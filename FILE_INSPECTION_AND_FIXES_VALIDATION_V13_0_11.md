# V13.0.11 File Inspection and Fixes Installer Validation

## Installer purpose
The macOS `.command` installer safely upgrades My Finance Records to V13.0.11, verifies the embedded release payload, preserves local public sync configuration, runs repository inspection and regression validation, and stops before commit/push.

## Automated installer tests actually run
Installer tests used `FILE_FIXES_TEST_MODE=1` in the available Linux environment. Native macOS execution is not claimed here.

- Clean V13.0.3 fixture → V13.0.11: passed.
- Local V13.0.4 → V13.0.11: passed.
- Local V13.0.5 → V13.0.11: passed.
- Local V13.0.6 → V13.0.11: passed.
- Local V13.0.7 → V13.0.11: passed.
- Local V13.0.8 → V13.0.11: passed.
- Local V13.0.9 → V13.0.11: passed.
- Local V13.0.10 → V13.0.11: passed.
- Re-running V13.0.11 verification: passed.
- Missing tracked V13.0.11 validation file recovery: passed.
- Existing `sync-config.js` checksum preserved across re-run: passed.
- Genuine local edit to `index.html` rejected instead of overwritten: passed.
- Corrupted installer payload rejected by SHA-256 verification: passed.

## Verification performed after installation
- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run inspect`
- `npm run quality`
- `git diff --check`
- Installed payload SHA-256 comparison
- Installed package version check (`13.0.11`)

## Safety behavior
- The installer never commits or pushes automatically.
- It refuses unexpected local modifications.
- It preserves `sync-config.js` when present.
- It can restore missing release files when V13.0.11 is already installed.
- It can be run more than once safely.
- It requires Node.js 22 or newer.

## Environment note
The installer logic was exercised in Linux test mode because the execution environment is not macOS. The final `.command` must receive its final native macOS verification on the user's Mac.

## Final packaged ZIP verification
After the release files were finalized, the generated installer ZIP was extracted again and the exact packaged `.command` retained mode `755`. That extracted installer successfully upgraded a V13.0.10 fixture to V13.0.11 and then completed a repeat verification run. The separately packaged PWA ZIP was also extracted and passed `npm run inspect` and `npm run quality`.
