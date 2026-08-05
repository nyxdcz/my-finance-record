# Changelog

All notable changes to My Finance Records are documented here.

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
