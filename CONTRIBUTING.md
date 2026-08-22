# Contributing

**Talaan V2.0.1** is the current production release. New releases continue forward from V2.0.1 using semantic versioning.

This repository contains a personal finance application. Changes must prioritize data preservation, payment correctness, recovery, and installed-PWA compatibility.

## Workflow

1. Start from the latest `main` branch.
2. Create a focused branch such as `fix/installer-permissions`, `feat/budget-export`, or `docs/repository-organization`.
3. Change only the approved scope.
4. Use a Conventional Commit subject such as `fix: restore installer permissions`; avoid subjects such as `fix`, `update`, or `f`.
5. When behavior or runtime output changes, update the release number, cache key, `version.json`, README/release documentation, changelog, and validation metadata required by the current release process.
6. Run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
npx playwright install chromium
npm run test:browser
```

7. Open a pull request with a Conventional Commit title and complete the safety checklist.
8. Merge only after repository, lint, browser, audit, and deployment prerequisites pass.

Direct pushes to `main` are discouraged. Configure GitHub branch protection to require the **Regression quality** and **Browser privacy and accessibility** checks and at least one pull-request approval when collaborators are present.

`package-lock.json` is the canonical dependency lock. Use `npm ci` for validation and do not add a second package-manager lock without updating CI and contributor documentation.

## Repository organization

Use the existing directory structure instead of adding new root-level files when an established area fits the change.

- `assets/js/` — application JavaScript. Prefer responsibility-based subfolders such as `ui/`, `finance/`, `sync/`, `core/`, `config/`, or `features/` for new extracted modules.
- `assets/css/` — application styles. Prefer component/feature ownership rather than creating another release-specific stylesheet by default.
- `tests/browser/` — browser behavior, accessibility, and interaction coverage.
- `tests/finance/` — finance workflows and calculations.
- `tests/regression/` — release and UI regression contracts.
- `tests/security/` — privacy, import, and security behavior.
- `tests/sync/` — cloud and multi-device behavior.
- `tests/helpers/` — repository inspection and maintenance utilities.
- `docs/architecture/` — long-lived architecture and organization decisions.
- `docs/setup/` — setup guidance.
- `docs/migration/` — migration notes.
- `docs/release/` — release-specific operational documentation.

See `docs/architecture/README.md` for the staged repository-cleanup strategy.

### Filename and compatibility guidance

Prefer stable, responsibility-oriented active filenames. Do not create a new version-numbered production filename solely to record when a change was made; Git history, `CHANGELOG.md`, Releases, and `version.json` preserve release information.

Some active filenames, storage keys, cache migration paths, and identifiers are compatibility contracts for installed PWAs or saved finance data. Their technical names do **not** define the visible product brand. Do not rename them only to match **Talaan** unless the change includes migration, rollback, and regression coverage.

### Documentation guidance

- Keep `README.md` focused on **Talaan V2.0.1** and current project information.
- Keep `CHANGELOG.md` focused on the current Talaan release and future V2 semantic-version updates.
- Keep `SECURITY.md` and `PRIVACY.md` focused on the current security and privacy baseline.
- Keep `version.md` focused on the current production release.
- Do not reintroduce superseded product names or previous product version numbers into current-facing documentation.

## Compatibility rules

- Do not change Finance Schema 12 without a documented migration and rollback plan.
- Do not change Cloud Schema V3 without a documented cloud migration, compatibility review, and recovery plan.
- Preserve unknown fields when normalizing imported records.
- Never rewrite historical paid status or account deductions silently.
- Use stable IDs for recurring series and payment operations.
- Do not include secret or `service_role` credentials in browser code.
- Keep Talaan usable offline when cloud sync is unavailable.
- Do not remove backup or recovery safeguards to simplify a feature.
- Do not move or rename a production asset, storage key, or persistent identifier only for aesthetics when installed clients or stored data still depend on it.
- UI-only and branding changes must not reset finance records, balances, recurrence, payments, projects, or synchronization state.

## Versioning

The current production baseline is **V2.0.1**.

- **Patch** (`2.0.x`): compatible reliability, documentation, security, delivery, branding, or UI fixes that require a deployed application release.
- **Minor** (`2.x.0`): new backward-compatible finance, productivity, reporting, project, or interface features.
- **Major** (`x.0.0`): intentional breaking architecture/schema changes or migrations that require explicit compatibility planning or user action.

Any release bump must keep `package.json`, `package-lock.json`, `version.json`, runtime release metadata, service-worker/cache identity, README, changelog, and release validation aligned where applicable.

## Releases

1. Merge the validated version change to `main`.
2. Confirm the hosted Talaan application and `version.json` report the intended version.
3. Create and push an annotated tag matching `package.json`.
4. The Tagged Release workflow validates the tag and creates the GitHub release with generated notes.
5. Verify that the deployed PWA is using the intended app version, brand, and cache generation before considering the release complete.
