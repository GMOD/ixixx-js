import { promisify } from "util";
import { finished, Readable } from "stream";
import { once } from "events";
import fs from "fs";
import readline from "readline";
import tmp from "tmp";
import esort from "external-sorting";

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

async function makeIxStream(fileStream: Readable, outIxFilename: string) {
  initCharTables();

  const tmpobj = tmp.fileSync();
  const out = fs.createWriteStream(tmpobj.name);
  try {
    const rl = readline.createInterface({
      input: fileStream,
    });

    for await (const line of rl) {
      const [id, ...words] = line.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const res = out.write(`${word.toLowerCase()} ${id}\n`);

        // Handle backpressure
        // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
        if (!res) {
          await once(out, "drain");
        }
      }
    }
  } finally {
    out.end();

    await streamFinished(out);
  }

  const tmpobj2 = tmp.fileSync();
  const outSort = fs.createWriteStream(tmpobj2.name);

  await esort({
    input: fs.createReadStream(tmpobj.name),
    output: outSort,
    tempDir: __dirname,
    maxHeap: 100000,
  }).asc();

  // superstitious streamFinished on the file that esort outputs
  await streamFinished(outSort);

  const outIx = fs.createWriteStream(outIxFilename);
  try {
    const readFinalStream = fs.createReadStream(tmpobj2.name);
    const rl2 = readline.createInterface({
      input: readFinalStream,
    });

    let current;
    let buff = [];
    for await (const line of rl2) {
      const [id, data] = line.split(" ");
      if (current !== id) {
        if (buff.length) {
          const res = outIx.write(
            `${current} ${buff
              .map((elt, idx) => `${elt},${idx + 1}`)
              .join(" ")}\n`
          );
          buff = [];

          // Handle backpressure
          // ref https://nodesource.com/blog/understanding-streams-in-nodejs/
          if (!res) {
            await once(outIx, "drain");
          }
        }
        current = id;
      }
      buff.push(data);
    }
  } finally {
    outIx.end();

    await streamFinished(outIx);
  }

  tmpobj.removeCallback();
  tmpobj2.removeCallback();
}

async function makeIx(inFile: string, outIndex: string) {
  const fileStream = fs.createReadStream(inFile);
  return makeIxStream(fileStream, outIndex);
}

function getPrefix(word: string) {
  return word.slice(0, prefixSize).padEnd(5, " ");
}

async function makeIxx(inIx: string, outIxx: string) {
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
