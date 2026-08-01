import fs from 'node:fs'
import { Readable, Writable } from 'node:stream'

import tmp from 'tmp'
import { describe, expect, test, vi } from 'vitest'

import { StringWritable } from './StringWritable.ts'
import { externalSort } from '../src/externalSort.ts'

async function run(input: Readable, maxHeap = 10_000) {
  const output = new StringWritable()
  const dir = tmp.dirSync({ prefix: 'streaming-test' })
  await externalSort(input, output, dir.name, maxHeap)
  dir.removeCallback()
  return output.data.split('\n').filter(l => l.length > 0)
}

describe('externalSort streaming edge cases', () => {
  test('input with no trailing newline still flushes last line', async () => {
    const input = Readable.from(['banana\napple\ncherry'])
    expect(await run(input)).toEqual(['apple', 'banana', 'cherry'])
  })

  test('input arriving in many tiny chunks (mid-line splits)', async () => {
    const lines = ['zebra', 'apple', 'mango', 'banana']
    const text = lines.join('\n') + '\n'
    const input = Readable.from(
      (function* () {
        for (const ch of text) {
          yield ch
        }
      })(),
    )
    expect(await run(input)).toEqual(lines.toSorted())
  })

  test('lines much larger than typical buffer (10KB)', async () => {
    const big = 'x'.repeat(10_000)
    const input = Readable.from([`${big}\nabc\n${big}\n`])
    const result = await run(input, 2)
    expect(result).toEqual(['abc', big, big])
  })

  test('k-way merge across many temp files', async () => {
    const lines = Array.from({ length: 250 }, (_, i) =>
      String(250 - i).padStart(4, '0'),
    )
    const input = Readable.from(lines.map(l => `${l}\n`))
    const expected = lines.toSorted()
    expect(await run(input, 7)).toEqual(expected)
  })

  test('cleans up temp files even on output error', async () => {
    const dir = tmp.dirSync({ prefix: 'cleanup-err' })
    const input = Readable.from(['a\nb\nc\nd\n'])
    const failing = new Writable({
      write(_chunk, _enc, cb) {
        cb(new Error('boom'))
      },
    })
    await expect(externalSort(input, failing, dir.name, 2)).rejects.toThrow(
      'boom',
    )
    expect(fs.readdirSync(dir.name)).toHaveLength(0)
    dir.removeCallback()
  })

  test('empty lines in input are preserved', async () => {
    const input = Readable.from(['b\n\na\n'])
    expect(await run(input)).toEqual(['a', 'b'])
  })

  test('rejects and cleans up when the input stream errors', async () => {
    const dir = tmp.dirSync({ prefix: 'input-err' })
    const input = new Readable({
      read() {
        this.push('a\nb\n')
        this.destroy(new Error('input boom'))
      },
    })
    const output = new StringWritable()
    // whatever reads the output has to learn the sort died, otherwise it waits
    // forever for an end that mergeSortedFiles never gets to write
    const outputError = new Promise<Error>(resolve => {
      output.once('error', resolve)
    })
    await expect(externalSort(input, output, dir.name, 2)).rejects.toThrow(
      'input boom',
    )
    expect((await outputError).message).toBe('input boom')
    expect(output.destroyed).toBe(true)
    expect(fs.readdirSync(dir.name)).toHaveLength(0)
    dir.removeCallback()
  })

  test('closes the temp file readers when the merge is abandoned', async () => {
    const dir = tmp.dirSync({ prefix: 'merge-abort' })
    const readers: fs.ReadStream[] = []
    const createReadStream = fs.createReadStream.bind(fs)
    const spy = vi
      .spyOn(fs, 'createReadStream')
      .mockImplementation((file, options) => {
        const stream = createReadStream(file, options)
        readers.push(stream)
        return stream
      })

    // each temp run has to exceed the 64KB read buffer, otherwise a reader
    // drains its file in one read and closes before the merge is torn down
    const input = Readable.from(
      Array.from(
        { length: 2000 },
        (_, i) => `${String(2000 - i).padStart(4, '0')}${'x'.repeat(500)}\n`,
      ),
    )
    const failing = new Writable({
      write(_chunk, _enc, cb) {
        cb(new Error('boom'))
      },
    })
    await expect(externalSort(input, failing, dir.name, 250)).rejects.toThrow(
      'boom',
    )
    spy.mockRestore()

    expect(readers.length).toBeGreaterThan(1)
    expect(readers.filter(r => !r.destroyed)).toEqual([])
    dir.removeCallback()
  })
})
