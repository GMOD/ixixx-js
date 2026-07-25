import { Writable } from 'node:stream'

export class StringWritable extends Writable {
  data = ''

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ) {
    this.data += chunk.toString()
    callback()
  }
}
