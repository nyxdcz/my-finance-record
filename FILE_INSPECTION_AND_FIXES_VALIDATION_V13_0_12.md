# V13.0.12 File Inspection and Fixes Installer Validation

## Installer scope
- macOS `.command` installer for My Finance Records V13.0.12.
- Repeat-safe installation and verification.
- Preserves `sync-config.js`.
- Repairs safe missing release files.
- Refuses to overwrite unexpected or edited local release files.
- Verifies installer payload SHA-256 before applying files.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` after installation.
- Verifies installed payload hashes and the final package version.

## Actual automated installer matrix
The installer was exercised in explicit Linux test mode against:
- Published V13.0.3 baseline → V13.0.12: passed.
- Local V13.0.4 → V13.0.12: passed.
- Local V13.0.5 → V13.0.12: passed.
- Local V13.0.6 → V13.0.12: passed.
- Local V13.0.7 → V13.0.12: passed.
- Local V13.0.8 → V13.0.12: passed.
- Local V13.0.9 → V13.0.12: passed.
- Local V13.0.10 → V13.0.12: passed.
- Local V13.0.11 → V13.0.12: passed.
- Repeat V13.0.12 verification: passed.
- Missing V13.0.12 validation file recovery: passed.
- Existing `sync-config.js` preservation: passed by before/after SHA-256 comparison.
- Locally edited V13.0.11 `index.html` rejection: passed; installer stopped instead of overwriting it.
- Corrupted installer payload rejection: passed; SHA-256 verification stopped installation before any payload apply.

## Repository checks
- `npm run inspect`: 0 errors, 0 warnings.
- `npm run quality`: passed.
- Required runtime files, local HTML paths, service-worker shell paths, GitHub Pages deployment sources, package metadata, and public sync configuration are consistent.

## Test environment limitation
The automated installer matrix was run in Linux test mode because this execution environment is not macOS. Native macOS Finder double-click / Terminal execution is **not claimed** here. The user’s Mac run remains the final Mac-specific verification.

## Final archive verification
- The generated installer ZIP was extracted again after packaging.
- `Install_V13_0_12.command` retained executable permission `755`.
- That exact extracted installer successfully upgraded a V13.0.11 fixture to V13.0.12 and completed repository inspection, quality validation, payload verification, and `git diff --check`.
- The generated PWA ZIP was extracted independently; `npm ci`, `npm run inspect`, and `npm run quality` passed from the extracted archive.
