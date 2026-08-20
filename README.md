# My Finance Records · V15.2.13

Local-first personal and household finance PWA with multi-profile support and optional encrypted Supabase synchronization.

## Project status

Current release: **V15.2.13 · Production UI/UX Consistency**
Released: **August 20, 2026**
Finance Schema: **12**
Cloud Schema: **V3**
Routine cloud sync cadence: **5 minutes**

V15.2.13 compacts the phone Budget & Expenses layout, standardizes desktop toolbar and summary-card spacing, and removes moving summary feedback while retaining accessible touch targets and reduced-motion support. Finance data, calculations, schemas, and the five-minute sync cadence remain unchanged.

For complete release history, see [`CHANGELOG.md`](CHANGELOG.md).

## Repository map

```text
.github/        GitHub Actions, Dependabot, CODEOWNERS, PR template
assets/         Application CSS and JavaScript source
  css/          Stylesheets and compatibility layers
  js/           Finance, sync, UI, and feature modules
  js/ui/        Focused user-interface modules
docs/           Setup, migration, release, and architecture documentation
icons/          Runtime icon assets
scripts/        Runtime preparation, install, and audit helpers
supabase/       Database schema, policies, SQL helpers, and Edge Functions
tests/          Browser, finance, regression, security, sync, and helper tests
vendor/         Vendored browser dependencies
```

See [`docs/architecture/README.md`](docs/architecture/README.md) for ownership rules and the staged repository-organization plan.

## Main application files

- `index.html` — application shell and remaining legacy inline runtime
- `assets/js/` — extracted JavaScript modules
- `assets/css/` — application and responsive styles
- `sw.js` — service worker and PWA cache delivery
- `manifest.webmanifest` — PWA metadata
- `sync-config.js` — hosted sync/release compatibility layer
- `version.json` — canonical release and schema metadata
- `server.js` — local development server

## Development

Requirements:

- Node.js **22 or newer**
- npm

Install dependencies:

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

Run locally:

```bash
npm run dev
```

Run source quality checks:

```bash
npm run quality
```

Run browser validation:

```bash
npx playwright install chromium
npm run test:browser
```

Run the full CI-equivalent validation:

```bash
npm run quality:ci
```

## Test organization

Tests are grouped by responsibility:

- `tests/browser/` — browser behavior, accessibility, and interaction coverage
- `tests/finance/` — finance workflows and calculations
- `tests/regression/` — release and UI regression contracts
- `tests/security/` — privacy, import, and security behavior
- `tests/sync/` — multi-device and cloud-sync behavior
- `tests/helpers/` — repository inspection and maintenance utilities

## Architecture direction

Repository cleanup is intentionally incremental because the application is installed as a PWA and must preserve old client compatibility while modules are extracted.

The current direction is:

1. Keep `index.html` moving toward an application shell rather than a monolithic runtime.
2. Group new JavaScript modules by responsibility instead of expanding the flat `assets/js/` directory.
3. Keep active filenames stable; preserve release history in Git, `CHANGELOG.md`, Releases, and `version.json` rather than adding new versioned filenames when compatibility does not require them.
4. Keep configuration, sync logic, UI behavior, and release compatibility in separate modules as extraction continues.
5. Keep tests organized by subsystem and make CI paths follow that structure.
6. Move historical release detail out of this README so the project entry page stays useful to contributors.

## Cloud sync and privacy

The application is local-first. Cloud synchronization is optional and uses Supabase-compatible publishable/anon browser credentials only. Never place a Supabase `service_role` key or other privileged secret in browser-delivered files.

Changes to sync, encryption, finance records, balances, payment state, or storage migrations require explicit regression coverage and a recovery-safe migration plan.

See [`PRIVACY.md`](PRIVACY.md) and [`SECURITY.md`](SECURITY.md).

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing the project. In particular:

- start from the latest `main`
- keep branches and pull requests focused
- use Conventional Commit titles
- preserve finance and sync compatibility unless the approved scope explicitly changes it
- run quality and browser validation before merge

## Documentation

Documentation is indexed in [`docs/README.md`](docs/README.md).

Key areas:

- [`docs/setup/`](docs/setup/) — setup guidance
- [`docs/migration/`](docs/migration/) — migration notes
- [`docs/release/`](docs/release/) — release documentation
- [`docs/architecture/`](docs/architecture/) — repository and module organization

## Release history

The full chronological history belongs in [`CHANGELOG.md`](CHANGELOG.md). GitHub Releases and repository history should be used for older implementation details so this README remains compact and current.
