![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/ixixx-js/publish.yml?branch=main&logo=github&style=for-the-badge)

# ixixx-js

ixixx-js generates trix text index files. Trix indexes let you search a large
amount of free text data using static files and byte-range requests, with no
server-side code.

ixixx-js is a translation of
https://github.com/ucscGenomeBrowser/kent/blob/master/src/index/ixIxx/ixIxx.c
from C into JS, plus an external disk-based sort that keeps memory usage low.
The C code loads all keywords into memory and sorts the keys of a large hash.
With larger files that approach runs into Node.js limits, so ixixx-js
uses the external sort instead.

## CLI

```
npm install -g ixixx
ixixxjs file.txt [out.ix] [out.ixx]
```

## Internal API

```
ixIxxStream(stream: Readable, outIx: string, outIxx: string, prefixSize?: number)
ixIxx(inText: string, outIx: string, outIxx: string, prefixSize?: number)
```

## The trix concept

`ixIxx` takes an input file like this, mapping one keyword to several keywords:

```
MyGene0001  kinase signalling
MyGene0002  binding zinc
```

`ixIxx` creates an ix file that inverts the mapping:

```
binding MyGene0002
kinase MyGene0001
signalling MyGene0001
zinc MyGene0002
```

`ixIxx` also builds an ixx file that indexes the ix file by prefix, pairing each
prefix with a byte offset to where words starting with it begin (made-up
numbers, but conceptually like this):

```
bindin0000000000
signal0000000114
```

A lookup for a prefix such as `sig` finds the nearest offset in the ixx file,
then does byte range requests against the ix file to find the matching
entries — for example, MyGene0001.

## See also

[trix-js](https://github.com/GMOD/trix-js) is the client-side library that runs
the searches.

## Publishing

GitHub Actions publishes each release with
[trusted publishing](https://docs.npmjs.com/about-trusted-publishing). Start a
release with:

```bash
pnpm version patch  # or minor/major
```
