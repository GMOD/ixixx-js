import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { expect, test } from 'vitest'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sortfail-'))

// a fake sort that reads all input, emits a couple of lines and then fails, the
// way a real sort would if it ran out of space for its temp files
const fakeBin = path.join(dir, 'bin')
fs.mkdirSync(fakeBin, { recursive: true })
fs.writeFileSync(
  path.join(fakeBin, 'sort'),
  '#!/bin/sh\ncat > /dev/null\nprintf "aaa id1\\nbbb id2\\n"\necho "sort: no space left on device" >&2\nexit 2\n',
  { mode: 0o755 },
)
process.env.PATH = `${fakeBin}${path.delimiter}${process.env.PATH}`

// makeIx checks for sort at import time, so it must be imported after PATH is set
const { makeIxStream } = await import('../src/makeIx.ts')

test.skipIf(process.platform === 'win32')(
  'rejects when the sort subprocess fails after consuming its input',
  async () => {
    const outFile = path.join(dir, 'out.ix')
    const lines = Array.from({ length: 200 }, (_, i) => `id${i} word${i}\n`)

    await expect(makeIxStream(Readable.from(lines), outFile)).rejects.toThrow(
      /sort failed.*no space left on device/i,
    )
  },
)
