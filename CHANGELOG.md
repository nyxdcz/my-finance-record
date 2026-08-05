# Changelog

All notable changes to My Finance Records are documented here.

## 12.24.0 · 2026-08-06

### Added

- Universal Quick Add for Expense, Income, Project, Transfer, Reconciliation, templates, and previous-month duplication.
- Synchronized expense templates with review-before-save behavior.
- Global search across major finance records, accounts, ledger history, budgets, and templates.
- Advanced account, amount, date, and status filters for unpaid and paid expenses.
- Bulk category changes and append-only paid-expense payment-account corrections.
- Recent-account suggestions, recently edited records, and 12-step local undo history.
- Mac keyboard shortcuts and iPhone bottom-sheet dialog presentation.

### Preserved

- Finance Schema 12, Cloud Schema V2, Ledger Version 1, Budget Version 1, Insights Version 1, account balances, payment IDs, ledger history, reports, backups, manifest, offline page, icons, and Supabase security rules.
- No additional Supabase migration is required.

## 12.23.0 · 2026-08-06

### Added

- Multi-month, year-to-date, prior-year, and custom-date financial insight ranges.
- Account and expense-category filters for reports.
- Income, actual spending, net cash flow, Savings change, and project cash-margin KPIs.
- Monthly cash-flow, category-spending, account-history, and planned-versus-actual views.
- Electric and Water Utility Bill trends.
- Gym visits, total Gym cost, and cost-per-visit insights.
- Recurring monthly expense change detection.
- Savings Goal progress and Savings-account trend reporting.
- Project income, paid Project Costs, and cash-basis project profitability.
- Consolidated financial-insights CSV export and print-ready PDF output.

### Preserved

- Existing Monthly Reports, snapshots, CSV/JSON exports, account ledger, budgets, cloud records, payment IDs, Finance Schema 12, Cloud Schema V2, Ledger Version 1, Budget Version 1, manifest, offline page, and icons.
- No Supabase migration is required.

## 12.22.0 · 2026-08-06

### Added

- Monthly category budgets with Fixed/Flexible grouping and Personal/Project scope.
- Planned, actual paid, committed, remaining, and utilization values per category.
- Optional unused-budget rollover when copying the previous month.
- Reusable budget templates and build-from-expenses planning.
- Fixed-amount or income-percentage savings allocation.
- Month-end forecast with expected unposted income, upcoming expenses, unassigned reserves, and savings allocation.
- Recurring, one-time, overdue, and low-balance forecast classifications.
- Dashboard and Monthly Report budget forecast summaries.
- Monthly budget and forecast CSV export.
- Record-level Cloud Schema V2 synchronization for monthly plans, templates, and settings.

### Preserved

- Core Finance Schema 12, Cloud Schema V2, Ledger Version 1, account balances, ledger operations, transfers, reconciliations, payment IDs, backups, reports, manifest, offline page, and icons.
- No new Supabase migration is required after the V12.21.0 Cloud Schema V2 migration.

## 12.21.0 · 2026-08-06

### Added

- Cloud Schema V2 record tables, sync profiles, atomic batch records, and immutable audit events.
- Record-level change queues for finance collections and singleton settings.
- Incremental pull by audit cursor and Realtime audit notifications.
- Atomic multi-record RPC commits with optimistic revision checks.
- Financial-operation RPC commits that keep payments, restorations, accounts, and ledger entries in one transaction.
- Capped exponential retry, exact pending-record controls, and per-record conflict recovery.
- Sync Health with protocol, cursor, pull/push times, pending records, conflicts, device versions, required writer version, and recent audit events.
- Remote device revocation and minimum-app/minimum-writer compatibility safeguards.
- Safe first-use migration from the Cloud Sync V1 state payload.

### Changed

- Normal cloud saves transmit only changed records rather than the complete finance state.
- Cloud writes are restricted to security-definer RPC functions; authenticated browser clients retain read-only access to their own V2 records and audit history.
- Realtime listens for immutable audit inserts instead of full-state row replacement.

### Preserved

- Core finance schema 12, Ledger Version 1, local-first saves, account-ledger calculations, payment-operation IDs, backups, reports, PWA configuration, manifest, offline page, and icons.

## 12.20.0 · 2026-08-06

### Added

- Append-only Account Ledger with Ledger Version 1 metadata.
- One-time opening-balance migration that preserves existing account totals.
- Ledger-derived account balances for payments, reversals, income deposits, transfers, reconciliation adjustments, and manual adjustments.
- Linked two-sided transfers with different-account and sufficient-funds validation.
- Account reconciliation history with documented balance differences.
- Optional income posting to an account with safe reversal on edit or deletion.
- Search, filters, summaries, and CSV exports for ledger and reconciliation history.
- Cloud synchronization for account-ledger and reconciliation records within the existing Cloud Schema V1 state payload.

### Changed

- Account balance editing now creates a reconciliation adjustment instead of silently replacing the balance.
- Accounts with a non-zero ledger balance must be transferred or reconciled to zero before deletion.
- Account renaming updates all supported linked financial references.
- GitHub Pages deployment includes the new ledger JavaScript and stylesheet.

### Preserved

- Core finance schema 12 and Cloud Schema V1.
- Existing account balances during the opening-balance migration.
- Expense payment IDs, duplicate-operation protection, backups, reports, Supabase configuration, manifest, offline page, and icons.

## 12.19.1 — 2026-08-06

### Added

- GitHub Actions quality validation for pushes and pull requests.
- Controlled GitHub Pages deployment after validation succeeds on `main`.
- Locked Node project metadata and a single `npm run quality` command.
- Repository security, privacy, contribution, and release documentation.
- CODEOWNERS, pull-request checklist, Dependabot configuration, and repository ignore rules.
- Supabase security migration and RLS smoke-test guidance.

### Security

- Forced Row Level Security on all finance cloud tables.
- Made payment-operation audit rows append-only for authenticated browser clients.
- Kept anonymous database access revoked.
- Added checks that reject browser-side secret and `service_role` credentials.

### Preserved

- Core finance schema 12 and Cloud Schema V1.
- Existing local records, Supabase records, payments, account balances, backups, and PWA behavior.
- Manifest and icon assets.

## 12.19.0 — 2026-08-05

- Added optional MacBook and iPhone synchronization through Supabase.
- Added first-sync choices, offline pending changes, connected devices, conflict recovery, deletion tombstones, Realtime updates, and idempotent payment-operation records.
