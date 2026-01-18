import { Readable, Writable } from 'stream'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { externalSort } from '../src/externalSort.ts'

class StringWritable extends Writable {
  data = ''

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ) {
    this.data += chunk.toString()
    callback()
  }
}

async function sortLines(lines: string[], maxHeap = 10_000): Promise<string[]> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const output = new StringWritable()
  const tempDir = tmp.dirSync({ prefix: 'test-sort' })

  await externalSort(input, output, tempDir.name, maxHeap)
  tempDir.removeCallback()

  return output.data.split('\n').filter(l => l.length > 0)
}

describe('externalSort', () => {
  test('sorts simple lines', async () => {
    const result = await sortLines(['cherry', 'apple', 'banana'])
    expect(result).toEqual(['apple', 'banana', 'cherry'])
  })

  test('handles already sorted input', async () => {
    const result = await sortLines(['apple', 'banana', 'cherry'])
    expect(result).toEqual(['apple', 'banana', 'cherry'])
  })

  test('handles reverse sorted input', async () => {
    const result = await sortLines(['cherry', 'banana', 'apple'])
    expect(result).toEqual(['apple', 'banana', 'cherry'])
  })

  test('handles duplicate lines', async () => {
    const result = await sortLines(['banana', 'apple', 'banana', 'apple'])
    expect(result).toEqual(['apple', 'apple', 'banana', 'banana'])
  })

  test('handles single line', async () => {
    const result = await sortLines(['only'])
    expect(result).toEqual(['only'])
  })

  test('handles empty input', async () => {
    const result = await sortLines([])
    expect(result).toEqual([])
  })

  test('handles lines with spaces', async () => {
    const result = await sortLines([
      'cherry pie',
      'apple tart',
      'banana split',
    ])
    expect(result).toEqual(['apple tart', 'banana split', 'cherry pie'])
  })

  test('sorts with small maxHeap (forces multiple temp files)', async () => {
    const lines = ['dog', 'cat', 'bird', 'ant', 'zebra', 'fish', 'elephant']
    const result = await sortLines(lines, 3)
    expect(result).toEqual([
      'ant',
      'bird',
      'cat',
      'dog',
      'elephant',
      'fish',
      'zebra',
    ])
  })

  test('handles larger dataset with small heap', async () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      String(100 - i).padStart(3, '0'),
    )
    const result = await sortLines(lines, 10)
    const expected = Array.from({ length: 100 }, (_, i) =>
      String(i + 1).padStart(3, '0'),
    )
    expect(result).toEqual(expected)
  })

  test('handles unicode characters', async () => {
    const result = await sortLines(['éclair', 'apple', 'über', 'banana'])
    // JS string sort uses UTF-16 code units: é (0xE9) < ü (0xFC)
    expect(result).toEqual(['apple', 'banana', 'éclair', 'über'])
  })
})
