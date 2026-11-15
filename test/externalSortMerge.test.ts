import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { externalSort } from '../src/externalSort.ts'
import { StringWritable } from './StringWritable.ts'

describe('externalSort merge behavior', () => {
  test('correctly merges multiple sorted temp files', async () => {
    // Use runLength=5 to force creation of multiple temp files
    const lines = [
      'zebra',
      'apple',
      'mango',
      'banana',
      'orange',
      'grape',
      'kiwi',
      'lemon',
      'peach',
      'cherry',
      'fig',
      'date',
      'plum',
      'pear',
      'lime',
    ]

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-merge' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 5),
      output,
    )
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)
    const expected = lines.toSorted()

    expect(result).toEqual(expected)
  })

  test('maintains sort stability with equal elements across files', async () => {
    // Create data that will be split across multiple files with duplicates
    const lines = ['b', 'a', 'c', 'a', 'b', 'c', 'a', 'b', 'c']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-stability' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 3),
      output,
    )
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c'])
  })

  test('handles single temp file (no merge needed)', async () => {
    const lines = ['c', 'b', 'a']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-single' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 100),
      output,
    )
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('handles exactly runLength items', async () => {
    const lines = ['e', 'd', 'c', 'b', 'a']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-exact' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 5),
      output,
    )
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  test('cleans up temp files after completion', async () => {
    const lines = ['b', 'a', 'c', 'd', 'e', 'f']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-cleanup' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 2),
      output,
    )

    // Check temp dir is empty (files should be cleaned up)
    const { readdirSync } = await import('node:fs')
    const remaining = readdirSync(tempDir.name)
    expect(remaining).toHaveLength(0)

    tempDir.removeCallback()
  })

  test('handles lines longer than read buffer (512 bytes)', async () => {
    const longLine = 'x'.repeat(1000)
    const lines = [longLine, 'a', 'z']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-long' })

    await pipeline(
      input,
      source => externalSort(source, tempDir.name, 2),
      output,
    )
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('a')
    expect(result[1]).toBe(longLine)
    expect(result[2]).toBe('z')
  })
})
