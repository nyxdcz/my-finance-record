## 13.0.13 · 2026-08-07

### Fixed
- Record Spending is isolated from the Correct Account Balance form submit/native-validation path.
- Successful quick spending now requires exactly one Paid Expense, exactly one expense-payment ledger debit, the expected recalculated balance, successful persistence, and storage verification before the modal closes.
- Failed spending attempts roll back in-memory changes and any already-persisted transaction, keep user inputs available, and show an inline error instead of leaving the form in an ambiguous dirty state.
- Inactive account-mode fields are disabled so hidden correction controls cannot block Record Spending.
- Persisted account-ledger and reconciliation fields now survive the base normalization/reload path instead of being reconstructed from balances.
- Normal quick-spend purchases with empty utility fields no longer normalize into utility expenses.

### Preserved
- Finance Schema 12, Cloud Schema V3, append-only account ledger history, quick-spend reversal behavior, budgets, profiles, encryption, sync, and stored records.

## 13.0.12 · 2026-08-07

### Fixed
- Spend is now rendered directly in every editable account card and survives all Budget & Expenses rerenders.
- Record Spending can no longer silently no-op when a stale Account Ledger module is present; the app shows a clear update-incomplete message instead.
- Quick spending verifies the Paid Expense, one expense-payment ledger debit, and recalculated account balance before closing the form.
- Phone Available Money collapse/header controls and Budget summary cards are more compact and consistently sized.

### Changed
- First-party JS/CSS assets are release-versioned and the new service worker activates only after successful precaching, reducing mixed-version PWA states.

### Preserved
- Finance Schema 12, Cloud Schema V3, account-ledger history, quick-spend accounting, paid-expense reversal behavior, budgets, encryption, sync, and stored records.

## 13.0.11 · 2026-08-07

### Fixed
- Rebuilt Record Spending interaction wiring so amount entry, mode switching, validation recovery, Close/Cancel, and submit controls remain reliable after repeated modal opens and rerenders.
- Removed overlapping account-spend click/submit interception and added single-submit protection to prevent duplicate purchase posting.
- Removed Edit Project horizontal overflow on phones and compacted date/month, salary, calendar, revision, and footer controls.

### Changed
- Phone Edit Project keeps Cancel and Save visible while Duplicate, revision, and Delete actions move into a compact More actions menu.
- Salary project summary wording and mobile spacing are shorter and easier to scan.

### Preserved
- Finance Schema 12, Cloud Schema V3, account ledger rules, quick-spend accounting, project revisions, payments, encryption, and stored records.

## 13.0.10 · 2026-08-07

### Added
- Added direct account spending from Edit Account and Available Money account cards.
- Purchases are automatically created as Paid Expenses and posted as one append-only expense-payment ledger debit.

### Fixed
- Separated reconciliation from normal spending so purchases are not misclassified as balance corrections.
- Quick-spend deletion restores the original account deduction, and paid ledger amounts are protected from silent amount edits.

### Preserved
- Finance Schema 12, Cloud Schema V3, account ledger history, encrypted sync, project revisions, budget logic, and existing stored records.

## 13.0.9 · 2026-08-07

### Changed
- Reordered phone top-bar actions to Add, Sync, then More and removed duplicate plus rendering while keeping all phone controls at 44 × 44px.
- Rebuilt phone Projects into compact cards with concise facts, smaller status badges, primary actions plus More, and overlap-safe project actions on desktop/iPad.
- Compacted Budget & Expenses phone summary cards with shorter mobile labels and descriptions while preserving all calculations.

### Fixed
- Added an explicit ledger recalculation and UI refresh after account reconciliation so edited account balances immediately update account cards and dependent totals without a manual page refresh.

## 13.0.8 · 2026-08-07

### Changed
- Paid expenses no longer appear as due/upcoming expense entries or dots in the Dashboard Monthly Calendar; paid history remains in Paid Expenses, reports, ledger, and calculations.
- Projects with Completed status now appear in Completed Projects whether fully paid or still carrying a client balance.
- Completed projects with remaining balances clearly show Completed · balance due alongside their Unpaid/Partial payment status and keep Mark paid available.
- Project action buttons are more compact on desktop while retaining phone touch targets.
- Disclosure/expand controls now share one SVG chevron, 40px desktop/iPad sizing, 44px phone sizing, and consistent border/focus treatment.

## 13.0.7 · 2026-08-07

### Changed
- Added a persistent expand/collapse control for the complete Monthly budget plan.
- Compact mode keeps Planned budget, Budget remaining, and Forecast month-end visible while hiding plan editing details.
- Tightened plan toolbar actions, KPI cards, Category plan, Cash-flow forecast, and spacing between summary cards and Available money.
- Preserved all monthly budget, category, committed-expense, and cash-flow forecast calculations.

## 13.0.6 · 2026-08-07

### Added
- Added numbered project revision cycles for completed projects, with requested date, optional deadline, revision notes, and per-revision completion date.
- Added Reopen for revision and Mark revision complete actions in Project lists and Edit Project.
- Added Revision history inside Edit Project while preserving the original project completion date.

### Changed
- In-revision projects return to Active Projects without becoming a new project or changing payment/fixed-salary classification.
- Dashboard project deadlines and Apple Calendar exports use the active revision deadline; calendar exports keep the existing project UID so revisions update the existing calendar identity instead of duplicating the original deadline.

### Preserved
- Finance Schema 12, Cloud Schema V3, project value, payment history, work month, salary classification, encrypted sync, and stored records.

## 13.0.5 · 2026-08-07

### Fixed
- Scoped unpaid Gym calendar visits to the Gym expense record saved for the calendar month, so recurring copies from other months cannot repeat the same visit.
- Added stable calendar event source keys and idempotent deduplication for income, expenses, project deadlines, and project payments.
- Kept underlying expense records, recurring-series data, account balances, payment history, and finance calculations unchanged.

### Validation
- Added Dashboard calendar deduplication regression coverage, including repeated recurring Gym copies, repeat rendering, and stable event identity.

## 13.0.4 · 2026-08-07

### Changed
- Standardized adjacent Settings controls, Household Sharing actions, Work & Calendar fields, Savings settings, and Account Ledger typography.
- Added clear Synced, Syncing, Offline, Needs sync, and Sync issue toolbar feedback with a compact sync-status panel.
- Added responsive month formatting: YYYY-MM on phones and full Month Year on iPad/Mac, plus a direct month picker.
- Tightened Add Expense field alignment and made Quick Add visibly smaller with SVG-only system icons.
- Fixed V13 service-worker cache cleanup so older V13 assets cannot override the current release.

### Preserved
- Finance Schema 12, Cloud Schema V3, encrypted sync, profiles, account ledger calculations, recurrence, Gym month-end payment logic, backups, and stored records.

## 13.0.2 · 2026-08-07
- Simplified Settings with a status overview, six plain-language sections, vertical iPhone navigation, collapsed advanced tools, account-history and reminder disclosures, save buttons enabled only after changes, and a separate danger zone.
- Preserved all account, profile, encryption, cloud sync, backup, reminder, PWA, schema, and calculation behavior.

### Changed
- Simplified the visible toolbar to Cloud Sync, month navigation, Current month, and the contextual Add action.
- Moved Theme, Search, and Quick actions into one More tools menu with standard SVG icons.
- Added independent accessible collapse controls to Category plan and Cash-flow forecast.
- Matched the expanded height and header structure of both budget bento panels.
- Aligned Reconciled balance and Account type in the Edit Account dialog, improved label contrast, standardized control height, and stacked the pair cleanly on iPhone.

### Preserved
- Budget and forecast calculations, account values, records, month navigation, Cloud Sync, profiles, encryption, and Finance Schema 12.
- No Supabase migration is required.

## 13.0.1 · 2026-08-07

### Changed
- Rebuilt the iPhone top bar so page information, utilities, and month navigation no longer compete for one row.
- Replaced duplicate mobile Add Expense controls with one contextual top-bar action.
- Shortened Money workspace labels on mobile and restored two-column summary cards on standard iPhones.
- Collapsed Income, Budget, Paid Expense, and Project filters by default on mobile and added active-filter counts.
- Centered selected Settings and Reports tabs, removed native horizontal scrollbars, and added subtle Settings edge indicators.

### Preserved
- MacBook layout and desktop navigation.
- Finance Schema 12, Cloud Schema V3, encryption, profile roles, ledger, calculations, stored data, and protected rollback assets.

# Changelog

## 13.0.3 · 2026-08-07

### Repository readiness
- Added a repeatable repository inspection command for required files, local paths, package metadata, permissions, deployment paths, and public sync configuration.
- Added simple macOS File Inspection and Fixes installer instructions.
- Renamed the stale GitHub Actions quality-job display label without changing workflow behavior.

### Changed
- Compacted Quick Add and the shared modal spacing system across major forms.
- Replaced system emoji icons in Quick Add and the device-lock screen with monochrome SVG interface icons.
- Grouped recurring expense controls and Gym automatic-payment controls into expandable sections with concise helper text.

### Preserved
- Finance Schema 12, Cloud Schema V3, account deduction, recurrence, templates, profiles, encryption, backups, and stored records.

All notable changes to My Finance Records are documented here.


## 13.0.0 · 2026-08-06

### Added

- Separate personal and household finance profiles with profile switching.
- Owner, Editor, and Viewer household roles with read-only enforcement for Viewers.
- Cloud Schema V3 profile-scoped record synchronization and immutable audit history.
- Client-side AES-256-GCM encryption for cloud record payloads and restore points.
- PBKDF2-SHA-256 passphrase key derivation with a 310,000-iteration default.
- Encrypted `.mfrx` backup export and restore.
- Invitation codes, member management, profile-aware device revocation, and encrypted cloud restore points.
- Optional device app lock, authenticator-app MFA management, and experimental passkey controls.
- Controlled migration documentation and Cloud Schema V3 RLS smoke-test guidance.

### Migration

- Requires `supabase/cloud-profiles-v13.sql` before enabling Cloud Sync V3.
- Existing Cloud Schema V2 tables and data are retained and are not modified.
- The first V3 upload encrypts the existing local profile records before sending them.

### Security boundaries

- Active browser localStorage remains a plaintext working copy.
- Record identifiers, revisions, timestamps, membership, and device metadata remain visible to the cloud service.
- The app cannot recover a lost profile passphrase.

### Preserved

- Finance Schema 12 and every V12.25.0 financial calculation and feature baseline.
- Ledger, budgets, reports, productivity tools, reminders, payment-operation IDs, manifest, offline page, and icons.

## 12.25.0 · 2026-08-06

### Added

- Configurable reminders for due and overdue expenses, low balances, expected unposted income, monthly Savings contributions, missing Utility Bill entries, Gym schedules, failed Gym auto-payments, unsynchronized cloud changes, and recovery backups.
- Daily grouped notification scheduling with a selected local time and optional newly detected individual-alert delivery.
- Current-alert list, permission and delivery status, next-check time, app badges, test notification, 24-hour pause, and device-local notification history.
- Service-worker notification handling plus best-effort Periodic Background Sync and foreground checks on app open, focus, visibility, reconnect, and interval.
- Cloud Schema V2 synchronization for reminder settings.

### Safety

- Alerts never mark expenses paid, transfer money, post income, reconcile balances, modify budgets, or create ledger entries automatically.
- Notification permission, delivery history, sent fingerprints, and pause state remain device-local.
- Exact closed-app timing remains browser-controlled and is not guaranteed.

### Preserved

- Finance Schema 12, Cloud Schema V2, Ledger Version 1, Budget Version 1, Insights Version 1, Productivity Version 1, all existing finance records, balances, ledger operations, backups, reports, manifest, offline page, and icons.
- No additional Supabase migration is required.

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
