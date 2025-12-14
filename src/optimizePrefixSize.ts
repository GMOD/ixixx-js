import fs from 'fs'
import readline from 'readline'
import { binSize, getPrefix } from './util'

interface PrefixStats {
  lastPrefix: string
  writtenPrefix: string
  writtenPos: number
  startPrefixPos: number
  lastBin: number
  binSizeTotal: number
  binCount: number
  maxBinSize: number
}

function createStats(): PrefixStats {
  return {
    lastPrefix: '',
    writtenPrefix: '',
    writtenPos: -binSize,
    startPrefixPos: 0,
    lastBin: 0,
    binSizeTotal: 0,
    binCount: 0,
    maxBinSize: 0,
  }
}

function meetsHeuristics(s: PrefixStats, totalBytes: number) {
  const avgBinSize = s.binSizeTotal / s.binCount
  // some heuristics. note: binSizeTotal===0 means everything was lumped into
  // one bin
  if (
    (s.binSizeTotal === 0 && totalBytes > binSize) ||
    avgBinSize > 3 * binSize ||
    s.maxBinSize > 10 * binSize
  ) {
    return false
  }
  return true
}

const MIN_PREFIX = 5
const MAX_PREFIX = 40

export async function optimizePrefixSize(inIx: string) {
  const fileStream = fs.createReadStream(inIx)
  const rl = readline.createInterface({
    input: fileStream,
  })

  // Track stats for all prefix sizes in a single pass
  const stats: PrefixStats[] = []
  for (let i = 0; i < MAX_PREFIX - MIN_PREFIX; i++) {
    stats.push(createStats())
  }

  let bytes = 0
  for await (const line of rl) {
    // Use indexOf instead of regex split for performance
    const spaceIdx = line.indexOf(' ')
    const word = spaceIdx === -1 ? line : line.slice(0, spaceIdx)

    for (let i = 0; i < stats.length; i++) {
      const prefixSize = MIN_PREFIX + i
      const s = stats[i]!
      const curPrefix = getPrefix(word, prefixSize)

      if (curPrefix !== s.lastPrefix) {
        s.startPrefixPos = bytes
      }

      if (bytes - s.writtenPos >= binSize && curPrefix !== s.writtenPrefix) {
        const currentBinSize = s.startPrefixPos - s.lastBin
        s.binSizeTotal += currentBinSize
        s.maxBinSize = Math.max(currentBinSize, s.maxBinSize)
        s.binCount++
        s.lastBin = s.startPrefixPos
        s.writtenPos = bytes
        s.writtenPrefix = curPrefix
      }
      s.lastPrefix = curPrefix
    }
    bytes += line.length + 1
  }

  // Find first prefix size that meets heuristics
  for (let i = 0; i < stats.length; i++) {
    if (meetsHeuristics(stats[i]!, bytes)) {
      return MIN_PREFIX + i
    }
  }
  return MAX_PREFIX
}
