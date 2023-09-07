import { Readable } from 'stream'
import { makeIxx } from './makeIxx'
import { makeIx, makeIxStream } from './makeIx'

// this file (index.ts) is a translation of ixIxx.c from ucscGenomeBrowser/kent
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

export async function ixIxx(
  inText: string,
  outIx: string,
  outIxx: string,
  prefixSize?: number,
) {
  await makeIx(inText, outIx)
  await makeIxx(outIx, outIxx, prefixSize)
}

export async function ixIxxStream(
  stream: Readable,
  outIx: string,
  outIxx: string,
  prefixSize?: number,
) {
  await makeIxStream(stream, outIx)
  await makeIxx(outIx, outIxx, prefixSize)
}
