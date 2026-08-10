# My Finance Records V12.24.0 — Quick Entry & Productivity Validation

## Approved scope

- Universal Quick Add for Expense, Income, Project, Transfer, Reconciliation, templates, and previous-month duplication.
- Synchronized expense templates with review-before-save behavior.
- Global search across major finance records and planning records.
- Advanced expense filters and safe bulk corrections.
- Recent-account suggestions, recently edited records, and 12-step local undo history.
- Mac keyboard shortcuts and iPhone bottom-sheet dialogs.

## Data-safety rules

- Quick Add opens the existing complete forms; it does not bypass validation or save automatically.
- An expense template never carries `paid`, `paidDate`, `paymentTransactionId`, or another record's ID into the new expense.
- Duplicate Last Month creates a new unpaid record for the selected month and leaves the original record unchanged.
- Paid payment-account correction uses append-only ledger entries: a positive reversal to the old account and a matching debit to the corrected account.
- A correction is rejected when the corrected account lacks sufficient balance.
- Recently edited and undo histories are stored only on the current device. Expense templates and productivity settings synchronize through Cloud Schema V2.
- Finance Schema remains 12; Cloud Schema remains V2; Ledger, Budget, Insights, and Productivity versions remain 1.

## Automated validation

- `node tests/validate-v12-24-0.mjs`
- Complete V12.18.1–V12.23.0 regression chain.
- JavaScript, inline-script, and service-worker syntax.
- Static and injected HTML ID uniqueness.
- Template normalization, new-ID, unpaid-state, search, filter, recent-account, and paid-account correction fixtures.
- Cloud Schema V2 round-trip for `expenseTemplates` and `productivitySettings`.
- Service-worker and GitHub Pages deployment asset checks.
- Protected manifest, offline page, icons, Supabase SQL, and browser-safe configuration checks.

## Browser and device checks

- Desktop Quick Add, Search, Productivity Center, advanced filters, bulk actions, and shortcuts remain keyboard accessible.
- Phone dialogs open as bottom sheets with scrollable content and reachable sticky actions.
- No page-level horizontal overflow appears at a 390px viewport.
- Existing Expense, Income, Project, Transfer, Reconciliation, Ledger, Budget, and Report workflows remain usable.

## Preserved

- Account totals and Available Money.
- Payment IDs, account-ledger calculations, transfers, reconciliations, monthly budgets, cash-flow forecasts, and financial insights.
- Record-level Cloud Sync V2, pending-record controls, audit history, RLS, and device protections.
- Manifest, offline page, icons, backups, exports, and installed-PWA behavior.
- No additional Supabase migration.
