import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, test } from 'vitest'

import { commandExistsSync } from '../src/commandExists.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmdexists-'))
const originalPath = process.env.PATH

afterEach(() => {
  process.env.PATH = originalPath
})

describe('commandExistsSync', () => {
  test('finds an executable file on PATH', () => {
    const bin = path.join(dir, 'bin1')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'mycmd'), '#!/bin/sh\n', { mode: 0o755 })
    process.env.PATH = bin
    expect(commandExistsSync('mycmd')).toBe(true)
  })

  test('ignores a directory with the command name', () => {
    const bin = path.join(dir, 'bin2')
    fs.mkdirSync(path.join(bin, 'mycmd'), { recursive: true })
    process.env.PATH = bin
    expect(commandExistsSync('mycmd')).toBe(false)
  })

  test('ignores a non-executable file', () => {
    const bin = path.join(dir, 'bin3')
    fs.mkdirSync(bin, { recursive: true })
    fs.writeFileSync(path.join(bin, 'mycmd'), 'data', { mode: 0o644 })
    process.env.PATH = bin
    expect(commandExistsSync('mycmd')).toBe(false)
  })

  test('returns false when not found', () => {
    process.env.PATH = dir
    expect(commandExistsSync('definitely-not-a-command')).toBe(false)
  })
})
