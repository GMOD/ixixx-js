import { lineBatches } from './lineBatches.ts'

// turns each `id term term...` record into one `term id` line per term
export async function* trixInput(source: AsyncIterable<Buffer | string>) {
  for await (const lines of lineBatches(source)) {
    let batch = ''
    for (const line of lines) {
      // trim first: splitting untrimmed lines yields empty fields, which turn
      // into a bogus entry with an empty word or an empty id
      const [id, ...terms] = line.trim().split(/\s+/)
      for (const term of terms) {
        batch += `${term.toLowerCase()} ${id}\n`
      }
    }
    if (batch !== '') {
      yield batch
    }
  }
}
