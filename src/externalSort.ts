import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { compareIxLines } from './compareIxLines.ts'
import { lineBatches } from './lineBatches.ts'
import { chunkSize, errorCode } from './util.ts'

// a sorted run being merged: `line` is its current head, and `lines[next]`
// onwards what is left of the batch it came from
interface Run {
  line: string
  lines: string[]
  next: number
  batches: AsyncIterator<string[]>
}

function heapify(harr: Run[], i: number, heapSize: number) {
  let cur = i
  for (;;) {
    const l = (cur << 1) + 1
    const r = l + 1
    let first = cur
    if (l < heapSize && compareIxLines(harr[l]!.line, harr[first]!.line) < 0) {
      first = l
    }
    if (r < heapSize && compareIxLines(harr[r]!.line, harr[first]!.line) < 0) {
      first = r
    }
    if (first === cur) {
      return
    }
    const tmp = harr[cur]!
    harr[cur] = harr[first]!
    harr[first] = tmp
    cur = first
  }
}

async function initialRun(
  input: AsyncIterable<Buffer | string>,
  tempDir: string,
  runLength: number,
  files: string[],
) {
  const buf: string[] = []

  const flush = async () => {
    if (buf.length > 0) {
      buf.sort(compareIxLines)
      const fpath = path.resolve(tempDir, `es_${files.length}.tmp`)
      await fs.promises.writeFile(fpath, buf.join('\n') + '\n')
      buf.length = 0
      files.push(fpath)
    }
  }

  for await (const lines of lineBatches(input)) {
    for (const line of lines) {
      buf.push(line)
      if (buf.length === runLength) {
        await flush()
      }
    }
  }
  await flush()
}

// lineBatches never yields an empty batch, so a batch always has a next line
async function nextBatch(run: Run) {
  const r = await run.batches.next()
  if (!r.done) {
    run.lines = r.value
    run.next = 0
  }
  return !r.done
}

async function* mergeIterator(filesPath: string[]) {
  const streams = filesPath.map(file => fs.createReadStream(file))

  try {
    const runs = streams.map((stream): Run => ({
      line: '',
      lines: [],
      next: 0,
      batches: lineBatches(stream),
    }))
    // started together, so every stream is listened to before any of them
    // can fail to open. a stream nobody reads yet has no 'error' listener,
    // and its failure would crash the process instead of rejecting
    const started = await Promise.all(runs.map(nextBatch))
    const harr = runs.filter((_, i) => started[i])
    for (const run of harr) {
      run.line = run.lines[run.next++]!
    }
    let heapSize = harr.length
    for (let i = (heapSize - 1) >> 1; i >= 0; i--) {
      heapify(harr, i, heapSize)
    }

    // yielding a chunk per line makes one write per line downstream
    let batch = ''
    while (heapSize > 0) {
      const top = harr[0]!
      batch += `${top.line}\n`
      if (batch.length >= chunkSize) {
        yield batch
        batch = ''
      }
      if (top.next < top.lines.length || (await nextBatch(top))) {
        top.line = top.lines[top.next++]!
      } else {
        heapSize--
        harr[0] = harr[heapSize]!
      }
      heapify(harr, 0, heapSize)
    }
    if (batch !== '') {
      yield batch
    }
  } finally {
    // closes the temp file handles even when the consumer stops early
    for (const stream of streams) {
      stream.destroy()
    }
  }
}

// a run whose file was never created, because opening it failed, has nothing
// to remove, and reporting that would bury the error that actually happened
async function unlinkTemp(file: string) {
  await fs.promises.unlink(file).catch((error: unknown) => {
    if (errorCode(error) !== 'ENOENT') {
      console.error(`failed to unlink temp file ${file}:`, error)
    }
  })
}

// a merge holds one file handle open per run for its whole duration, so a sort
// with thousands of runs would blow past the process fd limit (EMFILE). runs
// above this many are folded down first, which costs an extra pass over the
// data but only for sorts big enough to need it
export const maxFanIn = 64

// replaces groups of runs with a single merged run until few enough are left to
// merge in one pass. `files` is edited in place and always lists exactly the
// runs that exist on disk, so the caller's cleanup stays correct if this throws
async function reduceRuns(files: string[], tempDir: string) {
  let generation = 0
  while (files.length > maxFanIn) {
    const group = files.slice(0, maxFanIn)
    const fpath = path.resolve(tempDir, `es_g${generation++}.tmp`)
    files.push(fpath)
    await pipeline(mergeIterator(group), fs.createWriteStream(fpath))
    files.splice(0, maxFanIn)
    await Promise.all(group.map(unlinkTemp))
  }
}

export async function* externalSort(
  input: AsyncIterable<Buffer | string>,
  tempDir: string,
  runLength = 10_000,
) {
  const files: string[] = []
  try {
    await initialRun(input, tempDir, runLength, files)
    await reduceRuns(files, tempDir)
    yield* mergeIterator(files)
  } finally {
    await Promise.all(files.map(unlinkTemp))
  }
}
