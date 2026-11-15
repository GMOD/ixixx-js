import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { externalSort } from './externalSort.ts'
import { isOutOfSpace, tempSpaceHint } from './tempSpace.ts'

export async function* sortLines(input: AsyncIterable<Buffer | string>) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ixixx-sort-'))
  try {
    yield* externalSort(input, dir)
  } catch (error) {
    throw isOutOfSpace(error)
      ? new Error(tempSpaceHint(), { cause: error })
      : error
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true })
  }
}
