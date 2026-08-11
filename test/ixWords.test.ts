import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { ixWords } from '../src/ixWords.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ixwords-'))

let fileCount = 0

async function readWords(content: string) {
  const file = path.join(dir, `${fileCount++}.ix`)
  fs.writeFileSync(file, content)
  const out: { word: string; offset: number }[] = []
  for await (const entry of ixWords(file)) {
    out.push(entry)
  }
  return out
}

describe('ixWords', () => {
  test('yields first field and line offset', async () => {
    expect(await readWords('apple id1,1\nbanana id2,1\n')).toEqual([
      { word: 'apple', offset: 0 },
      { word: 'banana', offset: 12 },
    ])
  })

  test('offsets are byte counts, not character counts', async () => {
    const content = '日本語 id1,1\ncafé id2,1\nzed id3,1\n'
    const words = await readWords(content)
    const buf = Buffer.from(content)
    for (const { word, offset } of words) {
      expect(
        buf.toString('utf8', offset, offset + Buffer.byteLength(word)),
      ).toBe(word)
    }
  })

  test('handles missing trailing newline', async () => {
    expect(await readWords('a x\nb y')).toEqual([
      { word: 'a', offset: 0 },
      { word: 'b', offset: 4 },
    ])
  })

  test('handles lines without a space', async () => {
    expect(await readWords('word\nother thing\n')).toEqual([
      { word: 'word', offset: 0 },
      { word: 'other', offset: 5 },
    ])
  })

  test('offsets count crlf separators, word excludes the cr', async () => {
    expect(await readWords('a x\r\nb\r\n')).toEqual([
      { word: 'a', offset: 0 },
      { word: 'b', offset: 5 },
    ])
  })

  test('empty file yields nothing', async () => {
    expect(await readWords('')).toEqual([])
  })

  test('lines spanning read-buffer boundaries keep offsets', async () => {
    const line = `${'x'.repeat(100_000)} id,1`
    const content = `a b\n${line}\nz y\n`
    expect(await readWords(content)).toEqual([
      { word: 'a', offset: 0 },
      { word: 'x'.repeat(100_000), offset: 4 },
      { word: 'z', offset: 4 + line.length + 1 },
    ])
  })

  test('a multibyte character split across a read stays one character', async () => {
    // 日 lands on bytes 65535-65537, straddling the 64kb read boundary, so the
    // field is only decodable once both halves have arrived
    const word = `${'x'.repeat(65_535)}日y`
    expect(await readWords(`${word} id,1\nz y\n`)).toEqual([
      { word, offset: 0 },
      { word: 'z', offset: Buffer.byteLength(word) + 6 },
    ])
  })

  test('a long record list is not held in memory to reach the next line', async () => {
    // a term shared by many records: the field is tiny but the line runs for
    // megabytes, and only the offsets past it have to stay right
    const long = `hot${' rec,1'.repeat(500_000)}`
    expect(await readWords(`a b\n${long}\nz y\n`)).toEqual([
      { word: 'a', offset: 0 },
      { word: 'hot', offset: 4 },
      { word: 'z', offset: 4 + long.length + 1 },
    ])
  })
})
