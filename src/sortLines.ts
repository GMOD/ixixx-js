import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { externalSort } from './externalSort.ts'

import type { Readable, Writable } from 'node:stream'

export async function sortLinesExternal(input: Readable, output: Writable) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ixixx-sort-'))
  try {
    await externalSort(input, output, dir, 10_000)
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
