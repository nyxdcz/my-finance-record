# V12.18.6 Compact Dashboard and Project Payment Summary Validation

## Scope

- Dashboard Monthly Overview cards
- Project Payments summary cards

## Required layout

- Both summary groups use `min-height: 54px`.
- Cards use compact 6px vertical and 9px horizontal padding.
- Heights remain flexible rather than fixed so content can expand safely.
- Dashboard supporting text is truncated on desktop and may wrap to two lines on smaller screens.
- Monthly Comparison, Income, and Paid Expenses summary-card sizing remain unchanged.

## Data safety

- Schema remains 12.
- Storage identifiers and finance calculations are unchanged.
- Existing records, preferences, backups, exports, and PWA assets remain compatible.
