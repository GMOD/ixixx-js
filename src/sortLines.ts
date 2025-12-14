import { Readable, Writable } from 'stream'

import esort from 'external-sorting'
import tmp from 'tmp'

/**
 * Sort lines from input stream and write to output stream using external merge sort.
 * Handles large files by using temp files for intermediate sorted chunks.
 */
export async function sortLinesExternal(
  input: Readable,
  output: Writable,
  tempDir?: string,
): Promise<void> {
  const dir = tempDir ?? tmp.dirSync({ prefix: 'ixixx-sort' }).name
  await esort({
    input,
    output,
    tempDir: dir,
    maxHeap: 10_000,
  }).asc()
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
