import fs from 'node:fs'
import { Readable } from 'node:stream'

import tmp from 'tmp'
import { describe, expect, test, vi } from 'vitest'

import { StringWritable } from './StringWritable.ts'
import { externalSort, maxFanIn } from '../src/externalSort.ts'

// counts how many temp runs the merge has open at once. a merge keeps every
// run it is reading open for its whole duration, so this is what the process
// fd limit is spent on
function trackOpenReaders() {
  const createReadStream = fs.createReadStream.bind(fs)
  let open = 0
  let peak = 0
  const spy = vi.spyOn(fs, 'createReadStream').mockImplementation((f, o) => {
    const stream = createReadStream(f, o)
    open++
    peak = Math.max(peak, open)
    stream.once('close', () => {
      open--
    })
    return stream
  })
  return {
    peak: () => peak,
    restore: () => {
      spy.mockRestore()
    },
  }
}

// maxHeap of 1 makes one run per line, so `lines` runs without needing a big
// enough input to reach the default 10k-line runs
async function sortOneLinePerRun(lines: string[]) {
  const readers = trackOpenReaders()
  const output = new StringWritable()
  const dir = tmp.dirSync({ prefix: 'fan-in' })
  try {
    await externalSort(
      Readable.from(lines.map(l => `${l}\n`)),
      output,
      dir.name,
      1,
    )
  } finally {
    readers.restore()
  }
  const remaining = fs.readdirSync(dir.name)
  dir.removeCallback()
  return {
    sorted: output.data.split('\n').filter(l => l.length > 0),
    peakReaders: readers.peak(),
    remaining,
  }
}

describe('merge fan-in', () => {
  test('caps concurrent run handles when there are more runs than the fan-in', async () => {
    const lines = Array.from({ length: maxFanIn * 3 + 5 }, (_, i) =>
      String(i).padStart(4, '0'),
    )
    const { sorted, peakReaders, remaining } = await sortOneLinePerRun(
      lines.toReversed(),
    )

    expect(sorted).toEqual(lines)
    expect(peakReaders).toBeLessThanOrEqual(maxFanIn)
    // the folded-away runs are unlinked as they are consumed, not just at the end
    expect(remaining).toEqual([])
  })

  test('folds repeatedly when one pass is not enough', async () => {
    // more runs than a single fold can reduce to maxFanIn, so it has to loop
    const lines = Array.from({ length: maxFanIn * maxFanIn + 1 }, (_, i) =>
      String(i).padStart(5, '0'),
    )
    const { sorted, peakReaders } = await sortOneLinePerRun(lines.toReversed())

    expect(sorted).toEqual(lines)
    expect(peakReaders).toBeLessThanOrEqual(maxFanIn)
  })

  test('leaves a merge that fits within the fan-in untouched', async () => {
    const lines = Array.from({ length: maxFanIn }, (_, i) =>
      String(i).padStart(3, '0'),
    )
    const { sorted, peakReaders } = await sortOneLinePerRun(lines.toReversed())

    expect(sorted).toEqual(lines)
    // exactly one open handle per run, so no intermediate fold happened
    expect(peakReaders).toBe(maxFanIn)
  })
})
