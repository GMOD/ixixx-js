import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { externalSort } from './externalSort.ts'
import { isOutOfSpace, tempSpaceHint } from './tempSpace.ts'

export async function* sortLines(input: AsyncIterable<Buffer | string>) {
  const tempRoot = os.tmpdir()
  try {
    const dir = await fs.promises.mkdtemp(path.join(tempRoot, 'ixixx-sort-'))
    try {
      yield* externalSort(input, dir)
    } finally {
      await fs.promises.rm(dir, { recursive: true, force: true })
    }
  } catch (error) {
    throw isOutOfSpace(error)
      ? new Error(tempSpaceHint(tempRoot), { cause: error })
      : error
  }
}
