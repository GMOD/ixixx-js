import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { sync as commandExistsSync } from 'command-exists'
import split2 from 'split2'
import fs from 'fs'
import { spawn } from 'child_process'
import { TrixInputTransform } from './TrixInputTransform'
import { TrixOutputTransform } from './TrixOutputTransform'
import { sortLinesExternal } from './sortLines'

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

  const inputDone = pipeline(
    fileStream,
    split2(),
    new TrixInputTransform(),
    sort.stdin,
  )

  const outputDone = pipeline(
    sort.stdout,
    split2(),
    new TrixOutputTransform(),
    out,
  )

  await Promise.all([inputDone, outputDone])
}

async function makeIxWithJsSort(fileStream: Readable, outIxFilename: string) {
  const out = fs.createWriteStream(outIxFilename)

  // Transform input
  const transformedInput = fileStream.pipe(split2()).pipe(new TrixInputTransform())

  // Sort lines using external merge sort
  const sortedOutput = split2()
  const sortDone = sortLinesExternal(transformedInput, sortedOutput)

  // Transform sorted output and write to file
  const writeDone = pipeline(sortedOutput, new TrixOutputTransform(), out)

  await Promise.all([sortDone, writeDone])
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
