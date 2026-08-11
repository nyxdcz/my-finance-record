# V13.0.18 File Inspection and Fixes Installer Validation

## Installer scope
- macOS `.command` installer with Linux-only explicit test mode for automated validation.
- Payload SHA-256 verification before modifying the target repository.
- V13.0.17 local-base verification before upgrade.
- Repeat-safe V13.0.18 verification.
- Missing verified release-file recovery.
- Preservation of an existing `sync-config.js`.
- Refusal to overwrite a genuinely edited V13.0.17 release file.
- Repository inspection, V13.0.18 quality validation, `git diff --check`, installed-payload checksum verification, and final version verification.

## Tests actually executed
All automated installer tests below were run in the available Linux environment with `FILE_FIXES_TEST_MODE=1`; they are not claimed as native macOS execution.

### V13.0.17 → V13.0.18
- Created a clean Git repository fixture from the actual V13.0.17 project.
- Ran the packaged installer.
- Result: **SUCCESS**.
- Final `npm run inspect`: **0 errors, 0 warnings**.
- Final `npm run quality`: **passed**.

### Repeat installation
- Ran the same installer again against the already-applied V13.0.18 fixture.
- Result: **SUCCESS · V13.0.18 is already installed and verified**.

### Missing-file recovery
- Deleted `privacy-lock.js` from the V13.0.18 fixture and reran the installer.
- Installer restored the verified missing release file before validation.
- Result: **SUCCESS**.

### `sync-config.js` preservation
- Added a custom sentinel to the V13.0.17 fixture’s `sync-config.js` before upgrading.
- After installation, the custom sentinel remained present.
- Result: **passed**.

### Local-edit protection
- Added a user edit to V13.0.17 `index.html` before running the installer.
- Installer stopped with `Local V13.0.17 file was edited after installation: index.html`.
- Result: **passed — user edit was not overwritten**.

### Corrupted payload rejection
- Modified the installer payload’s `privacy-lock.js` after checksums were generated.
- Installer rejected the package at the payload-verification stage before applying changes.
- Result: **passed**.

## Final-package permission check
The extracted `Install_V13_0_18.command` permission was verified as **755** in the test environment.

## Limitation
A native macOS Finder/Terminal execution is not available in this environment. The user’s Mac remains the final macOS-specific verification.
