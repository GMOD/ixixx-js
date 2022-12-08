# v2.0.0

- Automatically optimize prefix size. Previously this was manually provided or
  defaulted to 5. We now automatically try to calculate this if no prefix size
  is provided. This will try to make each bin from the ixx index approximately
  64kb

# v1.0.21

- Export the makeIxx function

# v1.0.20

- Add configurable prefixSize paramter to ixIxx and ixIxxStream, can be used if
  many of the features you are indexing have similar ID prefixes

# v1.0.19

- Fix flaky error from external-sorting module sometimes failing
- Use pipeline instead of pump

# v1.0.18

- Add better error handling on stream

# v1.0.17

- Fix issue where nulls appear in stream on older node versions, but are
  stripped out xref https://github.com/GMOD/jbrowse-components/pull/2451
- Fix issue where streamFinished is not called always, so use close instead

# v1.0.16

- Improved streaming strategy and also fix intermittent failure. Thanks to
  @bbimber for reporting https://github.com/GMOD/jbrowse-components/issues/2354

# v1.0.15

- Cleanup files when done

# v1.0.14

- Revert #6 transformer change

# v1.0.13

- Change from external-sort -> external-sorting npm module due to bug in their module

# v1.0.12

- Use transform to reduce amount of data introduced to disk
- Fix issue with last element not being written to index
- Cleanup temp files

# v1.0.11

- Use a smaller maxHeap size for faster operation

# v1.0.10

- Use simple string compare rather than localeCompare

# v1.0.9

- Use new external sorting module that is ~2x faster than external-sorting

# v1.0.8

- Use external sorting module for better scalability, using the great external-sorting package on NPM

# v1.0.7

- Use fs.createWriteStream instead of fs/promises for writing outputs

# v1.0.6

- Fix writing ix and ixx files to await the filehandle.writeFile call

# v1.0.5

- Print usage message for CLI tool
- Attempt to fix error "Cannot find module 'fs/promises'...
- Avoid potential file handle leak on error with try/finally

# v1.0.4

- Ensure ix is written before calculating ixx

# v1.0.3

- Fix borked typescript definitions again

# v1.0.2

- Fix typescript definitions on stream functions

# 1.0.1

- Redo borked release of 1.0.0

# 1.0.0

- Initial release
