# V12.22.0 Monthly Budget & Cash-flow Validation

## Data model

- `monthlyBudgets` stores one plan per `YYYY-MM` month.
- Each category stores an ID, category, planned amount, Fixed/Flexible group, Personal/Project scope, rollover flag, note, and timestamps.
- `budgetTemplates` stores reusable plan definitions with independent category IDs when applied.
- `budgetSettings` uses Budget Version 1 and stores forecast defaults.
- Finance Schema remains 12, Cloud Schema remains V2, and Ledger Version remains 1.

## Calculation rules

- Actual spending uses paid expenses that are included in totals.
- Committed spending uses all included paid and unpaid expenses.
- Budget remaining equals planned amount minus actual paid spending.
- Unassigned reserve equals the positive remainder of planned amount minus committed expense records per category and scope.
- Current Available Money already reflects ledger-posted income and paid expenses, so paid expenses are never deducted again in the forecast.
- Expected income includes selected-month income that is not yet posted to an account and occurs in the future or a future selected month.
- Forecast month-end equals current Available Money plus expected unposted income, minus unpaid recorded expenses, unassigned reserves, and planned savings allocation.
- Savings allocation is informational and does not create an account ledger entry.

## Workflow checks

- Build from Expenses creates one category plan per category and Personal/Project scope.
- Copy Previous Month preserves the source plan and adds unused paid-budget value only to rollover-enabled categories.
- Templates create fresh category IDs when applied.
- Fixed and percentage savings allocations are both supported; percentage is capped at 100%.
- Low-balance warnings calculate projected account values after selected-month scheduled activity.
- Monthly budget CSV includes category and forecast rows.
- Dashboard and Monthly Reports show the same forecast as Budget & Expenses.

## Cloud checks

- `monthlyBudgets` is a map collection with one cloud record per month.
- `budgetTemplates` is an array collection with one cloud record per template.
- `budgetSettings` is stored inside the singleton settings record.
- No new Supabase tables or migration are required beyond Cloud Schema V2.
- Minimum writer version is V12.22.0 for new commits.
