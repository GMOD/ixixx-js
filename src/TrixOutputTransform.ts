import { Transform } from 'stream'

function elt(buff: string[], current: string) {
  return `${current} ${buff.map((elt, idx) => `${elt},${idx + 1}`).join(' ')}\n`
}
export class TrixOutputTransform extends Transform {
  buff = [] as string[]
  current = ''
  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    // weird: need to strip nulls from string, xref
    // https://github.com/GMOD/jbrowse-components/pull/2451
    const [id, data] = chunk.toString().replace(/\0/g, '').split(' ')
    if (this.current !== id) {
      if (this.buff.length) {
        this.push(elt(this.buff, this.current))
        this.buff = []
      }
      this.current = id
    }
    this.buff.push(data)
    done()
  }
  _flush(done: () => void) {
    if (this.buff.length) {
      this.push(elt(this.buff, this.current))
    }
    done()
  }
}
