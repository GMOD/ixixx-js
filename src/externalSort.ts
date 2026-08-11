import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'

import { compareIxLines } from './compareIxLines.ts'
import { chunkSize } from './util.ts'

import type { Writable } from 'node:stream'

interface HeapNode {
  item: string
  iter: AsyncIterator<string>
}

// pipe() propagates neither errors nor teardown: a failing input would leave
// the splitter open and the consumer waiting forever, and a consumer that stops
// early would leave the input's file descriptor open. pipeline() destroys in
// both directions, and the consumer sees any input error because pipeline
// destroys the splitter with it
function splitLines(input: Readable): AsyncIterable<string> {
  const splitter = split2()
  pipeline(input, splitter).catch(() => {
    // nothing to report here: pipeline destroys the splitter with the error, so
    // the consumer iterating it is the one that sees it
  })
  return splitter
}

function heapify(harr: HeapNode[], i: number, heapSize: number) {
  let cur = i
  for (;;) {
    const l = (cur << 1) + 1
    const r = l + 1
    let first = cur
    if (l < heapSize && compareIxLines(harr[l]!.item, harr[first]!.item) < 0) {
      first = l
    }
    if (r < heapSize && compareIxLines(harr[r]!.item, harr[first]!.item) < 0) {
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
  input: Readable,
  tempDir: string,
  maxHeap: number,
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

  for await (const line of splitLines(input)) {
    buf.push(line)
    if (buf.length === maxHeap) {
      await flush()
    }
  }
  await flush()
}

async function* mergeIterator(filesPath: string[]) {
  const iters = filesPath.map(file =>
    splitLines(fs.createReadStream(file))[Symbol.asyncIterator](),
  )

  try {
    const harr: HeapNode[] = []
    for (const iter of iters) {
      const r = await iter.next()
      if (!r.done) {
        harr.push({ item: r.value, iter })
      }
    }
    let heapSize = harr.length
    for (let i = (heapSize - 1) >> 1; i >= 0; i--) {
      heapify(harr, i, heapSize)
    }

    // yielding a chunk per line makes one write per line downstream
    let batch = ''
    while (heapSize > 0) {
      const top = harr[0]!
      batch += `${top.item}\n`
      if (batch.length >= chunkSize) {
        yield batch
        batch = ''
      }
      const r = await top.iter.next()
      if (r.done) {
        heapSize--
        harr[0] = harr[heapSize]!
      } else {
        top.item = r.value
      }
      heapify(harr, 0, heapSize)
    }
    if (batch !== '') {
      yield batch
    }
  } finally {
    // closes the temp file handles even when the consumer stops early
    await Promise.all(iters.map(async iter => iter.return?.()))
  }
}

async function unlinkTemp(file: string) {
  await fs.promises.unlink(file).catch((error: unknown) => {
    console.error(`failed to unlink temp file ${file}:`, error)
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
    await pipeline(
      Readable.from(mergeIterator(group)),
      fs.createWriteStream(fpath),
    )
    files.splice(0, maxFanIn)
    await Promise.all(group.map(unlinkTemp))
  }
}

async function mergeSortedFiles(
  files: string[],
  tempDir: string,
  output: Writable,
) {
  await reduceRuns(files, tempDir)
  if (files.length === 0) {
    await new Promise<void>(resolve => {
      output.end(resolve)
    })
  } else if (files.length === 1) {
    await pipeline(fs.createReadStream(files[0]!), output)
  } else {
    await pipeline(Readable.from(mergeIterator(files)), output)
  }
}

export async function externalSort(
  input: Readable,
  output: Writable,
  tempDir: string,
  maxHeap = 10_000,
) {
  const files: string[] = []
  try {
    await initialRun(input, tempDir, maxHeap, files)
    await mergeSortedFiles(files, tempDir, output)
  } catch (error) {
    // mergeSortedFiles is what ends the output, so failing before it would
    // leave whatever reads the output waiting on a stream that never finishes
    output.destroy(error instanceof Error ? error : new Error(String(error)))
    throw error
  } finally {
    await Promise.all(files.map(unlinkTemp))
  }
}
