import fs from 'node:fs'

import { ixWords } from './ixWords.ts'
import { binSize } from './util.ts'

interface PrefixStats {
  writtenWord: string
  writtenPos: number
  startPrefixPos: number
  lastBin: number
  binSizeTotal: number
  binCount: number
  maxBinSize: number
}

function createStats(): PrefixStats {
  return {
    writtenWord: '',
    writtenPos: -binSize,
    startPrefixPos: 0,
    lastBin: 0,
    binSizeTotal: 0,
    binCount: 0,
    maxBinSize: 0,
  }
}

function commonPrefixLength(a: string, b: string) {
  const len = Math.min(a.length, b.length)
  let i = 0
  // utf-16 code units, since that is what slice() in getPrefix compares
  // eslint-disable-next-line unicorn/prefer-code-point
  while (i < len && a.charCodeAt(i) === b.charCodeAt(i)) {
    i++
  }
  return i
}

function samePrefix(a: string, b: string, prefixSize: number) {
  return a === b || commonPrefixLength(a, b) >= prefixSize
}

function meetsHeuristics(s: PrefixStats, totalBytes: number) {
  // no bins written but file is bigger than a bin: prefix too coarse
  if (s.binCount === 0 && totalBytes > binSize) {
    return false
  }
  if (s.binCount > 0) {
    const avgBinSize = s.binSizeTotal / s.binCount
    if (avgBinSize > 3 * binSize || s.maxBinSize > 10 * binSize) {
      return false
    }
  }
  return true
}

const MIN_PREFIX = 5
const MAX_PREFIX = 40

export async function optimizePrefixSize(inIx: string) {
  // track stats for all prefix sizes in a single pass
  const stats = Array.from({ length: MAX_PREFIX - MIN_PREFIX + 1 }, createStats)

  let lastWord = ''
  for await (const { word, offset } of ixWords(inIx)) {
    // prefixes are compared via shared-prefix length rather than by building a
    // padded prefix per size, which would allocate 36 strings per line. words
    // never contain spaces, so getPrefix(a, n) === getPrefix(b, n) exactly when
    // a === b or the words agree on their first n characters
    const lastShared = commonPrefixLength(word, lastWord)
    const sameAsLast = word === lastWord

    for (const [i, s] of stats.entries()) {
      const prefixSize = MIN_PREFIX + i

      if (!sameAsLast && prefixSize > lastShared) {
        s.startPrefixPos = offset
      }

      // the shared-prefix check is behind the cheap byte-distance check because
      // it only becomes relevant once per bin
      if (
        offset - s.writtenPos >= binSize &&
        (s.binCount === 0 || !samePrefix(word, s.writtenWord, prefixSize))
      ) {
        const currentBinSize = s.startPrefixPos - s.lastBin
        s.binSizeTotal += currentBinSize
        s.maxBinSize = Math.max(currentBinSize, s.maxBinSize)
        s.binCount++
        s.lastBin = s.startPrefixPos
        s.writtenPos = offset
        s.writtenWord = word
      }
    }
    lastWord = word
  }

  const { size } = await fs.promises.stat(inIx)
  const found = stats.findIndex(s => meetsHeuristics(s, size))
  return found === -1 ? MAX_PREFIX : MIN_PREFIX + found
}
