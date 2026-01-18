import fs from 'fs'
import { Readable } from 'stream'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { makeIx, makeIxStream } from '../src/makeIx.ts'

async function createIx(lines: string[]): Promise<string> {
  const inFile = tmp.fileSync()
  const outFile = tmp.fileSync()

  fs.writeFileSync(inFile.name, lines.join('\n') + '\n')
  await makeIx(inFile.name, outFile.name)
  const result = fs.readFileSync(outFile.name, 'utf8')

  inFile.removeCallback()
  outFile.removeCallback()

  return result
}

async function createIxFromStream(lines: string[]): Promise<string> {
  const outFile = tmp.fileSync()
  const stream = Readable.from(lines.map(l => l + '\n'))

  await makeIxStream(stream, outFile.name)
  const result = fs.readFileSync(outFile.name, 'utf8')

  outFile.removeCallback()

  return result
}

describe('makeIx', () => {
  test('creates index from file', async () => {
    const result = await createIx([
      'id1 apple banana',
      'id2 cherry date',
    ])
    expect(result).toContain('apple')
    expect(result).toContain('banana')
    expect(result).toContain('cherry')
    expect(result).toContain('date')
  })

  test('lowercases words in output', async () => {
    const result = await createIx(['id1 APPLE Banana'])
    expect(result).toContain('apple')
    expect(result).toContain('banana')
    expect(result).not.toContain('APPLE')
  })

  test('sorts output alphabetically', async () => {
    const result = await createIx([
      'id1 zebra',
      'id2 apple',
      'id3 middle',
    ])
    const lines = result.trim().split('\n')
    const words = lines.map(l => l.split(' ')[0])
    expect(words).toEqual([...words].sort())
  })

  test('groups same words with different ids', async () => {
    const result = await createIx([
      'id1 common unique1',
      'id2 common unique2',
    ])
    const lines = result.trim().split('\n')
    const commonLine = lines.find(l => l.startsWith('common'))
    expect(commonLine).toBeDefined()
    expect(commonLine).toContain('id1')
    expect(commonLine).toContain('id2')
  })

  test('handles empty input', async () => {
    const result = await createIx([])
    expect(result).toBe('')
  })

  test('handles single word entry', async () => {
    const result = await createIx(['id1 onlyword'])
    expect(result).toContain('onlyword')
  })
})

describe('makeIxStream', () => {
  test('creates index from stream', async () => {
    const result = await createIxFromStream([
      'id1 hello world',
      'id2 foo bar',
    ])
    expect(result).toContain('hello')
    expect(result).toContain('world')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  test('handles large input', async () => {
    const lines = Array.from(
      { length: 1000 },
      (_, i) => `id${i} word${i} common`,
    )
    const result = await createIxFromStream(lines)
    expect(result).toContain('common')
    expect(result).toContain('word0')
    expect(result).toContain('word999')
  })
})
