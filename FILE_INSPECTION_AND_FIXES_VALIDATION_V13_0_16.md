# V13.0.16 File Inspection and Fixes Installer Validation

Date: 2026-08-07

## Installer behavior

The V13.0.16 macOS `.command` installer:

- verifies its complete payload with SHA-256 before changing the repository;
- accepts the reviewed local V13 release states through V13.0.15;
- preserves `sync-config.js`;
- refuses to overwrite unexpected local edits;
- restores safe missing tracked release files;
- can be run again safely after V13.0.16 is already installed;
- runs `npm ci`, `npm run inspect`, `npm run quality`, `git diff --check`, installed-payload verification, and final version verification;
- does not commit or push automatically.

## Tests actually performed

Before delivery the installer was exercised in the available Linux test mode with fixture repositories. The matrix covered:

- local V13.0.15 → V13.0.16;
- repeat V13.0.16 installation;
- safe missing-file recovery;
- preservation of `sync-config.js`;
- rejection of an unexpected locally edited release file;
- rejection of a corrupted installer payload;
- extraction of the final ZIP and execution of that exact packaged installer;
- preservation of executable permission on `Install_V13_0_16.command`.

The final installed project was rechecked with `npm run inspect`, `npm run quality`, and `git diff --check`.

## Platform statement

The automated installer matrix was run in Linux test mode because this execution environment is not macOS. Native Finder / Terminal execution on macOS is **not claimed**. The user's Mac run remains the final platform-specific validation.
