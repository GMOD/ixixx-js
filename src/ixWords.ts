import fs from 'node:fs'

// prettier lowercases hex literals while unicorn wants them uppercased, so
// these are decimal to keep both happy
const NEWLINE = 10
const CARRIAGE_RETURN = 13
const SPACE = 32

const EMPTY = Buffer.alloc(0)

function decodeField(field: Buffer) {
  const end =
    field.length > 0 && field[field.length - 1] === CARRIAGE_RETURN
      ? field.length - 1
      : field.length
  return field.toString('utf8', 0, end)
}

// yields the first field of each line along with the line's byte offset. byte
// offsets, not character counts, because the ixx addresses are used for
// byte-range requests against the ix
export async function* ixWords(filename: string) {
  const stream: AsyncIterable<Buffer> = fs.createReadStream(filename)
  // byte offset of the line being scanned, and of the current chunk
  let lineStart = 0
  let base = 0
  // that line's first field, as far as it has been seen. only the field is
  // carried across chunks, never the rest of the line: a term shared by many
  // records makes an ix line megabytes long, and holding those whole recopied
  // the line-so-far on every chunk, so a handful of them cost more than the
  // whole rest of the file
  let field: Buffer = EMPTY
  // false once the line's first space has gone by, after which its remaining
  // bytes are only counted
  let collecting = true
  // whether the line being scanned has any bytes yet, so a file ending in a
  // newline does not yield a phantom empty line and one that doesn't still
  // yields its last
  let pending = false

  for await (const chunk of stream) {
    let pos = 0
    while (pos < chunk.length) {
      const nl = chunk.indexOf(NEWLINE, pos)
      const lineEnd = nl === -1 ? chunk.length : nl
      if (collecting) {
        // a space past the line end means this line has none, checking after
        // the search beats bounding it with a subarray on lines that do have one
        const space = chunk.indexOf(SPACE, pos)
        const fieldEnd = space === -1 || space > lineEnd ? lineEnd : space
        const part = chunk.subarray(pos, fieldEnd)
        field = field.length === 0 ? part : Buffer.concat([field, part])
        collecting = fieldEnd === lineEnd
      }
      if (nl === -1) {
        pending = true
        break
      }
      yield { word: decodeField(field), offset: lineStart }
      lineStart = base + nl + 1
      field = EMPTY
      collecting = true
      pending = false
      pos = nl + 1
    }
    // `field` may be a view into a chunk the stream is free to reuse
    field = Buffer.from(field)
    base += chunk.length
  }

  if (pending) {
    yield { word: decodeField(field), offset: lineStart }
  }
}
