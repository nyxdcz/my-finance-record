# My Finance Records · V13.0.18 PWA

## V13.0.18 · Signed-Out Privacy Lock

- Signed-out and auth-pending states show zero-only privacy placeholders instead of accounts, expenses, projects, payments, reports, calendar events, search suggestions, or notifications.
- Local finance records remain stored on the device and are not deleted by sign-out; the UI unlocks only after a valid cloud-auth session is restored or created.
- Finance-changing actions are blocked while signed out. Sign in, account creation/recovery, cloud configuration, app controls, and backup restore remain available.
- The app starts locked before its first render to prevent a flash of previously viewed finance data.


## V13.0.17 · iPhone Input Zoom Prevention

- Prevents iPhone Safari, Brave, Chrome, and installed PWA views from automatically zooming when an editable field receives focus.
- Phone `input`, `select`, `textarea`, date/month, numeric/calculator, password, search, and dynamically created form controls use a minimum **16px** editable-value text size.
- Labels, helper text, badges, tables, and normal interface copy remain compact; the change does not enlarge the whole phone UI.
- Manual pinch zoom remains available. The viewport is not locked with `user-scalable=no` or similar accessibility-reducing settings.
- Finance calculations, account balances, projects, cloud sync, password recovery, stored records, and desktop/iPad layouts are unchanged.

## V13.0.16 · Password Recovery Redirect Fix

- Password-reset emails now return to a dedicated `?auth=recovery` route instead of silently opening the normal Dashboard.
- Failed reset links parse Supabase `error`, `error_code`, and `error_description` fragments and open **Settings → Sync & Backup** with a clear expired/invalid/reused-link message.
- Added **Send new reset email**, **Verify recovery code**, and **Back to sign in** recovery controls. Recovery-code fallback uses `verifyOtp({ email, token, type: "recovery" })` and requires the Supabase Recovery email template to include `{{ .Token }}`.
- Successful recovery links still use Supabase `PASSWORD_RECOVERY`, then show **Choose a new password** and clean the auth fragments after processing.
- Local finance records remain available and unchanged when password recovery fails.

## V13.0.15 · Cloud Sign-in Recovery & Diagnostics

- Adds **Forgot password?** to the Sync & Backup sign-in card and sends a Supabase password-recovery email without exposing whether an email is registered.
- Adds a secure in-app **Choose a new password** completion step when the recovery link returns to the PWA.
- Replaces technical authentication errors with plain-language guidance such as **Wrong email or password** and **Email not confirmed**.
- Adds **Show / Hide password**, disabled/busy button states, Enter-to-sign-in, and a visible authentication message area.
- Adds **Test cloud connection** so project/network reachability can be checked separately from credentials.
- Failed cloud sign-in never removes local finance records; the app remains local-first.

## V13.0.14 · Brave PWA Install Flow

- Detects Brave separately from other Chromium browsers and keeps the native `beforeinstallprompt` flow when Brave provides it.
- When Brave does not expose a native prompt, **Install app** becomes **Install with Brave** and opens clear steps: **Brave menu → Save and Share → Install page as app…**.
- Shows explicit Installed, Ready to install, Install from Brave menu, browser-menu, and HTTPS-required states without changing finance records or offline data.

## V13.0.13 · Record Spending Transaction Hotfix

- Separates **Record spending** from the account-correction form submit path, so hidden maintenance fields and native form validation cannot block a purchase.
- Runs quick spending as one verified transaction: validate → Paid Expense → ledger debit → recalculated balance → persist → storage verification → close.
- Rolls back failed spending attempts, keeps the modal open with an inline error, and clears the dirty state only after a verified successful save.
- Disables inactive mode controls so Correct Balance and Record Spending cannot interfere with each other.
- Preserves the append-only account ledger and reconciliation history through the app reload/normalization path, so a verified purchase remains traceable after reopening the app.
- Keeps direct purchases such as Dinner classified as normal paid expenses rather than accidentally treating empty utility fields as a utility bill.


## V13.0.12 · Spend Reliability & Phone Budget Compaction

- Makes **Spend** part of the account-card renderer so it remains available after every rerender, sync, month change, balance update, and collapse/expand.
- Hardens **Record spending** with an explicit module compatibility check, `Recording…` state, verified Paid Expense + ledger debit + balance persistence, and visible errors instead of silent no-ops.
- Version-pins first-party JS/CSS assets and activates the fully precached service worker so mixed-release PWA modules cannot keep old spending logic behind a newer form.
- Compacts phone Budget & Expenses summary cards and aligns Available Money amount/account count, Add account, and the standard 44px collapse control.


## V13.0.11 · UI & Interaction Reliability

- Rebuilt **Record spending** controls with direct, one-time bindings so amount typing, mode switching, validation, Cancel/Close, and submit remain responsive after rerenders and repeated modal opens.
- Uses one form-submit path with double-submit protection while preserving exactly one Paid Expense and one account-ledger debit per purchase.
- Cleaned up Edit Project on phones: zero horizontal overflow, compact date/month/salary/calendar sections, and a sticky **Cancel | Save project** footer with secondary actions under **More actions**.
- Added interaction regression coverage for critical account/project controls and preserved finance, cloud, revision, and security logic.


## V13.0.10 · Account Spending from Balance

- Edit Account now clearly separates **Correct account balance** from **Record spending**.
- Record spending deducts the purchase exactly once from the chosen account and automatically creates an already-paid expense with description, category, date, note, and totals choice.
- Account cards include a compact **Spend** action, and account balances, Available Money, Paid Expenses, Dashboard totals, and ledger views refresh immediately after the purchase.
- Quick-spend deletion restores its deducted account balance before removing the expense, while paid ledger amounts cannot be silently changed without first moving the expense back to unpaid.
- The standard File Inspection and Fixes macOS installer is included with this release.


## V13.0.9 · Phone UI & Account Balance Refresh

- Phone top-bar actions now follow **Add → Sync → More** with one SVG plus icon and consistent 44 × 44px controls.
- Projects use compact phone cards and overlap-safe primary + More actions; Budget & Expenses summary cards use shorter phone labels and tighter spacing.
- Editing an account balance now explicitly recalculates the append-only ledger and refreshes every visible account/totals surface immediately after reconciliation.
- Finance Schema 12, Cloud Schema V3, project revisions, payments, encrypted sync, and stored records are unchanged.


## V13.0.8 · Calendar Paid-State & Project Completion Cleanup

- Paid expense due-events disappear from the Dashboard calendar as soon as they are paid; the underlying paid transaction and ledger history are preserved.
- Completed projects now stay in Completed Projects even while a client balance is still due, so project completion and payment completion are separate states.
- Project actions are more compact and all disclosure/dropdown chevrons follow the same SVG icon, sizing, alignment, and phone touch-target rules.
- Finance calculations, project payments, revision history, account ledger, cloud sync, and stored records are unchanged.

## V13.0.7 · Budget Plan Compact Layout

- The full Monthly budget plan can now be expanded or collapsed, with the preference remembered locally.
- Collapsed mode keeps Planned budget, Budget remaining, and Forecast month-end visible as a compact summary.
- Plan actions, KPI cards, Category plan, Cash-flow forecast, and the spacing around Available money are more compact and consistent.
- Budget formulas, category limits, committed expenses, forecast calculations, account balances, and stored finance data are unchanged.

## V13.0.6 · Project Revision Cycles

- Reopen a completed project when a client requests changes without erasing the original completion date.
- Store Revision 1, Revision 2, and later cycles with requested date, optional deadline, notes, and revision completion date.
- Keep project value, payments, fixed-salary classification, work month, and project identity unchanged.
- Revision deadlines can update the same Apple Calendar project event and appear in the Dashboard calendar without duplicating the original deadline.

## V13.0.5 · Dashboard Calendar Deduplication

- Fixes repeated Gym visits in the Dashboard Monthly calendar by using only the recurring Gym record saved for that month.
- Deduplicates calendar projections with stable source identities, so refreshes, sync updates, and repeated renders cannot append the same logical event again.
- Does not delete or merge saved expenses; finance records, recurring schedules, payment history, and account calculations remain unchanged.

## V13.0.4 · Settings & Top Bar UI Refinement

- Standardized Settings row heights and compact Account Ledger text.
- Added clear cloud-sync status feedback and a compact status panel.
- Added responsive Month display and a direct month picker.
- Tightened Add Expense and Quick Add layouts.
- Prevented stale V13 service-worker caches from serving older interface assets.

## V13.0.3 · Compact Modals & SVG Interface Icons

- Made Quick Add smaller while keeping all six actions and responsive phone access.
- Standardized system interface icons on SVGs instead of emoji-style symbols; user-selected record icons remain available.
- Compacted shared modal spacing and grouped recurring and automatic Gym payment options into clear expandable sections.
- Preserved Finance Schema 12, Cloud Schema V3, profiles, encryption, payment logic, recurrence logic, templates, and stored records.

## macOS File Inspection and Fixes installer

Use the V13.0.18 **File Inspection and Fixes** installer when updating this repository on a Mac.

1. Extract `My_Finance_Records_V13_0_18_File_Inspection_and_Fixes_Installer.zip`.
2. Double-click `Install_V13_0_18.command`.
3. The installer uses `~/Documents/My_Finance_Records` by default, cloning the GitHub repository there when needed.
4. It checks the current Git state, required files, local asset paths, package metadata, permissions, and configuration before applying the V13.0.18 payload.
5. It preserves the repository copy of `sync-config.js`, installs locked npm metadata with `npm ci`, then runs `npm run inspect`, `npm run quality`, and `git diff --check`.
6. The installer **does not commit or push**. Review `git status` and publish only after the checks report success.

Requirements: macOS, Git, and Node.js 22 or newer. The installer is safe to run again; an already-applied V13.0.18 working tree is revalidated instead of reapplied.


## V13.0.2 · Simplified Settings UI

### Settings simplification

- Added an Overview showing account, profile/security, sync/backup, and app status with one clear action per card.
- Reduced seven technical categories to Overview, Accounts, Work & Calendar, Profile & Security, Sync & Backup, and App & About.
- Replaced iPhone horizontal Settings tabs with a vertical menu and Back to Settings control.
- Moved technical configuration, migration, device history, snapshots, and other advanced tools behind collapsed disclosures.
- Kept account history, transfers, balance-adjustment history, notification schedules, alert types, and notification history available inside collapsed plain-language sections.
- Separated destructive and troubleshooting actions into a collapsed Danger zone.
- Preserved all stored settings, accounts, profiles, encryption, cloud sync, backups, reminders, schemas, and calculation logic.

- Reduced the visible top toolbar to Cloud Sync, previous month, month selector, next month, Current month, and the contextual Add action.
- Moved Theme, Search, and Quick actions into one accessible More tools menu using standard SVG interface icons instead of emoji-style glyphs.
- Added independent collapse controls to Category plan and Cash-flow forecast and matched their expanded bento heights.
- Corrected the Edit Account balance/type row with equal-width desktop fields, matching control heights, clearer labels, and responsive iPhone stacking.
- Preserved all budget, forecast, account, sync, profile, encryption, and stored-data logic. No Supabase migration is required.

## V13.0.1 · MacBook & iPhone UI Stabilization

- Rebuilt the iPhone top bar into a title row, compact utility menu, and full-width month selector.
- Removed the overlapping floating Add Expense button and kept one contextual mobile add action.
- Added centered mobile Settings and Reports tabs, shorter Money workspace labels, compact two-column summaries, and collapsed filter panels with active-filter counts.
- Preserved the MacBook layout, Finance Schema 12, Cloud Schema V3, encrypted cloud payloads, profiles, account ledger, calculations, and stored records.

## V13.0.0 · Major Cloud, Encryption & Profile Architecture

V13 introduces separate **personal** and **household** finance profiles without changing Finance Schema 12. Each profile keeps its own accounts, ledger, budgets, reports, reminders, templates, and synchronized records. Household profiles support **Owner**, **Editor**, and **Viewer** roles; Viewer profiles are read-only in the app and database.

Cloud Sync now uses **Cloud Schema V3**. Before upload, each record payload is encrypted in the browser with **AES-256-GCM** using a key derived from the profile passphrase with **PBKDF2-SHA-256**. Supabase stores the encrypted envelope plus necessary synchronization metadata such as profile ID, collection, record ID, revision, timestamps, device ID, and app version. The profile passphrase and derived key are not sent to Supabase.

### Required upgrade order

1. Open V12.25.0 on the MacBook, wait for **Synced**, and export a normal recovery backup.
2. Run `supabase/cloud-profiles-v13.sql` in the Supabase SQL Editor.
3. Deploy V13.0.0.
4. Open the MacBook app first, sign in, then open **Settings → Profiles & Security**.
5. Create an encrypted cloud profile and save its passphrase outside the app.
6. In **Cloud Sync & Devices**, choose **Upload this device’s data** when the MacBook is authoritative.
7. Create an encrypted `.mfrx` backup and verify that it can be decrypted.
8. Update the iPhone, sign in, use **Find existing profiles** (or accept a household invitation), connect the same profile with its passphrase, and choose **Download cloud data**.

See `V13_MIGRATION_GUIDE.md` and `CLOUD_SYNC_SETUP.md` for the controlled procedure.

### Security boundaries

- **Encrypted:** Cloud record payloads, encrypted cloud restore points, and `.mfrx` portable backups.
- **Not encrypted by the profile passphrase:** The active browser working copy in localStorage, record identifiers, collection names, revisions, timestamps, user/profile membership, and device metadata.
- The optional app lock blocks casual screen access on that browser. It is not full local database encryption and does not protect an already-unlocked operating-system account from browser-storage inspection.
- Losing the profile passphrase means encrypted cloud records and encrypted backups cannot be recovered by the app or Supabase.
- Household members must receive the encryption passphrase through a separate trusted channel. An invitation code grants profile membership but does not reveal the passphrase.
- Passkey controls are experimental and depend on project configuration, supported browsers, and the Supabase client. Password sign-in remains available.

### Preserved

Finance Schema 12, Ledger Version 1, Budget Version 1, Insights Version 1, Productivity Version 1, Reminders Version 1, account balances, payment operation IDs, V12 Cloud Schema V2 tables, manifest, offline page, icons, and local-first use remain preserved. V2 data is not deleted by the V13 migration, providing a controlled rollback reference.


## V12.25.0 · Reminders & Scheduled Alerts

- Added configurable reminders for expense due dates, overdue bills, low account balances, expected unposted income, monthly Savings contributions, missing Utility Bill entry, today’s Gym schedule, failed Gym month-end auto-payment, unsynchronized Cloud Sync changes, and stale recovery backups.
- Added one daily grouped notification digest with a selected local time. Turning the digest off changes delivery to newly detected individual alerts while the app is active or the browser gives the installed PWA background time.
- Added a current-alert list, system-notification permission status, best-effort background-delivery status, next scheduled check, device-local notification history, test notification, and a 24-hour pause.
- Added app-badge counts when the browser and installed platform support badging.
- Reminder settings synchronize through the existing Cloud Schema V2 singleton settings record. Notification permission, sent history, pause state, and delivery history stay device-local.
- System notifications use the service worker and Periodic Background Sync where available. Exact closed-app delivery is browser-controlled and is not guaranteed; opening or focusing the app also runs the checks.
- Alerts are informational only. They never mark expenses paid, transfer money, post income, reconcile balances, change budgets, or create ledger entries automatically.
- No additional Supabase SQL migration is required. Finance Schema remains 12, Cloud Schema remains V2, Ledger Version remains 1, Budget Version remains 1, Insights Version remains 1, Productivity Version remains 1, and Reminders Version is 1.

### First use

Open the MacBook app first and wait for **Synced**. Go to **Settings → Offline App**, review the alert types and schedule, then select **Enable notifications** directly. Send one test notification and run one manual alert check. On iPhone or iPad, open the installed Home Screen app before requesting notification permission. After the MacBook returns to **Synced**, open the iPhone and confirm the reminder settings match. Export a new recovery backup.

## V12.24.0 · Quick Entry & Productivity

- Added one universal **Quick add** menu for Expense, Income, Project, Account Transfer, previous-month duplication, saved templates, and Account Reconciliation.
- Added synchronized expense templates. A template preserves the expense type, amounts, category, due day, period, recurrence, payment account, Gym schedule, optional icon, and inclusion settings, but always opens the form for review before saving a new record.
- Added global search across expenses, income, projects, Savings Goals, accounts, Account Ledger entries, reconciliations, monthly budgets, and saved templates.
- Added advanced unpaid and paid expense filters for account, amount range, date range, and status while preserving the existing month, search, and category filters.
- Added bulk category changes for unpaid and paid expenses. Paid-expense payment-account correction creates append-only reversal and replacement ledger entries instead of silently moving a deduction.
- Added **Duplicate last month** for reusing one prior expense as a new unpaid current-month draft with a new record ID and preserved recurring-series safeguards.
- Added recent-account suggestions, recently edited records, and a 12-step local undo history. Recent and undo histories stay on the current device; finance records and expense templates continue to use normal backup and Cloud Sync behavior.
- Added Mac keyboard shortcuts for Search, Quick Add, Expense, Income, Project, and Undo.
- Added compact iPhone bottom-sheet presentation for application dialogs without changing desktop forms.
- No additional Supabase migration is required. Finance Schema remains 12, Cloud Schema remains V2, Ledger Version remains 1, Budget Version remains 1, Insights Version remains 1, and Productivity Version is 1.

### First use

Open the MacBook app first and wait for **Synced**. Test one expense template, one global search, and one duplicate-last-month entry using a small non-sensitive record. Review the expense form before saving. After the MacBook returns to **Synced**, open the iPhone and confirm the template and finance record appear. Export a new recovery backup.

## V12.23.0 · Reports & Financial Insights

- Added a multi-month financial insights workspace inside **Monthly Reports** with Selected Month, Last 3 Months, Last 6 Months, Last 12 Months, Year to Date, Year Comparison, and custom date ranges.
- Added Account and Expense Category filters. Paid spending follows the confirmed payment account; project payments are excluded when an account filter is active because project payments do not yet store a receiving account.
- Added total income, actual paid spending, net cash flow, Savings change, and project cash-margin summaries.
- Added monthly cash-flow trends, paid spending by category, account-balance history, and planned-versus-actual budget comparisons.
- Added Utility Bill trends for Electric and Water, Gym visits and cost per visit, and recurring-expense change detection for started, stopped, increased, and decreased monthly series.
- Added Savings Goal progress, Savings-account change, project income versus paid Project Costs, and selected-year YTD comparison against the prior year.
- Added one consolidated financial-insights CSV export and a print-ready **Print / Save PDF** workflow.
- Insights are derived from existing local and synchronized records. No new finance records or automatic ledger transactions are created.
- No additional Supabase migration is required. Finance Schema remains 12, Cloud Schema remains V2, Ledger Version remains 1, Budget Version remains 1, and Insights Version is 1.

### First use

Open **Monthly Reports → Insights**, choose a range, and verify the totals against one known month. Historical account balances use saved month-end report snapshots when available and ledger history as a fallback. Export a recovery backup before using insights for an important financial review.

## V12.22.0 · Monthly Budgets & Cash-flow Forecasting

- Added a monthly category budget plan inside **Budget & Expenses**. Each category has a planned amount, Fixed or Flexible group, Personal or Project scope, optional rollover, and planning note.
- Added **Build from expenses**, **Copy previous month**, and reusable budget templates. Rollover-enabled categories carry unused paid-budget value into the copied month.
- Added planned-versus-actual and committed-spending comparisons. Actual uses paid included expenses; committed uses all included paid and unpaid expense records.
- Added a month-end cash forecast based on current Available Money, expected income that has not yet been posted to an account, unpaid recorded expenses, unassigned category reserves, and the selected savings allocation.
- Added separate forecast classifications for paid expenses, recurring upcoming expenses, one-time upcoming expenses, and overdue unpaid items.
- Added account-level low-balance and shortfall warnings using the selected month’s planned payment accounts and unposted income accounts.
- Added a fixed-amount or percentage-based savings allocation. This reserves money in the forecast but does not move money or create a ledger entry.
- Added monthly budget CSV export, Dashboard forecast summaries, and a Monthly Report budget-versus-actual card.
- Added Cloud Schema V2 record synchronization for `monthlyBudgets`, `budgetTemplates`, and `budgetSettings`. No additional Supabase SQL migration is required after V12.21.0.
- Core Finance Schema remains 12, Cloud Schema remains V2, Ledger Version remains 1, and Budget Version is 1.

### First use

Open the MacBook app online first, wait for **Synced**, then build the selected month from current expenses or add categories manually. Save a template only after reviewing the category amounts. Open the iPhone after the MacBook returns to **Synced**.

## V12.21.0 · Record-level Cloud Sync 2.0

- Replaced whole-finance-state uploads with record-level synchronization. Expenses, income, projects, accounts, ledger entries, reconciliations, reports, settings, goals, recurrence records, and other saved finance values are stored as independently revisioned cloud records.
- Added Cloud Schema V2 tables for current records, sync profiles, atomic batches, and immutable audit events.
- Added database RPC functions for device registration, snapshots, incremental pull, atomic record commits, financial-operation commits, and remote device revocation.
- Local saves remain immediate. Only changed records enter the pending queue, and retries use capped exponential backoff while the app is offline or the cloud is temporarily unavailable.
- Added server-confirmed record revisions and all-or-nothing multi-record batches. Transfers, account-affecting payments, restorations, and related ledger changes cannot be partially committed across devices.
- Added per-record conflict recovery with **Retry**, **Discard local**, **Keep this version**, and downloadable conflict evidence.
- Added **Sync Health** showing the cloud protocol, audit cursor, last pull, last push, pending records, conflicts, installed app version, required writer version, and recent immutable cloud events.
- Connected Devices now shows each device’s app version and Cloud Schema. Removing a device marks it revoked for future Cloud Sync V2 commits; its cloud session is cleared when that device reconnects.
- Added minimum-writer safeguards so an older app cannot overwrite records that require a newer release. Object payloads are deep-merged server-side to preserve fields introduced by later versions.
- Existing Cloud Sync V1 data is detected during first V2 initialization and can be uploaded, downloaded, or reviewed and merged into the record-level store.
- Core finance schema remains 12 and Ledger Version remains 1. Cloud Schema advances from V1 to V2 and requires the included one-time Supabase migration.

### Required Supabase migration

Before using V12.21.0 cloud sync, run this file once in the existing Supabase project:

```text
supabase/cloud-sync-v2.sql
```

Export a recovery backup first. After the SQL succeeds, deploy V12.21.0, open the authoritative MacBook copy first, choose the appropriate migration direction, wait for **Synced**, and then update the iPhone.

## V12.20.0 · Account Ledger, Transfers & Reconciliation

- Added an append-only Account Ledger that records every supported balance change instead of silently replacing account totals.
- Existing V12.19.1 account balances are migrated once into deterministic opening-balance entries. The migration preserves each balance and does not change Available Money.
- Account balances are recalculated from active ledger entries for opening balances, expense payments, Gym auto-payments, payment reversals, income deposits, transfers, reconciliations, and documented manual adjustments.
- Mark Paid creates one ledger debit per expense, while Move to Unpaid creates one linked reversal. Existing transaction IDs and duplicate-payment protections remain active.
- Added linked account transfers. One transfer creates an equal debit and credit, requires different active accounts, blocks insufficient funds, and does not count as income or expense.
- Reworked account balance editing into reconciliation. Entering the actual account balance creates a documented adjustment and stores the prior balance, actual balance, difference, date, and note.
- Added optional income posting. New income may be added to its selected account balance; editing or deleting posted income reverses the original ledger entry safely.
- Added searchable Account Ledger and Reconciliation History cards under Settings → Accounts & Savings, plus CSV exports for both histories.
- Account renaming updates linked ledger, reconciliation, expense-payment, Gym auto-pay, income, and savings references. Accounts with a non-zero ledger balance cannot be deleted.
- Cloud Sync now includes `accountLedger` and `accountReconciliations` as record-level collections inside the existing Cloud Schema V1 state payload.
- Core finance schema remains version 12, Cloud Schema remains V1, and the new local ledger metadata uses Ledger Version 1. Existing records, backups, reports, Supabase configuration, manifest, offline page, and icons remain compatible.

### One-time behavior after updating

On the first app opening, each active account receives one opening-balance ledger entry equal to its current saved balance. Verify that the total Available Money is unchanged before recording new transfers or reconciliations.

## V12.19.1 · Repository & Security Hardening

- Added a GitHub Actions quality workflow for every pull request and push to `main`.
- Added controlled GitHub Pages deployment that publishes only the validated runtime files.
- Added `package.json`, a lockfile, and one `npm run quality` command that executes all prior regression baselines plus V12.19.1 safeguards.
- Completed the GitHub repository with the offline page, version metadata, setup guides, validation files, and tests required by the service worker and release process.
- Added CODEOWNERS, a pull-request safety template, Dependabot configuration, repository ignore rules, changelog, security policy, privacy notes, contribution guidance, and a release checklist.
- Forced Row Level Security on all cloud tables and changed payment-operation browser access to append-only: authenticated clients may select and insert their own rows but cannot update or delete audit records.
- Added `supabase/security-hardening-v12-19-1.sql` for existing projects and `supabase/rls-smoke-tests.sql` for post-migration checks.
- Core finance schema remains version 12 and Cloud Schema remains V1. Existing records, payments, backups, sync behavior, manifest, offline page, and icons remain compatible.

### Repository setup after updating

1. Run the Supabase V12.19.1 security migration once.
2. Enable GitHub Pages with **GitHub Actions** as the publishing source.
3. Run the quality workflow successfully.
4. Configure the recommended `main` ruleset described in `GITHUB_SECURITY_SETUP.md`.

## V12.19.0 · MacBook & iPhone Cloud Sync

- Added optional Supabase cloud synchronization so the same hosted PWA can exchange finance changes between a MacBook and iPhone.
- Preserved local-first behavior: every save completes in browser storage immediately, offline edits remain available, and the cloud is used only after configuration, sign-in, and first-sync approval.
- Added **Cloud Sync & Devices** to Settings with project configuration, email/password authentication, first-device upload, new-device download, merge, Sync now, automatic-sync control, pending-change status, device names, device removal, and conflict recovery.
- Added a compact toolbar cloud indicator for Synced, Syncing, Pending, Offline, Sign in, and Needs attention states.
- Added Supabase Cloud Schema V1 with `finance_cloud_state`, `finance_cloud_devices`, and `finance_payment_operations`.
- Added Row Level Security policies restricting each cloud row to the authenticated user ID.
- Added optimistic cloud revisions, record update metadata, deletion tombstones, and recoverable local/cloud/merged conflict snapshots.
- Added idempotent payment-operation audit rows for Mark Paid, Gym month-end auto-pay, and Move to Unpaid restoration retries. Payment/account conflicts keep the cloud-confirmed state and preserve the alternate copy for recovery.
- Added Realtime change notifications while both devices are open and online; closed or offline devices catch up on the next open, focus, reconnect, visibility return, periodic foreground check, or manual Sync now.
- Added `CLOUD_SYNC_SETUP.md`, `MACBOOK_IPHONE_INSTALLATION.md`, `CROSS_DEVICE_SYNC_VALIDATION_V12_19_0.md`, `cloud-sync.js`, `sync-config.example.js`, `sync-config.js`, `vendor/supabase.min.js`, and Supabase SQL setup files.
- Cloud Sync is disabled safely when no project is configured. Existing V12.18.10 local records, backups, exports, calculations, payment behavior, Gym auto-pay, Dashboard settings, and PWA installation remain compatible.
- Core finance schema remains version 12; the optional Supabase database uses Cloud Schema V1.

### One-time setup required

1. Create a Supabase project.
2. Run the SQL files in `supabase/`.
3. Add the project URL and browser-safe publishable key through `sync-config.js` or Settings.
4. Deploy the complete PWA folder to one HTTPS address.
5. Upload the MacBook records first, then sign in on the iPhone and download the cloud copy.

See `CLOUD_SYNC_SETUP.md` for the complete security and deployment process. Never place a Supabase secret or `service_role` key in the browser package.

## V12.18.10 · Confirmed Payment Account Deduction & Gym Month-End Auto-Pay

- Mark Paid now opens an in-app confirmation that requires the actual payment account; the planned account saved in the Expense form is disregarded for the transaction.
- Confirming payment deducts the exact expense amount from the selected account and immediately updates Available Money, Dashboard balances, Money Remaining, Settings balances, and new reports.
- Insufficient balances and missing accounts block the payment; double submissions and repeated deductions are prevented.
- Move to Unpaid restores the exact app-deducted amount once. Legacy paid records that never reduced a balance do not create a false restoration.
- Bulk Mark Paid uses one confirmed account for the combined amount and succeeds or fails as one transaction.
- New Gym expenses enable optional month-end auto-pay by default and require a separately selected month-end account when enabled.
- Gym auto-pay runs on the first app opening after month-end, uses the final visit count and price, and records the actual payment account and amount.
- Existing Gym records remain opt-in; missing or insufficient accounts leave the record unpaid with a visible warning.
- Added actual-payment and Gym auto-pay fields to reports, CSV exports, JSON backups, recovery, and recurring copies.
- Schema remains version 12; manifest, offline page, icons, storage keys, existing records, and prior features remain compatible.
- Added `tests/validate-v12-18-10.mjs`, `PAYMENT_ACCOUNT_DEDUCTION_VALIDATION_V12_18_10.md`, and `GYM_MONTH_END_AUTO_PAY_VALIDATION_V12_18_10.md`.

## V12.18.9 · Split Utility Bills & Recurring Series Editing

- Added Utility Bill expenses with separate Electric and Water amounts and a live combined total.
- Added safe recurring-series edit scopes: This month only, This month and future months, or Every month in the recurring series.
- Series updates use `seriesId` and preserve paid status, paid dates, record IDs, and month-specific Gym adjustments.
- Existing combined Normal Expenses are not split automatically; conversion places the old total under Electric for review.
- Added Electric and Water values to report and Expense CSV exports.
- Schema version 12, existing storage keys, records, calculations, backups, and PWA behavior remain unchanged.
- Added `tests/validate-v12-18-9.mjs` and `SPLIT_UTILITY_BILL_RECURRING_SERIES_VALIDATION_V12_18_9.md`.

## V12.18.8 · Optional Gym Emoji & Settings History

- Removed automatic 🏋️ assignment from new Gym expenses. Gym icons now start blank and are applied only when the user selects an emoji or uploaded icon.
- Preserved the 🏋️ emoji inside the icon picker and kept existing Gym-record icons unchanged.
- Removed the separate Appearance category and panel from Settings while preserving System, Light, and Dark modes through the top-right theme control.
- Changed the default Settings category to Accounts & Savings and safely redirects older Appearance Settings links there.
- Added a responsive Version History card under Advanced, with the newest release expanded and older documented releases collapsed.
- Kept version history fully offline by embedding concise summaries from the project README.
- Added `tests/validate-v12-18-8.mjs`, `OPTIONAL_GYM_ICON_VALIDATION_V12_18_8.md`, and `SETTINGS_VERSION_HISTORY_VALIDATION_V12_18_8.md`.
- Updated the app version and service-worker cache to V12.18.8.

### Preserved

- Theme preference persistence, Gym schedules and calculations, finance records, schema version 12, storage keys, reports, exports, backups, recovery, Dashboard customization, PWA installation, and offline behavior remain unchanged.


## V12.18.7 · Flexible Gym Expense

- Added **Gym expense** as a third expense type alongside Normal Expense and Daily Reserved Budget.
- New Gym expenses default to **₱80 per visit** and **Monday, Tuesday, Thursday, and Friday**.
- Added seven editable weekday controls so the usual gym days can be changed at any time.
- Added a live monthly preview showing price per visit, planned visit count, and calculated monthly total.
- Added **Adjust this month** controls to add a replacement visit date or skip a planned visit without changing the normal weekly schedule.
- Added **This month only** and **This and future months** options when editing a recurring Gym expense.
- Added separate recurring-series defaults so month-only price or weekday changes do not automatically affect later months.
- Added the standard **Health & Fitness** expense category and a **🏋️** Gym icon option.
- Gym records appear under Other Expenses and use the normal Dashboard, Monthly Reports, Paid Expenses, filters, totals, backup, recovery, CSV, and JSON workflows.
- Unpaid Gym visits appear individually on the Dashboard calendar at the price per visit; marking the Gym expense paid still records the full monthly Gym total.
- Added `tests/validate-v12-18-7.mjs` and `GYM_EXPENSE_VALIDATION_V12_18_7.md`.
- Updated the app version and service-worker cache to V12.18.7.

### Preserved

- Schema version 12, existing storage keys, all previous records, finance formulas, Dashboard bento resizing, project and payment logic, reports, backups, recovery, local sync, dark mode, PWA installation, and offline support remain compatible.


## V12.18.6 · Compact Dashboard and Project Payment Summaries

- Set the five Dashboard Monthly Overview cards to `min-height: 54px`.
- Set the four Project Payments summary cards to `min-height: 54px`.
- Reduced summary-card padding and internal spacing while keeping values readable.
- Preserved responsive expansion so cards can grow for long amounts, browser zoom, or accessibility settings.
- Kept the Dashboard Monthly Comparison card unchanged.
- Preserved Income and Paid Expenses summary heights from V12.18.5.
- Added `tests/validate-v12-18-6.mjs` and `COMPACT_DASHBOARD_PAYMENT_HEIGHT_VALIDATION_V12_18_6.md`.
- Updated the app version and service-worker cache to V12.18.6.

### Preserved

- Schema version 12, storage keys, all records and calculations, Dashboard bento resizing, projects, project payment history, Monthly Reports, backups, recovery, exports, dark mode, and offline/PWA behavior remain unchanged.


## V12.18.5 · Compact Summary Heights

- Verified the live Budget & Expenses first-row summary cards at a browser-computed height of 70px, including padding and border-box sizing.
- Matched all five Income summary cards to the same 70px desktop height.
- Matched all four Paid Expenses summary cards to the same 70px desktop height.
- Standardized compact summary padding to 10px vertically and 11px horizontally.
- Reduced label, amount, and helper-text spacing so values remain vertically aligned without changing any calculation.
- Kept long desktop helper text to one ellipsized line to prevent card growth; tablet and phone layouts may expand safely when wrapping is required.
- Preserved five Income columns and four Paid Expenses columns on wide desktops, with existing responsive wrapping on smaller screens.
- Added `tests/validate-v12-18-5.mjs` and `COMPACT_SUMMARY_HEIGHT_VALIDATION_V12_18_5.md`.
- Updated the app version and service-worker cache to V12.18.5.

### Preserved

- Schema version 12, storage keys, finance records, calculations, Dashboard resizing, reports, exports, backups, recovery, local sync, dark mode, PWA installation, and offline behavior remain unchanged.


## V12.18.4 · Dashboard Resize Grid

- Changed the desktop Dashboard bento grid from six to twelve logical columns.
- Small cards now span three columns, allowing four Small cards per row.
- Large cards now span four columns, allowing three Large cards per row.
- Wide cards now span six columns, allowing two Wide cards per row.
- Updated pointer drag, click, keyboard, and Customize Dashboard labels to use the revised Small, Large, and Wide layout.
- Preserved existing saved size names, so V12.18.3 Dashboard preferences remain compatible without migration.
- Tablet layouts keep two Small or Large cards per row and one Wide card per row; phones remain a single column.
- Kept Savings Trend, Income versus Expenses, and Monthly Calendar restricted to Large or Wide sizes.
- Added `tests/validate-v12-18-4.mjs` and `DASHBOARD_RESIZE_GRID_VALIDATION_V12_18_4.md`.
- Updated the app version and service-worker cache to V12.18.4.

### Preserved

- Schema version 12, storage keys, Dashboard order, visibility, privacy and saved size names, finance records, calculations, exports, backups, local sync, dark mode, PWA installation, and offline behavior remain unchanged.


## V12.18.3 · Bento Resize Reliability

- Added a persistent Dashboard Customize mode with a visible toolbar for Card settings, Reset, and Done.
- Made edge resize controls usable after the settings dialog closes.
- Added real pointer drag resizing with safe snapping to Small, Large, or Wide sizes.
- Preserved click-to-cycle and keyboard Arrow, Home, and End resizing alternatives.
- Added live card-size preview while dragging and clear success announcements after a size is saved.
- Kept Savings Trend, Income versus Expenses, and Monthly Calendar restricted to Large or Wide sizes.
- Added a Preview on Dashboard action to the Customize Dashboard dialog.
- Corrected the complete default mobile card order so Due-soon Warnings and Expense Schedule remain first and Monthly Calendar remains third.
- Converted the V12.18.1 validator into a version-independent UX reliability baseline.
- Updated the V12.18.2 validator to protect bento and compact-summary behavior across later releases.
- Added a unified V12.18.3 validation entry point and removed temporary extracted JavaScript from the package.
- Updated the app version and service-worker cache to V12.18.3.

### Preserved

- Schema version 12, every existing storage key, saved Dashboard order, visibility, privacy and sizes, all finance records, calculations, exports, backups, recovery, local sync, dark mode, PWA installation, and offline behavior remain unchanged.


## V12.18.2 · Bento Dashboard and Compact Summaries

- Rebuilt the Dashboard detail area as a six-column bento grid. Small cards span two columns, Large cards span three columns, and Wide cards span the full row.
- Added Dashboard card-size preferences with safe Small, Large, and Wide snap sizes.
- Added edge resize controls that appear only while Customize Dashboard is open.
- Added size selectors inside Customize Dashboard for keyboard and touch-friendly resizing.
- Preserved saved Dashboard order, visibility, privacy mode, and added safe default size merging for older saved layouts.
- Reset Dashboard layout now restores the default order, visibility, privacy state, and card sizes.
- Restyled the five Income summary cards to match the compact Budget & Expenses summary system.
- Restyled the four Paid Expenses summary cards to match the same compact summary system and removed the empty fifth KPI track.
- Kept all finance calculations, storage keys, schema version 12, exports, backups, local sync, PWA behavior, and offline support unchanged.
- Added `tests/validate-v12-18-2.mjs` and `UI_LAYOUT_VALIDATION_V12_18_2.md`.
- Updated the app version and service-worker cache to V12.18.2.

### Preserved

- All finance records, projects, payments, reports, accounts, Savings, Apple Calendar export behavior, backups, recovery, Dashboard privacy mode, Dashboard card order and visibility, mobile navigation, dark mode, and existing offline-first behavior remain unchanged.


## V12.18.1 · UX Reliability

- Separated full Monthly Expenses from the current Outstanding Expenses countdown used on Budget & Expenses.
- Dashboard, cash-flow charts, month comparisons, and live Monthly Reports now use the same full monthly-expense totals.
- Preserved remaining-day Daily Reserved Budget calculations on Budget & Expenses and due-soon displays.
- Added Arrow Left, Arrow Right, Home, and End keyboard operation to Money and Projects workspace tabs.
- Corrected Dashboard KPI help so Available Money, Monthly Income, Total Savings, Monthly Expenses, and Money Remaining open the matching explanation.
- Added a direct Current Month action when viewing another month.
- Added safe Project duplication inside Edit Project. Copies reset payment history, received amount, completion state, and Calendar identity before saving.
- Increased phone touch targets for menu, month navigation, month input, and Dashboard calendar controls.
- Added assertive announcements for blocking errors while keeping success and information messages polite.
- Corrected collapse-control accessible names so help-button text is excluded.
- Added `tests/validate-v12-18-1.mjs` and `UX_RELIABILITY_VALIDATION.md`.
- Updated the app version and service-worker cache to V12.18.1.

### Preserved

- Schema version 12, every existing storage key, saved records, backup compatibility, archived report snapshots, Dashboard customization, salary-work rules, Apple Calendar identity behavior, local sync, offline support, dark mode, and the V12.18.0 compact interface remain unchanged.


## V12.18.0 · Compact Consistent Workspace UI

- Standardized the page headers, card padding, radii, shadows, button sizes, form controls, section gaps, and typography across Dashboard, Budget & Expenses, Projects, Monthly Reports, and Settings.
- Dashboard now uses five equal compact KPI cards and a consistent two-column desktop detail grid, while full-width charts and the monthly calendar retain the space they need.
- Budget & Expenses keeps the Income, Budget & Expenses, and Paid Expenses workspace tabs, uses matching summary cards, tighter account cards, and the existing single-line compact filters.
- Projects keeps the Projects and Project Payments workspace tabs, aligns project rows, filters, status chips, payment controls, and Active/Completed section spacing.
- Monthly Reports now groups Summary, Income, Expenses, Expense records, Projects & payments, Accounts & savings, and Exports into compact expandable sections. Summary remains open by default, and report-navigation buttons open the required section before scrolling.
- Settings now opens to a plain-language overview. MacBook uses six clear sections in a left menu. iPhone uses a vertical Settings menu and a Back to Settings control instead of horizontally scrolling category tabs. Advanced, technical, and destructive actions remain available inside collapsed More options and Danger zone sections.
- Removed duplicate page-level Paid Expenses shortcuts where the consolidated workspace tabs already provide access.
- Updated the app version and service-worker cache to V12.18.0.

### Preserved

- Schema version 12, all storage keys, saved finance records, calculations, income, expenses, accounts, Savings, project and salary-work rules, project payments, reports, exports, backups, recovery snapshots, Apple Calendar files, Dashboard customization, dark mode, responsive records, dialogs, accessibility protections, and PWA installation remain unchanged.


## V12.17.3 Consolidated Navigation Workspaces

- Simplified the primary sidebar to four numbered destinations: Dashboard, Budget & Expenses, Projects, and Monthly Reports; Settings remains unnumbered at the bottom.
- Moved Income and Paid Expenses into a shared Money workspace switcher: Income | Budget & Expenses | Paid Expenses.
- Kept the existing View paid expenses shortcut inside Budget & Expenses.
- Moved Project Payments into a shared Projects workspace switcher: Projects | Project Payments.
- Preserved direct links, browser history, active navigation states, desktop/mobile behavior, all records, calculations, exports, dialogs, backups, sync, and schema 12.


## V12.17.2 Compact Popup Inputs & Monthly Checkboxes

- Reduced the value and placeholder text size across Account, Income, Expense, Project, and Savings Goal popup forms while keeping labels, headers, and actions readable.
- Removed visible peso prefixes from popup amount fields and standardized empty amount placeholders to `0.00`.
- Replaced the expanded monthly recurrence controls with direct checkboxes for Income and Expense records.
- Preserved the saved recurrence values (`Monthly` and `No`), recurring-copy behavior, validation, calculator input support, and existing records.
- Kept calculated totals, displayed balances, reports, exports, and saved financial values formatted in Philippine pesos outside data-entry fields.
- Retained V12.17.1 Delete, Duplicate, unsaved-change, confirmation-dialog, mobile footer, dark-mode, PWA, and schema-12 behavior.


## V12.17.1 Recurring Delete & Duplicate Reliability

- Fixed monthly expenses returning immediately after deletion by saving a skipped occurrence for the deleted month.
- Recurring expense deletion now offers **Delete this month only** or **Stop this and future**.
- Stopping a recurring expense removes the selected and already-created future copies while preserving earlier expense history.
- Undo restores the deleted occurrence, recurrence state, and skipped-month record together.
- Saving a duplicate is guarded against double submission, moves to the duplicate's month, highlights the new record, and confirms the destination month.
- The original expense remains unchanged. Financial formulas, reports, backups, calendar behavior, schema 12, and existing records remain compatible.


## V12.17.0 Unified Popup Forms

- Standardized all 11 dialogs with one shared 8px-radius popup system, sticky headers and footers, scrollable bodies, consistent padding, and safe mobile viewport behavior.
- Account, Income, Expense, Project, and Savings Goal forms now share compact labels, inputs, required-field guidance, short context notes, and aligned Add/Edit footers.
- Added Delete Goal inside Edit Savings Goal and kept destructive actions on the far left, Cancel before Save, and primary actions on the far right.
- Reused the in-app confirmation dialog for Account, Income, Expense, Project, Savings Goal, fixed-salary conversion, linked-Savings warnings, and discard-unsaved-changes prompts.
- Added unsaved-change protection to Account, Income, Project, and Savings Goal forms while preserving the reliable Expense workflow.
- Standardized focus behavior, Escape/backdrop close handling, opener-focus return, compact confirmation dialogs, Dashboard Customize, Mark Fully Paid, Reset Sample Data, Help, and Sync Review layouts.
- Mobile form footers now use clear two-row layouts for destructive and primary actions; Sync Review actions stack in a safe order.
- Financial formulas, saved records, icon storage, reports, calendar behavior, and schema 12 remain unchanged.



## V12.16.4 Expense Dialog Reliability

- Rebuilt **Delete Expense** with a dedicated handler and an in-app confirmation dialog.
- Fixed **Duplicate Expense** so it changes the already-open Edit Expense dialog into an unsaved duplicate review instead of reopening the modal.
- Duplicate review advances the date one month, resets paid status and recurrence, clears the original ID, and leaves the source record unchanged.
- Replaced the Expense dialog's native unsaved-change prompt with an in-app confirmation.
- Compacted Add, Edit, and Duplicate Expense layouts to match the compact Income form.
- Joined peso symbols with the Amount and Budget per Day input shells.
- Verified Close, icon selection, emoji, logo upload, icon removal, totals, recurrence, Delete, Duplicate, Cancel, Save Expense, and Save Duplicate controls.


## V12.16.3 compact forms, icon picker, and annual Income

- Income Add/Edit uses a tighter 638px desktop dialog, reduced padding, a joined peso amount field, collapsed recurrence, two-row Notes, and a short account-balance helper.
- Category Name appears only for Other Wages and Other Income. Add Income never shows Delete; Edit Income does.
- Accounts, Income, Expenses, and Savings Goals now use the icon square itself as the picker trigger. Emoji, upload, and conditional remove actions stay inside a compact popover.
- Annual Income header controls are aligned and shortened, summary cards are smaller, populated tables use narrower cells, and an empty year shows a compact message instead of empty Project Income rows.
- Edit Expense now includes Duplicate. It opens an unsaved next-month copy, clears paid and recurrence state, preserves the icon and details, and saves only after review.
- Existing records, financial formulas, backups, calendar behavior, and schema 12 remain compatible.

## V12.16.2 Income interface refinements

- Add Income now uses the same top-bar action position as Add Expense and Add Project.
- Income summary cards use consistent heights, descriptions, amount alignment, and responsive grids.
- Income filters now match the compact Paid Expenses and Projects toolbars, including an expandable mobile Filters panel.
- Income rows use the same aligned header/row grid, compact status badges, optional record icons, and right-aligned amounts.
- The Income form now follows the Expense form structure with required-field guidance, icon selection, a totals card, monthly recurrence disclosure, and an account-balance clarification.
- Transfer from Savings disables Income totals and remains an internal movement rather than new income.
- Annual Income now includes a four-value summary, narrower month columns, sticky Category/Total/Average columns, zero-value dashes, and an optional Show all categories control.
- Annual CSV exports include all standard and custom categories. Income CSV exports include icon references.


## V12.16.2 — Calendar Deduplication & Compact View

- Calendar expenses are now assigned to one event date only: unpaid records use their due date, while paid records use their paid date or saved expense date when a legacy paid date is missing.
- Recurring expense copies are scoped to their own saved month, so future or prior copies no longer appear on the selected month’s matching due day.
- Paid expenses no longer appear again as Due.
- The calendar removes duplicate events using record ID, event type, date, and paid/due state while preserving separate legitimate records that share the same name.
- The monthly grid, markers, selected-date panel, and event rows are more compact. The selected-date list scrolls after several events.
- Income, project deadlines, project payments, record icons, and all V12.16.0 functionality remain unchanged.

## V12.16.0 — Record Icons & Project Action

- Accounts, Savings Goals, and Expenses can use an optional emoji or uploaded PNG, JPEG, or WebP logo.
- Uploaded logos are fitted into a transparent 64 × 64px canvas and compressed before storage.
- Identical uploaded images share one deduplicated local icon-library entry.
- Account icons appear on Available Money cards, Dashboard Account Balances, and Settings account rows.
- Savings Goal icons appear on Dashboard and monthly-report goal summaries.
- Expense icons appear in unpaid and paid records, monthly reports, and Dashboard calendar events.
- Recurring monthly expense copies retain the same icon reference.
- JSON backups, recovery snapshots, and sync bundles preserve the icon library and record references.
- The Projects page now places **Add Project** in the top bar beside the appearance control. The page-heading duplicate was removed.
- Existing records without icons remain fully compatible.

## V12.15.0 — Income, Dashboard Calendar & Brand Refresh

- Added a complete Income page for wages, bonuses, commissions, interest, dividends, gifts, refunds, transfers from Savings, and custom income categories.
- Added recurring monthly income records, calculator-style amount entry, account selection, included/excluded totals, Edit/Delete workflow, monthly CSV, and annual Income CSV.
- Added an annual Income table with January–December values, totals, and monthly averages.
- Dashboard Income now combines eligible manual Income and eligible Project Payments. Balance remains Total Income minus included monthly expenses.
- Added Monthly Income to the Dashboard overview and Income metrics to Monthly Comparison and Monthly Reports.
- Added a Dashboard monthly calendar for Income dates, Expense dates, Project deadlines, and Project-payment dates.
- Added the uploaded white peso-symbol artwork to the favicon, Apple touch icon, PWA icons, and maskable icon.
- Replaced the primary interface color with `#173b67`; Income remains green, Expenses red, and Balance blue.
- Simplified the sidebar: Income is under Money, Budget & Expenses remains one line, and Settings is fixed at the bottom without a number badge.
- Top-bar and filter controls use a filled internal focus state without an exterior focus border; validation errors remain red.
- Schema remains 12. Older backups load with an empty `incomeRecords` list.


V12.14.0 keeps the local-first finance app compatible with schema 12 while improving navigation, filter focus, top-bar clarity, and custom expense categories.

## V12.11.2 project fixes

- Active Projects now sort by status first: Ongoing, then On hold, then Completed items that still have a balance or no project value.
- Completed projects in the Active Projects box no longer show overdue or due-soon deadline warnings.
- The Active Projects summary ignores Completed deadlines and uses the nearest Ongoing or On hold deadline instead.
- Project rows now use eight aligned desktop columns: Project, Type, Deadline, Value, Status, Payment, Calendar, and Actions.
- The desktop project header now includes the missing Payment column.
- Project notes and the “No notes” placeholder are removed from the visible row; when a note exists it appears from the project title on hover, focus, or tap.
- Calendar actions now use three clearer states: Add to calendar, Update calendar, and ✓ Added to calendar.
- The Added to calendar state uses a muted neutral style and remains downloadable for repeat exports.
- Projects that are Completed and fully paid still move automatically to the Completed Projects box.

## V12.12.0 salary-work workflow

- The package folder is permanently titled **My_Finance_Records folder**. The release version remains inside the app, README, service worker, and `version.json`.
- Projects can be classified as Freelance Project or Salary-job Project.
- Salary projects can be Included in Fixed Salary or Extra Project — Freelance Payment.
- Fixed-salary projects do not affect Project Value, Payments Received, Balance to Collect, Collection Rate, Project Income, or Income versus Expenses.
- The first three salary projects in a work month default to Included in Fixed Salary. The fourth and later projects default to Extra Paid. Saved compensation choices are never silently reclassified.
- Default hybrid schedule: office Tuesday, Thursday, Saturday; work from home Monday, Wednesday, Friday.
- Fixed-salary projects move to Completed Projects when their status becomes Completed. Paid-work projects still require Completed status and full payment.
- Project filters are compact and include Work Source. Delete Project is available only inside Edit Project.
- Reports and CSV exports include work source, work month, compensation type, salary inclusion, and extra-paid status.

## V12.13.0 dashboard charts and action consistency

- Income versus Expenses now contains two coordinated graphs: vertical Income/Expense columns with a blue Balance line, and a horizontal monthly comparison.
- Income remains green, Expenses remain red, and Balance is blue. Balance equals project income received minus included monthly expenses.
- Fixed-salary projects remain excluded from Income; extra paid salary projects remain included.
- The Dashboard Monthly Overview and Savings Trend cards use a more compact layout and a shorter no-history state.
- Add Expense appears only on Budget & Expenses, including the mobile floating action.
- Previous Month, Month, Next Month, Current Month, appearance, and Add Expense controls share one top-bar height system.
- Project calendar actions are compact pills labeled Add, Update, or ✓ Added while preserving complete accessible labels.
- Project headers and row values use matching centered columns.
- Expense Delete was removed from record rows and moved into the Edit Expense dialog.

## V12.13.1 compact filter toolbars

- Removed visible field titles from the Budget & Expenses, Paid Expenses, and Projects filter rows.
- Preserved hidden labels and ARIA names for screen-reader users.
- Reduced desktop filter height, padding, gaps, and visual weight.
- Changed filter and placeholder text to smaller muted typography.
- Kept 44px touch targets on mobile.
- Budget & Expenses retains Search, Date, Category, Comfortable/Compact, and Clear Filters.
- Paid Expenses retains Search, Category, and Clear Filters.
- Projects retains Search, Status, Type, Work Source, and conditional Clear Filters.

## V12.13.2 single-line filter actions

- Budget & Expenses now uses Compact expense rows permanently; the Comfortable/Compact selector and saved density preference were removed.
- Select Visible, selected count, Search, Date, Category, and Clear now share one compact desktop toolbar.
- Bulk Actions, Apply, and Clear appear in that same toolbar only after at least one unpaid expense is selected.
- Paid Expenses and Projects retain one-line compact filter rows with shorter Clear controls.
- The gap between Available Money and the filter toolbar is intentionally balanced: 11px desktop, 9px tablet, and 8px mobile.
- Mobile filter panels keep 44px controls and stack only where necessary for touch access.

## V12.14.0 navigation and custom categories

- Removed the peso mark from the sidebar brand and removed the sidebar instruction block.
- Grouped navigation into Overview, Expenses, Projects, Reports, and App.
- Renamed the Payments navigation item to Project Payments.
- Added related-page shortcuts between Budget and Paid Expenses, Projects and Project Payments, and Dashboard and Monthly Reports.
- Changed filter focus and selected states from green to a neutral gray treatment while retaining keyboard accessibility and red validation errors.
- Centered and muted the Month control and changed the appearance control to an icon-only button with an accessible label and tooltip.
- Selecting Other in the Expense form now reveals a required Category Name field for new expenses.
- Custom categories are stored directly on expense records and automatically appear in expense forms, filters, reports, CSV exports, JSON backups, and restored data.
- Existing legacy records saved simply as Other remain compatible.



## Files

- `index.html` — master application and UI
- `manifest.webmanifest` — installation metadata and app shortcuts
- `sw.js` — versioned app-shell cache, updates, offline fallback, and best-effort reminder events
- `offline.html` — offline fallback page
- `version.json` — app, schema, and cache version
- `icons/` — install icons

## Existing local data: safe V11 → V12 transfer

A browser treats a local `file://` page and an HTTPS website as different storage locations. Existing records cannot move automatically between them.

1. Open the old local HTML file.
2. Export its JSON backup.
3. Publish this V12 folder to GitHub Pages or run it on localhost.
4. Open V12 and go to **Settings**.
5. Choose **Import & review backup**.
6. Review the source, record counts, and conflicts.
7. Merge or replace. V12 creates a pre-import recovery snapshot first.
8. Export a V12 recovery bundle after confirming the totals.

## GitHub Pages

1. Create or open a GitHub repository.
2. Upload every file and folder from this package to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**.
5. Select the main branch and `/ (root)`.
6. Open the published HTTPS address.
7. Use **Settings → Installable app** to install or check the offline cache.

## Local HTTPS-like testing

Service workers work on localhost. From this folder, run:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## V12 features

- Random known-device registry; no hardware fingerprinting
- Manual sync/recovery bundles with import review and conflict policy
- Append-only local sync history
- Non-destructive V11 recovery copy and migration validation
- Install controls, app shortcuts, versioned update notification
- Offline app-shell cache
- Internally verified account-balance snapshots in IndexedDB
- Optional monthly/project/annual/recovery PDF packs in IndexedDB
- Foreground review checks and best-effort Periodic Background Sync
- Persistent-storage request, quota display, and recovery guidance
- Same-origin cross-tab refresh with BroadcastChannel and storage-event fallback

## Limits

- There is no automatic cloud or device-to-device sync. Devices become known through imported bundles.
- Periodic Background Sync and installation prompts depend on browser and operating-system support.
- Persistent storage may be refused by the browser.
- “Verified account snapshot” means app validation and checksum verification, not bank verification.
- Bank credentials, OTPs, card security codes, and banking sessions are never requested or stored.
- Optional PDF packs are local to the browser and are not included in JSON recovery bundles.

## Update process

1. Change the app version in `index.html`, `version.json`, and `sw.js`.
2. Change the service-worker cache version.
3. Publish all updated files together.
4. The installed app downloads the new worker and shows **App update available**.
5. The user chooses **Update now** after closing unsaved forms.


## Phase 4 dashboard and Apple Calendar

V12.4 adds a compact, configurable dashboard and an Apple Calendar deadline workflow:

- Dashboard top row: available money, total savings, total expenses, and money remaining.
- Dashboard detail cards: project payment progress, expense schedule, three urgent expenses, account balances, three largest unpaid project balances, and recent activity.
- Dashboard cards can be hidden and reordered per device.
- Privacy control hides financial amounts on the Dashboard.
- Project deadlines can automatically prepare Apple-compatible `.ics` calendar files after saving.
- Calendar reminder choices: none, deadline time, one day, three days, or one week before.
- Project rows show calendar status and provide Add to Calendar or Download actions.
- Project Calendar defaults control automatic preparation, notes, reminders, and optional financial values.

Apple Calendar still requires the downloaded `.ics` file to be opened and confirmed. The PWA cannot silently create, edit, verify, or delete an event inside Apple Calendar. Deleting a project does not remove an already imported calendar event.

## Phase 3 monthly workflow

V12.2 adds faster monthly navigation and review tools without replacing existing finance records:

- Previous- and next-month buttons beside the month picker
- Current, upcoming, ended, and report-completed month status
- Compact comparison with the previous month for total, paid, unpaid, and remaining amounts
- A five-item monthly checklist saved with the finance backup
- Blank Add/Edit Account balances automatically save as `0`
- Blank account fields in Settings also save as `0`

## Phase 2 expense workflow

V12.1 adds a focused expense-management upgrade without changing the finance-data schema:

- Comfortable and compact expense-list modes, remembered per browser.
- Row selection and bulk actions for paid status, expense period, monthly repeat, paid-from account, and deletion.
- Quick expense changes for amount, expense date, due day, period, and next-month duplication.
- A conditional expense form that separates normal expenses from daily reserved budgets and hides irrelevant fields.
- Existing V12 device, sync, PWA, offline, storage, recovery, and V11 migration features remain intact.

The application still uses schema version 12. Existing V12 data opens directly; no destructive conversion is performed.

## Cumulative balance calculations

The Budget & Expenses calculation row now uses four cards based on the current unpaid period totals shown directly above it:

- **Total expenses** — first half + second half + other expenses.
- **First-half difference** — available money − first-half expenses.
- **Second-half difference** — available money − (first-half expenses + second-half expenses).
- **Money remaining** — available money − total expenses.

A positive difference means money remains after the stated expense periods. A negative difference means those expenses exceed available money. Zero means the available money exactly covers the stated expense periods. Paid status remains available in expense records and on the Paid Expenses page.


## V12.4 · Phase 5

- Added System, Light, and Dark appearance modes with a quick top-bar toggle.
- Reduced card, dialog, input, navigation, and button corner radius.
- Replaced colored top lines and decorative corner marks with softly filled bento cards.
- Removed the duplicate Undo and Add Expense controls from the Budget & Expenses heading; the global top-bar Add Expense control remains.
- Reorganized Monthly Reports into five sections: summary, expenses by period, expense records, project income, and account snapshot/exports.
- Added previous-month comparison for available money, total expenses, paid amount, money remaining, and project income.
- Added Draft, Active month, Final, and Regenerated report lifecycle states.
- Added monthly report JSON export and clearer Print / Save PDF controls.
- Print remains light even when the app is in dark mode.


## V12.5 · Phase 6 Savings & Insights

- Added account types: Cash, Bank, E-wallet, Savings, and Other.
- Existing account names and balances remain unchanged; recognizable account names receive a safe default type.
- Added a real **Total savings** dashboard card calculated only from accounts marked as Savings.
- Replaced the Paid Expenses top card with Total Savings; paid records remain visible in reports and monthly comparisons.
- Added a local, offline Savings Trend line chart with 3-, 6-, or 12-month periods.
- Added an Income versus Expenses chart and selected-month Net Cash Flow.
- Historical savings points use saved monthly snapshots. Missing snapshots remain blank and are never treated as zero.
- Added Savings settings for the default account, trend period, and whether Savings balances are included in Available Money.
- Monthly Reports now include Total Savings, Savings-account breakdown, previous-month comparison, CSV data, JSON data, and printed output.
- Verified account snapshots now include account types and a Savings total.

**Definitions**

- **Total savings** is the combined balance of accounts marked as Savings.
- **Money remaining** is Available Money minus Total Expenses. It is not automatically counted as Savings.
- **Net cash flow** is project income received minus total expenses. It explains monthly movement but is not automatically transferred to a Savings account.


## V12.6 · Phase 7 Secure Sample-Data Reset

- Replaced the one-click browser confirmation for **Reset sample data** with a dedicated warning dialog.
- The destructive reset button remains locked until `reset sample data` is typed. Matching ignores capitalization and leading or trailing spaces; partial phrases do not unlock it.
- Pressing Enter cannot reset records unless the complete confirmation phrase matches.
- Before replacing active records, the app must create a local recovery snapshot named **Before sample data reset**.
- The reset stops without changing active records when the recovery snapshot cannot be saved.
- The confirmation field is cleared after cancellation, closing, successful completion, or failure recovery.
- After a successful reset, the app returns to the Dashboard and confirms that the previous records were preserved in a recovery snapshot.

Local recovery snapshots remain in the same browser. Export a recovery bundle or JSON backup before clearing browser storage or changing devices.


## V12.7.1 · Phase 8 Expense Total Choice · Font Reverted

- Added **Add this amount to expense totals** to the Add/Edit Expense form.
- New expenses are included by default, preserving the existing calculation behavior.
- Existing and imported expenses without the new field remain included automatically.
- Unchecked expenses stay visible and keep their amount, date, category, account, recurrence, paid status, and due warnings, but do not affect Total Expenses, paid/unpaid totals, Money Remaining, monthly comparisons, reports, or Net Cash Flow.
- Excluded records display an **Excluded from totals** badge on Budget & Expenses, Paid Expenses, and Monthly Reports.
- Dashboard and report counts show included and excluded records separately.
- Monthly report CSV and all-expenses CSV exports include an **Included in Totals** column.
- Recurring and duplicated expenses preserve the selected included/excluded setting.
- Reverted the interface to the original system UI font stack. The Cutive Mono import was removed from the main app and offline page.

**Important:** Excluding a real expense can make Money Remaining appear higher than the amount truly available. Use the option for informational or reimbursable records that should remain visible without affecting calculated totals.


## V12.8.0 · Phase 9 UI/UX Stabilization

- Rebuilt Projects, Project Payments, and Monthly Report records as responsive mobile cards to prevent horizontal overflow.
- Kept one mobile **Add expense** action visible while preserving the single desktop top-bar action.
- Fixed Monthly Checklist contrast in dark mode and increased touch targets and small-text readability.
- Clarified calculation terminology without changing formulas: **Monthly expenses** on Dashboard/Reports and **Outstanding expenses** on Budget & Expenses.
- Added sticky, scrolling modal bodies with persistent headers and action footers; all main dialogs now have accessible names.
- Added responsive mobile action menus for expense, paid-expense, and project records.
- Organized Settings into Appearance, Accounts & Savings, Projects & Calendar, Backup & Recovery, Offline App, and Advanced tabs.
- Added accessible chart data tables, improved mobile chart labels, and a clear zero-Savings state.
- Added Sidebar ARIA state, Escape handling, mobile focus containment, page history, Back/Forward support, safe-area padding, and reduced-motion support.
- Restored the approved flatter 8px mobile card corners and moved full build information to the version badge tooltip.
- Reduced routine full-page rendering: ordinary updates render the active page, while startup still performs a complete validation render.
- Schema remains **12**. Existing storage keys, finance formulas, records, Dashboard preferences, theme preference, recovery data, and PWA installation remain compatible.

### Calculation labels

- **Monthly expenses**: all selected-month expense records included in calculated totals, whether paid or unpaid.
- **Outstanding expenses**: the unpaid portion of included expense records.
- **Money remaining**: Dashboard/Reports subtract Monthly expenses; Budget & Expenses subtracts Outstanding expenses.
- **Total savings** and **Net cash flow** remain separate and are not inferred from Money remaining.


## V12.9.0 · Phase 10 Projects, Savings Goals & Number Inputs

- Active projects are permanently ordered by deadline priority: nearest overdue items, due today, nearest upcoming deadlines, then projects without deadlines.
- Added separate **Active Projects** and collapsible **Completed Projects** sections. A project enters Completed Projects only when its status is Completed and its received amount covers the full project value.
- Added **Mark fully paid**, which records only the remaining balance as a final payment and preserves payment history.
- Added multiple customizable **Savings Goals** for travel, gadgets, shoes, emergency funds, and other goals. Goals may use manual planning progress or link to an actual Savings account without double-counting Total Savings.
- Savings Goals are included in Dashboard customization, privacy mode, backups, recovery bundles, sync data, monthly report JSON/CSV, and print reports.
- Replaced native monetary number controls with peso-prefixed decimal inputs that accept pasted commas and peso symbols, reject scientific notation, prevent mouse-wheel changes, select values on focus, and show inline validation.
- Due-day fields use whole-number validation without currency formatting.
- Project CSV exports now include fully-paid, completed-and-paid, and completion-date fields.
- Schema remains **12**. Older data loads with an empty Savings Goals list and existing project/account values are preserved.

### Savings Goal definitions

- **Linked goal:** progress comes from an existing account marked Savings. The balance remains counted once in Total Savings.
- **Manual goal:** progress is planning-only and does not change account balances or Total Savings.
- Deleting a goal never deletes or changes a linked account.

## V12.9.1 · Calculator Number-Input Correction

- Added safe calculator-style entry to every monetary field. Examples: `200 + 100`, `1,500 + 250.50`, `400 × 15`, `6000 / 3`, and `(5000 - 500) / 2`.
- Supported operators are addition (`+`), subtraction (`-` or `−`), multiplication (`*` or `×`), division (`/` or `÷`), and parentheses.
- Operators are preserved while typing and are never silently removed. `200+100` evaluates to `₱300.00`; it cannot become `200100`.
- Valid expressions show a live result preview. The result is evaluated and formatted when Enter, Tab, blur, or Save is used.
- Added inline errors for incomplete expressions, unsupported characters, invalid operator sequences, missing parentheses, division by zero, non-finite results, negative results where prohibited, and excessive values.
- The calculator uses a restricted arithmetic parser and does not use JavaScript `eval()` or execute user-entered code.
- Added a mobile operator row for `+`, `−`, `×`, `÷`, `(`, and `)` while a numeric field is active.
- Due-day fields also accept simple arithmetic, but the final result must be a whole number inside the allowed date range.
- Existing records, formulas, Projects, Completed Projects, Savings Goals, backups, reports, dark mode, offline operation, and schema version 12 remain unchanged.

## V12.10.0 · Phase 11 Interface Refinement

- Compact top navigation, month controls, Budget summary cards, Available Money cards, filters, and bulk-action controls without changing any financial formula.
- Added a saved **account order**. Account cards can be dragged on desktop, reordered with arrow keys, or moved with accessible Up and Down controls on touch layouts. The selected order is reused on the Dashboard, Budget & Expenses, Settings, and account selectors.
- Unified desktop column alignment so Expense descriptions, dates, payment accounts, amounts, and actions remain directly beneath their headers. Applied matching alignment improvements to Paid Expenses, Projects, Project Payments, and report records while preserving stacked mobile cards.
- Removed **Quick Change** from every expense interface. Use **Edit** for record changes; Mark Paid, monthly recurrence, Delete, and bulk actions remain available.
- Rebuilt the monthly recurrence star as a fixed circular control so the star stays centered and no longer shifts the Amount or Actions columns.
- Added accessible `?` help dialogs for Available Money, First Half, Second Half, and Other Expenses. Each explanation states which records appear and whether excluded expenses affect totals.
- Removed the Dashboard Monthly Checklist and Reset Checklist controls. Existing `monthlyChecklists` data remains preserved for backward compatibility but is no longer rendered.
- The filter area becomes a compact **Filters & view** disclosure on mobile. Bulk action controls remain hidden until at least one expense is selected.
- No login, username, password, authentication middleware, or hosting secret is included in this release.
- Schema remains **12**. Existing accounts, balances, account types, Savings Goals, expenses, projects, reports, backups, recovery data, dark mode, and calculator-style amount entry remain compatible.


## V12.11.0 · Phase 12 Application-wide Accessible Help

- Added compact contextual `?` help beside every page title, major KPI, summary value, Dashboard card, Budget section, Paid Expenses area, Project section, Project Payments summary, Monthly Report section, Settings card, and major dialog.
- Added focused help beside complex form labels for account balances and types, expense amounts and periods, due days, payment accounts, recurrence, project status and values, and Savings Goal settings.
- The help controls remain visually quiet at approximately 19–20px and sit directly beside the words they explain. Their invisible pointer area is larger so they remain usable on touch screens.
- Replaced the large help presentation with a compact dialog up to 390px wide. It contains a short explanation, an optional calculation, and an optional note without a large footer.
- Help can be opened by mouse, touch, Enter, or Space. Escape, the close button, or clicking the backdrop closes it, and keyboard focus returns to the exact help button that opened it.
- Help controls are hidden in printed reports and do not change records, totals, Dashboard order, or financial formulas.
- All help topics are stored in one centralized registry so terminology and future updates remain consistent.
- No login or authentication feature is included. Schema remains **12** and all existing finance data stays compatible.


## V12.11.1 · Hover Help & Bento Polish

- Contextual help remains available throughout the application, but hover-capable devices now reveal each `?` only when the related title or label is hovered or focused. The button remains keyboard accessible and a faint touch fallback is retained for devices without hover.
- Reduced the help icon to a quieter 16–18px visual size while preserving its larger invisible pointer target. Titles reserve the small icon space, so revealing help does not shift surrounding text or values.
- Restored one continuous, slightly stronger colored border around every summary bento card, including the top edge and rounded corners.
- Shortened and tightened Budget summary descriptions so they fit cleanly without clipping while keeping amounts in a stable right-aligned column.
- Removed the repeated Delete button from account cards. Existing accounts now expose **Delete account** only inside the Edit Account dialog, with the same confirmation, linked-goal conversion, default-Savings cleanup, record-history preservation, and minimum-one-account safeguards.
- No login feature was added. Financial formulas, schema version 12, stored data, account order, exports, backups, offline behavior, and all 112 help topics remain compatible.