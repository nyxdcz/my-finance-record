# V12.25.0 Reminders & Scheduled Alerts Validation

## Scope

- Expense due-date and overdue reminders
- Low account-balance reminders
- Expected unposted-income reminders
- Monthly Savings contribution reminders
- Missing Utility Bill entry reminders
- Today’s Gym schedule reminders
- Failed Gym month-end auto-payment reminders
- Unsynchronized Cloud Sync and conflict reminders
- Recovery-backup age reminders
- Daily grouped digest, optional individual-alert delivery, app badges, pause, test notification, and local history

## Safety boundaries

- Alerts are derived from saved records and settings only.
- Alert checks do not call payment, transfer, income-posting, reconciliation, budget-editing, ledger-append, or destructive record functions.
- System notification permission is requested only when **Enable notifications** or **Send test** is selected by the user.
- Reminder settings synchronize through Cloud Schema V2. Notification permission, delivery history, sent fingerprints, and pause state stay device-local.
- Exact closed-app timing is not guaranteed. Browsers control background execution and Periodic Background Sync availability.
- On iPhone and iPad, system notifications require the installed Home Screen web app and a direct user interaction to request permission.

## Calculation rules

- Due and overdue checks use the expense date or its saved month and due day. Paid expenses are excluded.
- Expected-income checks exclude income already posted to the Account Ledger and **Transfer from savings** records.
- Savings contribution progress counts positive current-month ledger activity into accounts typed as Savings, excluding opening balances and reconciliation adjustments.
- Utility reminders appear only after the configured day when no Utility Bill record exists for the current month.
- Gym schedule checks honor saved weekdays plus added and removed date overrides.
- Failed Gym auto-pay reminders require an enabled Gym auto-pay record that remains unpaid after its month or is explicitly suppressed.
- Cloud reminders use pending-record and conflict counts exposed by Cloud Sync V2.
- Backup reminders compare the configured maximum age with the last recorded external recovery backup date.

## Automated validation

- `node tests/validate-v12-25-0.mjs`
- Complete V12.18.1–V12.24.0 regression chain
- JavaScript, inline-script, and service-worker syntax checks
- Static and injected HTML ID uniqueness
- Alert fixture coverage for all ten reminder types
- Daily schedule, digest, individual-alert fingerprint, pause, and no-mutation safeguards
- Cloud Schema V2 reminder-settings round-trip
- Service-worker, GitHub Pages, cache, and app-version agreement
- Protected manifest, offline page, icons, Supabase SQL, and credential checks

## Device checks after publication

- MacBook Chrome or installed PWA: grant permission, send a test, run a manual check, and verify the badge and history.
- iPhone/iPad: install to Home Screen, open the installed app, grant permission from the in-app button, and send a test.
- Confirm the reminder settings synchronize between devices while each device keeps its own permission and history.
- Confirm no finance record, balance, budget, or ledger value changes after a reminder check.

## Preserved

- Finance Schema 12
- Cloud Schema V2
- Ledger Version 1
- Budget Version 1
- Insights Version 1
- Productivity Version 1
- Existing records, account balances, payment IDs, transfers, reconciliations, budgets, reports, backups, and cloud audit history
- Manifest, offline page, icons, and Supabase security files
- No additional Supabase migration
