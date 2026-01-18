import { describe, expect, test } from 'vitest'

import { binSize, getPrefix } from '../src/util.ts'

describe('binSize', () => {
  test('is 64KB', () => {
    expect(binSize).toBe(64 * 1024)
  })
})

describe('getPrefix', () => {
  test('returns full word when shorter than prefix size', () => {
    expect(getPrefix('abc', 5)).toBe('abc  ')
  })

  test('truncates word when longer than prefix size', () => {
    expect(getPrefix('abcdefgh', 5)).toBe('abcde')
  })

  test('returns exact word when equal to prefix size', () => {
    expect(getPrefix('abcde', 5)).toBe('abcde')
  })

  test('pads empty string', () => {
    expect(getPrefix('', 5)).toBe('     ')
  })

  test('handles prefix size of 1', () => {
    expect(getPrefix('hello', 1)).toBe('h')
  })

  test('handles very long prefix size', () => {
    expect(getPrefix('hi', 10)).toBe('hi        ')
  })
})
