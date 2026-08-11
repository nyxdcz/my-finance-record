# V12.18.2 Bento and Compact Summary Baseline

This document records the reusable baseline introduced in V12.18.2. Later releases may change the exact desktop column count while preserving these safeguards.

## Baseline checks

- Dashboard cards use normalized Small, Large, and Wide saved values.
- Customize Dashboard provides a size selector.
- Chart and calendar cards cannot use the Small size.
- Saved Dashboard preferences merge safe defaults without changing the storage key.
- Reset Layout restores order, visibility, privacy, and size defaults.
- Income uses five compact desktop summary cards.
- Paid Expenses uses four compact desktop summary cards.
- Tablet and phone layouts remain responsive and avoid page-level horizontal overflow.
- Schema version remains 12 and existing storage identifiers remain unchanged.

The current V12.18.4 grid geometry is validated separately in `DASHBOARD_RESIZE_GRID_VALIDATION_V12_18_4.md`.
