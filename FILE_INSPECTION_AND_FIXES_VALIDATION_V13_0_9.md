# V13.0.9 File Inspection and Fixes Installer Validation

## Installer scope
- macOS `.command` installer for `~/Documents/My_Finance_Records`.
- Verifies payload SHA-256 before modifying the repository.
- Supports the reviewed GitHub V13.0.3 baseline and verified local V13.0.4–V13.0.8 upgrade states.
- Preserves `sync-config.js`.
- Refuses to overwrite unexpected or edited local files.
- Repairs missing tracked V13.0.9 payload files on repeat runs.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` before reporting success.
- Does not commit or push automatically.

## Actual automated tests performed
The installer was executed in the available Linux environment with `FILE_FIXES_TEST_MODE=1` to exercise the same shell update and validation flow without claiming native macOS execution.

Passed:
- clean reviewed V13.0.3 → V13.0.9
- local V13.0.4 → V13.0.9
- local V13.0.5 → V13.0.9
- local V13.0.6 → V13.0.9
- local V13.0.7 → V13.0.9
- local V13.0.8 → V13.0.9
- repeat V13.0.9 verification
- missing V13.0.9 tracked-file recovery
- `sync-config.js` preservation
- genuine local-edit rejection
- corrupted installer-payload rejection

## Project validation performed
- `npm run inspect`: 0 errors, 0 warnings.
- `npm run quality`: passed V13.0.9 regression suite.
- Browser/device audit with headless Chromium at 1440×900, 1280×800, 1024×768, 393×852, and 360×800.
- No horizontal overflow at tested widths.
- Consecutive account reconciliations refreshed visible account balances immediately.
- Phone toolbar measured 44×44px in Add → Sync → More order with a single SVG plus.
- Project primary/More actions did not overlap at tested desktop/tablet widths.

## macOS limitation
The `.command` file was not executed by Finder or a native macOS shell in this environment. Final macOS execution must be verified on the user's Mac before claiming native macOS testing.
