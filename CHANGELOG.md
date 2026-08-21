# Changelog

This changelog follows the **organized product version history** for My Finance Records.

The previous repository history from **V12.19.0 through V15.2.24** has been consolidated into the cleaner **V1.0.0 → V2.0.0** product roadmap. The original detailed release sequence remains recoverable from Git history, while the mapping at the bottom of this file keeps the old version ranges traceable.

## 2.0.0 · 2026-08-22

### Organized Complete

- Established **V2.0.0** as the current production release and completed the organized V1.0.0-to-V2.0.0 product history.
- Combined the complete local-first Finance workspace, Account Ledger, budgeting, reporting, projects, productivity tools, reminders, security, encrypted Cloud Schema V3 synchronization, responsive interface, and PWA delivery into one organized release baseline.
- Added the final Budget & Expenses compact-card system, independent First half / Second half / Other expenses collapse controls, and the PNG mascot summary system.
- Standardized the current product identity and PWA cache on `finance-v2-20260822-organized-complete-r1`.
- Preserved Finance Schema 12, Cloud Schema V3, ledger history, saved records, calculations, balances, recurrence, payments, backups, encryption, conflict handling, and synchronization semantics.
- Updated repository validation and browser tests to use the V2.0.0 release identity while retaining legacy V13/V14/V15 asset filenames where renaming would create unnecessary compatibility risk.

## 1.14.0 · Budget & Expense Final Polish

**Reorganized from:** V15.2.19–V15.2.24 and V15.2.24 maintenance.

- Compacted desktop expense cards, metadata, action rows, and Budget & Expenses section geometry.
- Finalized Repeat monthly, Mark paid, Edit, and expense-selection control placement.
- Added independent collapse behavior for First half, Second half, and Other expenses.
- Finalized compact Monthly budget plan and summary layouts.
- Added the 30×30 PNG mascot system for zero-state and difference summaries.
- Preserved phone numeric fallbacks, accessibility labels, 20×20 desktop collapse controls, and existing finance/sync behavior.

## 1.13.0 · Production UX & Code Organization

**Reorganized from:** V15.2.0–V15.2.18.

- Added actionable empty states, filter recovery, validation feedback, busy states, and clearer Cloud Sync errors.
- Improved 320–428px phone layouts and common 1280px/1366px desktop layouts.
- Extracted form inputs, Application Help, shell UI, Cash Flow ownership, and other stable subsystems into dedicated source modules.
- Hardened Supabase startup and cloud-readiness behavior.
- Added structured Project drag-and-drop and horizontal Kanban boards with custom columns and Undo.

## 1.12.0 · Modern PWA & Visual System

**Reorganized from:** V15.0.0–V15.1.0 plus related PWA delivery work.

- Introduced the modern black-and-blue visual system and adaptive Liquid Glass controls.
- Standardized desktop and mobile control sizing and responsive Finance cards.
- Added Asia/Manila automatic Day/Night appearance behavior.
- Hardened PWA update detection, cache cleanup, cache repair, and version-pinned asset delivery.
- Simplified Dashboard Cash Flow presentation while preserving finance calculations.

## 1.11.0 · Cross-Device Sync Hardening

**Reorganized from:** V14.0.19–V14.0.23 and V15.0.3 sync hardening.

- Ensured shared Finance persistence paths queue cloud changes consistently.
- Added foreground, resume, reconnect, and visible-device synchronization recovery.
- Preserved local changes through pre-pull reconciliation and three-way merge behavior.
- Added explicit same-record conflict review and reliable **Use cloud version** / **Use this device** handling.
- Standardized five-minute routine sync while preserving immediate manual and incoming Realtime sync.

## 1.10.0 · Projects, Calendar, Navigation & Accessibility

**Reorganized from:** V14.0.0–V14.0.18.

- Replaced the older Projects-only calendar with Project Agenda and Dashboard calendar integration.
- Added agenda event identity, upcoming/completed sections, linked project completion, urgency indicators, and ICS export.
- Added persistent desktop navigation, expand/collapse behavior, pinning, workspace destinations, dashboard card ordering, Settings search, and Undo/Redo.
- Improved menus, ARIA state, focus behavior, progress indicators, reduced motion, drag-and-drop accessibility, chips, badges, pills, tags, and toasts.

## 1.9.0 · Mobile Finance & Transaction Reliability

**Reorganized from:** V13.0.1–V13.0.18.

- Rebuilt the iPhone Finance experience with compact summaries, contextual actions, bottom-sheet dialogs, safe 44×44 touch targets, and anti-auto-zoom input sizing.
- Added direct account spending with Paid Expenses and Account Ledger integration.
- Added transaction verification, rollback protection, duplicate-submit prevention, and safer reversals.
- Expanded project revision cycles and completed-project handling.
- Added PWA install guidance, password recovery, recovery-link handling, and signed-out privacy locking.

## 1.8.0 · Profiles, Encryption & Security

**Reorganized from:** V13.0.0.

- Added Personal and Household profiles with Owner, Editor, and Viewer roles.
- Introduced Cloud Schema V3 and profile-scoped cloud records.
- Added client-side AES-256-GCM encryption and PBKDF2-SHA-256 key derivation.
- Added encrypted `.mfrx` backups, invitations, member/device management, restore points, app lock, MFA, and experimental passkey controls.

## 1.7.0 · Reminders & Notifications

**Reorganized from:** V12.25.0.

- Added reminders for due/overdue expenses, low balances, expected income, savings contributions, utility entries, Gym schedules, failed payments, unsynchronized changes, and recovery backups.
- Added grouped daily notifications, configurable delivery time, permission/delivery status, app badges, notification history, test notifications, and pause controls.
- Kept reminder behavior informational only; notifications do not automatically move money or post transactions.

## 1.6.0 · Productivity & Quick Actions

**Reorganized from:** V12.24.0.

- Added Universal Quick Add for expenses, income, projects, transfers, and reconciliation.
- Added templates, previous-month duplication, global search, advanced filters, bulk category editing, payment-account correction, recent-account suggestions, and recently edited records.
- Added local Undo history, keyboard shortcuts, and iPhone-friendly action sheets.

## 1.5.0 · Reports & Financial Insights

**Reorganized from:** V12.23.0.

- Added multi-month, year-to-date, previous-year, and custom-range reporting.
- Added Income, spending, cash-flow, savings, and project KPIs.
- Added category, account, planned-vs-actual, Utility Bill, Gym, recurring-expense, Savings Goal, and project-profitability analysis.
- Added consolidated CSV and print-ready PDF export.

## 1.4.0 · Budget Planning

**Reorganized from:** V12.22.0.

- Added monthly category budgets with Fixed/Flexible and Personal/Project scopes.
- Added planned, actual, committed, remaining, utilization, rollover, template, savings-allocation, and forecast behavior.
- Added expected-income and upcoming-expense forecasting, low-balance warnings, Budget CSV export, and Dashboard/Report summaries.

## 1.3.0 · Record-Level Cloud Sync

**Reorganized from:** V12.21.0.

- Introduced Cloud Schema V2 record-level synchronization.
- Added incremental pull, immutable audit events, atomic RPC batches, optimistic revisions, per-record conflict handling, retry behavior, Sync Health, device revocation, and minimum writer/app compatibility rules.

## 1.2.0 · Account Ledger & Reconciliation

**Reorganized from:** V12.20.0.

- Added the append-only Account Ledger and opening-balance migration.
- Moved account balances to ledger-derived values.
- Added transfers, reconciliation adjustments/history, account-linked income posting/reversal, ledger search/filtering, and CSV export.
- Added financial-integrity protections around transfers, account deletion, reconciliation, and account renaming.

## 1.1.0 · Cloud Sync Foundation

**Reorganized from:** V12.19.0–V12.19.1.

- Added optional Supabase synchronization between devices.
- Added first-sync local/cloud choices, offline pending changes, connected-device tracking, Realtime updates, deletion tombstones, conflict recovery, and idempotent payment operations.
- Added GitHub Actions quality validation, controlled GitHub Pages deployment, repository security documentation, dependency controls, and Supabase RLS validation.

## 1.0.0 · Created

**Historical basis:** Reconstructed foundation that existed before the documented V12.19.0 changelog.

- Created the local-first My Finance Records application.
- Added Dashboard, Finance, Income, Budget & Expenses, Paid Expenses, Accounts, Projects, calendar, and Settings.
- Added local browser persistence, monthly finance calculations, income/expense CRUD, unpaid/paid expense tracking, account balances, project values/payments, stable record IDs, backup/export behavior, and basic offline/PWA support.

---

# Legacy Version Mapping

| Organized version | Original repository history |
| --- | --- |
| **1.0.0** | Reconstructed pre-V12.19.0 foundation |
| **1.1.0** | V12.19.0–V12.19.1 |
| **1.2.0** | V12.20.0 |
| **1.3.0** | V12.21.0 |
| **1.4.0** | V12.22.0 |
| **1.5.0** | V12.23.0 |
| **1.6.0** | V12.24.0 |
| **1.7.0** | V12.25.0 |
| **1.8.0** | V13.0.0 |
| **1.9.0** | V13.0.1–V13.0.18 |
| **1.10.0** | V14.0.0–V14.0.18 |
| **1.11.0** | V14.0.19–V14.0.23 + V15.0.3 |
| **1.12.0** | V15.0.0–V15.1.0 |
| **1.13.0** | V15.2.0–V15.2.18 |
| **1.14.0** | V15.2.19–V15.2.24 maintenance |
| **2.0.0** | Organized complete production baseline |

Going forward, new releases should continue from **V2.0.0** using normal semantic versioning rather than returning to the old V12–V15 numbering.
