import { errorCode } from './util.ts'

const OUT_OF_SPACE_CODES = new Set(['ENOSPC', 'EDQUOT'])

// gnu sort says `No space left on device`; uutils sort, /usr/bin/sort on
// ubuntu 26.04, panics with `StorageFull` and that same strerror text
const OUT_OF_SPACE_MESSAGE = /no space left on device|disk quota exceeded/i

export function isOutOfSpace(error: unknown) {
  return OUT_OF_SPACE_CODES.has(errorCode(error) ?? '')
}

export function mentionsOutOfSpace(text: string) {
  return OUT_OF_SPACE_MESSAGE.test(text)
}

export function tempSpaceHint(dir: string) {
  return `ran out of space for temporary sort files in ${dir}; set TMPDIR to a directory on a disk with more room`
}
