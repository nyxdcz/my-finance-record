# V13.0.7 File Inspection and Fixes Installer Validation

## Installer scope
- macOS `.command` installer for V13.0.7 Budget Plan Compact Layout.
- Defaults to `~/Documents/My_Finance_Records`.
- Verifies the installer payload with SHA-256 before applying files.
- Preserves the existing repository `sync-config.js`.
- Supports the reviewed GitHub V13.0.3 baseline and known local V13.0.4, V13.0.5, and V13.0.6 working states.
- Refuses to overwrite unexpected local edits.
- Restores missing V13.0.7 payload files on a safe repeat run.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` after installation.
- Does not commit or push automatically.

## Tests actually run
The installer was executed in explicit Linux test mode because this environment is not macOS. The same shell workflow and payload verification paths were executed; Finder double-click and the Darwin runtime were not claimed as tested.

Passed scenarios:
- Clean reviewed V13.0.3 repository → V13.0.7.
- Local uncommitted V13.0.4 → V13.0.7.
- Local uncommitted V13.0.5 → V13.0.7.
- Local uncommitted V13.0.6 → V13.0.7.
- Repeat V13.0.7 installation / verification.
- Missing V13.0.7 release-file recovery.
- Existing `sync-config.js` preserved byte-for-byte.
- Unexpected local edit rejected instead of overwritten.
- Corrupted payload rejected by SHA-256 verification.

## Project checks
- Repository inspection: 0 errors, 0 warnings.
- V13.0.7 quality validation: passed.
- Git whitespace / patch cleanliness: passed in installer simulations.

## macOS verification still required
Run the final extracted `Install_V13_0_7.command` on the user's Mac. A successful Mac run should finish with `SUCCESS · V13.0.7 was applied and verified.` or the repeat-run equivalent.

## Final archive verification
- The packaged installer ZIP was extracted successfully.
- `Install_V13_0_7.command` retained executable permission `755` in the extracted archive.
- The extracted installer was executed against a fresh simulated local V13.0.6 repository and completed with `SUCCESS · V13.0.7 was applied and verified.`
- The packaged PWA ZIP was separately extracted and passed `npm run inspect` and `npm run quality` again.
