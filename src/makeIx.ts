import { pipeline, Readable } from 'stream'
import esort from 'external-sorting'
import tmp from 'tmp'
import { sync as commandExistsSync } from 'command-exists'

import split2 from 'split2'
import fs from 'fs'
import { spawn } from 'child_process'
import { TrixInputTransform } from './TrixInputTransform'
import { TrixOutputTransform } from './TrixOutputTransform'

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
      wordBeginChars[c] = true
      wordMiddleChars[c] = true
    }
  }
  wordBeginChars['_'.charCodeAt(0)] = wordMiddleChars['_'.charCodeAt(0)] = true
  wordMiddleChars['.'.charCodeAt(0)] = true
  wordMiddleChars['-'.charCodeAt(0)] = true
}

const isWin =
  typeof process !== 'undefined' ? process.platform === 'win32' : false

export async function makeIxStream(
  fileStream: Readable,
  outIxFilename: string,
) {
  return new Promise((resolve, reject) => {
    initCharTables()

    const out = fs.createWriteStream(outIxFilename)

    // see https://stackoverflow.com/questions/68835344/ for explainer of
    // writer

    // override locale to C, but keep other env vars
    if (commandExistsSync('sort') && !isWin) {
      const sort = spawn('sort', ['-k1,1'], {
        env: { ...process.env, LC_ALL: 'C' },
      })
      pipeline(
        fileStream,
        split2(),
        new TrixInputTransform(),
        sort.stdin,
        err => {
          if (err) {
            reject(err)
          }
        },
      )

      pipeline(sort.stdout, split2(), new TrixOutputTransform(), out, err => {
        if (err) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    } else {
      const dir = tmp.dirSync({
        prefix: 'jbrowse-trix-sort',
      })
      const tempDir = dir.name
      const output = split2()

      pipeline(output, new TrixOutputTransform(), out, err => {
        if (err) {
          reject(err)
        }
      })
      esort({
        input: pipeline(fileStream, split2(), new TrixInputTransform(), err => {
          if (err) {
            reject(err)
          }
        }),
        output,
        tempDir,
      })
        .asc()
        .then(resolve, reject)
    }
  })
}

export async function makeIx(inFile: string, outIndex: string) {
  return makeIxStream(fs.createReadStream(inFile), outIndex)
}
