# ixixx-js


This library implements trix text indexing file generation


It is basically a translation of https://github.com/ucscGenomeBrowser/kent/blob/master/src/index/ixIxx/ixIxx.c from C into JS, plus some added code to keep memory usage low by doing an external disk based sort

## CLI

```
npm install -g ixixx
ixixxjs yourfile.text [out.ix] [out.ixx]
```

## Internal API

```
ixIxxStream(stream: Readable, outIxFilename: string, outIxxFilename:string)
ixIxx(inFilename:string,outIxFilename:string,outIxxFilename:string)
```


## The trix concept


Takes an input file like this, containing a mapping of a keyword to several keywords e.g.


```
MyGene0001  kinase signalling
MyGene0002  binding zinc
```

And then crates a new file thats kind of like the inverse of it in an ix file

```
binding MyGene0002  
kinase MyGene0001
signalling MyGene0001
zinc MyGene0002
```

And indexes it so that it has a prefix, and a byte offset to words starting with that prefix in an ixx file e.g. (made up numbers but conceptually something like this)

```
bindin0000000000
signal0000000114
```

So that when you type e.g. `sig` it can lookup where approximately you want to start looking in the ixx file and then perform byte range requests against the ix file

