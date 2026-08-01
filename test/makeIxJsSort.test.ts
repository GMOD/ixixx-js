import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { describe, expect, test, vi } from 'vitest'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jssort-'))

// enough records to spill past the default 10k-line run size, so the fallback's
// temp-file merge runs rather than a single in-memory sort
const records = Array.from(
  { length: 8000 },
  (_, i) =>
    `doc${i} gene${String(i).padStart(6, '0')} shared${i % 13} 日本語${i % 7}\n`,
)

// makeIx decides between the `sort` subprocess and the pure-JS sort once, at
// import time, so which path a call takes is fixed by the PATH at import
async function makeIxWith(pathEnv: string | undefined, out: string) {
  vi.resetModules()
  const original = process.env.PATH
  process.env.PATH = pathEnv
  try {
    const { makeIxStream } = await import('../src/makeIx.ts')
    await makeIxStream(Readable.from(records), out)
  } finally {
    process.env.PATH = original
  }
  return fs.readFileSync(out, 'utf8')
}

describe('pure-JS sort fallback', () => {
  test.skipIf(process.platform === 'win32')(
    'produces the same ix as the sort subprocess',
    async () => {
      const external = await makeIxWith(
        process.env.PATH,
        path.join(dir, 'external.ix'),
      )
      // no `sort` reachable, so makeIx falls back to sortLinesExternal
      const js = await makeIxWith('', path.join(dir, 'js.ix'))

      expect(js).toBe(external)
    },
  )

  test('sorts in utf-8 byte order, not utf-16 order', async () => {
    const ix = await makeIxWith('', path.join(dir, 'order.ix'))
    const words = ix
      .split('\n')
      .filter(Boolean)
      .map(l => l.split(' ')[0]!)

    const byBytes = words.toSorted((a, b) =>
      Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
    )
    expect(words).toEqual(byBytes)
    // multibyte words are what make this differ from javascript's `<`
    expect(words.some(w => Buffer.byteLength(w) > w.length)).toBe(true)
  })
})
