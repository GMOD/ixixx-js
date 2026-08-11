// code points above the basic multilingual plane take two utf-16 code units
const MAX_BMP = 65_535

const SPACE = 32

// orders ix lines the way the external backend does: `sort -k1,1` under
// LC_ALL=C, as in the original C ixIxx. two things about that.
//
// utf-8 byte order equals code point order, which javascript's `<` on strings
// does not follow: `<` compares utf-16 code units, so astral characters
// (encoded as surrogates in 0xD800-0xDFFF) compare below 0xE000-0xFFFF instead
// of above them.
//
// and `-k1,1` sorts on the first field before falling back to the whole line,
// which is not the same relation as plain byte order over the whole line. Where
// one term is a proper prefix of another, byte order weighs the space ending the
// shorter term against the longer term's next character, and gets the pair
// backwards whenever that character sorts below a space — `ab` after `ab\x01x`,
// where sort puts it first. A term holds no spaces, so ranking the separator
// below every character reproduces the two-level comparison exactly: it can only
// ever meet the continuation of a longer term, or the matching separator of an
// equal one
export function compareIxLines(a: string, b: string) {
  // one cursor serves both strings: the loop only advances past code points that
  // were equal, and equal code points occupy the same number of utf-16 units
  let i = 0
  while (i < a.length && i < b.length) {
    const ca = a.codePointAt(i)!
    const cb = b.codePointAt(i)!
    if (ca !== cb) {
      return (ca === SPACE ? -1 : ca) < (cb === SPACE ? -1 : cb) ? -1 : 1
    }
    i += ca > MAX_BMP ? 2 : 1
  }
  // the loop ends when at least one string runs out, so whichever still has
  // characters left is the larger one
  return i < a.length ? 1 : i < b.length ? -1 : 0
}
