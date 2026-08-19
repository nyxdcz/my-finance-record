# Repository Architecture

This document defines the target organization for My Finance Records and the rules for reaching it without breaking installed PWA clients or finance/sync compatibility.

## Goals

- Keep the root repository easy to scan.
- Keep runtime code grouped by responsibility.
- Reduce new release-specific filenames in active source.
- Keep `index.html` moving toward a small application shell.
- Preserve installed-PWA compatibility while modules are extracted.
- Keep tests and documentation organized by subsystem.

## Current ownership

### `assets/js/`

Application JavaScript. Existing flat files remain valid while extraction is in progress, but new modules should prefer responsibility-based folders when practical.

Recommended destinations:

```text
assets/js/
  core/       bootstrapping, shared state, storage adapters
  config/     runtime configuration readers and constants
  finance/    ledger, budget, income, expense, payment logic
  sync/       Supabase sync, conflict resolution, lifecycle
  ui/         dialogs, menus, help, interaction-only modules
  features/   feature modules that do not fit finance/sync/ui
```

Do not move a production file only for aesthetics if an installed client, service worker, test, or Pages package still depends on its current URL. Prefer an extraction plus compatibility-loader approach when a URL must remain stable.

### `assets/css/`

Application styling. Existing release-specific styles remain until their compatibility requirements are understood.

Long-term grouping:

```text
assets/css/
  base/        tokens, reset, typography, foundational layout
  components/  buttons, dialogs, tabs, toasts, controls
  features/    dashboard, finance, work, reports
  responsive/  phone/tablet-specific layout rules
```

New styles should avoid creating another release-numbered file unless the filename itself is required for cache or installed-client compatibility.

### `tests/`

Tests are already grouped by responsibility:

```text
tests/
  browser/
  finance/
  helpers/
  regression/
  security/
  sync/
```

Keep new tests in the matching subsystem. Test filenames should describe the behavior being protected. A release number may be retained where a test intentionally protects a historical compatibility contract, but it should not be the default naming pattern for new tests.

### `docs/`

- `architecture/` — long-lived structural decisions
- `setup/` — setup and environment instructions
- `migration/` — schema/data/client migration notes
- `release/` — release-specific operational documentation

Chronological release notes belong in `CHANGELOG.md`, not in the root README.

### `supabase/`

Current SQL files remain in place until a dedicated database migration pass is approved. The target shape is:

```text
supabase/
  functions/
  migrations/
  tests/
  schema.sql
```

Future database changes should prefer ordered migrations and separate RLS/database tests from production schema files.

## Root-file policy

The repository root should contain only files that contributors or runtime tooling need immediately, such as:

- `index.html`
- `offline.html`
- `sw.js`
- `manifest.webmanifest`
- `server.js`
- `version.json`
- `package.json`
- `package-lock.json`
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `PRIVACY.md`
- `SECURITY.md`
- required runtime compatibility files

Do not add historical copies, temporary exports, generated reports, or release-note documents to the root when an existing organized directory is suitable.

## Stable filename policy

Prefer stable active filenames such as:

- `projects-calendar.js`
- `pwa-update.js`
- `desktop.css`
- `mobile.css`

instead of creating a new active file for every application release.

Exceptions are allowed when the current service-worker/PWA compatibility strategy explicitly requires an old URL. In that case:

1. keep the old URL available,
2. move implementation into the organized source location,
3. leave a small compatibility loader or generated mapping at the legacy URL,
4. add regression coverage before removing the legacy path later.

## `index.html` extraction rule

`index.html` should gradually become an application shell containing markup, loading declarations, and minimal bootstrapping.

When extracting a subsystem:

1. identify one coherent responsibility,
2. move it to `assets/js/<area>/...`,
3. preserve required global APIs temporarily,
4. keep legacy runtime URLs working when needed,
5. update service-worker and Pages packaging only if required,
6. add source and browser regression tests,
7. verify finance/sync behavior remains unchanged when the extraction is structural only.

Avoid large rewrites that combine multiple unrelated extractions.

## `sync-config.js` direction

The long-term goal is for configuration to be configuration, not a catch-all runtime layer.

Future approved extractions should separate:

- hosted/public sync configuration,
- release metadata,
- UI enhancement behavior,
- screenshot/tool wiring,
- sync lifecycle logic,
- embedded CSS.

Do this incrementally because existing production URLs and installed clients may depend on the current compatibility layer.

## Release and versioning rules

- Behavior or runtime releases follow the repository versioning rules in `CONTRIBUTING.md` and `AGENTS.md`.
- Documentation-only repository organization does not require an application version bump when runtime/PWA output is unchanged.
- Release history belongs in `CHANGELOG.md` and GitHub Releases.
- `version.json` remains the canonical structured release/schema metadata for the deployed application.

## Safe migration sequence

Recommended order for future organization work:

1. Documentation and stale PR cleanup.
2. Test-suite organization and path fixes.
3. Extract focused inline `index.html` subsystems.
4. Separate responsibilities currently accumulated in compatibility files such as `sync-config.js`.
5. Group JavaScript modules by domain while preserving legacy URLs.
6. Consolidate CSS by component/feature after compatibility coverage is sufficient.
7. Reorganize Supabase SQL into migrations/tests.
8. Remove obsolete compatibility files only after installed-client and service-worker coverage proves they are no longer needed.

Each phase should be a focused PR with explicit preserved behavior and passing quality/browser checks.
