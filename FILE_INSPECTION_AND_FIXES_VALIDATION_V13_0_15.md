# V13.0.15 File Inspection and Fixes Installer Validation

## Installer purpose
The macOS `.command` installer verifies the embedded V13.0.15 payload, inspects the target Git repository, preserves the local `sync-config.js`, refuses to overwrite unexpected user edits, applies safe release files, then runs project inspection and quality validation.

## Tests actually performed in this environment
The installer was executed with its explicit Linux test mode because a native macOS runtime is not available here.

Successful upgrade/install paths:
- Clean reviewed V13.0.3 fixture → V13.0.15.
- V13.0.4 → V13.0.15.
- V13.0.5 → V13.0.15.
- V13.0.6 → V13.0.15.
- V13.0.7 → V13.0.15.
- V13.0.8 → V13.0.15.
- V13.0.9 → V13.0.15.
- V13.0.10 → V13.0.15.
- V13.0.11 → V13.0.15.
- V13.0.12 → V13.0.15.
- V13.0.13 → V13.0.15.
- V13.0.14 → V13.0.15.

Safety/repeat tests:
- Re-running V13.0.15 completed verification-only behavior successfully.
- A missing V13.0.15 validation file was restored on repeat run.
- A customized `sync-config.js` retained the same SHA-256 before and after installation.
- A genuine local edit to V13.0.14 `index.html` was rejected instead of overwritten.
- A deliberately corrupted installer payload was rejected by SHA-256 verification before installation.
- Final project checks run by the installer include `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check`.

## Native Mac boundary
The installer has not been executed on a real macOS host in this environment. The final Mac-specific verification is to extract the ZIP completely and run `Install_V13_0_15.command` on the user's Mac. The installer itself rejects non-macOS execution unless explicit test mode is enabled.
