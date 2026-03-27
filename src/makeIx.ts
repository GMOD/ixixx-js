import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { PassThrough } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { sync as commandExistsSync } from 'command-exists'
import split2 from 'split2'

import { TrixInputTransform } from './TrixInputTransform.ts'
import { TrixOutputTransform } from './TrixOutputTransform.ts'
import { sortLinesExternal } from './sortLines.ts'

import type { Readable } from 'node:stream'

const isWin =
  typeof process === 'undefined' ? false : process.platform === 'win32'

const useExternalSort = !isWin && commandExistsSync('sort')

async function makeIxWithExternalSort(
  fileStream: Readable,
  outIxFilename: string,
) {
  const out = fs.createWriteStream(outIxFilename)
  const sort = spawn('sort', ['-k1,1'], {
    env: { ...process.env, LC_ALL: 'C' },
  })

  const sortError = new Promise<never>((_, reject) => {
    sort.on('error', reject)
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

  await Promise.race([Promise.all([inputDone, outputDone]), sortError])
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
