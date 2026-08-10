# V13.0.17 File Inspection and Fixes Installer Validation

Date: 2026-08-07

## Installer scope

- Applies the verified V13.0.17 payload to the local `My_Finance_Records` repository.
- Accepts a verified local V13.0.16 working copy and retains support metadata for earlier V13 release paths.
- Preserves an existing `sync-config.js` instead of replacing device/cloud configuration.
- Refuses to overwrite a verified release file when it has been edited locally.
- Restores safe missing V13.0.17 release files on a repeat run.
- Verifies installer payload SHA-256 hashes before applying files.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` before reporting success.
- Does not commit or push automatically.

## Tests actually executed

All installer execution tests below were run in the available Linux environment with `FILE_FIXES_TEST_MODE=1`. Native macOS Finder/Terminal execution was not available and is not claimed.

### V13.0.16 → V13.0.17 upgrade

Passed.

The installer detected V13.0.16, verified the known local release files, applied the V13.0.17 payload, and completed:

- repository inspection: 0 errors, 0 warnings
- V13.0.17 quality validation: passed
- Git whitespace/patch check: passed
- final version verification: 13.0.17

### Repeat installation

Passed.

Running the installer again on V13.0.17 entered verification-only mode and completed successfully.

### `sync-config.js` preservation

Passed.

A custom `sync-config.js` was added before the repeat run. Its SHA-256 hash was identical before and after the installer. Installed-payload verification intentionally excludes this device-specific file while payload integrity still protects the packaged default copy.

### Missing-file recovery

Passed.

`IPHONE_INPUT_ZOOM_VALIDATION_V13_0_17.md` was removed from an installed V13.0.17 fixture. A repeat run restored the verified copy and completed validation.

### Local-edit protection

Passed.

A V13.0.16 fixture with a manual edit appended to `index.html` was rejected before the update with a clear local-edit error. The installer did not overwrite the edited file.

### Corrupted-payload rejection

Passed.

A copied installer package with a modified payload `index.html` failed the SHA-256 integrity check before any update was applied.

## macOS-specific final check

The `.command` script includes a Darwin guard and is intended for macOS. The final user-side Mac check should:

1. Extract the entire installer ZIP.
2. Double-click `Install_V13_0_17.command` or right-click → Open if Gatekeeper asks.
3. Confirm Terminal reports `SUCCESS`.
4. Run `npm run inspect`, `npm run quality`, and `git status` from `~/Documents/My_Finance_Records`.

No native macOS execution is claimed in this report.
