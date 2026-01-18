import fs from 'fs'
import { Readable, Writable } from 'stream'

import tmp from 'tmp'

import { externalSort } from './externalSort.ts'

/**
 * Sort lines from input stream and write to output stream using external merge sort.
 * Handles large files by using temp files for intermediate sorted chunks.
 */
export async function sortLinesExternal(
  input: Readable,
  output: Writable,
  tempDir?: string,
): Promise<void> {
  const createdTempDir = tempDir === undefined
  const dir = tempDir ?? tmp.dirSync({ prefix: 'ixixx-sort' }).name
  try {
    await externalSort(input, output, dir, 10_000)
  } finally {
    if (createdTempDir) {
      await fs.promises.rmdir(dir)
    }
  }
}

/**
 * Sort lines in memory. Only use for small inputs.
 */
export async function sortLinesInMemory(
  input: Readable,
  output: Writable,
): Promise<void> {
  const lines: string[] = []

  await new Promise<void>((resolve, reject) => {
    let buffer = ''

    input.on('data', function onData(chunk: Buffer | string) {
      buffer += chunk.toString()
      const parts = buffer.split('\n')
      buffer = parts.pop()!
      for (const line of parts) {
        if (line) {
          lines.push(line)
        }
      }
    })

    input.on('end', function onEnd() {
      if (buffer) {
        lines.push(buffer)
      }
      resolve()
    })

    input.on('error', reject)
  })

  lines.sort()

  await new Promise<void>((resolve, reject) => {
    let i = 0

    function writeNext() {
      let ok = true
      while (i < lines.length && ok) {
        ok = output.write(lines[i] + '\n')
        i++
      }
      if (i < lines.length) {
        output.once('drain', writeNext)
      } else {
        output.end()
        resolve()
      }
    }

    output.on('error', reject)
    writeNext()
  })
}
