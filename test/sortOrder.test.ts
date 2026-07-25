import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { StringWritable } from './StringWritable.ts'
import { compareCodePoints } from '../src/compareCodePoints.ts'
import { externalSort } from '../src/externalSort.ts'

// the words mix ascii, bmp characters above 0xE000 and astral characters, which
// is where utf-16 order and utf-8 byte order disagree
const words = [
  'zz',
  'apple',
  '🎉party',
  'private',
  '�replacement',
  '＠fullwidth',
  '🍎apple',
  '日本語',
  'a',
  '𠜎cjkext',
  '￿',
  'ｚ',
]

async function systemSort(lines: string[]) {
  const sort = spawn('sort', ['-k1,1'], {
    env: { ...process.env, LC_ALL: 'C' },
  })
  const out = new StringWritable()
  await Promise.all([
    pipeline(Readable.from(lines.map(l => `${l}\n`)), sort.stdin),
    pipeline(sort.stdout, out),
  ])
  return out.data.split('\n').filter(l => l.length > 0)
}

async function jsSort(lines: string[], maxHeap: number) {
  const out = new StringWritable()
  const dir = tmp.dirSync({ prefix: 'order-' })
  await externalSort(
    Readable.from(lines.map(l => `${l}\n`)),
    out,
    dir.name,
    maxHeap,
  )
  dir.removeCallback()
  return out.data.split('\n').filter(l => l.length > 0)
}

describe('sort order', () => {
  test('compareCodePoints matches utf-8 byte order', () => {
    const byBytes = words.toSorted((a, b) =>
      Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
    )
    expect(words.toSorted(compareCodePoints)).toEqual(byBytes)
  })

  test('utf-16 order really differs, so this is not a no-op', () => {
    expect(words.toSorted(compareCodePoints)).not.toEqual(words.toSorted())
  })

  test.skipIf(process.platform === 'win32')(
    'js sort path matches LC_ALL=C sort, single run',
    async () => {
      const lines = words.map((w, i) => `${w} id${i},1`)
      expect(await jsSort(lines, 1000)).toEqual(await systemSort(lines))
    },
  )

  test.skipIf(process.platform === 'win32')(
    'js sort path matches LC_ALL=C sort across merged runs',
    async () => {
      const lines = Array.from({ length: 600 }, (_, i) => {
        const w = words[i % words.length]!
        return `${w}${String(i % 37).padStart(3, '0')} id${i},1`
      })
      expect(await jsSort(lines, 7)).toEqual(await systemSort(lines))
    },
  )
})
