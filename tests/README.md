# Tests

Tests are grouped by the subsystem they protect.

## Source regression suites

`tests/run.mjs` owns the ordered source-regression plan used by `npm test`. The default plan preserves the same test files and execution order that were previously chained directly inside `package.json`.

Run every source regression test:

```bash
npm test
```

Run one source suite:

```bash
npm run test:finance
npm run test:regression
npm run test:sync
```

The suite-specific commands are convenience filters. CI continues to run the complete ordered plan through `npm run quality`.

## Directories

- `browser/` — Playwright browser behavior, accessibility, privacy, and interaction coverage
- `finance/` — finance workflows, calculations, budget, spending, and finance UI source contracts
- `helpers/` — repository inspection and maintainability helpers
- `regression/` — release, PWA, desktop/mobile, and UI regression contracts
- `security/` — privacy/import/security behavior
- `sync/` — cloud and multi-device synchronization behavior

## Adding a source regression test

1. Put the test in the matching subsystem directory.
2. Add it to `testPlan` in `tests/run.mjs` if it belongs in the default `npm test` quality gate.
3. Preserve ordering when a test intentionally depends on a generated compatibility file or an earlier validation assumption.
4. Prefer behavior-oriented filenames for new tests. Keep a release number only when the test deliberately protects a historical compatibility contract.
5. Run `npm run quality` and `npm run test:browser` before merge.

Browser tests remain under the Playwright configuration and are not duplicated in `tests/run.mjs`.
