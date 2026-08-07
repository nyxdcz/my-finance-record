# V13.0.3 File Inspection and Fixes Validation

## Inspection scope

- Required repository files and directories.
- Local `src`/`href` references in `index.html`.
- Manifest icon paths and service-worker app-shell paths.
- GitHub Pages deployment source paths.
- `package.json`, `package-lock.json`, and `version.json` consistency.
- Node.js quality-script target and locked npm metadata.
- Unix file readability, world-writable files, and special permission bits.
- `sync-config.js` check for forbidden Supabase secret/service-role key patterns.

## Safe fixes included

- Added `npm run inspect` for repeatable repository inspection.
- Added simple macOS File Inspection and Fixes installer instructions to `README.md`.
- Renamed the stale GitHub Actions display label from `V12 regression quality` to `Regression quality`; workflow behavior is unchanged.

## Validation actually performed

Build/test environment: Linux x86_64, Node.js `v22.16.0`, npm `10.9.2`.

- `npm ci --ignore-scripts --no-audit --no-fund` passed.
- `npm run inspect` passed with 0 errors and 0 warnings.
- `npm run quality` passed with the V13.0.3 validator.
- `bash -n Install_V13_0_3.command` passed.
- Full installer upgrade simulation from a local Git repository containing V13.0.2 passed.
- A second installer run against the already-applied, uncommitted V13.0.3 working tree passed, confirming repeat-safe behavior.
- A missing tracked-file simulation restored the file and completed successfully.
- A real uncommitted README edit was correctly refused instead of overwritten.
- `git diff --check` passed after installation.
- The final ZIP was extracted, its `.command` executable mode was preserved as `755`, and the installer was run again from that extracted ZIP against a fresh local V13.0.2 Git origin; it passed.

## macOS limitation

The build/test environment is **not macOS**. Finder double-click launch and execution with the macOS versions of Git, Bash, and Node were not available, so those Mac-specific steps were **not actually tested in this session**. The installer intentionally refuses non-macOS execution unless its internal test mode is enabled. Run the Mac test steps in `README_INSTALLER.txt` before publishing.
