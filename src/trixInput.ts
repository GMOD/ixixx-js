import { lineBatches } from './lineBatches.ts'
import { chunkSize } from './util.ts'

// turns each `id term term...` record into one `term id` line per term.
// output is held to chunkSize rather than yielded per input chunk: callers
// such as @jbrowse/cli stream one record per chunk, which would otherwise make
// one write to sort per record
export async function* trixInput(source: AsyncIterable<Buffer | string>) {
  let batch = ''
  for await (const lines of lineBatches(source)) {
    for (const line of lines) {
      // trim first: splitting untrimmed lines yields empty fields, which turn
      // into a bogus entry with an empty word or an empty id
      const [id, ...terms] = line.trim().split(/\s+/)
      for (const term of terms) {
        batch += `${term.toLowerCase()} ${id}\n`
      }
    }
    if (batch.length >= chunkSize) {
      yield batch
      batch = ''
    }
  }
  if (batch !== '') {
    yield batch
  }
}
