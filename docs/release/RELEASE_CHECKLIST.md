# Release Checklist


## V13.0.0 Cloud, encryption, and profiles

- [ ] Clean V12.25.0 repository passes `npm run quality` before applying V13.
- [ ] A fresh V12 recovery backup exists before running the V3 SQL migration.
- [ ] `supabase/cloud-profiles-v13.sql` succeeds before V13 Cloud Sync is enabled.
- [ ] V2 tables and rollback SQL remain unchanged.
- [ ] Cloud payloads are AES-256-GCM envelopes before RPC submission.
- [ ] Incoming cloud payloads are decrypted only after profile membership and passphrase unlock.
- [ ] Viewer profiles cannot save locally or commit cloud changes.
- [ ] Owner/Editor financial operations preserve idempotent operation IDs.
- [ ] Household invitation codes do not contain the encryption passphrase.
- [ ] Wrong passphrases and modified ciphertext fail without replacing active data.
- [ ] Encrypted `.mfrx` export and restore are tested with sample data.
- [ ] The app lock is described as screen access control, not localStorage encryption.
- [ ] Passkeys are labeled experimental and password recovery remains available.
- [ ] No Supabase secret, service-role key, passphrase, or derived encryption key is committed.
- [ ] MacBook-first upload and iPhone download are tested after deployment.

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
- [ ] `npm run test:browser` succeeds with Chromium installed.
- [ ] `npm run audit` reports no production dependency vulnerabilities.
- [ ] Installer and audit scripts retain executable Git modes.
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
- [ ] Monthly budget actual values use paid included expenses only.
- [ ] Monthly budget committed values include paid and unpaid included expenses.
- [ ] Copy Previous Month applies rollover once and does not change the source month.
- [ ] Applying a template creates new category IDs and does not link monthly records accidentally.
- [ ] Forecast does not subtract paid expenses a second time from current account balances.
- [ ] Unassigned category reserves exclude already committed expenses.
- [ ] Savings allocation changes the forecast without creating a ledger entry.
- [ ] Low-balance warnings use scheduled account activity and configured thresholds.
- [ ] Insights Total Income equals included manual income plus eligible project payments for the selected range.
- [ ] Insights Actual Spending uses paid included expenses and confirmed payment dates.
- [ ] Net Cash Flow equals Total Income minus Actual Spending.
- [ ] Account filters use the confirmed payment or receiving account and clearly exclude unassigned project payments.
- [ ] Expense-category filters do not change income values unexpectedly.
- [ ] Account history uses saved month-end snapshots before ledger fallback.
- [ ] Planned-versus-actual uses monthly budget plans and paid spending without changing budget records.
- [ ] Utility Bill trends preserve separate Electric and Water amounts.
- [ ] Gym cost per visit handles zero visits without division errors.
- [ ] Recurring change detection does not modify recurring series.
- [ ] Project margin uses project payments minus paid Project Costs and is labeled as cash-basis.
- [ ] YTD comparison uses the same months in the selected and previous year.
- [ ] Insights CSV and Print / Save PDF contain the selected range and filters.
- [ ] Quick Add opens the correct complete form and never saves a record without confirmation.
- [ ] Expense templates create a new record ID and preserve type-specific fields without carrying paid state.
- [ ] Duplicate Last Month creates an unpaid current-month copy and does not duplicate the original ID or payment operation.
- [ ] Global search opens the correct record or workspace for every supported collection.
- [ ] Advanced filters combine with existing month, search, and category filters without changing records.
- [ ] Bulk category changes affect only selected records.
- [ ] Paid payment-account correction creates one reversal and one replacement ledger entry per corrected payment.
- [ ] Payment-account correction is blocked when the destination account cannot cover the corrected debit.
- [ ] Recent-account suggestions never create or rename accounts.
- [ ] Multi-step Undo restores a complete normalized snapshot and keeps the current state recoverable.
- [ ] Keyboard shortcuts do not trigger while typing in a form field.
- [ ] iPhone bottom-sheet dialogs remain scrollable and keep action buttons reachable.
- [ ] Reminder checks identify due, overdue, low-balance, expected-income, Savings, Utility, Gym, cloud-sync, and backup conditions without changing finance records.
- [ ] Posted income and transfers from Savings do not create expected-income reminders.
- [ ] Daily digest fires at most once per local date after the selected time.
- [ ] Individual-alert mode sends only newly detected fingerprints unless a manual test is forced.
- [ ] Pause blocks notification delivery for 24 hours without disabling reminder calculations.
- [ ] Notification permission is requested only from an explicit user action.
- [ ] Alerts never mark paid, post income, transfer funds, reconcile balances, alter budgets, or append ledger entries.
- [ ] iPhone guidance requires the installed Home Screen app and does not promise exact closed-app timing.

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
- [ ] Monthly budgets synchronize as month-level records.
- [ ] Budget templates synchronize as independent records.
- [ ] Budget settings synchronize through the singleton settings record.
- [ ] Expense templates synchronize as independent Cloud Schema V2 records.
- [ ] Productivity settings synchronize through the singleton settings record.
- [ ] Recently edited and multi-step undo histories remain device-local and are not uploaded.
- [ ] Reminder settings synchronize through the Cloud Schema V2 singleton settings record.
- [ ] Notification permission, delivery history, pause state, and sent fingerprints remain device-local and are not uploaded.
- [ ] No new Supabase table or migration is required for V12.25.0.

## Publication

- [ ] Work was reviewed on a focused branch rather than pushed directly to `main`.
- [ ] Commit and pull-request titles describe the change using Conventional Commit format.
- [ ] Pull-request checks are green.
- [ ] Only approved files changed.
- [ ] The GitHub Pages deployment succeeds from `main`.
- [ ] The hosted app shows the expected version.
- [ ] MacBook and iPhone load and sync the released version.
- [ ] An annotated `vX.Y.Z` tag matching `package.json` was pushed.
- [ ] The Tagged Release workflow created the GitHub release.
