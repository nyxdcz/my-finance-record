# Release Checklist

## Before editing

- [ ] Inspect the latest `main` files and commits.
- [ ] Confirm the approved scope and affected files.
- [ ] Export a recovery backup before destructive testing.

## Version agreement

- [ ] `index.html` title and `APP_VERSION` match.
- [ ] `cloud-sync.js` fallback version matches.
- [ ] `sw.js` app and cache versions match.
- [ ] `version.json`, `package.json`, README, and changelog match.
- [ ] The newest in-app Version History entry is first.

## Quality

- [ ] `npm ci --ignore-scripts --no-audit --no-fund` succeeds.
- [ ] `npm run quality` succeeds.
- [ ] JavaScript and service-worker syntax pass.
- [ ] No duplicate HTML IDs exist.
- [ ] Protected storage keys and finance formulas remain intact.
- [ ] Manifest, offline page, and icons changed only when approved.

## Finance regression

- [ ] Account totals and Available Money match.
- [ ] Mark Paid deducts once from the confirmed account.
- [ ] Move to Unpaid restores once.
- [ ] Bulk payments remain atomic.
- [ ] Recurring-series edits preserve payment history.
- [ ] Gym month-end auto-pay cannot run twice.
- [ ] Opening-balance migration preserves every account balance and Available Money.
- [ ] Every supported balance change creates the expected ledger entry.
- [ ] Transfers create equal linked debit and credit entries and preserve total money.
- [ ] Insufficient or same-account transfers are blocked.
- [ ] Reconciliation creates one documented adjustment and history record.
- [ ] Posted income reverses safely when edited or deleted.
- [ ] Utility, Gym, normal, and reserved-budget totals match reports and exports.

## Cloud and security

- [ ] RLS remains enabled and forced on exposed tables.
- [ ] Anonymous access remains revoked.
- [ ] Payment-operation rows remain append-only.
- [ ] No `sb_secret_`, `service_role`, database password, or personal token is committed.
- [ ] MacBook and iPhone sync tests use non-sensitive sample records.
- [ ] Account ledger and reconciliation records sync without duplicate operation IDs.
- [ ] `supabase/cloud-sync-v2.sql` succeeds on a representative V12.20 project.
- [ ] V2 profile, record, batch, audit, and device RLS checks pass.
- [ ] Only changed records enter the pending queue.
- [ ] Atomic batches reject all records when one expected revision conflicts.
- [ ] Payment, restoration, transfer, account, and ledger changes cannot partially commit.
- [ ] Incremental pull advances the audit cursor without skipping records.
- [ ] Retry delay increases and remains capped.
- [ ] Retry, Discard local, Keep this version, and conflict download work.
- [ ] An older app version is blocked from writing protected newer records.
- [ ] Revoked devices cannot register or commit V2 records.

## Publication

- [ ] Pull-request checks are green.
- [ ] Only approved files changed.
- [ ] The GitHub Pages deployment succeeds from `main`.
- [ ] The hosted app shows the expected version.
- [ ] MacBook and iPhone load and sync the released version.
