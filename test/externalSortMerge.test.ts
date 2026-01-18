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

describe('externalSort merge behavior', () => {
  test('correctly merges multiple sorted temp files', async () => {
    // Use maxHeap=5 to force creation of multiple temp files
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

    await externalSort(input, output, tempDir.name, 5)
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)
    const expected = lines.toSorted()

    expect(result).toEqual(expected)
  })

  test('maintains sort stability with equal elements across files', async () => {
    // Create data that will be split across multiple files with duplicates
    const lines = [
      'b',
      'a',
      'c',
      'a',
      'b',
      'c',
      'a',
      'b',
      'c',
    ]

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-stability' })

    await externalSort(input, output, tempDir.name, 3)
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c'])
  })

  test('handles single temp file (no merge needed)', async () => {
    const lines = ['c', 'b', 'a']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-single' })

    await externalSort(input, output, tempDir.name, 100)
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'b', 'c'])
  })

  test('handles exactly maxHeap items', async () => {
    const lines = ['e', 'd', 'c', 'b', 'a']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-exact' })

    await externalSort(input, output, tempDir.name, 5)
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  test('cleans up temp files after completion', async () => {
    const lines = ['b', 'a', 'c', 'd', 'e', 'f']

    const input = Readable.from(lines.map(l => l + '\n'))
    const output = new StringWritable()
    const tempDir = tmp.dirSync({ prefix: 'test-cleanup' })

    await externalSort(input, output, tempDir.name, 2)

    // Check temp dir is empty (files should be cleaned up)
    const { readdirSync } = await import('fs')
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

    await externalSort(input, output, tempDir.name, 2)
    tempDir.removeCallback()

    const result = output.data.split('\n').filter(l => l.length > 0)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('a')
    expect(result[1]).toBe(longLine)
    expect(result[2]).toBe('z')
  })
})
