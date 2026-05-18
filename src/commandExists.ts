import fs from 'node:fs'
import path from 'node:path'

export function commandExistsSync(cmd: string) {
  const PATH = process.env.PATH ?? ''
  for (const dir of PATH.split(path.delimiter)) {
    if (dir !== '') {
      try {
        fs.accessSync(path.join(dir, cmd), fs.constants.X_OK)
        return true
      } catch {
        // not here, keep looking
      }
    }
  }
  return false
}
