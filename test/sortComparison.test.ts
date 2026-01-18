import { spawn } from 'child_process'
import { Readable, Writable } from 'stream'

import { sync as commandExistsSync } from 'command-exists'
import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { externalSort } from '../src/externalSort.ts'

const hasGnuSort = commandExistsSync('sort')

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

async function sortWithInternal(lines: string[]): Promise<string[]> {
  const input = Readable.from(lines.map(l => l + '\n'))
  const output = new StringWritable()
  const tempDir = tmp.dirSync({ prefix: 'test-internal' })

  await externalSort(input, output, tempDir.name, 100)
  tempDir.removeCallback()

  return output.data.split('\n').filter(l => l.length > 0)
}

async function sortWithGnu(lines: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const sort = spawn('sort', [], {
      env: { ...process.env, LC_ALL: 'C' },
    })

    let output = ''
    sort.stdout.on('data', chunk => {
      output += chunk.toString()
    })

    sort.on('error', reject)
    sort.on('close', code => {
      if (code !== 0) {
        reject(new Error(`sort exited with code ${code}`))
      } else {
        resolve(output.split('\n').filter(l => l.length > 0))
      }
    })

    for (const line of lines) {
      sort.stdin.write(line + '\n')
    }
    sort.stdin.end()
  })
}

describe.skipIf(!hasGnuSort)('internal sort vs GNU sort', () => {
  test('simple alphabetic sort', async () => {
    const lines = ['cherry', 'apple', 'banana', 'date', 'elderberry']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('numeric strings', async () => {
    const lines = ['10', '2', '1', '20', '3', '100']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('mixed case', async () => {
    const lines = ['Apple', 'apple', 'APPLE', 'banana', 'Banana', 'BANANA']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('lines with spaces', async () => {
    const lines = [
      'zebra crossing',
      'apple pie',
      'banana split',
      'apple tart',
      'zebra stripe',
    ]

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('special characters', async () => {
    const lines = ['@special', '#hashtag', '$dollar', '!exclaim', 'normal']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('duplicates', async () => {
    const lines = ['a', 'b', 'a', 'c', 'b', 'a', 'd', 'c', 'b', 'a']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('already sorted', async () => {
    const lines = ['a', 'b', 'c', 'd', 'e']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('reverse sorted', async () => {
    const lines = ['e', 'd', 'c', 'b', 'a']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('larger dataset with multiple temp files', async () => {
    // Generate 500 random-ish lines to force multiple temp files (maxHeap=100)
    const lines: string[] = []
    for (let i = 0; i < 500; i++) {
      // Use a deterministic but scrambled order
      const val = ((i * 7) % 500).toString().padStart(4, '0')
      lines.push(`line_${val}_data`)
    }

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
    expect(internal).toHaveLength(500)
  })

  test('unicode characters', async () => {
    const lines = ['éclair', 'apple', 'über', 'banana', 'café', 'naïve']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('empty lines filtered', async () => {
    const lines = ['b', 'a', 'c']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
    expect(internal).not.toContain('')
  })

  test('single line', async () => {
    const lines = ['only']

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })

  test('trix-like data format', async () => {
    // Simulate the kind of data that flows through the trix pipeline
    const lines = [
      'zebra gene123',
      'apple gene456',
      'apple gene789',
      'banana gene111',
      'cherry gene222',
      'apple gene333',
    ]

    const internal = await sortWithInternal(lines)
    const gnu = await sortWithGnu(lines)

    expect(internal).toEqual(gnu)
  })
})
