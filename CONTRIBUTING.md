# Contributing

This repository contains a personal finance application. Changes must prioritize data preservation, payment correctness, and recovery.

## Workflow

1. Start from the latest `main` branch.
2. Create a short feature or fix branch.
3. Change only the approved scope.
4. Update the release number, cache key, README, changelog, and validation file when behavior changes.
5. Run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
```

6. Open a pull request and complete the safety checklist.
7. Merge only after the quality workflow passes.

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
