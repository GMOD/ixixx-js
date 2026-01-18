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
