![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/ixixx-js/publish.yml?branch=main&logo=github&style=for-the-badge)

# ixixx-js

This library implements trix text indexing file generation. Trix indexes allow
you to search a large amount of free text data using static files and
byte-range requests, no server side code needed

This library is basically a translation of
https://github.com/ucscGenomeBrowser/kent/blob/master/src/index/ixIxx/ixIxx.c
from C into JS, plus some added code to keep memory usage low by doing an
external disk based sort. The original C library basically loads all keywords
into memory, and sorts the keys of a large hash, but this library ran into some
node.js limits on doing this with larger files and so it uses the external sort
to keep memory usage lower

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

https://github.com/GMOD/trix-js for the client side library to do the searches

## Publishing

[Trusted publishing](https://docs.npmjs.com/about-trusted-publishing) via GitHub Actions.

```bash
pnpm version patch  # or minor/major
```
