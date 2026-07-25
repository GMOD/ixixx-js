import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { describe, expect, test } from 'vitest'

import { ixIxxStream } from '../src/index.ts'
import { getPrefix } from '../src/util.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ixxoffsets-'))

const ADDRESS_SIZE = 10
const NEWLINE = 10

// every ixx entry must point at the byte offset of an ix line whose word starts
// with that entry's prefix, which is what a byte-range search relies on
function checkAddresses(ixFile: string, ixxFile: string) {
  const ix = fs.readFileSync(ixFile)
  const entries = fs
    .readFileSync(ixxFile, 'utf8')
    .split('\n')
    .filter(l => l.length > 0)

  expect(entries.length).toBeGreaterThan(1)
  for (const entry of entries) {
    const prefix = entry.slice(0, -ADDRESS_SIZE)
    const offset = Number.parseInt(entry.slice(-ADDRESS_SIZE), 16)
    expect(offset === 0 || ix[offset - 1] === NEWLINE).toBe(true)
    const lineEnd = ix.indexOf(NEWLINE, offset)
    const word = ix.toString('utf8', offset, lineEnd).split(' ')[0]!
    expect(getPrefix(word, prefix.length)).toBe(prefix)
  }
}

async function buildIndex(lines: string[], name: string) {
  const ixFile = path.join(dir, `${name}.ix`)
  const ixxFile = path.join(dir, `${name}.ixx`)
  await ixIxxStream(Readable.from(lines), ixFile, ixxFile)
  return { ixFile, ixxFile }
}

describe('ixx addresses', () => {
  test('point at line starts for ascii input', async () => {
    const lines = Array.from(
      { length: 6000 },
      (_, i) => `id${i} gene${String(i).padStart(6, '0')} shared\n`,
    )
    const { ixFile, ixxFile } = await buildIndex(lines, 'ascii')
    checkAddresses(ixFile, ixxFile)
  })

  test('point at line starts for multibyte input', async () => {
    const lines = Array.from(
      { length: 6000 },
      (_, i) => `id${i} 日本語${String(i).padStart(6, '0')} café${i}\n`,
    )
    const { ixFile, ixxFile } = await buildIndex(lines, 'multibyte')
    checkAddresses(ixFile, ixxFile)
  })
})
