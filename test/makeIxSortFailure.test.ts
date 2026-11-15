import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { expect, test } from 'vitest'

import { makeIxStream } from '../src/makeIx.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sortfail-'))

// fake sorts, one per way a real one fails. `drains` reads all its input
// first, the way a sort does when it runs out of space part-way through;
// `immediate` dies before reading any, the way one does on a TMPDIR it cannot
// create files in, leaving the writer with a pipe nobody is reading; `panics`
// is uutils sort, /usr/bin/sort on ubuntu 26.04, filling its TMPDIR
const bins = {
  drains:
    '#!/bin/sh\ncat > /dev/null\nprintf "aaa id1\\nbbb id2\\n"\necho "sort: no space left on device" >&2\nexit 2\n',
  immediate:
    '#!/bin/sh\necho "sort: cannot create temporary file: read-only file system" >&2\nexit 2\n',
  panics: [
    '#!/bin/sh',
    'cat > /dev/null',
    `echo "thread 'main' panicked at src/uu/sort/src/ext_sort/threaded.rs:302:34:" >&2`,
    'echo \'called `Result::unwrap()` on an `Err` value: Os { code: 28, kind: StorageFull, message: "No space left on device" }\' >&2',
    'kill -ABRT $$',
    '',
  ].join('\n'),
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

test.skipIf(process.platform === 'win32')(
  'says to move TMPDIR when sort runs out of space',
  async () => {
    await expect(makeIxWith('drains')).rejects.toThrow(
      /^ran out of space for temporary sort files in .*; set TMPDIR/,
    )
  },
)

test.skipIf(process.platform === 'win32')(
  'explains a uutils sort panic on a full TMPDIR',
  async () => {
    const error = makeIxWith('panics')
    await expect(error).rejects.toThrow(/^ran out of space.*set TMPDIR/)
    await expect(error).rejects.toThrow(/sort failed \(SIGABRT\).*panicked/)
  },
)
