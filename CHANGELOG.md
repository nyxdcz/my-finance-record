## 15.2.2 · 2026-08-16
- Refined the phone UI across 320–428px with corrected sticky workspace navigation, 44px touch targets, safer overflow menus, and a narrow Paid Expenses fallback.
- Added deliberate mobile treatment for V15.2.1 filter chips, empty/search recovery actions, Budget Plan actions, and Project Agenda menus while preserving the completed desktop interface.
- Added portrait, landscape, and short-screen browser regression coverage and rotated the PWA cache to `finance-v15-20260816-mobile-ui-ux-r32`; Finance Schema 12, Cloud Schema V3, calculations, saved records, and five-minute sync cadence are unchanged.

## 15.2.1 · 2026-08-16
- Added actionable empty and filtered states across Income, Budget & Expenses, Paid Expenses, and Projects, including removable Income filter chips and direct next-step actions.
- Added a Clear search recovery action when global Search returns no matching finance records.
- Standardized Project Agenda field-level validation and deletion confirmation, and moved Agenda ICS/Delete plus Budget Plan Settings/Export into accessible More menus.
- Clarified Budget & Expenses page copy and released the desktop-only UX quick wins with PWA cache `finance-v15-20260816-desktop-ux-quick-wins-r31`; Finance Schema 12, Cloud Schema V3, calculations, saved records, five-minute sync cadence, and phone layout remain unchanged.

## 15.2.0 · 2026-08-16
- Desktop UX consistency: month changes now explicitly report recurring-item checks, filter changes clearly report when an active expense selection is reset, Income/Account forms focus and explain the first invalid field, and harmless filter clears no longer create extra toasts.
- Replaced native Productivity destructive confirmations and text prompts with app dialogs, added per-action busy states for long Settings operations, exposed Search keyboard shortcuts, and simplified Cloud Sync error copy with optional technical details.
- Released as V15.2.0 with PWA cache `finance-v15-20260816-desktop-ux-r29`. Finance Schema 12, Cloud Schema V3, saved records, calculations, account balances, budgets, projects, five-minute Cloud Sync cadence, and phone layout remain unchanged.

## 15.1.0 · 2026-08-15
- Desktop UI Phase 1: simplified desktop hierarchy, report export menu, compact Income summary, calmer Calendar/Settings/status surfaces, and r28 PWA delivery while leaving phone layout and finance/sync behavior unchanged.
- Rounded Finance period headers and expense rows to 9px so the First half, Second half, Other expenses, and individual expense surfaces match the compact Black Canvas card language.
- Normalized desktop topbar controls to the 38px Synced reference while preserving the existing 44px mobile touch targets.

### Changed
- Set the app canvas/background to `#000000` across both appearance modes and the offline/PWA shell.
- Set the primary interface color to `#173e76`, including primary buttons, active navigation, focus accents, browser chrome, and manifest theme color.
- Retinted V15 Liquid Glass navigation, toolbars, menus, popovers, and active controls to the black-and-blue palette without changing their geometry or blur behavior.

### Delivery
- Released the visual refresh as V15.1.0 and rotated the PWA shell to `finance-v15-20260815-black-canvas-r15` with a dedicated final palette stylesheet.
- Finance Schema 12, Cloud Schema V3, finance records, calculations, ledger behavior, Dashboard/card dimensions, and five-minute Cloud Sync cadence are unchanged.

## 15.0.5 · 2026-08-15

### Fixed
- Released the UI delivery repair as a real app-version change so existing V15.0.4 clients detect and install the new service worker instead of treating cache-only revisions as unchanged.
- Updated the service-worker registration URL to include both app version and shell cache generation.
- Made the update check compare both `version` and `cacheVersion`.
- Fixed App & About cache status, Clear app cache, and Repair offline app so stale V12–V15 Finance caches are recognized and removed.
- Limited offline-app repair to this Finance app service-worker scope and preserved finance records and PDF packs.

### Delivery
- Rotated the PWA shell to `finance-v15-20260815-pwa-update-r13` and moved the final icon-alignment rules to a fresh V15.0.5 stylesheet URL.
- Finance Schema 12, Cloud Schema V3, finance calculations, records, ledger behavior, and five-minute Cloud Sync cadence are unchanged.

## 15.0.4 · 2026-08-15

### Fixed
- Removed the stale `renderDashboardBudgetForecast()` call left behind after the Dashboard cash-flow forecast boxes were intentionally removed.
- Restored **Record spending** and related expense saves that were rolling back with `renderDashboardBudgetForecast is not defined`.
- Protected a successfully persisted spending transaction from being undone solely because a later interface refresh throws.

### Delivery
- Pinned `account-ledger.js` and `budget-planning.js` to V15.0.4 and rotated the PWA cache so phones and installed PWAs receive the repaired modules.
- Finance Schema 12, Cloud Schema V3, ledger rules, expense calculations, and five-minute Cloud Sync cadence are unchanged.

## 15.0.3 · 2026-08-15

### Fixed
- Stopped newer cloud revisions from silently deleting pending local Finance edits on MacBook or iPhone.
- Rebased and three-way merged non-overlapping concurrent changes while preserving same-field changes as explicit conflicts.
- Restored **Use this device** so it keeps and uploads the selected device record instead of behaving like **Use cloud version**.

### Recovery
- Added a protected **Make this device the current cloud copy** action that creates a local recovery point, refreshes cloud revisions, and only then writes this device’s current Finance records.
- Kept pull-before-push ordering so a stale phone cannot blindly overwrite newer cloud data.

### Preserved
- Finance Schema 12, Cloud Schema V3, client-side encryption, five-minute routine sync, Realtime updates, and existing finance calculations remain unchanged.

## 15.0.2 · 2026-08-15

- Removed the Dashboard “View exact cash-flow values” disclosure, selected-month value cards, and injected budget forecast cards from the Income versus expenses bento.
- Expanded the vertical and horizontal cash-flow plotting areas while preserving the existing Dashboard bento size, position, calculations, and neighboring calendar geometry.
- Rotated the V15 PWA cache to r6 and updated release metadata, installer, README, and validation without changing Finance Schema 12, Cloud Schema V3, or Cloud Sync behavior.

## 15.0.1 · 2026-08-15

### Changed
- Simplified the expanded desktop sidebar header to a larger **Records** title with no decorative chart icon or subtitle.
- Preserved Overview, Finance, Work, Insights, and Settings positions, including collapsed Insights visibility and expanded-only Pin/Unpin controls.
- Rotated the V15 PWA cache and release pins so the maintenance update reaches installed and previously visited clients.

### Preserved
- Dashboard and bento layouts, Finance Schema 12, Cloud Schema V3, encrypted records, calculations, five-minute sync behavior, and saved navigation preferences remain unchanged.

## 15.0.0 · 2026-08-15

### Changed
- Introduced an adaptive Liquid Glass control layer across navigation, toolbar controls, workspace switchers, floating menus and popovers, modal chrome, and Toast feedback.
- Kept finance content surfaces opaque so KPI cards, tables, charts, forms, and weekly marquee content retain contrast and hierarchy.
- Updated the browser/runtime release identity and PWA cache generation to V15.0.0.

### Accessibility
- Added solid or near-opaque fallbacks for unsupported backdrop filters, reduced transparency, reduced motion, and forced-colors environments.
- Preserved visible keyboard focus, the 43px Finance and Work strip geometry, and existing 44px phone touch targets.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, finance records, calculations, five-minute synchronization, uploaded utility icons, and saved interface preferences remain unchanged.

## 14.0.23 · 2026-08-13

### Fixed
- Reordered conflict-resolution persistence to reclaim obsolete queue and conflict storage before saving the chosen baseline, with one safe retry for constrained iPhone browser storage.
- Reworked phone Paid Expenses rows into compact cards with one contextual More menu and no stray punctuation.
- Prevented Settings forms, cloud configuration, connected-device lists, and pending-sync cards from overflowing narrow screens.

### Accessibility
- Stacked conflict comparisons on phones with visible local/cloud labels and retained 44px action targets.
- Collapsed long browser identification into an optional disclosure while preserving device status and actions.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, five-minute routine sync, manual sync, Realtime updates, completed projects, calculations, and saved preferences remain unchanged.

## 14.0.22 · 2026-08-13

### Changed
- Matched the Dashboard and Finance weekly marquees to the 43px desktop/tablet tab-strip height and placed the Budget & Expenses marquee beside its workspace tabs.
- Removed weekly marquees from phone layouts at 700px and below so the finance workspace stays compact.
- Kept the desktop sidebar expanded after an icon click until the pointer leaves, without scroll or page-navigation retraction.
- Fixed the expand/retract geometry so navigation icons and the sidebar control remain in the same location while only the rail width and labels animate.
- Reduced the collapsed Monthly budget plan to a concise three-value summary while preserving the full planner and its saved disclosure state.
- Kept persistent choices native and upgraded Toast feedback with pausable success timing plus dismissible persistent warnings and errors.

### Tested
- Added desktop, tablet, and phone assertions for marquee geometry, sidebar stability, compact budget states, native control semantics, and pausable live Toast feedback.

### Preserved
- Finance Schema 12, Cloud Schema V3, encrypted records, five-minute routine sync, manual sync, Realtime updates, completed projects, calculations, and pinned/mobile navigation remain unchanged.

## 14.0.21 · 2026-08-13

### Changed
- Moved a more compact one-week marquee above Monthly overview and above the shared Income, Budget & Expenses, and Paid Expenses tabs.
- Changed routine encrypted cloud synchronization, foreground polling, and periodic synchronization to a five-minute cadence while keeping manual sync and incoming Realtime changes immediate.
- Made desktop sidebar expansion click-only, replaced Overview, Finance, Work, and Settings with the supplied PNG artwork, and removed the Insights icon while retaining its expanded navigation label.
- Shortened the month action and status from Current month to Current.

### Tested
- Added desktop and phone coverage for all three Finance marquees, reduced motion, supplied navigation icons, icon-free Insights navigation, compact month controls, and the five-minute sync constants.

### Preserved
- Finance Schema 12, Cloud Schema V3, encrypted records, expenses, completed projects, calculations, manual synchronization, Realtime incoming updates, and saved preferences remain unchanged.

## 14.0.20 · 2026-08-13

### Fixed
- Added a pre-pull reconciliation pass that compares this device's Finance data with its last confirmed cloud baseline and queues records that diverged before V14.0.19.
- Preserved base revisions for recovered account updates, additions, and deletions so a stale phone cannot silently overwrite newer desktop records.
- Kept genuine same-record changes on two devices in the existing conflict-review flow instead of choosing a winner automatically.

### Tested
- Added the reported phone-versus-desktop account fixture, including mismatched Wallet, UnionBank, and RCBC balances plus the Metrobank-to-GoTyme account change.
- Confirmed already-matching devices produce no repair queue entries and all existing persistence, Realtime, lifecycle, encryption, and browser checks remain active.

### Preserved
- Finance Schema 12, Cloud Schema V3, encrypted payloads, expenses, completed projects, calculations, and saved preferences remain unchanged.

## 14.0.19 · 2026-08-13

### Fixed
- Routed every shared Finance persistence event into the encrypted record queue, including expense duplication, recurring-record generation, automatic payments, report snapshots, restores, migrations, and rollback writes that previously bypassed `saveData()`.
- Added phone resume, `pageshow`, foreground, and reconnect pulls so a visible mobile app checks for MacBook changes without waiting for a successful Realtime notification.
- Added Realtime channel recovery with bounded exponential backoff and a 30-second visible-device polling fallback.

### Tested
- Added regression coverage for direct-persistence queueing, deduplication, mobile lifecycle triggers, Realtime recovery states, and the existing manual Sync now controls.

### Preserved
- Finance Schema 12, Cloud Schema V3, encryption, records, accounts, expenses, completed projects, calculations, conflicts, and saved preferences remain unchanged.

## 14.0.18 · 2026-08-13

### Added
- Added the existing reduced-motion-safe one-week calendar marquee below the Finance / Budget & Expenses heading.
- Added dismissible active-filter Chips, compact numeric Badges, fully rounded status Pills, and category Tags with accessible labels.

### Accessibility
- Restored native browser focus rings for keyboard-focused controls and retained enough outline offset to prevent the first responder indicator from being replaced by a custom border.
- Added an accessible name to every icon-only filter-removal button.

### Preserved
- Finance Schema 12, Cloud Schema V3, records, accounts, expenses, completed projects, calculations, cloud data, and saved preferences are unchanged.

## 14.0.17 · 2026-08-13

### Fixed
- Bound the shared overflow-menu helpers in the main application script so saving an edited expense no longer raises `closeOverflowMenu is not defined`.
- Kept the contextual More menu behavior intact after expense changes and re-renders.

### Tested
- Added live browser coverage that edits and saves an expense, verifies the updated row, and reopens the top-bar More menu.

### Preserved
- Finance records, completed projects such as Taburi and Maderoza, calculations, cloud data, and saved preferences are unchanged.

## 14.0.16 · 2026-08-12

### Fixed
- Published the repaired top-bar More menu initialization through a new JavaScript asset URL so previously cached clients receive the working control.
- Published the simplified active-navigation icon treatment through a new stylesheet URL so selected destinations use one mint surface instead of nested color blocks.

### Changed
- Rotated the service-worker shell and runtime cache identifiers and repinned every first-party stylesheet and script to V14.0.16.
- Added release validation that rejects stale V14.0.15 asset pins and verifies both live-interface fixes are present.

### Preserved
- Finance Schema 12, Cloud Schema V3, records, accounts, expenses, projects, completed projects, calculations, and saved interface preferences remain unchanged.

## 14.0.15 · 2026-08-12

### Added
- Added a one-week Dashboard calendar marquee below the heading using exactly duplicated content and a CSS `translateX(-50%)` loop.
- Added Dashboard card drag-and-drop while customization is active, with visible drag and resize handles, a drag preview, insertion feedback, saved order, keyboard alternatives, and ARIA live announcements.

### Changed
- Replaced contextual More disclosures with semantic horizontal meatballs and vertical kebab menu buttons using `aria-haspopup="menu"`, `aria-controls`, and synchronized `aria-expanded`; retained the navigation hamburger with `aria-controls="sidebar"`.
- Replaced visual-only completion tracks with native `<progress>` elements and added indeterminate spinners for unknown migration and cloud-sync work.
- Added single-line ellipsis, two-line WebKit clamping, extension-preserving JavaScript filename truncation, logical decorative borders, and semantic menu separators.

### Accessibility
- The marquee pauses on hover or focus and stops under `prefers-reduced-motion`; duplicated content is hidden from assistive technology.
- Overflow menus support Arrow keys, Home, End, Escape, outside-click closing, focus return, and correctly grouped menu separators.

### Preserved
- Finance Schema 12, Cloud Schema V3, records, calculations, saved Dashboard layouts, manual Move Up/Down actions, and the full Monthly Calendar remain unchanged.

## 14.0.14 · 2026-08-12

### Changed
- Removed the duplicated uppercase Overview, Finance, Work, and Insights headings from expanded desktop and mobile navigation.
- Kept one clear icon-and-label destination for each route and tightened the spacing between the four primary navigation rows.

### Tested
- Updated responsive browser coverage to require zero duplicate group headings and a compact four-pixel expanded navigation gap.

### Preserved
- Sidebar routes, compact icon tooltips, keyboard navigation, active states, Settings placement, Finance Schema 12, Cloud Schema V3, records, and calculations remain unchanged.

## 14.0.13 · 2026-08-12

### Changed
- Renamed the four primary sidebar destinations and compact-rail tooltips to Overview, Finance, Work, and Insights while preserving their existing routes.
- Replaced operating-system theme following with an automatic Asia/Manila schedule: Day from 7:01 AM through 5:59 PM and Night from 6:00 PM through 7:00 AM.
- Kept manual Light and Dark choices and refreshed the automatic appearance at minute boundaries and when the app becomes visible.

### Tested
- Added timezone-independent boundary coverage for 7:00 AM, 7:01 AM, 5:59 PM, and 6:00 PM Philippine time.

### Preserved
- Finance Schema 12, Cloud Schema V3, records, calculations, existing sidebar routes, manual appearance choices, and saved automatic-theme preferences remain unchanged.

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
