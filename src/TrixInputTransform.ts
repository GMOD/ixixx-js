import { Transform } from 'node:stream'

export class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    const parts = chunk.toString().split(/\s+/)
    const id = parts[0]
    for (let i = 1; i < parts.length; i++) {
      this.push(`${parts[i]!.toLowerCase()} ${id}\n`)
    }
    done()
  }
}
