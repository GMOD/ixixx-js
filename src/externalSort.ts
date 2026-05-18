import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'

import type { Writable } from 'node:stream'

interface HeapNode {
  item: string
  iter: AsyncIterator<string>
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
    const r = await iter.next()
    if (!r.done) {
      harr.push({ item: r.value, iter })
    }
  }
  let heapSize = harr.length
  for (let i = (heapSize - 1) >> 1; i >= 0; i--) {
    heapify(harr, i, heapSize)
  }

  while (heapSize > 0) {
    const top = harr[0]!
    yield `${top.item}\n`
    const r = await top.iter.next()
    if (r.done) {
      heapSize--
      harr[0] = harr[heapSize]!
    } else {
      top.item = r.value
    }
    heapify(harr, 0, heapSize)
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
