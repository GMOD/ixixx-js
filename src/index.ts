import fs from "fs";
import readline from "readline";
import { Readable } from "stream";

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
  /* Initialize tables that describe characters. */
  for (let c = 0; c < 256; ++c) {
    if (isalnum(String.fromCharCode(c))) {
      wordBeginChars[c] = wordMiddleChars[c] = true;
    }
  }
  wordBeginChars["_".charCodeAt(0)] = wordMiddleChars["_".charCodeAt(0)] = true;
  wordMiddleChars[".".charCodeAt(0)] = true;
  wordMiddleChars["-".charCodeAt(0)] = true;
}

type Hash = any;

function indexWords(
  wordHash: Hash,
  itemId: string,
  words: string[],
  itemIdHash: Hash
) {
  itemIdHash[itemId] = true;
  words.forEach((word, wordIx) => {
    if (!wordHash[word]) {
      wordHash[word] = { val: [] };
    }
    wordHash[word].val.push({ itemId, wordIx: wordIx + 1 });
  });
}

type WordHash = {
  [key: string]: { val: { itemId: number; wordIx: number }[] };
};

async function writeIndexHash(wordHash: WordHash, fileName: string) {
  const file = await fs.promises.open(fileName, "w");
  try {
    const entries = Object.entries(wordHash).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [name, { val }] of entries) {
      const entries = val
        .sort((a, b) => a.wordIx - b.wordIx)
        .map((pos) => `${pos.itemId},${pos.wordIx}`);
      await file.writeFile(`${name} ${entries.join(" ")}\n`);
    }
  } finally {
    file.close();
  }
}

async function makeIxStream(fileStream: Readable, outIndex: string) {
  initCharTables();

  const rl = readline.createInterface({
    input: fileStream,
  });

  const wordHash = {};
  const itemIdHash = {};

  for await (const line of rl) {
    const [id, ...text] = line.split(/\s+/);
    indexWords(
      wordHash,
      id,
      text.map((s) => s.toLowerCase()),
      itemIdHash
    );
  }

  await writeIndexHash(wordHash, outIndex);
}

async function makeIx(inFile: string, outIndex: string) {
  const fileStream = fs.createReadStream(inFile);
  return makeIxStream(fileStream, outIndex);
}

function getPrefix(word: string) {
  return word.slice(0, prefixSize).padEnd(5, " ");
}

async function makeIxx(inIx: string, outIxx: string) {
  const outFile = await fs.promises.open(outIxx, "w");
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
        await outFile.writeFile(
          `${curPrefix}${startPrefixPos
            .toString(16)
            .toUpperCase()
            .padStart(10, "0")}\n`
        );
        writtenPos = bytes;
        writtenPrefix = curPrefix;
      }
      lastPrefix = curPrefix;
      bytes += line.length + 1;
    }
  } finally {
    outFile.close();
  }
}

/* ixIxx - Create indices for simple line-oriented file of format
 * <symbol> <free text>. */
export async function ixIxx(inText: string, outIx: string, outIxx: string) {
  await makeIx(inText, outIx);
  await makeIxx(outIx, outIxx);
}

/* ixIxx - Create indices for simple line-oriented file of format
 * <symbol> <free text>. */
export async function ixIxxStream(
  stream: Readable,
  outIx: string,
  outIxx: string
) {
  await makeIxStream(stream, outIx);
  await makeIxx(outIx, outIxx);
}