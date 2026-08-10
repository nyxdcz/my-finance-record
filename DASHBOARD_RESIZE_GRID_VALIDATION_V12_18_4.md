# My Finance Records V12.18.4 — Dashboard Resize Grid Validation

## Approved desktop geometry

- Small: span 3 of 12 columns — four cards per row.
- Large: span 4 of 12 columns — three cards per row.
- Wide: span 6 of 12 columns — two cards per row.

## Responsive geometry

- Tablet: six logical columns; Small and Large span three columns, Wide spans the full row.
- Phone: every saved size renders as a single column and edge dragging remains disabled.

## Regression safeguards

- Existing saved values (`small`, `large`, `wide`) require no migration.
- Pointer drag, click-to-cycle, Arrow keys, Home, End, size selectors, Preview, Reset, and Done continue to operate.
- Savings Trend, Income versus Expenses, and Monthly Calendar remain restricted to Large or Wide.
- Dashboard order, hidden cards, privacy mode, and size preferences remain in the existing Dashboard preferences object.
- Schema version remains 12 and all protected storage, database, backup, sync, manifest, offline, and icon assets remain unchanged.

## Validation completed

- `node tests/validate-v12-18-4.mjs` passed together with the V12.18.1, V12.18.2, and V12.18.3 regression baselines.
- Both inline scripts and `sw.js` passed JavaScript syntax validation.
- 484 HTML IDs were checked with no duplicates.
- The production stylesheet was rendered in headless Chromium using a controlled layout fixture:
  - 1600px desktop: four Small cards shared one row, three Large cards shared one row, and two Wide cards shared one row.
  - 1024px tablet: Small and Large cards rendered two per row; Wide cards rendered full width.
  - 390px phone: all saved sizes rendered in one column.
  - No horizontal overflow occurred at any tested width.
- Protected manifest, offline page, icons, schema, and storage identifiers remained unchanged.

The managed browser blocks direct localhost app navigation, so this release does not claim a new full end-to-end PWA browser run. The layout geometry was verified using the app’s actual CSS, while the existing interaction and data safeguards were covered by the retained regression validators.
