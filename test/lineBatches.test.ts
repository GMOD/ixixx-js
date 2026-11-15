import { Readable } from 'node:stream'

import { describe, expect, test } from 'vitest'

import { lineBatches } from '../src/lineBatches.ts'

async function lines(chunks: (Buffer | string)[]) {
  const out: string[] = []
  for await (const batch of lineBatches(Readable.from(chunks))) {
    out.push(...batch)
  }
  return out
}

describe('lineBatches', () => {
  test('splits on newlines and drops the empty tail of a final newline', async () => {
    expect(await lines(['a\nb\n'])).toEqual(['a', 'b'])
  })

  test('yields a last line that has no newline', async () => {
    expect(await lines(['a\nb'])).toEqual(['a', 'b'])
  })

  test('keeps empty lines in the middle', async () => {
    expect(await lines(['a\n\nb\n'])).toEqual(['a', '', 'b'])
  })

  test('strips the carriage return of crlf endings', async () => {
    expect(await lines(['a\r\nb\r\nc\r'])).toEqual(['a', 'b', 'c'])
  })

  test('joins a line split across chunks', async () => {
    expect(await lines(['ab', 'cd', 'e\nf', 'g\n'])).toEqual(['abcde', 'fg'])
  })

  test('decodes a multibyte character split across buffers', async () => {
    const bytes = Buffer.from('é😀\n')
    const chunks = [...bytes].map(b => Buffer.from([b]))
    expect(await lines(chunks)).toEqual(['é😀'])
  })

  test('yields nothing for empty input', async () => {
    expect(await lines([])).toEqual([])
    expect(await lines([''])).toEqual([])
  })
})
