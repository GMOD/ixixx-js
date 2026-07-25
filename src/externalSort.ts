import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'

import { chunkSize } from './util.ts'

import type { Writable } from 'node:stream'

interface HeapNode {
  item: string
  iter: AsyncIterator<string>
}

// pipe() does not forward errors, so a failing input would leave the splitter
// open and the consumer waiting forever
function splitLines(input: Readable): AsyncIterable<string> {
  const splitter = input.pipe(split2())
  input.on('error', (error: Error) => {
    splitter.destroy(error)
  })
  return splitter
}

function heapify(harr: HeapNode[], i: number, heapSize: number) {
  let cur = i
  for (;;) {
    const l = (cur << 1) + 1
    const r = l + 1
    let first = cur
    if (l < heapSize && harr[l]!.item < harr[first]!.item) {
      first = l
    }
    if (r < heapSize && harr[r]!.item < harr[first]!.item) {
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
      buf.sort()
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

async function mergeSortedFiles(filesPath: string[], output: Writable) {
  if (filesPath.length === 0) {
    await new Promise<void>(resolve => {
      output.end(resolve)
    })
  } else if (filesPath.length === 1) {
    await pipeline(fs.createReadStream(filesPath[0]!), output)
  } else {
    await pipeline(Readable.from(mergeIterator(filesPath)), output)
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
    await mergeSortedFiles(files, output)
  } finally {
    await Promise.all(
      files.map(file =>
        fs.promises.unlink(file).catch((error: unknown) => {
          console.error(`failed to unlink temp file ${file}:`, error)
        }),
      ),
    )
  }
}
