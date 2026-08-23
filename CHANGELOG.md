# Changelog

## V2.0.1 · Talaan

**Current production release:** V2.0.1

Talaan V2.0.1 is the active release baseline. This changelog focuses only on the current product version.

### Brand and PWA

- Renamed the current product experience to **Talaan**.
- Updated the website title, sidebar brand, installed-app labels, manifest metadata, offline page, install messaging, and calendar export branding.
- Updated current-facing repository documentation to use the Talaan name.
- Unified the legacy primary-action blues on `#356FD1` across buttons, selected controls, and related blue UI states.
- Replaced the remaining exact `#244770` and `#325279` shades with `#356FD1` across tracked source and runtime styles.
- Styled the active Finance and Projects workspace tabs with Talaan blue `#356FD1` and persistent white text across hover, focus, and dark mode while leaving inactive tabs neutral.
- Kept the **More tools** control at 34px on fine-pointer desktops, restored the 44px touch-tablet target, and contained both the trigger and popup within the viewport.
- Kept the collapsed desktop sidebar at a 64px icon rail, restored a compact 190px open/pinned state with the uploaded logo, Talaan title, and navigation labels, and kept `#356FD1` limited to the selected icon square rather than the full row.
- Increased collapsed sidebar tooltip readability with 13px semibold white text on a solid `#1F2937` popup, larger padding, and a stronger shadow while preserving hover and keyboard focus behavior.
- Replaced the sidebar brand pseudo-image with a real 16px `talaan-brand-logo.png` image beside the Talaan title and cache-busted the brand stylesheet/image as `talaan6` so the uploaded logo renders reliably.
- Rotated the PWA cache to `finance-v2-20260822-talaan-r5` so installed clients receive the refreshed primary color and corrected header layout.
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
- Added `icons/repeat-monthly-off.png` and `icons/repeat-monthly-on.png` as the replaceable artwork for the saved-for-future-months control while preserving the existing recurrence behavior and accessibility labels.
- Added a short spring-style bounce when the Repeat monthly control is clicked or tapped, with the animation disabled when Reduce Motion is enabled.
- Removed the redundant visible Repeat monthly / Repeats monthly text beside the recurrence icon in Paid Expenses desktop rows while keeping the icon control, tooltip, accessibility label, and phone More-actions wording.
- Unified the Paid Expenses desktop recurrence control with the same 30px replaceable OFF/ON PNG artwork and spring bounce used by Budget & Expenses.
- Compact Monthly budget plan and summary layouts.
- PNG mascot summaries with phone numeric fallbacks and accessible numeric labels.

### Projects & productivity

- Projects, completed projects, revision cycles, and Project Agenda.
