# Contributing

## Development

```sh
pnpm install
pnpm test
pnpm build
```

```sh
pnpm version patch  # or minor/major
```

`pnpm version` runs lint, format, types, tests and build, regenerates
CHANGELOG.md with git-cliff, then pushes the tag, which triggers the publish
workflow.

## Publishing

GitHub Actions publishes each release to npm with trusted publishing (OIDC, no
stored token). The workflow requires `--provenance` and `id-token: write`
permissions.

ixixx-js is already configured for trusted publishing. To set up a new package,
run `npm trust github <pkg> --file publish.yml --repo GMOD/<repo>` (requires
npm >=11.10.0 and 2FA).

Once npm publish succeeds, the `release` job creates the GitHub release for the
tag, with that version's CHANGELOG.md section as its notes.
`scripts/release-notes.sh` extracts the section, so run the script with a
version to preview a release's notes.
