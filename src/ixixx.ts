import fs from "fs";
import { open } from "fs/promises";
import readline from "readline";

const wordMiddleChars =
  [] as boolean[]; /* Characters that may be part of a word. */
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

function skipToWord(s: string) {
  /* Skip to next word character.  Return NULL at end of string. */
  let i = 0;
  while (i < s.length) {
    if (wordBeginChars[s.charCodeAt(i)]) {
      return i;
    }
    i += 1;
  }
  return s.length;
}

/* Skip to next non-word character.  Returns empty string at end. */
function skipOutWord(start: string) {
  const s = start;
  let i = 0;
  while (i < s.length) {
    if (!wordMiddleChars[s.charCodeAt(i)]) {
      break;
    }
    i++;
  }

  // while (s > start && !wordBeginChars[(int)(s[-1])])
  //     s -= 1;
  return i;
}

interface WordPos {
  /* Word position. */
  next: WordPos /* Next wordPos in list. */;
  itemId: string /* ID of associated item.  Not allocated here*/;
  wordIx: number /* Word number within doc. */;
}

function wordPosCmp(va: WordPos, vb: WordPos): number {
  /* Compare two wordPos by itemId. */
  const a = va;
  const b = vb;
  let dif = a.itemId.localeCompare(b.itemId);
  if (dif == 0) {
    dif = a.wordIx - b.wordIx;
  }
  return dif;
}

type Hash = any;

function indexWords(
  wordHash: Hash,
  itemId: string,
  text: string,
  itemIdHash: Hash
) {
  /* Index words in text and store in hash. */
  let s = 0;
  let e = 0;
  const word = [];
  let len;
  let hel: Hash;
  let pos: WordPos;
  let wordIx;
  text = text.toLowerCase();
  itemIdHash[itemId] = true;

  // // itemId = hashStoreName(itemIdHash, itemId);
  for (wordIx = 1; ; ++wordIx) {
    s = skipToWord(text.slice(e));
    if (s === text.length) {
      break;
    }
    e = skipOutWord(text.slice(s));
    len = e - s;

    // sizeof word
    if (len < 32) {
      const word = text.slice(s, s + len);
      hel = wordHash[word];
      if (!hel) {
        wordHash[word] = { itemId, wordIx };
      }
    }
  }
}

async function writeIndexHash(wordHash: any, fileName: string) {
  let els = Object.keys(wordHash);
  const file = await open(fileName, "w");
  els = els.sort();
  // slSort(&els, hashElCmp);
  els.forEach((el) => {
    // // struct wordPos *pos;
    // file.writeFile(el.name);
    // // slSort(&el->val, wordPosCmp);
    // el.val.forEach((pos) => {
    //   file.writeFile(` ${pos.itemId},${pos.wordIx}`);
    // });
    // file.writeFile("\n");
  });
  file.close();
}

async function makeIx(inFile: string, outIndex: string) {
  initCharTables();
  /* Create an index file. */
  const fileStream = fs.createReadStream(inFile);
  const rl = readline.createInterface({
    input: fileStream,
    output: process.stdout,
  });

  const wordHash = {};
  const itemIdHash = {};

  for await (const line of rl) {
    const [id, ...text] = line.split("\t");
    indexWords(wordHash, id, text.join("\t"), itemIdHash);
  }

  writeIndexHash(wordHash, outIndex);
}

const prefixSize = 5;
function getPrefix(word: string) {
  return word.slice(0, prefixSize).padEnd(5, " ");
}

type File = any;
function writeIxxEntry(f: File, prefix: string, pos: number) {
  /* Write out one index entry to file. */
  // fprintf(f, "%s%010llX\n", prefix, pos);
}

async function makeIxx(inIx: string, outIxx: string) {
  const fileStream = fs.createReadStream(inIx);
  const rl = readline.createInterface({
    input: fileStream,
    output: process.stdout,
  });

  // const it = rl[Symbol.asyncIterator]();
  // const line = (await it.next()) as string;

  // const [word, ...rest] = line.split("\t");
  // const writtenPrefix = getPrefix(word);
  // const lastPrefix = writtenPrefix;
  // writtenPos = lineFileTell(lf);
  // writeIxxEntry(f, writtenPrefix, writtenPos);
  // /* Loop around adding to index as need be */
  // while (lineFileNextReal(lf, &line))
  //     {
  //     int diff;
  //     curPos = lineFileTell(lf);
  //     word = nextWord(&line);
  //     const curPrefix = getPrefix(word);
  //     if (!sameString(curPrefix, lastPrefix))
  //         startPrefixPos = curPos;
  //     diff = curPos - writtenPos;
  //     if (diff >= binSize)
  //         {
  // 	if (!sameString(curPrefix, writtenPrefix))
  // 	    {
  // 	    writeIxxEntry(f, curPrefix, startPrefixPos);
  // 	    writtenPos = curPos;
  // 	    strcpy(writtenPrefix, curPrefix);
  // 	    }
  // 	}
  //     strcpy(lastPrefix, curPrefix);
  //     }
  // carefulClose(&f);
  // lineFileClose(&lf);
  // freeMem(curPrefix);
  // freeMem(lastPrefix);
  // freeMem(writtenPrefix);
}

/* ixIxx - Create indices for simple line-oriented file of format
 * <symbol> <free text>. */
export async function ixIxx(inText: string, outIx: string, outIxx: string) {
  await makeIx(inText, outIx);
  await makeIxx(outIx, outIxx);
}
