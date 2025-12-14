#!/usr/bin/env node
import { ixIxx } from './index'

const [file, out1 = 'out.ix', out2 = 'out.ixx'] = process.argv.slice(2)

if (!file) {
  // eslint-disable-next-line no-console
  console.log('usage: ixixx file.txt [out.ix] [out.ixx]')
  process.exit()
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
  try {
    await ixIxx(file, out1, out2)
  } catch (error) {
    console.error(error)
  }
})()
