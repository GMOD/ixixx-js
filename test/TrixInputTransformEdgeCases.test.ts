import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import split2 from 'split2'
import { describe, expect, test } from 'vitest'

import { TrixInputTransform } from '../src/TrixInputTransform.ts'

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

async function transformInput(lines: string[]): Promise<string> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const output = new StringWritable()

  await pipeline(input, split2(), new TrixInputTransform(), output)

  return output.data
}

describe('TrixInputTransform edge cases', () => {
  test('filters out empty strings from split', async () => {
    // Multiple spaces create empty strings when split
    const result = await transformInput(['id1   word1   word2'])
    // Should only have word1 and word2, not empty entries
    const lines = result.trim().split('\n')
    expect(lines.every(l => l.length > 0)).toBe(true)
    expect(lines).toHaveLength(2)
  })

  test('handles tab characters as whitespace', async () => {
    const result = await transformInput(['id1\tword1\tword2'])
    expect(result).toContain('word1')
    expect(result).toContain('word2')
  })

  test('handles mixed whitespace', async () => {
    const result = await transformInput(['id1 \t word1 \t word2'])
    const lines = result
      .trim()
      .split('\n')
      .filter(l => l.length > 0)
    expect(lines).toHaveLength(2)
  })

  test('preserves numbers in words', async () => {
    const result = await transformInput(['id1 abc123 456def'])
    expect(result).toContain('abc123')
    expect(result).toContain('456def')
  })

  test('handles hyphenated words', async () => {
    const result = await transformInput(['id1 well-known self-aware'])
    expect(result).toContain('well-known')
    expect(result).toContain('self-aware')
  })

  test('handles words with underscores', async () => {
    const result = await transformInput(['id1 snake_case SCREAMING_SNAKE'])
    expect(result).toContain('snake_case')
    expect(result).toContain('screaming_snake')
  })

  test('handles unicode words', async () => {
    const result = await transformInput(['id1 café naïve résumé'])
    expect(result).toContain('café')
    expect(result).toContain('naïve')
    expect(result).toContain('résumé')
  })

  test('handles CJK characters', async () => {
    const result = await transformInput(['id1 日本語 中文'])
    expect(result).toContain('日本語')
    expect(result).toContain('中文')
  })

  test('handles emoji', async () => {
    const result = await transformInput(['id1 hello🎉 world🌍'])
    expect(result).toContain('hello🎉')
    expect(result).toContain('world🌍')
  })

  test('lowercases unicode letters', async () => {
    const result = await transformInput(['id1 MÜNCHEN ZÜRICH'])
    expect(result).toContain('münchen')
    expect(result).toContain('zürich')
  })
})
