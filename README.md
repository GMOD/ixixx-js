![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/ixixx-js/publish.yml?branch=main&logo=github&style=for-the-badge)

# ixixx-js

ixixx-js generates trix text index files. Trix indexes allow you to search a
large amount of free text data using static files and byte-range requests, with
no server-side code needed.

ixixx-js translates UCSC's
[ixIxx.c](https://github.com/ucscGenomeBrowser/kent/blob/master/src/index/ixIxx/ixIxx.c)
into JS. Where the C code sorts every keyword in memory, which hits Node.js
limits on large files, ixixx-js uses an external disk-based sort.

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

`ixIxx` also builds an ixx file that pairs each prefix with the byte offset in
the ix file where its words begin (offsets illustrative):

```
bindin0000000000
signal0000000114
```

A lookup for `sig` finds the nearest offset in the ixx file, then reads the ix
file from there to find MyGene0001.

## See also

[trix-js](https://github.com/GMOD/trix-js) is the client-side library that runs
the searches.

## Publishing

GitHub Actions publishes with
[trusted publishing](https://docs.npmjs.com/about-trusted-publishing):

```bash
pnpm version patch  # or minor/major
```
