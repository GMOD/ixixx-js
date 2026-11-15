import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { externalSort } from './externalSort.ts'

export async function* sortLines(input: AsyncIterable<Buffer | string>) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ixixx-sort-'))
  try {
    yield* externalSort(input, dir)
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
