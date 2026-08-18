## 15.2.5 · 2026-08-18
- Aligned the Budget & Expenses disclosure controls for Monthly budget plan, Available money, First half, Second half, and Other expenses to the First-half reference geometry: 40px desktop controls on one exact 17px right-side column.
- Replaced the previous margin approximation with a derived Available money header inset that accounts for its existing 12px card padding, and anchored the collapsed Monthly budget plan control to the same reference edge.
- Preserved the existing 44px mobile disclosure touch targets and phone layouts while adding source-contract regression coverage for the shared desktop size and right edge.
- Released the alignment fix as V15.2.5 with cache `finance-v15-20260818-disclosure-alignment-r40`; Finance Schema 12, Cloud Schema V3, finance calculations, account balances, conflict-resolution behavior, and the five-minute routine sync cadence are unchanged.

## 15.2.4 · 2026-08-18
- Replaced the More tools presentation with the exact supplied light/dark PNG artwork and finalized Appearance as a compact 38px, left-aligned **Auto / Light / Dark** control with the existing 20px icon and theme behavior.
- Refined Finance visuals with the revised monthly-save toggle artwork and press feedback, scalloped Available/First-half/Second-half/Other-expenses legend markers, supplied receipt artwork for Spend, and clean theme-aware heart-smile completion icons for First half, First-half difference, and zero Other expenses.
- Flattened the desktop month selector into the same compact visual language as More tools: one 38px segmented month control with subtle separators, no glass blur/double-border treatment, and a separate aligned **Current** control.
- Hardened GitHub Pages/PWA delivery with run-attempt-specific artifacts, automatic deployment retries, network-first final Appearance geometry, and expanded browser regression coverage for the new icon, theme, and month-selector states.
- Released the consolidated interface update as V15.2.4 with cache `finance-v15-20260818-ui-refinement-r39`. Finance Schema 12, Cloud Schema V3, finance records, calculations, account balances, conflict-resolution behavior, and the five-minute routine sync cadence are unchanged.

## 15.2.3 · 2026-08-17
- Replaced the Cloud Sync toolbar artwork with the supplied state icons and matching colors: green Synced, orange Syncing, red Needs sync attention, and red Sync issue/Offline unavailable.
- Made the icon and text inherit the same state color on desktop and phone, including offline states that still have queued pending records.
- Rotated the PWA cache to `finance-v15-20260817-sync-status-r38` and updated release metadata/README. Finance Schema 12, Cloud Schema V3, records, calculations, conflict resolution, and the five-minute sync cadence are unchanged.

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
- Finance Schema 12, Cloud Schema V3, finance calculations, records, ledger behavior, and five-minute sync cadence are unchanged.

## 15.0.4 · 2026-08-15

### Fixed
- Removed the stale `renderDashboardBudgetForecast()` call left behind after the Dashboard cash-flow forecast boxes were intentionally removed.
- Restored **Record spending** and related expense saves that were rolling back with `renderDashboardBudgetForecast is not defined`.
- Protected a successfully persisted spending transaction from being undone solely because a later interface refresh throws.

### Delivery
- Pinned `account-ledger.js` and `budget-planning.js` to V15.0.4 and rotated the PWA cache so phones and installed PWAs receive the repaired modules.
- Finance Schema 12, Cloud Schema V3, ledger rules, expense calculations, and five-minute sync cadence are unchanged.

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
