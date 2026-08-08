# File Inspection and Fixes Installer Validation

## Installer scope

- Tracked macOS installer: `scripts/file-inspection-and-fixes.command`.
- Verifies Git and Node.js 22+ before changing the target repository.
- Restores only an absent critical file that is tracked in the target repository's current `HEAD`; modified files are not overwritten.
- Rebuilds ignored npm metadata with `npm ci --ignore-scripts --no-audit --no-fund`.
- Runs repository inspection, the complete quality validation, and `git diff --check` before reporting success.
- Can create a fresh clone when the standalone script is run outside a repository. It never commits or pushes.

## Tests executed on macOS

These commands were run in a native Apple Silicon macOS shell with Node.js `v24.18.0` and npm `11.16.0`:

```bash
npm run inspect
npm run installer:test
bash scripts/file-inspection-and-fixes.command
npm test
git diff --check
```

All commands passed.

`npm run installer:test` creates an independent temporary Git fixture, deletes `offline.html`, and adds stale data under `node_modules`. Its first installer run restored the deleted tracked file, removed the stale npm data, and completed inspection, quality validation, and whitespace checks. Its second installer run passed without changing the fixture's tracked working tree.

The installer was also run directly against this repository; it required no file repair and completed all verification checks successfully.

## Automated publishing guard

The GitHub Actions workflow runs repository inspection on every pull request and push, and runs the installer regression test on `macos-latest`. GitHub Pages deployment waits for both jobs.

## Limitation

The installer was tested by running it with `bash`. Finder double-click interaction was not tested.
