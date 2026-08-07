# V13.0.13 File Inspection and Fixes Installer Validation

## Installer scope
- Safe macOS update of My Finance Records to V13.0.13.
- SHA-256 verification of the embedded payload before installation.
- Preserve the user's `sync-config.js`.
- Refuse to overwrite unexpected or edited local release files.
- Restore missing verified release files on repeat runs.
- Run `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` after installation.
- Never commit or push automatically.

## Project inspection
- Required runtime/deployment files: checked.
- Local paths and GitHub Pages asset list: checked.
- npm metadata and Node >=22 requirement: checked.
- Public sync-configuration safeguards: checked.
- `npm run inspect`: 0 errors, 0 warnings.
- `npm run quality`: V13.0.13 regression suite passed.

## Installer simulations actually run
Tests used `FILE_FIXES_TEST_MODE=1` in the available Linux environment.

- Local V13.0.12 -> V13.0.13 update: passed.
- Second/repeated V13.0.13 run: passed.
- Missing V13.0.13 validation file recovery: passed.
- Existing `sync-config.js` byte-for-byte preservation: passed.
- Modified local V13.0.12 `index.html` rejection: passed.
- Corrupted installer payload SHA-256 rejection: passed.

An earlier broad matrix run also completed V13.0.3 and local V13.0.4 through V13.0.11 upgrade cases before the environment command timeout. The focused final safety matrix above was then completed through all intended repeat/safety cases.

## Environment limitation
These tests validate installer shell logic and repository transformations, but they are not native macOS Finder/Terminal execution. The final Mac-specific verification must be performed by running `Install_V13_0_13.command` on macOS.

## Exact distributable-package verification
After generating the final ZIPs, the PWA ZIP was extracted and its exact contents passed `npm ci`, `npm run inspect`, and `npm run quality` again. The installer ZIP was extracted, `Install_V13_0_13.command` retained mode `755`, the exact extracted installer successfully upgraded a local V13.0.12 fixture to V13.0.13, and a second run completed the already-installed verification path successfully.
