import { Transform } from 'node:stream'

export class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    const [id, ...terms] = chunk.toString().split(/\s+/)
    for (const term of terms) {
      this.push(`${term.toLowerCase()} ${id}\n`)
    }
    done()
  }
}
