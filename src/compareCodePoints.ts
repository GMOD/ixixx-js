// code points above the basic multilingual plane take two utf-16 code units
const MAX_BMP = 65_535

// utf-8 byte order, which is the order the ix is sorted in: ixixx sorts with
// `sort -k1,1` under LC_ALL=C, as does the original C ixIxx. it equals code
// point order, which javascript's `<` on strings does not follow: `<` compares
// utf-16 code units, so astral characters (encoded as surrogates in
// 0xD800-0xDFFF) compare below 0xE000-0xFFFF instead of above them
export function compareCodePoints(a: string, b: string) {
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i)!
    const cb = b.codePointAt(j)!
    if (ca !== cb) {
      return ca < cb ? -1 : 1
    }
    i += ca > MAX_BMP ? 2 : 1
    j += cb > MAX_BMP ? 2 : 1
  }
  // the loop ends when at least one string runs out, so whichever still has
  // characters left is the larger one
  return (i < a.length ? 1 : 0) - (j < b.length ? 1 : 0)
}
