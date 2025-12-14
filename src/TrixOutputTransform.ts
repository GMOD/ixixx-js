import { Transform } from 'stream'

function elt(buff: string[], current: string) {
  let result = current
  for (let i = 0; i < buff.length; i++) {
    result += ` ${buff[i]},${i + 1}`
  }
  return result + '\n'
}

export class TrixOutputTransform extends Transform {
  buff: string[] = []
  current = ''

  _transform(chunk: Buffer, _encoding: unknown, done: () => void) {
    // weird: need to strip nulls from string, xref
    // https://github.com/GMOD/jbrowse-components/pull/2451
    const line = chunk.toString().replaceAll('\0', '')
    const spaceIdx = line.indexOf(' ')
    const id = spaceIdx === -1 ? line : line.slice(0, spaceIdx)
    const data = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1)

    if (this.current !== id) {
      if (this.buff.length > 0) {
        this.push(elt(this.buff, this.current))
        this.buff = []
      }
      this.current = id
    }
    this.buff.push(data)
    done()
  }

  _flush(done: () => void) {
    if (this.buff.length > 0) {
      this.push(elt(this.buff, this.current))
    }
    done()
  }
}
