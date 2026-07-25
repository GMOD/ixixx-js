import fs from 'node:fs'

// prettier lowercases hex literals while unicorn wants them uppercased, so
// these are decimal to keep both happy
const NEWLINE = 10
const CARRIAGE_RETURN = 13
const SPACE = 32

function firstField(buf: Buffer, start: number, end: number) {
  const stop = end > start && buf[end - 1] === CARRIAGE_RETURN ? end - 1 : end
  // a space past the line end means this line has none, checking after the
  // search beats bounding it with a subarray on lines that do have a space
  const space = buf.indexOf(SPACE, start)
  const wordEnd = space === -1 || space > stop ? stop : space
  return buf.toString('utf8', start, wordEnd)
}

// yields the first field of each line along with the line's byte offset. byte
// offsets, not character counts, because the ixx addresses are used for
// byte-range requests against the ix
export async function* ixWords(filename: string) {
  const stream: AsyncIterable<Buffer> = fs.createReadStream(filename)
  let offset = 0
  let rest: Buffer = Buffer.alloc(0)

  for await (const chunk of stream) {
    const buf = rest.length === 0 ? chunk : Buffer.concat([rest, chunk])
    let start = 0
    let nl = buf.indexOf(NEWLINE)
    while (nl !== -1) {
      yield { word: firstField(buf, start, nl), offset }
      offset += nl - start + 1
      start = nl + 1
      nl = buf.indexOf(NEWLINE, start)
    }
    rest = buf.subarray(start)
  }

  if (rest.length > 0) {
    yield { word: firstField(rest, 0, rest.length), offset }
  }
}
