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

- Revert "chore: converge package.json" — the CHANGELOG prettier step

Removes `prettier --write CHANGELOG.md` from the `version` script, which the
previous commit added on a premise I did not check.

The reasoning was: git-cliff writes CHANGELOG.md after `preversion` has run, so
the format:check gate structurally cannot see it, while CI checks it on the tag
commit -- a hole the gate cannot cover. The first half is true. The second is
not: **every one of the 20 repos already lists CHANGELOG.md in
.prettierignore**, so CI's format:check skips it too and there was never a hole.

The step was also a no-op, verified rather than assumed: prettier skips an
ignored file even when it is named explicitly on the command line, so a
deliberately mangled CHANGELOG.md came back unchanged.

hclust was the only repo that had this step, which is where I copied it from.
It is reverted there too. The .prettierignore comments in bgzf-filehandle,
cram-js and hclust say why nobody should add it back: reformatting a generated
changelog fights the generator on every release.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

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
