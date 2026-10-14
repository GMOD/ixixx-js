import fs from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { ixWords } from './ixWords.ts'
import { optimizePrefixSize } from './optimizePrefixSize.ts'
import { binSize, getPrefix, samePrefix } from './util.ts'

const ADDRESS_SIZE = 10

// samePrefix decides each prefix change, the same rule optimizePrefixSize
// scored the file with, so this writes the bins it measured. both words stay
// undefined until the first line, to tell an empty first field from no line
async function* ixxLines(inIx: string, prefixSize: number) {
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
      (writtenWord === undefined || !samePrefix(word, writtenWord, prefixSize))
    ) {
      const address = startPrefixPos
        .toString(16)
        .toUpperCase()
        .padStart(ADDRESS_SIZE, '0')
      yield `${getPrefix(word, prefixSize)}${address}\n`
      writtenPos = offset
      writtenWord = word
    }
    lastWord = word
  }
}

export async function makeIxx(
  inIx: string,
  outIxx: string,
  prefixSizeParam?: number,
) {
  const prefixSize = prefixSizeParam ?? (await optimizePrefixSize(inIx))
  await pipeline(
    Readable.from(ixxLines(inIx, prefixSize)),
    fs.createWriteStream(outIxx),
  )
}
