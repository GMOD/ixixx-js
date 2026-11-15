function stripCarriageReturns(lines: string[]) {
  for (const [i, line] of lines.entries()) {
    if (line.endsWith('\r')) {
      lines[i] = line.slice(0, -1)
    }
  }
  return lines
}

// yields the lines each chunk completes as one array, so consumers pay one
// await per chunk rather than per line. a chunk with no newline is only
// appended to the pending line, which keeps a line spanning many chunks from
// being re-flattened on every one of them
export async function* lineBatches(source: AsyncIterable<Buffer | string>) {
  const decoder = new TextDecoder()
  let pending = ''
  for await (const chunk of source) {
    const text =
      typeof chunk === 'string'
        ? chunk
        : decoder.decode(chunk, { stream: true })
    if (text.includes('\n')) {
      const lines = (pending + text).split('\n')
      pending = lines.pop()!
      yield stripCarriageReturns(lines)
    } else {
      pending += text
    }
  }
  const last = pending + decoder.decode()
  if (last !== '') {
    yield stripCarriageReturns([last])
  }
}
