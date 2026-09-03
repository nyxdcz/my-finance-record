# Changelog

## V2.5.0 · Talaan

**Current production release:** V2.5.0

### Household expense splits

- Added household groups and expense-level equal, percentage, and exact PHP shares with deterministic cent rounding.
- Added payer tracking, member net positions, and explicit settlement history under Settings → Finance tools without adding a sidebar destination.
- Personal expense totals and reports count only the owner's assigned share while owner-paid Account Ledger transactions keep the complete cash amount actually paid.
- Another member can pay a split bill without deducting a Talaan account; moving the expense back to unpaid clears its payer claim.
- Settlements adjust household balances only and never create income, expenses, paid state, or automatic Account Ledger entries.
- Added expense allocation snapshots, recurring equal/percentage allocation support, paid-record edit protection, recovery snapshots, Undo, backup merge conflicts, and encrypted synchronization.
- Stored versioned groups and settlements under `ledgerSettings.householdSplits` and optional snapshots on expenses, preserving Finance Schema 12 and Cloud Schema V3.
- Hardened iPhone safe-area geometry, dynamic viewport sizing, and compact phone controls without changing desktop layouts or finance behavior.
- Corrected phone account-dialog mode headings and scroll containment, transaction-total overlap, workspace-tab chrome, and Project Agenda action wrapping.
- Organized the Dashboard into Calendar, Cash Flow, and Overview views with Calendar first, a consistent 7px card radius, a 12px spacing rhythm, and explicit default bento spans.
- Reused the exact Finance `workspace-switcher` component for Dashboard views and enlarged the monthly calendar grid across desktop and phone layouts.
- Refined the sidebar without changing its 60px collapsed or 185px expanded desktop widths: navigation now uses 12px semibold labels, 7px full-row selection states, clearer section spacing, a theme-aware Settings divider, and collapsed tooltips.
- Reordered the expanded sidebar header to place the logo first in the navigation-icon column, the Talaan title second, and the pin/unpin control at the far-right edge.
- Expanded the phone drawer to a capped 320px with safe-area padding and 48px navigation rows while preserving every route and the existing pinned-state preference.
- Normalized Calendar, Cash Flow, and Overview into one full-width Dashboard contract outside Customize mode, while preserving saved card order, visibility, and size preferences for editing.
- Enlarged the desktop calendar canvas, matched its event panel height, bounded the Cash Flow chart on wide screens, and made Overview use predictable three-, two-, and full-width bento rows.
- Kept the PWA cache at `finance-v2-20260828-household-splits-r17` and advanced the one-time Dashboard presentation refresh so installed clients receive the normalized layouts without changing the product version.
- Hardened Account Ledger balance corrections so edits are reconciled, verified in active-profile storage before the dialog closes, blocked for Viewer profiles, and delivered through fresh network-first account/sync runtime assets without changing Finance Schema 12, Cloud Schema V3, or the product version. The refresh removes only stale cached runtime copies; it does not clear saved finance data, profiles, or IndexedDB records.

## V2.4.0 · Talaan

**Current production release:** V2.4.0

Talaan V2.4.0 is the active release baseline. This changelog focuses only on the current product version.

### Manual net worth ledger

- Added manually maintained assets and liabilities with dated valuation histories.
- Added net worth totals, category composition, stale-value awareness, and historical value evolution under Insights without adding a sidebar destination.
- Kept every valuation separate from Available Money, Cash Flow, Account Ledger balances, paid state, and project payments.
- Added optional foreign-currency values using an explicitly entered PHP conversion rate, with manual, stale, and converted-value labels.
- Added archive/restore, recovery snapshots, Undo, backup merge conflict handling, encrypted synchronization, and net-worth-only privacy-lock detection.
- Stored the versioned configuration under `ledgerSettings.netWorth`, preserving Finance Schema 12 and Cloud Schema V3.
