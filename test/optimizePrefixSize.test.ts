import fs from 'fs'

import tmp from 'tmp'
import { describe, expect, test } from 'vitest'

import { optimizePrefixSize } from '../src/optimizePrefixSize.ts'

async function optimizeWithContent(lines: string[]): Promise<number> {
  const tempFile = tmp.fileSync()
  fs.writeFileSync(tempFile.name, lines.join('\n') + '\n')
  const result = await optimizePrefixSize(tempFile.name)
  tempFile.removeCallback()
  return result
}

describe('optimizePrefixSize', () => {
  test('returns minimum prefix size for small file', async () => {
    const lines = ['apple data1', 'banana data2', 'cherry data3']
    const result = await optimizeWithContent(lines)
    expect(result).toBe(5)
  })

  test('returns minimum prefix for diverse prefixes', async () => {
    const lines = Array.from(
      { length: 100 },
      (_, i) => `word${String(i).padStart(3, '0')} data${i}`,
    )
    const result = await optimizeWithContent(lines)
    expect(result).toBeGreaterThanOrEqual(5)
    expect(result).toBeLessThanOrEqual(40)
  })

  test('handles empty file', async () => {
    const result = await optimizeWithContent([])
    expect(result).toBe(5)
  })

  test('handles file with single line', async () => {
    const result = await optimizeWithContent(['onlyword somedata'])
    expect(result).toBe(5)
  })

  test('handles lines with same prefix', async () => {
    const lines = Array.from(
      { length: 50 },
      (_, i) => `sameprefix${i} data${i}`,
    )
    const result = await optimizeWithContent(lines)
    expect(result).toBeGreaterThanOrEqual(5)
  })
})
