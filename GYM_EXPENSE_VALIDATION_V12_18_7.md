# My Finance Records V12.18.7 — Flexible Gym Expense Validation

## Default setup

- Expense type: Gym expense
- Default name: Gym
- Default price per visit: ₱80
- Default usual days: Monday, Tuesday, Thursday, and Friday
- Default category: Health & Fitness
- Default icon: 🏋️
- Default recurrence for a newly selected Gym expense: Monthly

## Calculation

Monthly Gym amount is calculated as:

`Price per visit × scheduled visits in the selected month`

For August 2026, Monday, Tuesday, Thursday, and Friday occur 17 times. At ₱80 per visit, the monthly total is ₱1,360.

## Monthly adjustments

- Add Visit adds a date only for the selected month.
- Skip Visit removes a planned date only for the selected month.
- Duplicate dates are prevented.
- Added and skipped dates are stored in separate optional arrays.
- Adjustments do not rewrite the normal recurring weekday schedule.

## Recurring changes

- This month only updates the current Gym record while retaining separate future-series price and weekday defaults.
- This and future months updates existing unpaid future records in the same series and the defaults used for newly generated months.
- Past records and saved Monthly Report snapshots are not rewritten.

## Compatibility

- Schema remains version 12.
- Existing storage keys remain unchanged.
- Gym records continue using the standard expense `amount` field, so Dashboard, Budget & Expenses, Paid Expenses, Monthly Reports, backups, recovery, CSV, JSON, and totals remain compatible.
- Gym fields are optional and do not affect old expense records.
