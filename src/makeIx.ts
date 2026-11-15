import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { commandExistsSync } from './commandExists.ts'
import { sortLines } from './sortLines.ts'
import { mentionsOutOfSpace, tempSpaceHint } from './tempSpace.ts'
import { trixInput } from './trixInput.ts'
import { trixOutput } from './trixOutput.ts'

import type { Readable } from 'node:stream'

const MAX_STDERR = 4096

function isEpipe(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'EPIPE'
}

// waits for every promise to settle, so the caller never sees a rejection
// while cleanup is still running, and reports the most informative failure. a
// sort that dies before draining its stdin trips the input pipeline with EPIPE
// while sortDone holds the exit status and stderr, so EPIPE comes last
async function settleAll(promises: Promise<void>[]) {
  const failures = (await Promise.allSettled(promises)).flatMap(
    (outcome): unknown[] =>
      outcome.status === 'rejected' ? [outcome.reason] : [],
  )
  if (failures.length > 0) {
    const cause: unknown =
      failures.find(error => !isEpipe(error)) ?? failures[0]
    throw cause instanceof Error ? cause : new Error(String(cause))
  }
}

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
        const detail = stderr.trim()
        const hint = mentionsOutOfSpace(detail) ? `${tempSpaceHint()}\n` : ''
        reject(new Error(`${hint}sort failed (${why}): ${detail}`))
      }
    })
  })

  const inputDone = pipeline(fileStream, trixInput, sort.stdin)
  const outputDone = pipeline(sort.stdout, trixOutput, out)

  await settleAll([inputDone, outputDone, sortDone])
}

async function makeIxWithJsSort(fileStream: Readable, outIxFilename: string) {
  await pipeline(
    fileStream,
    trixInput,
    sortLines,
    trixOutput,
    fs.createWriteStream(outIxFilename),
  )
}

export async function makeIxStream(
  fileStream: Readable,
  outIxFilename: string,
) {
  await (process.platform !== 'win32' && commandExistsSync('sort')
    ? makeIxWithExternalSort(fileStream, outIxFilename)
    : makeIxWithJsSort(fileStream, outIxFilename))
}

export async function makeIx(inFile: string, outIndex: string) {
  return makeIxStream(fs.createReadStream(inFile), outIndex)
}
