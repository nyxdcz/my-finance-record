# Contributing

This repository contains a personal finance application. Changes must prioritize data preservation, payment correctness, and recovery.

## Workflow

1. Start from the latest `main` branch.
2. Create a focused branch such as `fix/installer-permissions` or `feat/budget-export`.
3. Change only the approved scope.
4. Use a Conventional Commit subject such as `fix: restore installer permissions`; avoid subjects such as `fix`, `update`, or `f`.
5. Update the release number, cache key, README, changelog, and validation file when behavior changes.
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

## Compatibility rules

- Do not change core schema 12 without a documented migration and rollback plan.
- Preserve unknown fields when normalizing imported records.
- Never rewrite historical paid status or account deductions silently.
- Use stable IDs for recurring series and payment operations.
- Do not include secret or `service_role` credentials in browser code.
- Keep the app usable offline when cloud sync is unavailable.
- Do not remove backup or recovery safeguards to simplify a feature.

## Versioning

- Patch: reliability, documentation, security, or compatible UI fixes.
- Minor: new compatible finance features.
- Major: migrations or architecture changes that require explicit user action.

## Releases

1. Merge the validated version change to `main`.
2. Confirm the hosted application and `version.json` report the intended version.
3. Create and push an annotated tag matching `package.json`, for example `git tag -a v14.0.1 -m "My Finance Records v14.0.1"` followed by `git push origin v14.0.1`.
4. The Tagged Release workflow validates the tag and creates the GitHub release with generated notes.
