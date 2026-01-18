import fs from 'fs'
import { Readable } from 'stream'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { ixIxx, ixIxxStream } from '../src/index.ts'

describe('edge cases', () => {
  test('handles very long words', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()
    const longWord = 'a'.repeat(1000)
    const stream = Readable.from([`id1 ${longWord}\n`])

    await ixIxxStream(stream, l1.name, l2.name)
    const ix = fs.readFileSync(l1.name, 'utf8')

    expect(ix).toContain(longWord)
    l1.removeCallback()
    l2.removeCallback()
  })

  test('handles many words per line', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`)
    const stream = Readable.from([`id1 ${words.join(' ')}\n`])

    await ixIxxStream(stream, l1.name, l2.name)
    const ix = fs.readFileSync(l1.name, 'utf8')

    expect(ix).toContain('word0')
    expect(ix).toContain('word99')
    l1.removeCallback()
    l2.removeCallback()
  })

  test('handles special characters in words', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()
    const stream = Readable.from([
      'id1 hello-world\n',
      'id2 foo_bar\n',
      'id3 test123\n',
    ])

    await ixIxxStream(stream, l1.name, l2.name)
    const ix = fs.readFileSync(l1.name, 'utf8')

    expect(ix).toContain('hello-world')
    expect(ix).toContain('foo_bar')
    expect(ix).toContain('test123')
    l1.removeCallback()
    l2.removeCallback()
  })

  test('handles lines with only whitespace words', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()
    const stream = Readable.from(['id1    \n', 'id2 real\n'])

    await ixIxxStream(stream, l1.name, l2.name)
    const ix = fs.readFileSync(l1.name, 'utf8')

    expect(ix).toContain('real')
    l1.removeCallback()
    l2.removeCallback()
  })

  test('full pipeline produces valid ix and ixx files', async () => {
    const inFile = tmp.fileSync()
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()

    fs.writeFileSync(
      inFile.name,
      [
        'gene1 brca1 breast cancer',
        'gene2 tp53 tumor protein',
        'gene3 brca2 breast cancer susceptibility',
      ].join('\n') + '\n',
    )

    await ixIxx(inFile.name, l1.name, l2.name)

    const ix = fs.readFileSync(l1.name, 'utf8')
    const ixx = fs.readFileSync(l2.name, 'utf8')

    // ix should have sorted, grouped entries
    expect(ix).toContain('breast')
    expect(ix).toContain('cancer')
    expect(ix).toContain('brca1')

    // ixx should have hex addresses
    expect(ixx).toMatch(/[0-9A-F]{10}/)

    inFile.removeCallback()
    l1.removeCallback()
    l2.removeCallback()
  })

  test('handles file with many duplicate words', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()
    const lines = Array.from(
      { length: 100 },
      (_, i) => `id${i} common shared duplicate`,
    )
    const stream = Readable.from(lines.map(l => l + '\n'))

    await ixIxxStream(stream, l1.name, l2.name)
    const ix = fs.readFileSync(l1.name, 'utf8')

    // common should appear once but reference all ids
    const commonLines = ix.split('\n').filter(l => l.startsWith('common'))
    expect(commonLines).toHaveLength(1)
    expect(commonLines[0]).toContain('id0')
    expect(commonLines[0]).toContain('id99')

    l1.removeCallback()
    l2.removeCallback()
  })
})

describe('error handling', () => {
  test('rejects on non-existent input file', async () => {
    const l1 = tmp.fileSync()
    const l2 = tmp.fileSync()

    await expect(
      ixIxx('/non/existent/file.txt', l1.name, l2.name),
    ).rejects.toThrow()

    l1.removeCallback()
    l2.removeCallback()
  })
})
