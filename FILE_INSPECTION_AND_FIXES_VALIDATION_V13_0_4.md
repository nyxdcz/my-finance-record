# V13.0.4 File Inspection and Fixes Installer Validation

## Scope
- macOS `.command` installer for My Finance Records V13.0.4.
- Reviewed baseline: GitHub `main` V13.0.3 commit `d7ef1ab9298fa0f4a0108232f604cb6c8f78a214`.
- Default target: `~/Documents/My_Finance_Records`.

## Safety behavior
- Requires macOS, Git, Node.js 22+, npm, and `shasum`.
- Clones `main` when the target repository does not exist.
- Uses `git pull --ff-only` for a clean existing checkout.
- Restores only accidentally missing tracked files before inspection.
- Stops on genuine uncommitted edits rather than overwriting them.
- Preserves the repository copy of `sync-config.js`.
- Verifies the embedded payload SHA-256 manifest before applying files.
- Accepts V13.0.3 as the reviewed upgrade baseline and V13.0.4 as an idempotent re-run state.
- Does not commit or push automatically.

## Verification performed by the installer
1. `npm ci --ignore-scripts --no-audit --no-fund`
2. `npm run inspect`
3. `npm run quality`
4. `git diff --check`
5. Expected changed-file allow-list validation
6. Final package version check for `13.0.4`

## Release protection
Finance Schema 12, Cloud Schema V3, encrypted profile data, account ledger behavior, payment logic, stored records, and local `sync-config.js` are not rewritten by installer-specific logic.
