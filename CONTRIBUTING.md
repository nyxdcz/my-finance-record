# Contributing

This repository contains a personal finance application. Changes must prioritize data preservation, payment correctness, recovery, and installed-PWA compatibility.

## Workflow

1. Start from the latest `main` branch.
2. Create a focused branch such as `fix/installer-permissions`, `feat/budget-export`, or `docs/repository-organization`.
3. Change only the approved scope.
4. Use a Conventional Commit subject such as `fix: restore installer permissions`; avoid subjects such as `fix`, `update`, or `f`.
5. When behavior/runtime output changes, update the release number, cache key, README/release history, changelog, and validation metadata required by the current release process.
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

### Filename guidance

Prefer stable, responsibility-oriented active filenames. Do not create a new version-numbered production filename solely to record when a change was made; Git history, `CHANGELOG.md`, Releases, and `version.json` already preserve release history.

Versioned filenames are acceptable when an installed PWA, service worker, cache contract, or other compatibility requirement depends on that exact URL. When extracting such code, keep the legacy URL available through a compatibility loader or mapping until regression coverage proves it is safe to remove.

### Documentation guidance

Keep the root `README.md` focused on project orientation, development, architecture, and links. Put chronological release detail in `CHANGELOG.md` and GitHub Releases instead of duplicating long release histories in the README.

## Compatibility rules

- Do not change core schema 12 without a documented migration and rollback plan.
- Preserve unknown fields when normalizing imported records.
- Never rewrite historical paid status or account deductions silently.
- Use stable IDs for recurring series and payment operations.
- Do not include secret or `service_role` credentials in browser code.
- Keep the app usable offline when cloud sync is unavailable.
- Do not remove backup or recovery safeguards to simplify a feature.
- Do not move or rename a production asset only for aesthetics when installed clients or cache/service-worker rules still depend on the old URL.

## Versioning

- Patch: reliability, documentation, security, or compatible UI fixes when a deployed application release is required.
- Minor: new compatible finance features.
- Major: migrations or architecture changes that require explicit user action.
- Documentation-only repository organization does not require an application version bump when runtime/PWA output is unchanged.

## Releases

1. Merge the validated version change to `main`.
2. Confirm the hosted application and `version.json` report the intended version.
3. Create and push an annotated tag matching `package.json`, for example `git tag -a v15.2.8 -m "My Finance Records v15.2.8"` followed by `git push origin v15.2.8`.
4. The Tagged Release workflow validates the tag and creates the GitHub release with generated notes.
