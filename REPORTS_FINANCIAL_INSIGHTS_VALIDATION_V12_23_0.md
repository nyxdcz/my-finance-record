# V12.23.0 Reports & Financial Insights Validation

## Scope

- Multi-month and custom-date reporting ranges
- Account and expense-category filters
- Income, actual paid spending, net cash flow, Savings change, and project cash margin
- Category spending, account-balance history, planned-versus-actual budgets
- Utility Bill, Gym, recurring-expense, Savings Goal, project, and year-to-date insights
- CSV export and print-ready PDF workflow

## Calculation rules

- **Total Income** adds included manual Income records in the selected date range and eligible project payments. When an Account filter is active, project payments are excluded because project payment records do not currently store a receiving account.
- **Actual Spending** adds paid included expenses using the confirmed paid date and payment account.
- **Net Cash Flow** equals Total Income minus Actual Spending.
- **Planned Expenses** use the saved expense month and monthly expense amount.
- **Budget Plan** uses V12.22.0 monthly category plans and does not create or edit budget records.
- **Account History** uses saved month-end report snapshots first, then account-ledger history as a fallback.
- **Utility Trend** keeps Electric and Water amounts separate and uses the Utility Bill expense month.
- **Gym Cost per Visit** divides the selected-range Gym amount by scheduled visits and shows no value when visits are zero.
- **Project Margin** is a cash-basis estimate: eligible project payments minus paid expenses categorized as Project Costs. Project Costs are not assigned to individual projects in the current data model.
- **YTD Comparison** compares January through the selected month with the same month span in the prior year.

## Automated validation

- `node tests/validate-v12-23-0.mjs`
- Complete V12.18.1–V12.22.0 regression chain
- JavaScript and service-worker syntax checks
- Static and injected HTML ID uniqueness
- Range, date, account, category, cash-flow, Utility, Gym, recurring-change, Savings, project-margin, and YTD fixtures
- Service-worker and GitHub Pages asset checks
- Protected manifest, offline page, icon, Supabase SQL, and configuration checks

## Browser checks

- Desktop and 390px phone layouts show no page-level horizontal overflow.
- Report range, custom dates, Account, and Expense Category controls render and update.
- CSV export uses the active range and filters.
- Print / Save PDF includes the insights panels while hiding interactive controls.

## Preserved

- Finance Schema 12
- Cloud Schema V2
- Ledger Version 1
- Budget Version 1
- Existing Monthly Reports and saved snapshots
- Account ledger, payments, transfers, reconciliation, budgets, backups, and cloud records
- Manifest, offline page, and icons
- No additional Supabase migration
