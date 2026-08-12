## 14.0.12 · 2026-08-12

### Changed
- Made the approved Dashboard card sequence and widths the default for new users and Reset Dashboard.
- Refreshed previously saved uncustomized layouts while preserving every explicitly customized card arrangement.
- Expanded the compact desktop navigation smoothly after an icon selection without changing its saved pin state.

### Tested
- Added regression coverage for all ten default card positions and sizes, reset migration behavior, desktop rail preview behavior, release metadata, and PWA cache pinning.

### Preserved
- Finance Schema 12, Cloud Schema V3, records, calculations, mobile navigation, pinned desktop navigation, and user-customized Dashboard layouts remain unchanged.

## 14.0.11 · 2026-08-12

### Added
- Added persistent, accessible Undo and Redo controls to the desktop header, with matching mobile actions in More tools and standard keyboard shortcuts.
- Added a compact Settings topic search that opens the correct section and expands its related More options area when needed.

### Changed
- History actions now explain why they are unavailable, remain disabled while finance data is privacy-locked, and clear redo after a new edit.
- Settings search is keyboard navigable, responsive, and limited to privacy-safe Sync and App topics while signed out.

### Preserved
- Existing compact Settings sections, finance records, local-first storage, Cloud Schema V3 synchronization, encryption, profiles, and calculations remain unchanged.

## 14.0.10 · 2026-08-12

### Changed
- Replaced large Settings overview cards with compact, fully clickable status rows for Accounts, Work & Calendar, Profile & Security, Sync & Backup, and App & About.
- Grouped Settings navigation into Start, Your data, Protection, and App, with Back to overview and Next section actions for a clearer walkthrough.
- Consolidated secondary controls into one More options disclosure per section while keeping destructive controls in a separate collapsed Danger zone.

### Preserved
- Existing settings, saved finance records, local-first storage, Cloud Schema V3 synchronization, encryption, backup, profile, and security behavior remain available.

## 14.0.9 · 2026-08-12

### Changed
- Replaced the long repository README with a concise product summary and exactly five recent release/fix entries.
- Aligned repository-facing and in-app release metadata on V14.0.9.
- Omitted external application links from the README as requested.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, synchronization, saved records, calculations, and application behavior are unchanged.

## 14.0.8 · 2026-08-12

### Fixed
- Recovered **Use cloud version** and **Use this device** actions when a conflict snapshot exists without its pending queue entry.
- Cleared stale conflict records after this device’s committed revision is confirmed by the cloud.

### Changed
- New conflict snapshots preserve local sort order and deletion intent for faithful recovery.
- Device-choice recovery reconstructs, rebases, and queues the reviewed local record transactionally.

### Tested
- Added state-level regressions for both choices using orphaned conflict fixtures.

## 14.0.7 · 2026-08-12

### Fixed
- Persisted the selected remote payload and revision when choosing **Use cloud version**, preventing the previous local base record from remaining active.
- Rebased **Use this device** on the reviewed cloud revision before scheduling its retry.
- Replaced silent stale-conflict and browser-storage failures with actionable messages.

### Changed
- Conflict actions now show a busy state and close only after the selected state transition succeeds.
- Saved choices survive interface-refresh failures and prompt the user to reload when needed.

### Tested
- Added state-level regression fixtures for cloud and device choices, including base-record, pending-queue, and conflict-list assertions.

## 14.0.6 · 2026-08-12

### Fixed
- Reserved full layout space for pinned desktop navigation so page headings, tabs, and controls are no longer covered.
- Corrected dark-theme contrast for primary actions, selected Settings controls, field labels, status chips, and danger actions.
- Restored contextual Help and safe app-maintenance controls while signed out.

### Changed
- Finance reminders, offline finance documents, and related destructive controls are hidden while signed out with an explicit privacy explanation.
- Added semantic primary-contrast and field-label tokens without changing the established light-theme brand palette.

### Tested
- Added browser assertions for pinned main-content geometry, representative dark-theme contrast, safe signed-out controls, and hidden finance-private Settings surfaces.

## 14.0.5 · 2026-08-11

### Fixed
- Corrected the dark-theme active-navigation cascade so selected destinations use an accessible mint background with dark-teal text in both themes.
- Removed the hidden-but-focusable duplicate desktop hamburger by keeping the rail control as the single desktop navigation toggle.

### Changed
- Replaced the rail hamburger with distinct pin and unpin states and consistent accessible wording.
- Renamed navigation groups to Overview, Finance, Work, and Insights, increased expanded group-label readability, and lengthened hover expansion to preserve tooltip usefulness.

### Tested
- Added browser assertions for dark-theme active contrast, one visible desktop navigation toggle, consistent group labels, and the preserved mobile drawer.

## 14.0.4 · 2026-08-11

### Added
- Added a compact three-event Project Agenda preview and a responsive full-agenda popup with Upcoming and Completed sections.
- Added agenda completion/reopen controls, linked-project completion confirmation, and labeled date-urgency colors on Projects and the Dashboard calendar.
- Added a local-versus-cloud conflict comparison popup with explicit resolution choices and a non-destructive Resolve later action.
- Added a persistent desktop icon rail with SVG navigation icons, hover/focus expansion, collapsed labels, and a saved pinned-open state.

### Changed
- Completed agenda records remain available for history and continue to use the existing agenda storage key.
- Completing a linked agenda event can move its project to Completed Projects without changing project value, payments, or remaining balance.
- Mobile navigation retains the existing slide-out drawer and overlay behavior.

### Preserved
- Existing agenda and finance records, Finance Schema 12, Cloud Schema V3, encrypted synchronization, Supabase tables, ledger behavior, and financial calculations are unchanged.

## 14.0.3 · 2026-08-11

### Changed
- Replaced the Projects monthly calendar and month navigation with one complete Project Agenda ordered by date and time.
- Kept agenda scheduling, editing, deletion, reminders, linked projects, and ICS export available from Projects.
- Added version-pinned agenda assets to the V14.0.3 offline application shell.

### Fixed
- Projects every valid agenda date onto the Dashboard monthly calendar using stable agenda identities.
- Refreshes Dashboard markers and selected-day events after local agenda changes and cross-tab storage updates.
- Reads the latest stored agenda for Dashboard rendering instead of returning a potentially stale in-memory copy.

### Preserved
- Existing agenda records remain under `simple-finance-project-calendar-v13.0.20`; no migration or record deletion is performed.
- Finance Schema 12, Cloud Schema V3, encryption, Supabase tables, financial calculations, and finance records are unchanged.

## 14.0.2 · 2026-08-11

### Fixed
- Centralized the browser title and top-bar build badge on V14.0.2 so the older project-calendar extension cannot display V13.0.20 over the active release.
- Stopped normal ledger normalization, rendering, and startup from rewriting `lastRecalculatedAt` and persisting unchanged finance data.
- Removed the device-local ledger recalculation timestamp from encrypted `settings:preferences` cloud payloads.
- Added a one-time local queue migration that clears timestamp-only settings conflicts, safely rebases non-overlapping settings changes, and preserves genuine overlapping conflicts for review.
- Avoided redundant cloud revisions when a safe non-overlapping merge already matches the remote record.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, Supabase tables, account balances, ledger entries, and financial calculations are unchanged.

## 14.0.1 · 2026-08-11

### Fixed
- Restored executable Git modes for the macOS installer and audit entry point.
- Aligned V14 release, installer, cache, README, package, and validation metadata.

### Changed
- Replaced no-op linting with a configured ESLint validation pass.
- Added portable Playwright privacy and phone-input browser coverage to CI.
- Added repository inspection, maintainability checks, dependency audit, npm Dependabot updates, and tag-driven release automation.
- Extracted the application stylesheet from `index.html` into a versioned, precached `app.css` asset.
- Added branch, commit, pull-request, and release guidance for safer changes to `main`.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, profiles, ledgers, calculations, PWA behavior, and stored finance records are unchanged.

## 14.0.0 · 2026-08-07

### Added
- Integrated Project Schedule Calendar events with the primary Dashboard financial calendar.
- Added real-time event projection and listener callbacks.

### Changed
- Tightened desktop and mobile calendar layout dimensions, button scaling, and header action padding.

## 13.0.18 · 2026-08-07

### Added
- Added a signed-out privacy lock that is active before the first finance render and unlocks only after cloud authentication succeeds.
- Added zero-only signed-out placeholders and a dedicated top-bar Sign in action.

### Changed
- Accounts, expenses, projects, payments, reports, calendar events, search/productivity data, and finance notifications stay hidden while signed out.
- Finance-data actions are blocked while signed out while authentication/recovery, cloud setup, basic app controls, and backup restore remain available.

### Preserved
- Sign-out does not delete local finance/profile data. Existing Finance Schema 12, Cloud Schema V3, encryption, ledger, revisions, calculations, and stored records remain unchanged.

## 13.0.17 · 2026-08-07
### Fixed
- Prevented iPhone WebKit browsers and installed PWA mode from automatically zooming into focused editable fields by enforcing a 16px minimum rendered font size for phone inputs, selects, textareas, date/month controls, amount/calculator fields, passwords, searches, and dynamically created form controls.
- Kept mobile forms compact through spacing and padding rather than shrinking editable values below the iPhone-safe threshold.

### Preserved
- Manual pinch zoom and browser accessibility remain available; no `user-scalable=no` or maximum-scale lock was added.
- Finance Schema 12, Cloud Schema V3, account ledger, password recovery, projects, calculations, profiles, sync, desktop/iPad layout, and stored records are unchanged.

## 13.0.16 · 2026-08-07

- Added a dedicated `?auth=recovery` redirect target and explicit parsing of Supabase password-reset error fragments.
- Expired, invalid, reused, and access-denied reset links now open Sync & Backup recovery help instead of silently returning to Dashboard.
- Added resend, recovery-code verification, recovery URL cleanup, and preserved the existing valid `PASSWORD_RECOVERY` new-password flow.
- Finance records, cloud schema, encryption, profiles, and local access remain unchanged.

## 13.0.15 · 2026-08-07

### Added
- Added Forgot password with Supabase reset-email delivery and a password-recovery completion screen.
- Added Show/Hide password controls, processing states, and a Test cloud connection action.

### Changed
- Replaced technical authentication errors with plain-language sign-in guidance while keeping local finance records available when cloud login fails.
- Password-reset messaging avoids revealing whether an email address is registered.

### Preserved
- Finance Schema 12, Cloud Schema V3, client-side encryption, local records, account ledger, profiles, calculations, and Brave PWA installation behavior.

## 13.0.14 · 2026-08-07

### Changed
- Added Brave-aware PWA install detection while preserving the normal browser-provided install prompt when available.
- Added an in-app Brave installation guide for cases where Brave requires Menu → Save and Share → Install page as app….
- Added clearer Installed, browser-menu, Brave-menu, and HTTPS-required install states so the Install control never appears to do nothing.

### Preserved
- Finance Schema 12, Cloud Schema V3, profiles, encryption, account ledger, calculations, stored records, manifest capabilities, and offline service-worker behavior.

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
- Finance Schema 12, Cloud Schema V3, account ledger history, encrypted sync, projec