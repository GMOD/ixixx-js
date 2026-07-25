import { once } from 'node:events'
import fs from 'node:fs'
import { finished } from 'node:stream/promises'

import { ixWords } from './ixWords.ts'
import { optimizePrefixSize } from './optimizePrefixSize.ts'
import { binSize, getPrefix } from './util.ts'

const ADDRESS_SIZE = 10

export async function makeIxx(
  inIx: string,
  outIxx: string,
  prefixSizeParam?: number,
) {
  const prefixSize = prefixSizeParam ?? (await optimizePrefixSize(inIx))
  const out = fs.createWriteStream(outIxx)

  try {
    let lastPrefix = ''
    let writtenPrefix = ''
    let writtenPos = -binSize
    let startPrefixPos = 0

    for await (const { word, offset } of ixWords(inIx)) {
      const curPrefix = getPrefix(word, prefixSize)
      if (curPrefix !== lastPrefix) {
        startPrefixPos = offset
      }

      if (offset - writtenPos >= binSize && curPrefix !== writtenPrefix) {
        const address = startPrefixPos
          .toString(16)
          .toUpperCase()
          .padStart(ADDRESS_SIZE, '0')

        // handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!out.write(`${curPrefix}${address}\n`)) {
          await once(out, 'drain')
        }
        writtenPos = offset
        writtenPrefix = curPrefix
      }
      lastPrefix = curPrefix
    }
  } finally {
    out.end()
    await finished(out)
  }
}
