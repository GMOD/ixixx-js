import { Transform } from 'stream'

export class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    const [id, ...words] = chunk.toString().split(/\s+/)

    this.push(words.map(word => `${word.toLowerCase()} ${id}\n`).join(''))
    done()
  }
}
