export const binSize = 64 * 1024 //64kb

export function getPrefix(word: string, prefixSize: number) {
  return word.slice(0, prefixSize).padEnd(prefixSize, ' ')
}
