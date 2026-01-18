import fs from 'fs'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { makeIxx } from '../src/makeIxx.ts'

async function createIxx(
  ixContent: string,
  prefixSize?: number,
): Promise<string> {
  const ixFile = tmp.fileSync()
  const ixxFile = tmp.fileSync()

  fs.writeFileSync(ixFile.name, ixContent)
  await makeIxx(ixFile.name, ixxFile.name, prefixSize)
  const result = fs.readFileSync(ixxFile.name, 'utf8')

  ixFile.removeCallback()
  ixxFile.removeCallback()

  return result
}

describe('makeIxx', () => {
  test('creates index for simple ix file', async () => {
    const ixContent = [
      'apple data1,1',
      'banana data2,1',
      'cherry data3,1',
    ].join('\n') + '\n'

    const result = await createIxx(ixContent, 5)
    expect(result).toContain('apple')
    expect(result).toMatch(/[0-9A-F]{10}/)
  })

  test('uses hex addresses', async () => {
    const ixContent = 'apple data1,1\n'
    const result = await createIxx(ixContent, 5)
    const lines = result.trim().split('\n')
    for (const line of lines) {
      const address = line.slice(-10)
      expect(address).toMatch(/^[0-9A-F]{10}$/)
    }
  })

  test('handles empty file', async () => {
    const result = await createIxx('', 5)
    expect(result).toBe('')
  })

  test('respects prefix size parameter', async () => {
    const ixContent = 'verylongword data1,1\n'
    const result = await createIxx(ixContent, 10)
    const prefix = result.slice(0, 10)
    expect(prefix).toBe('verylongwo')
  })

  test('pads short prefixes', async () => {
    const ixContent = 'ab data1,1\n'
    const result = await createIxx(ixContent, 5)
    const prefix = result.slice(0, 5)
    expect(prefix).toBe('ab   ')
  })

  test('auto-optimizes prefix size when not provided', async () => {
    const lines = Array.from(
      { length: 10 },
      (_, i) => `word${i} data${i},1`,
    )
    const ixContent = lines.join('\n') + '\n'
    const result = await createIxx(ixContent)
    expect(result.length).toBeGreaterThan(0)
  })
})
