# My Finance Records · V15.2.6

Local-first personal finance PWA with multi-profile support and optional encrypted cloud synchronization.

## V15.2.6 · Form Input Module Extraction

Released **August 19, 2026** with PWA cache `finance-v15-20260819-form-inputs-r41`.

### New updates since V15.2.5

- **Form-input module extraction** — Moves the existing calculator and numeric input subsystem out of the large inline application script into `assets/js/form-inputs.js` while preserving the same global APIs and user behavior.
- **Repository maintainability** — Reduces `index.html` and keeps the extracted runtime source inside the organized Phase 4 `assets/js/` structure with generated root compatibility for local development.
- **PWA delivery** — Precaches the new form-input module and rotates the shell cache to r41 so installed clients receive the extracted runtime safely.
- **Regression coverage** — Adds source and browser checks for arithmetic parsing, money/integer validation, accessible field errors, formatting, and calculator controls.

### Preserved in V15.2.6

Finance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, layouts, conflict-resolution behavior, and the routine **five-minute sync cadence** are unchanged.

## V15.2.5 · Finance Disclosure Alignment

Released **August 18, 2026** with PWA cache `finance-v15-20260818-disclosure-alignment-r40`.

### New updates since V15.2.4

- **Budget disclosure alignment** — Aligns Monthly budget plan, Available money, First half, Second half, and Other expenses disclosure controls to a shared **40px** desktop size and the exact **17px** right inset established by First half.
- **Responsive preservation** — Keeps the existing **44px** mobile touch targets and phone layouts unchanged.
- **Delivery refresh** — Cache-busts the disclosure stylesheet, service worker, and release layer so GitHub Pages and installed PWA clients receive the fix.
- **Regression coverage** — Updates current-release source contracts for V15.2.5 while preserving older feature-specific asset versions.

### Preserved in V15.2.5

Finance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, conflict-resolution behavior, and the routine **five-minute sync cadence** are unchanged.

## V15.2.4 · Finance UI & Header Refinement

Released **August 18, 2026** with PWA cache `finance-v15-20260818-ui-refinement-r39`.

### New updates since V15.2.3

- **More tools icon refresh** — Uses the exact supplied light/dark PNG artwork for Philippine-time/Theme, Quick add, Customize dashboard, Search, and Quick actions while keeping Undo/Redo behavior unchanged.
- **Compact Appearance control** — Replaces the old Theme presentation with a compact **Auto / Light / Dark** state label, keeps the existing Philippine-time automatic day/night behavior, uses the existing 20px theme artwork, and finalizes the row at **38px high** with left-aligned icon/text geometry.
- **Finance monthly-save control** — Uses the revised supplied unsaved/saved artwork beside **Mark paid**, keeps the existing 34px control and 30px artwork sizing, adds press/bounce feedback, and includes a reduced-motion fallback without changing monthly-save behavior.
- **Finance summary markers** — Replaces the circular Available money, First half, Second half, and Other expenses indicators with the supplied scalloped silhouette while preserving their existing responsive sizes and green/red/orange/blue state colors.
- **Spend action artwork** — Replaces only the visible Finance account-card Spend glyph with the supplied receipt artwork and automatic light/dark switching while preserving the existing 15px desktop/tablet and 18px compact-phone sizing and all spending logic.
- **Completion heart artwork** — Uses the final clean supplied light/dark heart-smile assets for **First half of the month**, **First-half difference**, and zero-value **Other expenses**, preserving their existing size, placement, spacing, completion rules, and automatic theme switching.
- **Desktop month selector refinement** — Flattens the `‹ | Month | August 2026 | ›` navigation into one compact **38px** segmented control with subtle separators, removes the glass blur/double-border treatment, and keeps **Current** as a separate aligned 38px control.
- **PWA and GitHub Pages delivery** — Adds retry-safe Pages deployment with run-attempt-specific artifacts and automatic retries, keeps the final icon/alignment layer network-first, and cache-busts the V15.2.4 release assets so installed/mobile PWAs receive the latest interface reliably.
- **Regression coverage** — Expands and aligns browser/source validation for V15.2.4 icon artwork, Appearance states, month-selector geometry, release/cache identity, and preserved mobile UI behavior.

### Preserved in V15.2.4

Finance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, conflict-resolution behavior, and the routine **five-minute sync cadence** are unchanged.

## Recent updates

- **V15.2.3 · Sync Status Icons** — Uses the supplied Cloud Sync artwork with matching state colors: Synced is green, Syncing is orange, Needs sync uses its red attention icon, and Sync issue/Offline use the red unavailable icon. The release also refreshes PWA delivery without changing finance logic, Cloud Schema V3, or the five-minute sync cadence.
- **V15.2.2 · Mobile UI & UX** — Refines phone layouts across 320–428px, fixes sticky Finance tabs, standardizes key 44px touch targets, and makes mobile overflow actions safer without changing finance logic, sync cadence, or the completed desktop interface.
- **V15.2.1 · Desktop UX Quick Wins** — Makes empty/filter states actionable, adds removable Income filter chips, simplifies Budget Plan and Agenda secondary actions, and standardizes Agenda validation/deletion feedback without changing finance logic, sync cadence, or phone layout.
- **V15.2.0 · Desktop UX Consistency** — Clarifies month and filter state changes, standardizes validation and destructive confirmations, adds per-action busy feedback, improves Search shortcut discovery, and makes Cloud Sync errors easier to recover from while preserving phone layout and finance/sync behavior.
- **V15.1.0 · Black Canvas UI** — Changes the app canvas to #000000 and the primary interface color to #173e76 across desktop, phone, PWA chrome, and Liquid Glass controls while preserving finance and sync behavior.
- **V15.0.5 · PWA Update Recovery** — Forces V15.0.4 clients onto a real app-version update, tracks the exact PWA shell cache, clears stale V12–V15 Finance caches safely, and delivers the corrected text-only badge/icon alignment on desktop and phone.
- **V15.0.4 · Record Spending Reliability** — Fixes Record spending/Add Expense refresh failures, protects verified saved spends from render-only rollback, and refreshes the repaired account-ledger/budget modules on desktop and phone.
- **V15.0.3 · Safe Multi-device Sync** — Preserves concurrent device edits, auto-merges non-overlapping changes, stops silent cloud-over-device replacement, restores a real Use this device conflict choice, and adds protected device-to-cloud recovery.
- **V15.0.2 · Cash-flow Chart Focus** — Removes the exact cash-flow values/forecast boxes and expands both coordinated cash-flow charts inside the existing Dashboard bento size.
- **V15.0.1 · Sidebar Header Maintenance** — Simplifies the expanded sidebar to a larger Records title, preserves collapsed Insights/expanded-only Pin behavior, and refreshes PWA cache delivery without changing finance or cloud schemas.
- **V15.0.0 · Liquid Glass Interface** — Adds an adaptive Liquid Glass control layer to navigation, toolbars, menus, popovers, modal chrome, and toasts while keeping finance content opaque and readable.
- **V14.0.23 · Phone UI & Sync Conflict Recovery** — Compacts phone Finance and Settings screens and repairs conflict-choice saving on storage-constrained devices.
- **V14.0.22 · Marquee & Sidebar Stability** — Aligns the 43px marquee, stabilizes sidebar icons, compacts the collapsed budget plan, and adds accessible Toast timing.
- **V14.0.21 · Compact Navigation & Sync Cadence** — Compacts and repositions the weekly marquee, uses the supplied sidebar icons with click-only expansion, and changes routine auto-sync to five minutes.
- **V14.0.20 · Existing Sync State Repair** — Detects Finance records that were already out of sync, safely uploads missed desktop changes, and refreshes phones from the confirmed cloud state.
