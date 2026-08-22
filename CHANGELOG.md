# Changelog

## V2.0.1 · Talaan

**Current production release:** V2.0.1

Talaan V2.0.1 is the active release baseline. This changelog focuses only on the current product version.

### Brand and PWA

- Renamed the current product experience to **Talaan**.
- Updated the website title, sidebar brand, installed-app labels, manifest metadata, offline page, install messaging, and calendar export branding.
- Updated current-facing repository documentation to use the Talaan name.
- Rotated the PWA cache to `finance-v2-20260822-talaan-r2` so installed clients receive the new branding.
- Preserved compatibility-sensitive storage keys, repository paths, calendar UID domains, and runtime filenames where changing them could affect saved data or installed clients.

### Finance

- Local-first Dashboard and Finance workspace.
- Income, Budget & Expenses, Paid Expenses, Accounts, and Account Ledger.
- Transfers, reconciliation, direct account spending, payment reversals, and auditable balances.
- Monthly category budgets, planned vs. actual spending, savings allocation, forecasts, and low-balance awareness.
- Multi-range reports, financial insights, project profitability, utility trends, and CSV/PDF export.

### Budget & Expenses

- Compact desktop expense cards and action rows.
- First half, Second half, and Other expenses sections with independent collapse controls.
- Repeat monthly, Mark paid, Edit, and expense-selection controls.
- Compact Monthly budget plan and summary layouts.
- PNG mascot summaries with phone numeric fallbacks and accessible numeric labels.

### Projects & productivity

- Projects, completed projects, revision cycles, and Project Agenda.
- Dashboard calendar integration and ICS export.
- Horizontal Kanban workflow with custom columns and Undo.
- Quick Add, templates, global search, filters, bulk actions, reminders, notifications, and keyboard shortcuts.

### Cloud sync & security

- Optional encrypted multi-device synchronization.
- Finance Schema 12 and Cloud Schema V3.
- Record-level synchronization, offline pending changes, Realtime updates, conflict review, and recovery safeguards.
- Client-side AES-256-GCM encrypted cloud payloads and encrypted backups.
- PBKDF2-SHA-256 key derivation, profile roles, device management, app lock, and MFA support.
- Browser-delivered configuration prohibits privileged secrets.

### Interface & accessibility

- Responsive desktop, tablet, and phone layouts.
- Desktop navigation rail and mobile navigation drawer.
- Accessible menus, dialogs, progress indicators, focus states, reduced-motion support, and screen-reader announcements.
- Automatic appearance scheduling for Asia/Manila.
- PWA install, offline support, update recovery, and version-aware cache handling.

### Reliability

- Protected finance calculations, balances, recurrence, payments, ledger history, projects, backups, and synchronization state.
- Regression, browser, privacy, accessibility, and deployment validation in GitHub Actions.

Future release notes continue from the current Talaan V2 product line using semantic versioning.
