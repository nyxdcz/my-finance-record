# Changelog

All notable changes to My Finance Records are documented here.

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
