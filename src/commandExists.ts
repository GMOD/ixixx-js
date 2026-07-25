import fs from 'node:fs'
import path from 'node:path'

export function commandExistsSync(cmd: string) {
  const PATH = process.env.PATH ?? ''
  for (const dir of PATH.split(path.delimiter)) {
    if (dir !== '') {
      const candidate = path.join(dir, cmd)
      try {
        // directories are executable too, so check for a plain file
        if (fs.statSync(candidate).isFile()) {
          fs.accessSync(candidate, fs.constants.X_OK)
          return true
        }
      } catch {
        // not here, keep looking
      }
    }
  }
  return false
}
