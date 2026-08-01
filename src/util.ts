export const binSize = 64 * 1024 //64kb

// lines are accumulated into chunks of about this size before being handed to
// the next stream, one push per line is dominated by stream overhead
export const chunkSize = 64 * 1024

export function getPrefix(word: string, prefixSize: number) {
  return word.slice(0, prefixSize).padEnd(prefixSize, ' ')
}

export function commonPrefixLength(a: string, b: string) {
  const len = Math.min(a.length, b.length)
  let i = 0
  // utf-16 code units, since that is what slice() in getPrefix compares
  while (i < len && a.charCodeAt(i) === b.charCodeAt(i)) {
    i++
  }
  return i
}

// answers getPrefix(a, n) === getPrefix(b, n) without building either prefix.
// equivalent because words never contain spaces, so getPrefix's padding can
// only ever line up against more padding. optimizePrefixSize relies on this to
// avoid allocating a prefix per size per line, which is also what keeps the
// bins it counts identical to the ones makeIxx goes on to write
export function samePrefix(a: string, b: string, prefixSize: number) {
  return a === b || commonPrefixLength(a, b) >= prefixSize
}
