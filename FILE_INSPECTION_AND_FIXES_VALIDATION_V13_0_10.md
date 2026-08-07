# V13.0.10 File Inspection and Fixes Installer Validation

## Installer purpose

The V13.0.10 macOS `.command` installer applies the reviewed Account Spending from Balance release to `~/Documents/My_Finance_Records`, preserves the user's existing `sync-config.js`, refuses unsafe local overwrites, and verifies the repository after installation. It does not commit or push.

## Repository inspection

Before packaging, the V13.0.10 project passed:

- `npm run inspect` — **0 errors, 0 warnings**
- `npm run quality` — **passed**
- JavaScript syntax validation — **passed**
- required-file, local-path, deploy-path, package-metadata, permission, and public sync-configuration checks — **passed**

## Installer safety tests actually performed

The installer was executed in explicit Linux test mode against disposable Git repositories for these starting versions:

- published/reviewed V13.0.3 baseline → V13.0.10 — passed
- local V13.0.4 → V13.0.10 — passed
- local V13.0.5 → V13.0.10 — passed
- local V13.0.6 → V13.0.10 — passed
- local V13.0.7 → V13.0.10 — passed
- local V13.0.8 → V13.0.10 — passed
- local V13.0.9 → V13.0.10 — passed

Additional safety cases:

- repeat V13.0.10 installation/verification — passed
- missing tracked V13.0.10 file recovery — passed
- existing `sync-config.js` preservation — passed by SHA-256 comparison
- genuine local edit protection — installer stopped instead of overwriting an edited V13.0.9 `index.html`
- corrupted payload detection — installer rejected a modified payload before applying it
- shell syntax validation with `bash -n` — passed

## Installer behavior

The installer:

1. verifies the embedded payload with SHA-256;
2. checks Git, Node.js 22+, npm, and `shasum`;
3. uses/clones the expected repository on `main`;
4. verifies a recognized source version before updating;
5. preserves the repository's local `sync-config.js`;
6. applies only the verified release payload;
7. runs `npm ci --ignore-scripts --no-audit --no-fund`;
8. runs `npm run inspect`;
9. runs `npm run quality`;
10. runs `git diff --check`;
11. verifies installed payload hashes and the final V13.0.10 package version;
12. leaves commit and push to the user.

## Native macOS limitation

The `.command` installer was not executed on a native macOS host in this environment. The automated installer matrix above used Linux test mode. Finder launch, Gatekeeper behavior, and the user's installed macOS Git/Node/npm environment require final confirmation on the user's Mac before claiming native macOS execution testing.

## Final archive verification

After the installer ZIP and full-project ZIP were generated, the exact archives were extracted into fresh test directories.

- The extracted `Install_V13_0_10.command` retained Unix executable mode **755**.
- The exact extracted installer upgraded a disposable local V13.0.9 repository to V13.0.10 and reached the installer's success state.
- The same exact extracted installer was run a second time and reached the already-installed verification success state.
- The exact extracted full-project ZIP passed `npm run inspect` and `npm run quality` again.

These final archive checks were also performed in the available Linux test environment, not on native macOS.
