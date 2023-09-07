import fs from 'fs'
import readline from 'readline'
import { binSize, getPrefix } from './util'

export async function optimizePrefixSize(inIx: string) {
  let binSizeTotal = 0
  let binCount = 0
  let prefixSize = 5
  for (; prefixSize < 40; prefixSize++) {
    const fileStream = fs.createReadStream(inIx)
    const rl = readline.createInterface({
      input: fileStream,
    })

    let lastPrefix
    let writtenPrefix
    let writtenPos = -binSize
    let startPrefixPos = 0
    let bytes = 0

    let lastBin = 0
    let maxBinSize = 0

    for await (const line of rl) {
      const [word] = line.split(/\s/)
      const curPrefix = getPrefix(word, prefixSize)
      if (curPrefix !== lastPrefix) {
        startPrefixPos = bytes
      }

      if (bytes - writtenPos >= binSize && curPrefix !== writtenPrefix) {
        const binSize = startPrefixPos - lastBin
        binSizeTotal += binSize
        maxBinSize = Math.max(binSize, maxBinSize)
        binCount++
        lastBin = startPrefixPos

        writtenPos = bytes
        writtenPrefix = curPrefix
      }
      lastPrefix = curPrefix
      bytes += line.length + 1
    }
    const avgBinSize = binSizeTotal / binCount
    // some heuristics. note: binSizeTotal===0 means everything was lumped into
    // one bin
    if (
      (binSizeTotal === 0 && bytes > binSize) ||
      avgBinSize > 3 * binSize ||
      maxBinSize > 10 * binSize
    ) {
      continue
    } else {
      break
    }
  }
  return prefixSize
}
