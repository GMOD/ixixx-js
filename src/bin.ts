#!/usr/bin/env node
import { ixIxx } from './index.ts'

const [file, out1 = 'out.ix', out2 = 'out.ixx'] = process.argv.slice(2)

async function main() {
  if (file) {
    await ixIxx(file, out1, out2)
  } else {
    console.error('usage: ixixx file.txt [out.ix] [out.ixx]')
    process.exitCode = 1
  }
}

// exitCode rather than process.exit(), which can drop buffered output when
// stdout/stderr is a pipe
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
