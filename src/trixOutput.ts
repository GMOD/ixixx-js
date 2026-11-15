import { lineBatches } from './lineBatches.ts'

function ixLine(term: string, records: string[]) {
  return `${term}${records.map((r, i) => ` ${r},${i + 1}`).join('')}\n`
}

// folds sorted `term id` lines into one ix line per term
export async function* trixOutput(source: AsyncIterable<Buffer | string>) {
  let term = ''
  let records: string[] = []
  for await (const lines of lineBatches(source)) {
    let batch = ''
    for (const raw of lines) {
      // weird: need to strip nulls from string, xref
      // https://github.com/GMOD/jbrowse-components/pull/2451
      const line = raw.replaceAll('\0', '')
      const spaceIdx = line.indexOf(' ')
      const word = spaceIdx === -1 ? line : line.slice(0, spaceIdx)
      const record = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1)

      if (term !== word) {
        if (records.length > 0) {
          batch += ixLine(term, records)
          records = []
        }
        term = word
      }
      // a term repeated within one input record produces identical lines,
      // which the sort puts next to each other. emitting both would hand the
      // reader the same record twice, and it counts each one against its
      // result cap
      if (records.at(-1) !== record) {
        records.push(record)
      }
    }
    if (batch !== '') {
      yield batch
    }
  }
  if (records.length > 0) {
    yield ixLine(term, records)
  }
}
