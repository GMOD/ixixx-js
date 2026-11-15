## [3.1.1](https://github.com/GMOD/ixixx-js/compare/v3.1.0...v3.1.1) (2026-11-15)

### Bug Fixes

- Name the installed binary, ixixxjs, in the usage message ([2105045](https://github.com/GMOD/ixixx-js/commit/2105045b697a8308abd7017e6dadd8487bbdfe45))
- Say TMPDIR filled up when a sort runs out of temp space ([ebdde77](https://github.com/GMOD/ixixx-js/commit/ebdde77cf9b579abe84612405a0b429ac9faa886))
- Reject rather than crash when a temp run fails to open ([41ce691](https://github.com/GMOD/ixixx-js/commit/41ce6913f166fca9ff3e11f3b240f48d98d82aee))
- Name the directory each sort actually used in the TMPDIR hint ([74bb35e](https://github.com/GMOD/ixixx-js/commit/74bb35e3076dac2883baab444f0a02ee4bea1379))

### Documentation

- Trusted publishing adds provenance without a --provenance flag ([fc1ee13](https://github.com/GMOD/ixixx-js/commit/fc1ee13fd41d84c57d2055aa07fe09b8d5ecdd18))
- Say the output is for trix-js, not UCSC's trix ([4465432](https://github.com/GMOD/ixixx-js/commit/446543284c0c13d5185d287915f083a358d6e799))

### Other Changes

- Bump deps, drop unused dev deps and stale ignores ([250938a](https://github.com/GMOD/ixixx-js/commit/250938a4599641242aca0f93187caf3a40f060fe))

### Performance Improvements

- Batch writes to sort across input chunks ([3dc5e17](https://github.com/GMOD/ixixx-js/commit/3dc5e17cb7b3f69af80a186d2350207d47240a5f))

### Refactoring

- Narrow errors in settleAll without casts ([1b0499c](https://github.com/GMOD/ixixx-js/commit/1b0499ccd7f28084965d7c8e3f40d17ee8776ce8))
- Drop split2 for a built-in line splitter ([a07582a](https://github.com/GMOD/ixixx-js/commit/a07582a66fcb2164917c36a78025112e8f5e031c))
- Run the JS sort as a pipeline stage ([960421c](https://github.com/GMOD/ixixx-js/commit/960421ce8fcbd2b595f2d730b6ecc5ba322c20d1))
- Look for sort when called, not at import ([36964d8](https://github.com/GMOD/ixixx-js/commit/36964d862d630129839d13d1c68cba5cad1268fd))

### Tests

- Finish renaming maxHeap to runLength ([298e540](https://github.com/GMOD/ixixx-js/commit/298e540b3e6fc0f0d89b6f871f08ac9cf9a0dec6))

## [3.1.0](https://github.com/GMOD/ixixx-js/compare/v3.0.13...v3.1.0) (2026-10-14)

### Chores

- Keep agent worktrees out of the toolchain's way ([f8d0381](https://github.com/GMOD/ixixx-js/commit/f8d038167f892379e9ae0ffa9a91e75d72441df5))

### Documentation

- Correct the release command in CONTRIBUTING, and its voice ([c268e03](https://github.com/GMOD/ixixx-js/commit/c268e03c3cf816ff057207c2bdfe6c0063312d14))
- Fix anti-AI writing tropes in README ([3bd77ff](https://github.com/GMOD/ixixx-js/commit/3bd77ff6bf2171568d73bf556409a22436990bb2))

### Other Changes

- Rewrite AI-writing tropes in README and CONTRIBUTING ([2114c27](https://github.com/GMOD/ixixx-js/commit/2114c2793f75f07e961335e017caeafc361c1409))
- Restore wording the tropes rewrite changed without a trope ([ac1fd5b](https://github.com/GMOD/ixixx-js/commit/ac1fd5b582ec5e288268ed2ae38271f0053c24b6))
- Trim README wordiness ([1519877](https://github.com/GMOD/ixixx-js/commit/15198776d83b63916f2cc3174dcb8d13a1b405d6))
- Reject instead of crashing when makeIxx cannot open its output ([0a6e562](https://github.com/GMOD/ixixx-js/commit/0a6e5623f2559aa58f72caed0f7d4d766d362cdf))
- Settle every promise in the JS-sort fallback before rejecting ([9a8c32e](https://github.com/GMOD/ixixx-js/commit/9a8c32efa2e85cc7a922f9c1b4913e6d2bf19e91))
- Rename externalSort's maxHeap to runLength, make transform state private ([060df5c](https://github.com/GMOD/ixixx-js/commit/060df5c2f514c3cda5ae9e5d5d0340e08aaa2555))

## [3.0.13](https://github.com/GMOD/ixixx-js/compare/v3.0.12...v3.0.13) (2026-08-11)

### Bug Fixes

- The js fallback did not order the ix the way `sort -k1,1` does ([baea191](https://github.com/GMOD/ixixx-js/commit/baea19146bcb912fe29e23e0f337e4131f8a8dee))
- A sort that died before reading its input reported only EPIPE ([5db41d0](https://github.com/GMOD/ixixx-js/commit/5db41d04eb667109667aed3e691eff4d99cb003f))

### Chores

- Render only the commit subject, and link the commit ([f1bcea9](https://github.com/GMOD/ixixx-js/commit/f1bcea933ea10f32e897d28d5da7e584f5d4c37e))
- Create a GitHub release for each published tag ([e50ba3e](https://github.com/GMOD/ixixx-js/commit/e50ba3e9997a828a3cf8343934067e6f231cfb84))
- Enforce type strippability in tsconfig ([a19d729](https://github.com/GMOD/ixixx-js/commit/a19d729f3c2271a8525328e23846fbc815d18094))

### Performance Improvements

- A term shared by many records made the whole ix quadratic ([efab8e4](https://github.com/GMOD/ixixx-js/commit/efab8e494bced420b195fb411cb202e092e93777))

### Refactoring

- One bin rule, not two spellings of it ([200c92a](https://github.com/GMOD/ixixx-js/commit/200c92ac8c93cfb6cf887e5b1711d52adc6b0493))
- Drop a redundant cursor and a redundant default ([ffe086c](https://github.com/GMOD/ixixx-js/commit/ffe086c5c2be6c3375ba256d09f62eb8a9d3ae5d))

### Tests

- The loop test spent the whole budget proving something smaller ([5ab2789](https://github.com/GMOD/ixixx-js/commit/5ab27898442429ab8b50a44efea81831ba2c2db2))

## [3.0.12](https://github.com/GMOD/ixixx-js/compare/v3.0.11...v3.0.12) (2026-08-10)

### Chores

- Drop eslint-plugin-unicorn
- Type-check the tests and enforce prettier, as @gmod/bam does
- Let npm publish stop auto-correcting repository.url
- Exempt our own packages from the release quarantine
- Bump pnpm/action-setup to v6.0.10
- Run the test suite as `pnpm test --run`
- Gate preversion on format:check, as CI does
- Gate preversion on typecheck too, as CI does
- Converge package.json on the shape its siblings use

### Documentation

- Mark breaking changes in the generated changelog

### Other Changes

- Revert "chore: converge package.json" — the CHANGELOG prettier step ([b3c833e](https://github.com/GMOD/ixixx-js/commit/b3c833efe83545369fdb670365fcd1afbad42038))

## [3.0.11](https://github.com/GMOD/ixixx-js/compare/v3.0.10...v3.0.11) (2026-08-01)

### Bug Fixes

- Collapse a record repeated for the same word in the ix
- Stop the external sort leaking fds, stalling, and hitting EMFILE
- Count the run to end-of-file when scoring a prefix size

### Chores

- Sha-pin actions, take pnpm version from packageManager, node 24
- Pin pnpm via the `packageManager` field, so local pnpm and CI agree
- Share one eslint-plugin-unicorn opt-out list across the repos
- Turn off unicorn/prefer-early-return across the repos
- Add git-cliff for changelog generation

### Documentation

- Backfill changelog for v2.2.3 through v3.0.10

### Refactoring

- Set exitCode in the cli instead of calling process.exit

### Tests

- Cover the pure-JS sort fallback end to end

# v3.0.10

- Fix ixx byte offsets for non-ASCII input: offsets were computed from
  string length rather than bytes, so any non-ASCII text in the ix shifted
  every later address and byte-range lookups landed mid-line
- Fix silent success when the `sort` subprocess fails after reading its
  input (e.g. TMPDIR out of space), which previously produced a truncated
  index that reported success
- Fix hang when the input stream errors during external sort, since
  `pipe()` does not forward errors to the splitter
- Fix incorrect term extraction for lines with leading/trailing whitespace
- Fix the pure-JS sort fallback (used on Windows, or when `sort` is
  unavailable) to order lines by UTF-8 bytes like `LC_ALL=C sort`, so ix
  output is consistent across platforms
- Fix `commandExistsSync` accepting a directory named `sort` as the
  executable
- Close temp file handles left open when a merge consumer stops early or
  prefix optimization throws
- Substantial speedups to `optimizePrefixSize` and `makeIx` (roughly 10x
  and 2x respectively, measured on 300k input lines)
- Mark the package side-effect free apart from the CLI entry point, for
  better tree-shaking

# v3.0.9

- CI: rename the merged publish workflow back to publish.yml so npm
  trusted publishing's OIDC trust config keeps matching

# v3.0.8

- CI: gate npm publish on the test job (lint, build, test) passing in the
  same workflow run

# v3.0.7

- Fix README inaccuracies

# v3.0.6

- Fix `optimizePrefixSize` never evaluating the maximum prefix size (40)
- Simplify the external-sort merge heap and stream helpers; drop the
  unused `tempDir` parameter from `sortLines`

# v3.0.5

- Fix external-sort temp files not being cleaned up when a run errored
- Drop runtime dependencies on `command-exists` and `tmp`, replacing them
  with small fs-based helpers

# v3.0.4

- Migrate build tooling from yarn to pnpm
- Update to TypeScript 6 with nodenext module resolution
- Add npm trusted publishing (provenance) via GitHub Actions
- Enable stricter type-checking (noUncheckedIndexedAccess) throughout

# v3.0.3

- Inline the external-sorting module as our own implementation to fix ESM
  usage issues, replacing the `external-sorting` npm dependency

# v3.0.2

- Internal: explicit `.ts` import extensions for nodenext module
  resolution

# v3.0.1

- Internal: dependency bumps and tsconfig cleanup

# v3.0.0

- Replace the `external-sorting` npm dependency with an in-house external
  merge sort
- Compute prefix-size optimization stats for all candidate prefix sizes in
  a single pass instead of re-reading the file once per size
- Migrate tests from jest to vitest

# v2.2.3

- Fix usage on Windows by avoiding the external GNU `sort` dependency

# v2.2.2

- Fix external-sorting piping system

# v2.2.1

- Use more extensive pipeline() functions to avoid listening to explicit stream signals which are tricky to understand

# v2.2.0

- Restore external-sorting pure-JS sort

# v2.1.1

- More accurately determine end of stream

# v2.1.0

- Use GNU sort instead of javascript NPM external-sort module, this should be significantly faster for the sort step and may help with potential memory leak issues

# v2.0.1

- Use commonjs + es2015 instead of relying on es5 setting to make commonjs
  modules

# v2.0.0

- Automatically optimize prefix size. Previously this was manually provided or
  defaulted to 5. We now automatically try to calculate this if no prefix size
  is provided. This will try to make each bin from the ixx index approximately
  64kb

# v1.0.21

- Export the makeIxx function

# v1.0.20

- Add configurable prefixSize parameter to ixIxx and ixIxxStream, can be used if
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
