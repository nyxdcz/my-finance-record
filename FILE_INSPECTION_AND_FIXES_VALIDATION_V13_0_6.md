# V13.0.6 File Inspection and Fixes Installer Validation

## Installer scope
- macOS `.command` installer for V13.0.6 Project Revision Cycles.
- Accepts the reviewed published V13.0.3 baseline and verified local V13.0.4 or V13.0.5 working releases.
- Supports safe repeat execution when V13.0.6 is already installed.
- Preserves the user's existing `sync-config.js`.
- Repairs safely recoverable missing tracked files and restores missing current-release files from the verified payload.
- Stops instead of overwriting unexpected or locally edited project files.
- Verifies every embedded payload file with SHA-256 before applying it.
- Runs locked npm metadata installation, repository inspection, full quality validation, `git diff --check`, changed-file allow-list checks, and installed-payload verification.
- Does not commit or push automatically.

## Installer simulations actually run
The following tests were executed successfully in the available test environment:
1. Clean V13.0.3 Git baseline → V13.0.6.
2. Local uncommitted V13.0.4 working release → V13.0.6.
3. Local uncommitted V13.0.5 working release → V13.0.6.
4. Repeat execution on an already-installed V13.0.6 working tree.
5. Recovery when both an unchanged tracked file and a release-modified tracked file were missing.
6. Refusal to overwrite a locally edited V13.0.5 `index.html`.
7. Preservation of a custom local `sync-config.js` byte-for-byte.
8. Rejection of a deliberately corrupted installer payload before the target was modified.
9. Recovery of a missing V13.0.6 release file during a repeat verification run.
10. Installer shell syntax validation with `bash -n` and executable mode verification (`755`).

All installer matrix tests completed with `SUCCESS`, and the installed project finished `npm run inspect`, `npm run quality`, and `git diff --check` successfully.

## Test-environment disclosure
The installer simulations above were executed on Linux x86_64 with explicit `FILE_FIXES_TEST_MODE=1`, Node.js 22.16.0, npm 10.9.2, and Git 2.47.3. This validates the installer shell/Git logic, payload integrity checks, local-version handling, repeat safety, and project verification. It is **not** a claim that Finder double-click execution was tested on macOS. The user's Mac run is the final macOS-specific verification.
