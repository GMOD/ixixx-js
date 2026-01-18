import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import split2 from 'split2'
import { describe, expect, test } from 'vitest'

import { TrixInputTransform } from '../src/TrixInputTransform.ts'

async function transformInput(lines: string[]): Promise<string> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const chunks: string[] = []

  await pipeline(input, split2(), new TrixInputTransform(), async function* (
    source,
  ) {
    for await (const chunk of source) {
      chunks.push(chunk.toString())
    }
  })

  return chunks.join('')
}

describe('TrixInputTransform', () => {
  test('transforms single word line', async () => {
    const result = await transformInput(['id123 hello'])
    expect(result).toBe('hello id123\n')
  })

  test('transforms multiple words', async () => {
    const result = await transformInput(['id123 hello world test'])
    expect(result).toBe('hello id123\nworld id123\ntest id123\n')
  })

  test('lowercases words', async () => {
    const result = await transformInput(['id123 HELLO World TeSt'])
    expect(result).toBe('hello id123\nworld id123\ntest id123\n')
  })

  test('handles line with only id (no words)', async () => {
    const result = await transformInput(['id123'])
    expect(result).toBe('')
  })

  test('handles multiple lines', async () => {
    const result = await transformInput(['id1 apple', 'id2 banana'])
    expect(result).toBe('apple id1\nbanana id2\n')
  })

  test('handles multiple whitespace between words', async () => {
    const result = await transformInput(['id123   hello    world'])
    expect(result).toBe('hello id123\nworld id123\n')
  })

  test('handles empty input', async () => {
    const result = await transformInput([])
    expect(result).toBe('')
  })
})
