import fs from 'fs'
import path from 'path'
import { Readable, Writable } from 'stream'
import { pipeline } from 'stream/promises'

const EOF = Symbol('EOF')

interface HeapItem {
  item: string | typeof EOF
  file: FileParser
}

class FileParser {
  private buffer = ''
  private bbuffer = Buffer.from('')
  private bytesRead = 0
  private file: string
  private delimiter: string
  private fh: fs.promises.FileHandle | undefined
  private eof = false

  constructor(file: string, delimiter: string) {
    this.file = file
    this.delimiter = delimiter
  }

  private checkBuffer(): string {
    const dIndex = this.buffer.indexOf(this.delimiter)
    if (dIndex === this.buffer.length - 1) {
      const temp = this.buffer.slice(0, dIndex)
      this.buffer = ''
      return temp
    }
    const temp = this.buffer.slice(0, dIndex)
    this.buffer = this.buffer.slice(dIndex + 1)
    return temp
  }

  async getNextChunk(): Promise<string | typeof EOF> {
    if (this.buffer.length > 0 && this.buffer.includes(this.delimiter)) {
      return this.checkBuffer()
    }

    if (this.eof) {
      return EOF
    }

    if (!this.fh) {
      this.fh = await fs.promises.open(this.file, 'r')
    }

    const cBuffer = Buffer.alloc(512)
    let readed: { bytesRead: number }

    while (
      (readed = await this.fh.read(cBuffer, 0, 512, this.bytesRead)).bytesRead >
      0
    ) {
      this.bbuffer = Buffer.concat([
        this.bbuffer,
        cBuffer.subarray(0, readed.bytesRead),
      ])
      this.bytesRead += readed.bytesRead
      const dIndex = this.bbuffer.indexOf(this.delimiter)
      if (dIndex === -1) {
        continue
      }
      this.buffer = this.bbuffer.subarray(0, dIndex + 1).toString('utf8')
      this.bbuffer = this.bbuffer.subarray(dIndex + 1)
      return this.checkBuffer()
    }

    if (this.bbuffer.length > 0 && this.bbuffer.includes(this.delimiter)) {
      this.buffer = this.bbuffer.toString('utf8')
      this.bbuffer = Buffer.from('')
      return this.checkBuffer()
    }

    this.eof = true
    await this.fh.close()
    return EOF
  }
}

function swap(harr: HeapItem[], a: number, b: number) {
  ;[harr[a], harr[b]] = [harr[b], harr[a]]
}

function compare(a: string | typeof EOF, b: string | typeof EOF): number {
  if (a === EOF) {
    return 1
  }
  if (b === EOF) {
    return -1
  }
  return a < b ? -1 : a > b ? 1 : 0
}

function heapify(harr: HeapItem[], i: number, heapSize: number) {
  const t = i << 1
  const l = t + 1
  const r = t + 2
  let first = i

  if (l < heapSize && compare(harr[l].item, harr[first].item) < 0) {
    first = l
  }
  if (r < heapSize && compare(harr[r].item, harr[first].item) < 0) {
    first = r
  }
  if (first !== i) {
    swap(harr, i, first)
    heapify(harr, first, heapSize)
  }
}

function constructHeap(harr: HeapItem[]) {
  const heapSize = harr.length
  let i = (heapSize - 1) >> 1
  while (i >= 0) {
    heapify(harr, i--, heapSize)
  }
}

async function initialRun(
  input: Readable,
  tempDir: string,
  maxHeap: number,
): Promise<string[]> {
  const files: string[] = []
  let fileIndex = 0
  let sBuffer = ''
  const tBuffer: string[] = []
  const delimiter = '\n'

  const writeTBuffer = () => {
    tBuffer.sort()
    const fpath = path.resolve(tempDir, `es_${fileIndex}.tmp`)
    const mergedBuffer = tBuffer.join(delimiter) + delimiter
    tBuffer.length = 0
    fs.writeFileSync(fpath, mergedBuffer, 'utf8')
    files.push(fpath)
    fileIndex++
  }

  const pushTBuffer = (v: string) => {
    tBuffer.push(v)
    if (tBuffer.length === maxHeap) {
      writeTBuffer()
    }
  }

  input.on('data', (chunk: Buffer | string) => {
    sBuffer += chunk instanceof Buffer ? chunk.toString('utf8') : chunk
    let dIndex = sBuffer.indexOf(delimiter)
    if (dIndex === sBuffer.length - 1) {
      pushTBuffer(sBuffer.slice(0, dIndex))
      sBuffer = ''
      return
    }
    while (dIndex < sBuffer.length - 1 && dIndex !== -1) {
      pushTBuffer(sBuffer.slice(0, dIndex))
      sBuffer = sBuffer.slice(dIndex + 1)
      dIndex = sBuffer.indexOf(delimiter)
    }
  })

  return new Promise((resolve, reject) => {
    input.on('end', () => {
      if (sBuffer.length > 0) {
        const dIndex = sBuffer.indexOf(delimiter)
        if (dIndex !== -1) {
          pushTBuffer(sBuffer.slice(0, dIndex))
        }
      }
      if (tBuffer.length > 0) {
        writeTBuffer()
      }
      resolve(files)
    })
    input.on('error', reject)
  })
}

async function mergeSortedFiles(
  filesPath: string[],
  output: Writable,
): Promise<void> {
  const delimiter = '\n'
  const flen = filesPath.length

  if (flen === 1) {
    const rs = fs.createReadStream(filesPath[0], 'utf8')
    await pipeline(rs, output)
    return
  }

  const harr: HeapItem[] = []
  const files = filesPath.map(file => new FileParser(file, delimiter))

  for (let i = 0; i < flen; i++) {
    harr.push({ item: await files[i].getNextChunk(), file: files[i] })
  }

  constructHeap(harr)

  while (true) {
    const first = harr[0]
    const item = first?.item
    if (typeof item !== 'string') {
      break
    }
    await new Promise<void>(resolve =>
      output.write(`${item}${delimiter}`, () => {
        resolve()
      }),
    )
    harr[0] = {
      item: await first.file.getNextChunk(),
      file: first.file,
    }
    heapify(harr, 0, harr.length)
  }

  await new Promise<void>(resolve => output.end(resolve))
}

export async function externalSort(
  input: Readable,
  output: Writable,
  tempDir: string,
  maxHeap = 10_000,
): Promise<void> {
  const files = await initialRun(input, tempDir, maxHeap)
  await mergeSortedFiles(files, output)
  await Promise.all(files.map(file => fs.promises.unlink(file)))
}
