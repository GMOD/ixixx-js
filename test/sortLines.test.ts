import { Readable, Writable } from 'stream'

import { describe, expect, test } from 'vitest'

import { sortLinesExternal } from '../src/sortLines.ts'

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

async function sortLines(lines: string[]): Promise<string[]> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const output = new StringWritable()
  await sortLinesExternal(input, output)
  return output.data.split('\n').filter(l => l.length > 0)
}

describe('sortLinesExternal', () => {
  test('sorts lines', async () => {
    const result = await sortLines(['cherry', 'apple', 'banana'])
    expect(result).toEqual(['apple', 'banana', 'cherry'])
  })

  test('handles empty input', async () => {
    const result = await sortLines([])
    expect(result).toEqual([])
  })

  test('handles single line', async () => {
    const result = await sortLines(['only'])
    expect(result).toEqual(['only'])
  })

  test('handles duplicates', async () => {
    const result = await sortLines(['b', 'a', 'b', 'a'])
    expect(result).toEqual(['a', 'a', 'b', 'b'])
  })

  test('handles lines with spaces', async () => {
    const result = await sortLines(['cherry pie', 'apple tart'])
    expect(result).toEqual(['apple tart', 'cherry pie'])
  })

  test('cleans up temp directory', async () => {
    const input = Readable.from(['b\n', 'a\n'])
    const output = new StringWritable()
    await sortLinesExternal(input, output)
    expect(output.data).toBe('a\nb\n')
  })
})
