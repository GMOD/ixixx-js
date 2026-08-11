import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { expect, test, vi } from 'vitest'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sortfail-'))

// two fake sorts, one per way a real one fails. `drains` reads all its input
// first, the way a sort does when it runs out of space part-way through;
// `immediate` dies before reading any, the way one does on a TMPDIR it cannot
// create files in, leaving the writer with a pipe nobody is reading
const bins = {
  drains:
    '#!/bin/sh\ncat > /dev/null\nprintf "aaa id1\\nbbb id2\\n"\necho "sort: no space left on device" >&2\nexit 2\n',
  immediate:
    '#!/bin/sh\necho "sort: cannot create temporary file: read-only file system" >&2\nexit 2\n',
}

for (const [name, script] of Object.entries(bins)) {
  const binDir = path.join(dir, name)
  fs.mkdirSync(binDir, { recursive: true })
  fs.writeFileSync(path.join(binDir, 'sort'), script, { mode: 0o755 })
}

// enough input that the writer is still going when an immediately-dying sort
// closes the pipe under it
const lines = Array.from({ length: 200_000 }, (_, i) => `id${i} word${i}\n`)

async function makeIxWith(bin: keyof typeof bins) {
  const original = process.env.PATH
  process.env.PATH = `${path.join(dir, bin)}${path.delimiter}${original}`
  try {
    // makeIx picks its sort at import time, so each fake needs a fresh module
    vi.resetModules()
    const { makeIxStream } = await import('../src/makeIx.ts')
    await makeIxStream(Readable.from(lines), path.join(dir, `${bin}.ix`))
  } finally {
    process.env.PATH = original
  }
}

test.skipIf(process.platform === 'win32')(
  'rejects when the sort subprocess fails after consuming its input',
  async () => {
    await expect(makeIxWith('drains')).rejects.toThrow(
      /sort failed.*no space left on device/i,
    )
  },
)

test.skipIf(process.platform === 'win32')(
  'reports why sort died rather than the EPIPE it left behind',
  async () => {
    // the input pipeline fails first here, with a write EPIPE that says nothing
    // about the cause
    await expect(makeIxWith('immediate')).rejects.toThrow(
      /sort failed.*read-only file system/i,
    )
  },
)
