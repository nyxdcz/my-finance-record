# My Finance Records — Organized Version Roadmap

This is the **new product version history** for My Finance Records.

It reorganizes and combines the documented repository work from **V12.19.0 through V15.2.24** into a clean development story beginning at **V1.0.0 (Created)** and ending at **V2.0.0 (Organized Complete)**.

> The original V12–V15 history is still preserved in `CHANGELOG.md` for auditability. This file is the organized product roadmap going forward.

---

# Version Strategy

The clean build order is:

1. Create the local finance application.
2. Add reliable account and transaction behavior.
3. Add cloud synchronization.
4. Add budgets, reports, and productivity tools.
5. Add reminders, profiles, encryption, and security.
6. Improve mobile and desktop usability.
7. Add projects, calendar, navigation, and accessibility.
8. Harden cross-device synchronization and PWA delivery.
9. Organize the codebase and polish production UI.
10. Finish as V2.0.0 with the complete organized product.

---

# V1 Series — Building the Application

## V1.0.0 — Created

**Goal:** Establish the first working local-first personal finance application.

### Core application

- Dashboard
- Finance workspace
- Income records
- Budget & Expenses
- Paid Expenses
- Accounts and balances
- Projects
- Monthly calendar
- Settings
- Local browser persistence
- Basic backup/export behavior
- Offline/PWA foundation

### Core finance behavior

- Create, edit, and delete income.
- Create, edit, and delete expenses.
- Track unpaid and paid expenses.
- Track account balances.
- Track project value and received payments.
- Calculate monthly totals.
- Separate First half, Second half, and Other expenses.
- Preserve stable record identifiers and timestamps.

**Historical basis:** Reconstructed application foundation that existed before the repository changelog starts at V12.19.0.

---

## V1.1.0 — Cloud Sync Foundation

**Goal:** Synchronize finance data safely between devices.

### Added

- Optional Supabase synchronization.
- First-sync local/cloud choices.
- Offline pending changes.
- Connected-device tracking.
- Realtime updates.
- Deletion tombstones.
- Basic conflict recovery.
- Idempotent payment-operation records.
- GitHub Actions quality validation.
- Controlled GitHub Pages deployment.
- Repository security and release documentation.
- Supabase Row Level Security validation.

**Combined from:** V12.19.0–V12.19.1.

---

## V1.2.0 — Account Ledger & Reconciliation

**Goal:** Make balances auditable instead of treating them as simple editable values.

### Added

- Append-only Account Ledger.
- Opening-balance migration.
- Ledger-derived account balances.
- Account transfers.
- Reconciliation adjustments.
- Reconciliation history.
- Optional income posting to accounts.
- Safe income reversal.
- Ledger search, filtering, and CSV export.

### Financial integrity

- Balance corrections create reconciliation entries.
- Transfers validate account selection and available funds.
- Accounts with remaining balances cannot be silently deleted.
- Account renaming updates supported linked records.

**Combined from:** V12.20.0.

---

## V1.3.0 — Record-Level Cloud Sync

**Goal:** Replace full-state sync with safer individual-record synchronization.

### Added

- Cloud Schema V2.
- Record-level sync queues.
- Incremental pull by audit cursor.
- Immutable cloud audit events.
- Atomic RPC commits.
- Optimistic revision checks.
- Per-record conflict recovery.
- Exponential retry.
- Sync Health.
- Device revocation.
- Minimum app/writer compatibility checks.

**Combined from:** V12.21.0.

---

## V1.4.0 — Budget Planning

**Goal:** Turn Budget & Expenses into a complete monthly planning system.

### Added

- Monthly category budgets.
- Fixed and Flexible budget groups.
- Personal and Project scopes.
- Planned vs actual spending.
- Committed expenses.
- Remaining budget and utilization.
- Optional rollover.
- Budget templates.
- Build-from-expenses planning.
- Savings allocation.
- Month-end forecast.
- Expected income and upcoming-expense forecasting.
- Budget CSV export.
- Dashboard and Monthly Report budget summaries.

**Combined from:** V12.22.0.

---

## V1.5.0 — Reports & Financial Insights

**Goal:** Add deeper analysis without changing the underlying finance records.

### Added

- Multi-month and year-to-date reporting.
- Previous-year comparison.
- Custom date ranges.
- Account/category filters.
- Income, spending, cash-flow, savings, and project-margin KPIs.
- Monthly cash-flow views.
- Category-spending analysis.
- Account-history views.
- Planned-vs-actual reporting.
- Utility trends.
- Gym cost-per-visit analysis.
- Recurring-expense change detection.
- Savings Goal reporting.
- Project profitability.
- CSV and print-ready PDF export.

**Combined from:** V12.23.0.

---

## V1.6.0 — Productivity & Quick Actions

**Goal:** Make frequent finance tasks faster.

### Added

- Universal Quick Add.
- Expense templates.
- Quick Income, Project, Transfer, and Reconciliation creation.
- Previous-month duplication.
- Global Search.
- Advanced filters.
- Bulk category changes.
- Payment-account correction.
- Recent-account suggestions.
- Recently edited records.
- Local undo history.
- Keyboard shortcuts.
- iPhone bottom-sheet dialogs.

**Combined from:** V12.24.0.

---

## V1.7.0 — Reminders & Notifications

**Goal:** Surface important finance events without automatically moving money.

### Added reminders for

- Due and overdue expenses.
- Low balances.
- Expected income.
- Savings contributions.
- Missing Utility Bill entries.
- Gym schedules.
- Failed Gym auto-payments.
- Unsynchronized cloud changes.
- Recovery backups.

### Notification system

- Daily grouped notifications.
- Configurable notification time.
- Alert list and delivery status.
- App badges.
- Test notification.
- 24-hour pause.
- Device-local notification history.
- Foreground and background checks where supported.

**Combined from:** V12.25.0.

---

## V1.8.0 — Profiles, Encryption & Security

**Goal:** Support personal and household finance securely.

### Added

- Personal profiles.
- Household profiles.
- Owner, Editor, and Viewer roles.
- Cloud Schema V3.
- Profile-scoped cloud records.
- Immutable audit history.
- AES-256-GCM encrypted cloud payloads.
- PBKDF2-SHA-256 passphrase derivation.
- Encrypted `.mfrx` backups.
- Invitation/member management.
- Device revocation.
- Encrypted restore points.
- Device app lock.
- Authenticator MFA.
- Experimental passkey controls.

**Combined from:** V13.0.0.

---

## V1.9.0 — Mobile Finance & Transaction Reliability

**Goal:** Make everyday finance work reliable on iPhone and other narrow screens.

### Mobile UX

- Rebuilt phone top bar.
- Single contextual Add action.
- Compact Budget & Expenses summaries.
- Mobile filter disclosures.
- Compact Project cards.
- 44×44 phone actions.
- Safer mobile dialogs and menus.
- 16px editable fields to avoid iPhone focus zoom.
- Phone-safe Settings and Paid Expenses layouts.

### Spending and ledger integration

- Direct Spend action from accounts.
- Spending creates Paid Expenses and ledger debits.
- Transaction verification before closing forms.
- Rollback on failed spending.
- Duplicate-submit protection.
- Safe reversal behavior.
- Reliable reconciliation refresh.

### Projects and authentication

- Project revision cycles and history.
- Revision deadlines.
- Completed projects with remaining balances.
- Brave-aware PWA install guidance.
- Forgot-password and recovery flow.
- Signed-out privacy lock before finance rendering.

**Combined from:** V13.0.1–V13.0.18.

---

## V1.10.0 — Projects, Calendar, Navigation & Accessibility

**Goal:** Organize the app into a stronger desktop/mobile workspace.

### Projects and calendar

- Project Agenda.
- Dashboard calendar integration.
- Stable agenda identities.
- Upcoming and Completed agenda sections.
- Linked project completion.
- Date urgency indicators.
- ICS export.

### Navigation and Settings

- Persistent desktop icon rail.
- Expand/collapse and pin/unpin navigation.
- Overview, Finance, Work, and Insights destinations.
- Mobile navigation drawer.
- Dashboard card ordering/customization.
- Header Undo and Redo.
- Settings topic search.
- Compact Settings overview.
- Organized More options and Danger zone.

### Accessibility

- Keyboard-friendly menus.
- ARIA menu states.
- Native progress indicators.
- Screen-reader announcements.
- Visible focus rings.
- Reduced-motion support.
- Drag-and-drop alternatives.
- Chips, badges, pills, and tags.
- Improved Toast feedback.

**Combined from:** V14.0.0–V14.0.18.

---

## V1.11.0 — Cross-Device Sync Hardening

**Goal:** Prevent desktop and phone records from silently overwriting one another.

### Added

- Cloud queueing for every shared Finance persistence path.
- Resume/foreground/reconnect cloud pulls.
- Realtime channel recovery.
- Polling fallback.
- Pre-pull reconciliation against last confirmed cloud state.
- Recovery of older unqueued local changes.
- Base-revision preservation.
- Explicit same-record conflict review.
- Safer conflict persistence on constrained phone storage.
- Correct Use cloud version behavior.
- Correct Use this device behavior.
- Protected Make this device the current cloud copy recovery action.
- Three-way merging for non-overlapping concurrent changes.
- Five-minute routine synchronization.

**Combined from:** V14.0.19–V14.0.23 plus V15.0.3 synchronization hardening.

---

## V1.12.0 — Modern PWA & Visual System

**Goal:** Establish the modern production interface while preserving finance behavior.

### Added and changed

- Adaptive Liquid Glass control layer.
- Opaque finance surfaces for readability.
- Black application canvas.
- Primary blue interface color `#173e76`.
- Rounded Finance surfaces.
- 38px desktop controls.
- 44px mobile touch controls.
- Improved Light/Dark appearance.
- Asia/Manila automatic Day/Night schedule.
- Version-aware service-worker registration.
- Cache-version update checks.
- Stale-cache cleanup and offline repair.
- Simplified Dashboard Cash Flow presentation.

**Combined from:** V15.0.0–V15.1.0 and related V14 PWA-delivery work.

---

## V1.13.0 — Production UX & Code Organization

**Goal:** Make the product easier to maintain and more consistent in production.

### UX

- Actionable empty and filtered states.
- Search recovery.
- Clear form validation.
- Month/filter feedback.
- Accessible destructive confirmations.
- Busy states.
- Cleaner sync-error copy.
- Refined 320–428px phone layouts.
- Stable sticky workspace navigation.
- Safer overflow menus.
- Compact 56px Budget summaries.
- Common 1280px/1366px desktop support.

### Code organization

- Extracted calculator/form-input subsystem.
- Extracted Application Help.
- Consolidated Cash Flow CSS ownership.
- Extracted stable shell/privacy/navigation CSS.
- Reduced duplicate runtime-injected styling.
- Added focused source and browser regressions.

### Cloud and Projects

- Single-flight Supabase/auth initialization.
- Unified cloud-readiness state.
- Structured mouse/touch/keyboard project drag-and-drop.
- Horizontal Kanban boards.
- Custom named, colored, reorderable columns.
- Five-second Undo and invalid-drop return behavior.

**Combined from:** V15.2.0–V15.2.18.

---

## V1.14.0 — Budget & Expense Final Polish

**Goal:** Finalize the Budget & Expenses experience before V2.

### Expense cards

- Compact desktop expense-card typography and spacing.
- Inline Past due / Due soon status beside Unpaid.
- Simplified date/status presentation.
- 30px desktop actions.
- Checkbox at lower-left.
- Repeat, Mark paid, and Edit grouped at lower-right.
- Stable recurrence behavior.

### Section controls

- Independent First half, Second half, and Other expenses collapse state.
- 20×20 desktop collapse controls.
- Consistent right-side positioning.

### Budget summary and mascots

- Compact summary rows.
- Aligned disclosure controls.
- Compact Monthly budget plan state.
- Supplied 256×256 transparent PNG mascot assets.
- 30×30 displayed mascot size.
- First half → pink/red.
- Second half → beige/orange.
- Other expenses → blue.
- Positive difference → green.
- Negative difference → pink/red.
- Legacy smile artwork hidden when mascot state owns the visual.
- Numeric accessibility labels preserved.
- Phone numeric fallback preserved.
- 10px mascot-to-collapse horizontal gap.
- Current lower mascot optical alignment uses `translateY(-16px)`.
- Versioned mascot loading avoids stale PWA artwork.

**Combined from:** V15.2.19–V15.2.24 and the same-version mascot maintenance that followed V15.2.24.

---

# V2.0.0 — Organized Complete

**Release date:** 2026-08-22  
**Release name:** Organized Complete

V2.0.0 is the first release under the reorganized product version history. It treats the work previously delivered across the V12, V13, V14, and V15 repository releases as one coherent production application.

## Finance

- Dashboard
- Income
- Budget & Expenses
- Paid Expenses
- Accounts
- Account Ledger
- Transfers
- Reconciliation
- Direct account spending
- Monthly budget planning
- Category budgets
- Savings allocation
- Forecasting
- Financial insights
- Reports
- CSV/PDF export

## Projects & productivity

- Projects and Completed Projects
- Project revisions
- Project Agenda
- Dashboard calendar integration
- Horizontal Kanban workflow
- Quick Add
- Templates
- Global Search
- Filters and bulk actions
- Undo/Redo
- Keyboard shortcuts
- Reminders and notifications

## Cloud & security

- Cloud Schema V3
- Record-level synchronization
- Five-minute routine sync
- Immediate manual sync
- Realtime incoming changes
- Offline pending queue
- Three-way merge behavior
- Explicit conflict resolution
- Device management
- Personal and household profiles
- Owner/Editor/Viewer roles
- AES-256-GCM encrypted cloud records
- Encrypted backups
- MFA support
- Device app lock
- Signed-out privacy lock

## User interface

- Responsive desktop, tablet, and phone layouts
- Desktop navigation rail
- Mobile navigation drawer
- 38px desktop control system
- 44px mobile touch targets
- Compact Budget & Expenses interface
- Monthly budget plan disclosure
- Accessible menus and dialogs
- Progress indicators
- Toast notifications
- Chips, badges, pills, and tags
- Reduced-motion support
- Visible keyboard focus
- Light/Dark/automatic appearance
- Final PNG mascot system

## PWA & deployment

- Offline support
- Version-aware service worker
- Cache cleanup and repair
- Versioned runtime assets
- GitHub Actions quality validation
- Browser regression testing
- GitHub Pages deployment
- Repository quality/security checks

## Compatibility contract

V2.0.0 changes the **public product version identity**, not the finance-data model.

The following remain unchanged:

- **Finance Schema:** 12
- **Cloud Schema:** V3
- Existing finance records
- Account and ledger history
- Budgets
- Projects and revisions
- Payment state
- Recurrence behavior
- Encryption model
- Backup/restore compatibility
- Cloud conflict semantics
- Five-minute routine synchronization

Legacy V13/V14/V15 asset and module filenames may remain in the repository where renaming them would create unnecessary PWA or compatibility risk.

---

# Original-to-Organized Mapping

| New version | Development stage | Original history combined |
| --- | --- | --- |
| **V1.0.0** | Created — local finance foundation | Reconstructed pre-V12.19.0 baseline |
| **V1.1.0** | Cloud Sync foundation | V12.19.0–V12.19.1 |
| **V1.2.0** | Account Ledger & reconciliation | V12.20.0 |
| **V1.3.0** | Record-level Cloud Sync | V12.21.0 |
| **V1.4.0** | Monthly budget planning | V12.22.0 |
| **V1.5.0** | Reports & insights | V12.23.0 |
| **V1.6.0** | Productivity & Quick Add | V12.24.0 |
| **V1.7.0** | Reminders & notifications | V12.25.0 |
| **V1.8.0** | Profiles, encryption & security | V13.0.0 |
| **V1.9.0** | Mobile Finance & transaction reliability | V13.0.1–V13.0.18 |
| **V1.10.0** | Projects, Agenda, navigation & accessibility | V14.0.0–V14.0.18 |
| **V1.11.0** | Cross-device sync hardening | V14.0.19–V14.0.23 + V15.0.3 |
| **V1.12.0** | Modern PWA & visual system | V15.0.0–V15.1.0 |
| **V1.13.0** | Production UX & code organization | V15.2.0–V15.2.18 |
| **V1.14.0** | Budget & Expense final polish | V15.2.19–V15.2.24 maintenance |
| **V2.0.0** | Organized complete application | All previous stages combined |

---

# Going Forward

Future releases should continue from **V2.0.0** using normal semantic versioning:

- **V2.0.x** — fixes that do not materially change behavior or data contracts.
- **V2.x.0** — backward-compatible features and substantial UI/product improvements.
- **V3.0.0** — only for a deliberate breaking product/data/API architecture change with a documented migration path.
