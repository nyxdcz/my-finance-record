# V13.0.5 File Inspection and Fixes Installer Validation

## Installer behavior
- Targets `~/Documents/My_Finance_Records` on macOS by default.
- Requires Git, npm, and Node.js 22 or newer.
- Verifies every embedded payload file with SHA-256 before touching the repository.
- Accepts the published V13.0.3 GitHub baseline or the already-applied V13.0.4 local release.
- Verifies a local V13.0.4 working copy against reviewed V13.0.4 file hashes before overwriting release files.
- Preserves `sync-config.js` exactly.
- Restores accidentally missing Git-tracked files when safe.
- Refuses to overwrite unexpected local edits.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` after applying V13.0.5.
- Does not commit or push automatically.
- Re-running an installed V13.0.5 release performs verification again instead of reapplying changes.

## Tests actually performed in the available environment
The installer was executed with its explicit test mode on Linux. This validates shell flow and repository behavior but is not a claim that Finder double-click execution was tested on macOS.

Passed scenarios:
1. Clean V13.0.3 Git baseline → V13.0.5 installation.
2. Already-applied, uncommitted V13.0.4 local release → V13.0.5 installation.
3. Second V13.0.5 installer run → verification-only success.
4. Missing Git-tracked `offline.html` → safely restored before installation.
5. Locally customized `sync-config.js` → SHA-256 identical before and after installation.
6. Locally edited V13.0.4 `index.html` → installer stopped before overwriting it.
7. Corrupted embedded README payload → payload SHA-256 verification failed and installer stopped before installation.
8. Installed release completed `npm run inspect`, `npm run quality`, and `git diff --check` successfully.

## Mac verification still required
On the user's Mac, extract the complete ZIP and run `Install_V13_0_5.command`. A successful Mac run should end with `SUCCESS · V13.0.5 was applied and verified.` or the repeat-run equivalent.
