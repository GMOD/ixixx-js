# ixixx-js

Translation of https://github.com/ucscGenomeBrowser/kent/blob/master/src/index/ixIxx/ixIxx.c from C into JS

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
