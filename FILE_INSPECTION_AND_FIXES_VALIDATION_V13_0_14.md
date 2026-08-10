# V13.0.14 File Inspection and Fixes Installer Validation

## Release
- My Finance Records V13.0.14 · Brave PWA Install Flow
- macOS installer: `Install_V13_0_14.command`
- Installer is repeat-safe and does not commit or push automatically.

## Safety behavior
- Verifies SHA-256 hashes for the complete embedded payload before applying files.
- Preserves the user's existing `sync-config.js`.
- Verifies known local release files before upgrading and refuses unexpected local edits.
- Restores a missing verified V13.0.14 release file on a repeat run.
- Runs `npm ci`, `npm run inspect`, `npm run quality`, and `git diff --check` after installation.

## Tests actually run in the available Linux test mode
- V13.0.13 fixture → V13.0.14 installation: passed.
- Repeat V13.0.14 installation: passed.
- Missing V13.0.14 file restoration: passed.
- Locally edited `index.html` rejection: passed.
- Corrupted embedded payload rejection: passed.
- Repository inspection after install: 0 errors, 0 warnings.
- V13.0.14 quality validation after install: passed.
- Exact final installer ZIP extraction: passed.
- Extracted `Install_V13_0_14.command` retained executable permission `755`.
- Exact extracted installer package successfully upgraded a fresh V13.0.13 fixture to V13.0.14 in Linux test mode.

## Platform limitation
The installer is intended for macOS and checks for Darwin during normal use. These automated installer tests used the installer's explicit Linux test mode. A native macOS double-click/Terminal run is not claimed here and should be verified on the user's Mac.
