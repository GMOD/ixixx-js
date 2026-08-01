import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { describe, expect, test } from 'vitest'

import { makeIxStream } from '../src/makeIx.ts'
import { makeIxx } from '../src/makeIxx.ts'
import { optimizePrefixSize } from '../src/optimizePrefixSize.ts'
import { binSize, getPrefix, samePrefix } from '../src/util.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prefixsize-'))
const ADDRESS_SIZE = 10

async function buildIndex(name: string, words: string[]) {
  const ixFile = path.join(dir, `${name}.ix`)
  const ixxFile = path.join(dir, `${name}.ixx`)
  await makeIxStream(
    Readable.from(words.map((w, i) => `doc${i} ${w}\n`)),
    ixFile,
  )
  const prefixSize = await optimizePrefixSize(ixFile)
  await makeIxx(ixFile, ixxFile, prefixSize)

  const addresses = fs
    .readFileSync(ixxFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => Number.parseInt(l.slice(-ADDRESS_SIZE), 16))

  return { prefixSize, addresses, ixBytes: fs.statSync(ixFile).size }
}

// the intervals a search has to scan: one per ixx entry, the last running to
// the end of the ix
function binSizes(addresses: number[], ixBytes: number) {
  return addresses.map((a, i) => (addresses[i + 1] ?? ixBytes) - a)
}

describe('prefix comparison', () => {
  // optimizePrefixSize compares words by shared-prefix length rather than by
  // building the padded prefix makeIxx writes. that shortcut is the only reason
  // the two agree on where bins fall, so it has to stay exact
  test('samePrefix matches padded getPrefix equality', () => {
    // no spaces: getPrefix pads with them, so 'ab' and 'ab c' share the padded
    // 3-prefix 'ab ' while sharing only two characters. ixWords cuts each word
    // at the first space, so that case cannot reach either function
    const words = [
      '',
      'a',
      'ab',
      'abc',
      'abcd',
      'b',
      'ba',
      'café',
      'cafe',
      '日本語',
      '日本',
      '🎉x',
      '🎉y',
    ]
    for (const a of words) {
      for (const b of words) {
        for (let n = 1; n <= 6; n++) {
          expect({ a, b, n, same: samePrefix(a, b, n) }).toEqual({
            a,
            b,
            n,
            same: getPrefix(a, n) === getPrefix(b, n),
          })
        }
      }
    }
  })
})

describe('optimizePrefixSize', () => {
  test('does not settle for one bin covering the whole ix', async () => {
    // every word shares the first five characters, the way real accessions do
    // (ENSG…, AT1G…). the prefix that never changes writes a single bin at
    // offset 0 and, unless the run to EOF is measured, scores perfectly
    const words = Array.from(
      { length: 40_000 },
      (_, i) => `ENSG0${String(i).padStart(10, '0')}`,
    )
    const { prefixSize, addresses, ixBytes } = await buildIndex('shared', words)

    expect(ixBytes).toBeGreaterThan(10 * binSize)
    expect(prefixSize).toBeGreaterThan(5)
    expect(addresses.length).toBeGreaterThan(1)
    expect(Math.max(...binSizes(addresses, ixBytes))).toBeLessThanOrEqual(
      10 * binSize,
    )
  })

  test('the size it picks holds up against the ixx actually written', async () => {
    const words = Array.from(
      { length: 40_000 },
      (_, i) => `chr1_gene_${String(i).padStart(8, '0')}`,
    )
    const { addresses, ixBytes } = await buildIndex('measured', words)
    const bins = binSizes(addresses, ixBytes)
    const avg = bins.reduce((a, b) => a + b, 0) / bins.length

    // the same thresholds optimizePrefixSize accepted the size on, checked
    // against the bins that landed in the file rather than its own model
    expect(avg).toBeLessThanOrEqual(3 * binSize)
    expect(Math.max(...bins)).toBeLessThanOrEqual(10 * binSize)
  })

  test('falls back to the maximum when no prefix can discriminate', async () => {
    // shared run longer than MAX_PREFIX, so no allowed prefix size splits these
    const shared = 'homo_sapiens_chromosome_one_gene_annotation_v'
    const words = Array.from(
      { length: 40_000 },
      (_, i) => `${shared}${String(i).padStart(6, '0')}`,
    )
    const { prefixSize } = await buildIndex('undiscriminating', words)

    expect(prefixSize).toBe(40)
  })
})
