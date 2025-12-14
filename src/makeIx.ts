import { pipeline } from 'stream/promises'
import { Readable, Writable } from 'stream'
import esort from 'external-sorting'
import tmp from 'tmp'
import { sync as commandExistsSync } from 'command-exists'
import split2 from 'split2'
import fs from 'fs'
import { spawn } from 'child_process'
import { TrixInputTransform } from './TrixInputTransform'
import { TrixOutputTransform } from './TrixOutputTransform'

const isWin =
  typeof process !== 'undefined' ? process.platform === 'win32' : false

const useExternalSort = !isWin && commandExistsSync('sort')

async function makeIxWithExternalSort(
  fileStream: Readable,
  outIxFilename: string,
) {
  const out = fs.createWriteStream(outIxFilename)
  const sort = spawn('sort', ['-k1,1'], {
    env: { ...process.env, LC_ALL: 'C' },
  })

  sort.on('error', function onSortError(err) {
    throw err
  })

  // Pipeline input → sort stdin
  const inputDone = pipeline(
    fileStream,
    split2(),
    new TrixInputTransform(),
    sort.stdin,
  )

  // Pipeline sort stdout → output
  const outputDone = pipeline(
    sort.stdout,
    split2(),
    new TrixOutputTransform(),
    out,
  )

  await Promise.all([inputDone, outputDone])
}

async function makeIxWithJsSort(fileStream: Readable, outIxFilename: string) {
  const dir = tmp.dirSync({ prefix: 'jbrowse-trix-sort' })
  const out = fs.createWriteStream(outIxFilename)
  const output = split2()

  const outputDone = pipeline(output, new TrixOutputTransform(), out)

  await esort({
    input: fileStream.pipe(split2()).pipe(new TrixInputTransform()) as Writable,
    output,
    tempDir: dir.name,
  }).asc()

  await outputDone
}

export async function makeIxStream(
  fileStream: Readable,
  outIxFilename: string,
) {
  if (useExternalSort) {
    await makeIxWithExternalSort(fileStream, outIxFilename)
  } else {
    await makeIxWithJsSort(fileStream, outIxFilename)
  }
}

export async function makeIx(inFile: string, outIndex: string) {
  return makeIxStream(fs.createReadStream(inFile), outIndex)
}
