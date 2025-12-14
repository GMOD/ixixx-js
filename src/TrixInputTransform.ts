import { Transform } from 'stream'

export class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    const line = chunk.toString()
    const parts = line.split(/\s+/)
    const id = parts[0]
    let result = ''
    for (let i = 1; i < parts.length; i++) {
      result += `${parts[i]!.toLowerCase()} ${id}\n`
    }
    this.push(result)
    done()
  }
}
