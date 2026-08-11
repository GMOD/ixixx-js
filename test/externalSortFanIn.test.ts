import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

import tmp from 'tmp'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { StringWritable } from './StringWritable.ts'
import { externalSort, maxFanIn } from '../src/externalSort.ts'

// a test that times out never reaches its own restore, and the next spyOn then
// binds the leaked spy as its original and calls itself forever. one slow test
// turning into a stack overflow in the next one is a bad way to find that out
afterEach(() => {
  vi.restoreAllMocks()
})

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

// counts the folded runs written, which is how many times reduceRuns went round
// its loop. es_g is the name it gives them; es_ alone is an initial run
function trackFolds() {
  const createWriteStream = fs.createWriteStream.bind(fs)
  let folds = 0
  const spy = vi.spyOn(fs, 'createWriteStream').mockImplementation((f, o) => {
    if (typeof f === 'string' && path.basename(f).startsWith('es_g')) {
      folds++
    }
    return createWriteStream(f, o)
  })
  return {
    folds: () => folds,
    restore: () => {
      spy.mockRestore()
    },
  }
}

// maxHeap of 1 makes one run per line, so `lines` runs without needing a big
// enough input to reach the default 10k-line runs
async function sortOneLinePerRun(lines: string[]) {
  const readers = trackOpenReaders()
  const writers = trackFolds()
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
    writers.restore()
  }
  const remaining = fs.readdirSync(dir.name)
  dir.removeCallback()
  return {
    sorted: output.data.split('\n').filter(l => l.length > 0),
    peakReaders: readers.peak(),
    folds: writers.folds(),
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
    // a fold replaces maxFanIn runs with one, so it nets maxFanIn - 1 fewer.
    // this is the smallest input that cannot get down to maxFanIn in one, which
    // is all the loop needs to be exercised — the maxFanIn squared it used to
    // use took 65 folds and roughly the whole 5s test budget, so the suite
    // failed here whenever the machine was busy
    const lines = Array.from({ length: maxFanIn * 2 + 5 }, (_, i) =>
      String(i).padStart(5, '0'),
    )
    const { sorted, peakReaders, folds } = await sortOneLinePerRun(
      lines.toReversed(),
    )

    expect(sorted).toEqual(lines)
    expect(peakReaders).toBeLessThanOrEqual(maxFanIn)
    expect(folds).toBe(2)
  })

  test('leaves a merge that fits within the fan-in untouched', async () => {
    const lines = Array.from({ length: maxFanIn }, (_, i) =>
      String(i).padStart(3, '0'),
    )
    const { sorted, peakReaders, folds } = await sortOneLinePerRun(
      lines.toReversed(),
    )
    expect(folds).toBe(0)

    expect(sorted).toEqual(lines)
    // exactly one open handle per run, so no intermediate fold happened
    expect(peakReaders).toBe(maxFanIn)
  })
})
