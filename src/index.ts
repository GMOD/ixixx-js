import { promisify } from 'util'
import { pipeline, finished, Readable, Transform } from 'stream'
import { once } from 'events'

import split2 from 'split2'
import fs from 'fs'
import readline from 'readline'
import tmp from 'tmp'
import esort from 'external-sorting'

tmp.setGracefulCleanup()

const streamFinished = promisify(finished) // (A)

// this file (ixixx.ts) is a translation of ixIxx.c from ucscGenomeBrowser/kent
// the license of that file is reproduced below

/*
 * MIT License
 *
 * Copyright (C) 2001 UC Regents
 *
 * Permission is hereby granted, free of charge, to any person or non-commercial
 * entity obtaining a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including without
 * limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const prefixSize = 5
let binSize = 64 * 1024

// Characters that may be part of a word
const wordMiddleChars = [] as boolean[]
const wordBeginChars = [] as boolean[]

function isalpha(c: string) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}

function isdigit(c: string) {
  return c >= '0' && c <= '9'
}

function isalnum(c: string) {
  return isalpha(c) || isdigit(c)
}

function initCharTables() {
  for (let c = 0; c < 256; ++c) {
    if (isalnum(String.fromCharCode(c))) {
      wordBeginChars[c] = wordMiddleChars[c] = true
    }
  }
  wordBeginChars['_'.charCodeAt(0)] = wordMiddleChars['_'.charCodeAt(0)] = true
  wordMiddleChars['.'.charCodeAt(0)] = true
  wordMiddleChars['-'.charCodeAt(0)] = true
}

class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, encoding: any, done: Function) {
    const [id, ...words] = chunk.toString().split(/\s+/)

    this.push(words.map(word => `${word.toLowerCase()} ${id}\n`).join(''))
    done()
  }
}

function elt(buff: string[], current: string) {
  return `${current} ${buff.map((elt, idx) => `${elt},${idx + 1}`).join(' ')}\n`
}
class TrixOutputTransform extends Transform {
  buff = [] as string[]
  current = ''
  _transform(chunk: Buffer, encoding: any, done: Function) {
    // weird: need to strip nulls from string, xref
    // https://github.com/GMOD/jbrowse-components/pull/2451
    let [id, data] = chunk.toString().replace(/\0/g, '').split(' ')
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
  _flush(done: Function) {
    if (this.buff.length) {
      this.push(elt(this.buff, this.current))
    }
    done()
  }
}

async function makeIxStream(fileStream: Readable, outIxFilename: string) {
  return new Promise(async (resolve, reject) => {
    initCharTables()

    const dir = tmp.dirSync({
      prefix: 'jbrowse-trix-sort',
    })
    const tempDir = dir.name

    const out = fs.createWriteStream(outIxFilename)

    // see https://stackoverflow.com/questions/68835344/ for explainer of
    // writer
    const input = pipeline(
      fileStream,
      split2(),
      new TrixInputTransform(),
      function (err) {
        if (err) {
          reject(err)
        }
      },
    )

    const output = split2()
    pipeline(output, new TrixOutputTransform(), out, function (err) {
      if (err) {
        reject(err)
      }
    })

    await esort({
      input,
      output,
      tempDir,
    }).asc()

    resolve(true)
  })
}

async function makeIx(inFile: string, outIndex: string) {
  return makeIxStream(fs.createReadStream(inFile), outIndex)
}

function getPrefix(word: string) {
  return word.slice(0, prefixSize).padEnd(5, ' ')
}

async function makeIxx(inIx: string, outIxx: string) {
  const out = fs.createWriteStream(outIxx)
  try {
    const fileStream = fs.createReadStream(inIx)
    const rl = readline.createInterface({
      input: fileStream,
    })

    let lastPrefix
    let writtenPrefix
    let writtenPos = -binSize
    let startPrefixPos = 0
    let bytes = 0

    for await (const line of rl) {
      const [word] = line.split(/\s/)
      const curPrefix = getPrefix(word)
      if (curPrefix !== lastPrefix) {
        startPrefixPos = bytes
      }

      if (bytes - writtenPos >= binSize && curPrefix !== writtenPrefix) {
        const res = out.write(
          `${curPrefix}${startPrefixPos
            .toString(16)
            .toUpperCase()
            .padStart(10, '0')}\n`,
        )

        // Handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!res) {
          await once(out, 'drain')
        }
        writtenPos = bytes
        writtenPrefix = curPrefix
      }
      lastPrefix = curPrefix
      bytes += line.length + 1
    }
  } finally {
    out.end()
    await streamFinished(out)
  }
}

export async function ixIxx(inText: string, outIx: string, outIxx: string) {
  await makeIx(inText, outIx)
  await makeIxx(outIx, outIxx)
}

export async function ixIxxStream(
  stream: Readable,
  outIx: string,
  outIxx: string,
) {
  await makeIxStream(stream, outIx)
  await makeIxx(outIx, outIxx)
}
