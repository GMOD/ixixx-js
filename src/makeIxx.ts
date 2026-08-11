import { once } from 'node:events'
import fs from 'node:fs'
import { finished } from 'node:stream/promises'

import { ixWords } from './ixWords.ts'
import { optimizePrefixSize } from './optimizePrefixSize.ts'
import { binSize, getPrefix, samePrefix } from './util.ts'

const ADDRESS_SIZE = 10

export async function makeIxx(
  inIx: string,
  outIxx: string,
  prefixSizeParam?: number,
) {
  const prefixSize = prefixSizeParam ?? (await optimizePrefixSize(inIx))
  const out = fs.createWriteStream(outIxx)

  try {
    // where a prefix change is decided by samePrefix rather than by comparing
    // two padded prefixes: it is the same rule optimizePrefixSize scored the
    // file with, so the bins it measured are the bins written here, and it does
    // not allocate a prefix for every line of the ix. getPrefix is left to
    // format the one prefix an entry actually writes. both are undefined until
    // the first word, which is the only way a genuinely empty first field is
    // told apart from "nothing seen yet"
    let lastWord: string | undefined
    let writtenWord: string | undefined
    let writtenPos = -binSize
    let startPrefixPos = 0

    for await (const { word, offset } of ixWords(inIx)) {
      if (lastWord === undefined || !samePrefix(word, lastWord, prefixSize)) {
        startPrefixPos = offset
      }

      if (
        offset - writtenPos >= binSize &&
        (writtenWord === undefined ||
          !samePrefix(word, writtenWord, prefixSize))
      ) {
        const address = startPrefixPos
          .toString(16)
          .toUpperCase()
          .padStart(ADDRESS_SIZE, '0')

        // handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!out.write(`${getPrefix(word, prefixSize)}${address}\n`)) {
          await once(out, 'drain')
        }
        writtenPos = offset
        writtenWord = word
      }
      lastWord = word
    }
  } finally {
    out.end()
    await finished(out)
  }
}
