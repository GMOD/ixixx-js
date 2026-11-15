import fs from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { describe, expect, test, vi } from 'vitest'

import { sortLines } from '../src/sortLines.ts'
import { StringWritable } from './StringWritable.ts'

async function sorted(lines: string[]) {
  const input = Readable.from(lines.map(l => l + '\n'))
  const output = new StringWritable()
  await pipeline(input, sortLines, output)
  return output.data.split('\n').filter(l => l.length > 0)
}

describe('sortLines', () => {
  test('sorts lines', async () => {
    const result = await sorted(['cherry', 'apple', 'banana'])
    expect(result).toEqual(['apple', 'banana', 'cherry'])
  })

  test('handles empty input', async () => {
    const result = await sorted([])
    expect(result).toEqual([])
  })

  test('handles single line', async () => {
    const result = await sorted(['only'])
    expect(result).toEqual(['only'])
  })

  test('handles duplicates', async () => {
    const result = await sorted(['b', 'a', 'b', 'a'])
    expect(result).toEqual(['a', 'a', 'b', 'b'])
  })

  test('handles lines with spaces', async () => {
    const result = await sorted(['cherry pie', 'apple tart'])
    expect(result).toEqual(['apple tart', 'cherry pie'])
  })

  test('cleans up temp directory', async () => {
    const input = Readable.from(['b\n', 'a\n'])
    const output = new StringWritable()
    await pipeline(input, sortLines, output)
    expect(output.data).toBe('a\nb\n')
  })

  test('says to move TMPDIR when the temp files run out of space', async () => {
    const enospc = Object.assign(
      new Error('ENOSPC: no space left on device, write'),
      { code: 'ENOSPC' },
    )
    const spy = vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(enospc)
    try {
      const error = pipeline(
        Readable.from(['b\n', 'a\n']),
        sortLines,
        new StringWritable(),
      )
      await expect(error).rejects.toThrow(
        /^ran out of space for temporary sort files in .*; set TMPDIR/,
      )
      await expect(error).rejects.toHaveProperty('cause', enospc)
    } finally {
      spy.mockRestore()
    }
  })
})
