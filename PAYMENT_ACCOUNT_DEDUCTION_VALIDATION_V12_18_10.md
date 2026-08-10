# V12.18.10 Payment Account Deduction Validation

## Confirmed behavior

- Mark Paid opens an in-app dialog instead of immediately changing the expense.
- The dialog starts without a selected account and requires the actual payment account.
- The planned account saved in the Expense form is not used for the transaction.
- Current balance and balance after payment are shown before confirmation.
- Confirming deducts the exact amount once and stores the actual account, paid amount, payment date, transaction ID, and deduction state.
- Insufficient or missing accounts block the complete operation without changing balances or paid states.
- Bulk Mark Paid uses one selected account for the combined total and succeeds or fails atomically.
- Move to Unpaid restores only amounts previously deducted by this app and clears the transaction fields.
- Legacy paid records do not create balance restorations.
- Accounts linked to restorable paid transactions cannot be deleted until those expenses return to unpaid.
- Paid Expenses and report records use the actual payment account, while the Expense form retains its planned account.

## Protected behavior

- Paid status, actual payment data, and account deduction state remain record-specific during recurring-series edits.
- A single recurring month is paid independently; future records are not deducted.
- Schema remains version 12.
- Existing records and backups without payment-transaction fields normalize safely.
