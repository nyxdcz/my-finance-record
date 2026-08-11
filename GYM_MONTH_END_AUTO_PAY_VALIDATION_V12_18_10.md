# V12.18.10 Gym Month-End Auto-Pay Validation

## Confirmed behavior

- New Gym expenses enable month-end auto-pay by default, but saving requires a separately selected month-end account while the option is enabled.
- Existing Gym records remain opt-in and are not automatically activated by migration.
- Auto-pay is eligible only after the Gym expense month has ended.
- Because the PWA is local, processing occurs on the first app opening, foreground return, or hourly foreground check after month-end.
- The final monthly amount uses the saved price, weekday schedule, added dates, and skipped dates.
- Eligible overdue recurring Gym months are generated and processed oldest first.
- The chosen account is deducted only when it exists and has enough balance.
- Missing or insufficient accounts keep the Gym record unpaid and show a warning.
- Manual Mark Paid before auto-pay prevents a second deduction.
- Auto-paid records store the actual account, paid amount, transaction ID, payment date, and Auto-paid after month end status.
- Move to Unpaid restores the exact amount once and suppresses immediate reprocessing for that historical Gym month.

## Reference fixture

August 2026 with Monday, Tuesday, Thursday, and Friday contains 17 planned visits. At ₱80 per visit, the final total is ₱1,360.

## Protected behavior

- Recurring Gym copies preserve the auto-pay preference and selected account but start unpaid with cleared transaction fields.
- Month-specific Gym date overrides remain isolated.
- Schema remains version 12.
