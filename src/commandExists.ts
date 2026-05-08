import fs from 'node:fs'
import path from 'node:path'

export function commandExistsSync(cmd: string) {
  const PATH = process.env.PATH ?? ''
  const isWin = process.platform === 'win32'
  const exts = isWin ? (process.env.PATHEXT ?? '').split(';') : ['']
  for (const dir of PATH.split(path.delimiter)) {
    if (dir === '') {
      continue
    }
    for (const ext of exts) {
      try {
        fs.accessSync(path.join(dir, cmd + ext), fs.constants.X_OK)
        return true
      } catch {
        // not here, keep looking
      }
    }
  }
  return false
}
