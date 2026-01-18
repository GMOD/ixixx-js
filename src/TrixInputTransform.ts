import { Transform } from 'stream'

export class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    const line = chunk.toString()
    const parts = line.split(/\s+/)
    const id = parts[0]
    const result = parts
      .slice(1)
      .map(p => `${p.toLowerCase()} ${id}\n`)
      .join('')
    this.push(result)
    done()
  }
}
