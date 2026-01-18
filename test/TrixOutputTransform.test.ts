import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import split2 from 'split2'
import { describe, expect, test } from 'vitest'

import { TrixOutputTransform } from '../src/TrixOutputTransform.ts'

async function transformOutput(lines: string[]): Promise<string> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const chunks: string[] = []

  await pipeline(input, split2(), new TrixOutputTransform(), async function* (
    source,
  ) {
    for await (const chunk of source) {
      chunks.push(chunk.toString())
    }
  })

  return chunks.join('')
}

describe('TrixOutputTransform', () => {
  test('groups entries by word (first part)', async () => {
    const result = await transformOutput(['apple id1', 'apple id2'])
    expect(result).toBe('apple id1,1 id2,2\n')
  })

  test('separates different words', async () => {
    const result = await transformOutput(['apple id1', 'banana id2'])
    expect(result).toBe('apple id1,1\nbanana id2,1\n')
  })

  test('handles multiple entries for same word', async () => {
    const result = await transformOutput([
      'apple id1',
      'apple id2',
      'apple id3',
    ])
    expect(result).toBe('apple id1,1 id2,2 id3,3\n')
  })

  test('handles mixed words', async () => {
    const result = await transformOutput([
      'apple id1',
      'apple id2',
      'banana id3',
      'banana id4',
    ])
    expect(result).toBe('apple id1,1 id2,2\nbanana id3,1 id4,2\n')
  })

  test('handles line with only id (no data)', async () => {
    const result = await transformOutput(['word'])
    expect(result).toBe('word ,1\n')
  })

  test('strips null characters', async () => {
    const input = Readable.from(['apple\0 id1\n'])
    const chunks: string[] = []

    await pipeline(input, split2(), new TrixOutputTransform(), async function* (
      source,
    ) {
      for await (const chunk of source) {
        chunks.push(chunk.toString())
      }
    })

    expect(chunks.join('')).toBe('apple id1,1\n')
  })

  test('handles empty input', async () => {
    const result = await transformOutput([])
    expect(result).toBe('')
  })
})
