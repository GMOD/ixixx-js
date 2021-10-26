import { promisify } from "util";
import { finished, Readable, PassThrough, Transform } from "stream";

import pump from "pump";
import split2 from "split2";
import { once } from "events";
import fs from "fs";
import readline from "readline";
import tmp from "tmp";
import esort from "external-sorting";

tmp.setGracefulCleanup();

const streamFinished = promisify(finished); // (A)

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

const prefixSize = 5;
let binSize = 64 * 1024;

// Characters that may be part of a word
const wordMiddleChars = [] as boolean[];
const wordBeginChars = [] as boolean[];

function isalpha(c: string) {
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

function isdigit(c: string) {
  return c >= "0" && c <= "9";
}

function isalnum(c: string) {
  return isalpha(c) || isdigit(c);
}

function initCharTables() {
  for (let c = 0; c < 256; ++c) {
    if (isalnum(String.fromCharCode(c))) {
      wordBeginChars[c] = wordMiddleChars[c] = true;
    }
  }
  wordBeginChars["_".charCodeAt(0)] = wordMiddleChars["_".charCodeAt(0)] = true;
  wordMiddleChars[".".charCodeAt(0)] = true;
  wordMiddleChars["-".charCodeAt(0)] = true;
}

class TrixInputTransform extends Transform {
  _transform(chunk: Buffer, encoding: any, callback: Function) {
    const [id, ...words] = chunk.toString().split(/\s+/);
    callback(
      null,
      words.map((word) => `${word.toLowerCase()} ${id}\n`).join("")
    );
  }
}

class TrixOutputTransform extends Transform {
  buff = [] as string[];
  current = "";
  _transform(chunk: Buffer, encoding: any, callback: Function) {
    const [id, data] = chunk.toString().split(" ");
    if (this.current !== id) {
      if (this.buff.length) {
        callback(
          null,
          `${this.current} ${this.buff
            .map((elt, idx) => `${elt},${idx + 1}`)
            .join(" ")}\n`
        );
        this.buff = [];
      } else {
        callback(null, null);
      }
      this.current = id;
    } else {
      callback(null, null);
    }
    this.buff.push(data);
    console.log("transform", { len: this.buff });
  }
  _flush(callback: Function) {
    console.log("final", { curr: this.current, len: this.buff });
    if (this.buff.length) {
      callback(
        null,
        `${this.current} ${this.buff
          .map((elt, idx) => `${elt},${idx + 1}`)
          .join(" ")}\n`
      );
    }
    callback(null, null);
  }
}

async function makeIxStream(fileStream: Readable, outIxFilename: string) {
  initCharTables();

  const tmpdir = tmp.dirSync({
    prefix: "jbrowse-trix-sort",
  });

  const out = fs.createWriteStream(outIxFilename);

  // see https://stackoverflow.com/questions/68835344/ for explainer of writer
  const r = split2();
  let ret = pump(r, new TrixOutputTransform(), out);
  console.log("her3");
  await esort({
    //@ts-ignore
    input: pump(fileStream, split2(), new TrixInputTransform()),
    //@ts-ignore
    output: r,
    tempDir: tmpdir.name,
  }).asc();
  console.log("her2");

  await streamFinished(ret);
  console.log("her1");
}

async function makeIx(inFile: string, outIndex: string) {
  const fileStream = fs.createReadStream(inFile);
  return makeIxStream(fileStream, outIndex);
}

function getPrefix(word: string) {
  return word.slice(0, prefixSize).padEnd(5, " ");
}

async function makeIxx(inIx: string, outIxx: string) {
  console.log("her1");
  const out = fs.createWriteStream(outIxx);
  try {
    const fileStream = fs.createReadStream(inIx);
    const rl = readline.createInterface({
      input: fileStream,
    });

    let lastPrefix;
    let writtenPrefix;
    let writtenPos = -binSize;
    let startPrefixPos = 0;
    let bytes = 0;

    for await (const line of rl) {
      const [word] = line.split(/\s/);
      const curPrefix = getPrefix(word);
      if (curPrefix !== lastPrefix) {
        startPrefixPos = bytes;
      }

      if (bytes - writtenPos >= binSize && curPrefix !== writtenPrefix) {
        const res = out.write(
          `${curPrefix}${startPrefixPos
            .toString(16)
            .toUpperCase()
            .padStart(10, "0")}\n`
        );

        // Handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!res) {
          await once(out, "drain");
        }
        writtenPos = bytes;
        writtenPrefix = curPrefix;
      }
      lastPrefix = curPrefix;
      bytes += line.length + 1;
    }
  } finally {
    out.end();
    await streamFinished(out);
  }
}

export async function ixIxx(inText: string, outIx: string, outIxx: string) {
  await makeIx(inText, outIx);
  await makeIxx(outIx, outIxx);
}

export async function ixIxxStream(
  stream: Readable,
  outIx: string,
  outIxx: string
) {
  await makeIxStream(stream, outIx);
  await makeIxx(outIx, outIxx);
}
