import fs from 'node:fs'

import { ixWords } from './ixWords.ts'
import { binSize, commonPrefixLength, samePrefix } from './util.ts'

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

function meetsHeuristics(s: PrefixStats, totalBytes: number) {
  // the stretch from the last bin to the end of the file is what a search
  // landing in it has to scan, so it counts as a bin even though no ixx entry
  // marks its end. leaving it out scores a prefix that writes one bin and then
  // never changes again as perfect, and every word sharing the first five
  // characters (ENSG00000139618 and friends) is exactly that case: it wins with
  // a single ixx entry at offset 0, so every search rescans the whole ix
  const tail = totalBytes - s.lastBin
  const avgBinSize = (s.binSizeTotal + tail) / (s.binCount + 1)
  return (
    avgBinSize <= 3 * binSize && Math.max(s.maxBinSize, tail) <= 10 * binSize
  )
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
