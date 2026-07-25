import { Transform } from 'node:stream'

import { chunkSize } from './util.ts'

export class TrixInputTransform extends Transform {
  batch = ''

  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    // trim first: splitting untrimmed lines yields empty fields, which turn
    // into a bogus entry with an empty word or an empty id
    const [id, ...terms] = chunk.toString().trim().split(/\s+/)
    for (const term of terms) {
      this.batch += `${term.toLowerCase()} ${id}\n`
    }
    if (this.batch.length >= chunkSize) {
      this.push(this.batch)
      this.batch = ''
    }
    done()
  }

  _flush(done: () => void) {
    if (this.batch !== '') {
      this.push(this.batch)
    }
    done()
  }
}
