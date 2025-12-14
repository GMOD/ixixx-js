import { finished } from 'stream/promises'
import { once } from 'events'
import fs from 'fs'
import readline from 'readline'

import { binSize, getPrefix } from './util'
import { optimizePrefixSize } from './optimizePrefixSize'

const ADDRESS_SIZE = 10

export async function makeIxx(
  inIx: string,
  outIxx: string,
  prefixSizeParam?: number,
) {
  const out = fs.createWriteStream(outIxx)
  const prefixSize = prefixSizeParam ?? (await optimizePrefixSize(inIx))

  try {
    const fileStream = fs.createReadStream(inIx)
    const rl = readline.createInterface({
      input: fileStream,
    })

    let lastPrefix
    let writtenPrefix
    let writtenPos = -binSize
    let startPrefixPos = 0
    let bytes = 0

    for await (const line of rl) {
      const spaceIdx = line.indexOf(' ')
      const word = spaceIdx === -1 ? line : line.slice(0, spaceIdx)
      const curPrefix = getPrefix(word, prefixSize)
      if (curPrefix !== lastPrefix) {
        startPrefixPos = bytes
      }

      if (bytes - writtenPos >= binSize && curPrefix !== writtenPrefix) {
        const res = out.write(
          `${curPrefix}${startPrefixPos
            .toString(16)
            .toUpperCase()
            .padStart(ADDRESS_SIZE, '0')}\n`,
        )

        // Handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!res) {
          await once(out, 'drain')
        }
        writtenPos = bytes
        writtenPrefix = curPrefix
      }
      lastPrefix = curPrefix
      bytes += line.length + 1
    }
  } finally {
    out.end()
    await finished(out)
  }
}
