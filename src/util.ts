export const binSize = 64 * 1024 //64kb

// lines are accumulated into chunks of about this size before being handed to
// the next stream, one push per line is dominated by stream overhead
export const chunkSize = 64 * 1024

export function getPrefix(word: string, prefixSize: number) {
  return word.slice(0, prefixSize).padEnd(prefixSize, ' ')
}
