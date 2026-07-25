import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { PassThrough } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'

import { TrixInputTransform } from './TrixInputTransform.ts'
import { TrixOutputTransform } from './TrixOutputTransform.ts'
import { commandExistsSync } from './commandExists.ts'
import { sortLinesExternal } from './sortLines.ts'

import type { Readable } from 'node:stream'

const useExternalSort =
  process.platform !== 'win32' && commandExistsSync('sort')

const MAX_STDERR = 4096

async function makeIxWithExternalSort(
  fileStream: Readable,
  outIxFilename: string,
) {
  const out = fs.createWriteStream(outIxFilename)
  const sort = spawn('sort', ['-k1,1'], {
    env: { ...process.env, LC_ALL: 'C' },
  })

  let stderr = ''
  sort.stderr.setEncoding('utf8')
  sort.stderr.on('data', (chunk: string) => {
    if (stderr.length < MAX_STDERR) {
      stderr += chunk
    }
  })

  // a sort that dies after reading all input, e.g. out of space in TMPDIR,
  // otherwise looks like success and silently produces a truncated index
  const sortDone = new Promise<void>((resolve, reject) => {
    sort.on('error', reject)
    sort.on('close', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        const why = signal ?? `exit code ${code}`
        reject(new Error(`sort failed (${why}): ${stderr.trim()}`))
      }
    })
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

  await Promise.all([inputDone, outputDone, sortDone])
}

async function makeIxWithJsSort(fileStream: Readable, outIxFilename: string) {
  const out = fs.createWriteStream(outIxFilename)

  // Transform input using pipeline for proper error handling
  const transformedInput = new PassThrough()
  const inputDone = pipeline(
    fileStream,
    split2(),
    new TrixInputTransform(),
    transformedInput,
  )

  // Sort lines using external merge sort
  const sortedOutput = split2()
  const sortDone = sortLinesExternal(transformedInput, sortedOutput)

  // Transform sorted output and write to file
  const writeDone = pipeline(sortedOutput, new TrixOutputTransform(), out)

  await Promise.all([inputDone, sortDone, writeDone])
}

export async function makeIxStream(
  fileStream: Readable,
  outIxFilename: string,
) {
  await (useExternalSort
    ? makeIxWithExternalSort(fileStream, outIxFilename)
    : makeIxWithJsSort(fileStream, outIxFilename))
}

export async function makeIx(inFile: string, outIndex: string) {
  return makeIxStream(fs.createReadStream(inFile), outIndex)
}
