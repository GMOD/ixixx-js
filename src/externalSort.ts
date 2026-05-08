import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'

import type { Writable } from 'node:stream'

const EOF = Symbol('EOF')
type Item = string | typeof EOF

interface HeapNode {
  item: Item
  iter: AsyncIterator<string>
}

function compare(a: Item, b: Item) {
  if (a === EOF) {
    return 1
  }
  if (b === EOF) {
    return -1
  }
  return a < b ? -1 : a > b ? 1 : 0
}

function heapify(harr: HeapNode[], i: number, heapSize: number) {
  let cur = i
  for (;;) {
    const l = (cur << 1) + 1
    const r = l + 1
    let first = cur
    if (l < heapSize && compare(harr[l]!.item, harr[first]!.item) < 0) {
      first = l
    }
    if (r < heapSize && compare(harr[r]!.item, harr[first]!.item) < 0) {
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

async function nextItem(iter: AsyncIterator<string>): Promise<Item> {
  const r = await iter.next()
  return r.done ? EOF : r.value
}

async function initialRun(
  input: Readable,
  tempDir: string,
  maxHeap: number,
): Promise<string[]> {
  const files: string[] = []
  const buf: string[] = []
  let fileIndex = 0

  const flush = async () => {
    if (buf.length === 0) {
      return
    }
    buf.sort()
    const fpath = path.resolve(tempDir, `es_${fileIndex++}.tmp`)
    await fs.promises.writeFile(fpath, buf.join('\n') + '\n')
    buf.length = 0
    files.push(fpath)
  }

  for await (const line of input.pipe(split2())) {
    buf.push(line as string)
    if (buf.length === maxHeap) {
      await flush()
    }
  }
  await flush()
  return files
}

async function* mergeIterator(filesPath: string[]) {
  const iters = filesPath.map(file => {
    const stream = fs.createReadStream(file).pipe(split2())
    return stream[Symbol.asyncIterator]() as AsyncIterator<string>
  })

  const harr: HeapNode[] = []
  for (const iter of iters) {
    harr.push({ item: await nextItem(iter), iter })
  }
  for (let i = (harr.length - 1) >> 1; i >= 0; i--) {
    heapify(harr, i, harr.length)
  }

  for (;;) {
    const first = harr[0]!
    if (first.item === EOF) {
      return
    }
    yield `${first.item}\n`
    first.item = await nextItem(first.iter)
    heapify(harr, 0, harr.length)
  }
}

async function mergeSortedFiles(filesPath: string[], output: Writable) {
  if (filesPath.length === 0) {
    await new Promise<void>(resolve => {
      output.end(resolve)
    })
    return
  }
  if (filesPath.length === 1) {
    await pipeline(fs.createReadStream(filesPath[0]!), output)
    return
  }
  await pipeline(Readable.from(mergeIterator(filesPath)), output)
}

export async function externalSort(
  input: Readable,
  output: Writable,
  tempDir: string,
  maxHeap = 10_000,
) {
  const files = await initialRun(input, tempDir, maxHeap)
  try {
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
