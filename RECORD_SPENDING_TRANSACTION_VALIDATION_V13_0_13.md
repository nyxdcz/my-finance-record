# V13.0.13 Record Spending Transaction Validation

## Scope
- Isolate Record Spending from Correct Account Balance form validation.
- Require a verified Paid Expense, ledger debit, recalculated balance, and persisted storage state before closing the modal.
- Preserve dirty state after a failed transaction and clear it after a successful transaction.
- Preserve account-ledger history through normalization/reload.
- Keep normal quick-spend purchases classified as normal expenses rather than utility expenses.
- Validate MacBook and iPhone layouts/interactions.

## Automated source and repository validation
- `npm run inspect`: passed with 0 errors and 0 warnings.
- `npm run quality`: V13.0.13 regression suite passed.
- Static HTML IDs checked: 617, no duplicates.
- Injected runtime IDs checked: 232, no duplicates.
- Finance Schema 12, Cloud Schema V3, ledger, encryption, profile, rollback, and credential safeguards passed.

## Chromium interaction validation
The browser environment blocks direct localhost/file navigation, so the project was loaded into headless Chromium with its local CSS/JS inlined and an in-memory Web Storage implementation. User interactions below used Playwright mouse/keyboard form actions rather than direct value assignment for the transaction itself.

### Successful Wallet purchase
- Created/verified Wallet at PHP 1,600.00.
- Opened Wallet > Spend through the rendered account-card action.
- Typed amount `500`, description `Dinner`, category `Personal`, and date `2026-08-07`.
- Clicked `Record spending`.
- Modal closed after verification.
- No discard-unsaved-changes dialog appeared after success.
- Persisted Wallet balance: PHP 1,100.00.
- Exactly one paid quick-spend expense was stored.
- Exactly one matching `expense-payment` ledger debit was stored.
- Rendered Wallet account card immediately showed PHP 1,100.00.

### Reload/normalization preservation
- Re-normalized the persisted finance payload to simulate the data-loading path.
- Wallet remained PHP 1,100.00.
- The paid Dinner expense remained present exactly once.
- The matching ledger debit remained present.
- Dinner remained `expenseType: normal`.

### Validation failure behavior
- Entered a purchase larger than the available Wallet balance.
- The modal remained open with an inline insufficient-funds message.
- Closing the dirty failed form correctly opened the discard confirmation.

### Forced persistence failure / rollback
- Forced the finance storage write to throw during a real Record Spending button click.
- Modal stayed open with the explicit persistence error.
- Account balance returned to its original value.
- Expense count returned to its original value.
- Ledger count returned to its original value.
- No half-saved spending transaction remained in memory.

### Responsive interaction checks
- iPhone 393 x 852: 0 px document horizontal overflow; Record Spending controls stayed inside the dialog; real PHP 10 spend completed successfully.
- iPhone 360 x 800: 0 px document horizontal overflow; Record Spending controls stayed inside the dialog; real PHP 10 spend completed successfully.
- Mobile primary action measured at least 44 px high after the hotfix.

## Protected behavior
- Record Spending remains one Paid Expense plus one append-only ledger debit.
- Correct Account Balance remains a reconciliation workflow.
- Paid-expense reversal behavior is unchanged.
- Finance Schema 12, Cloud Schema V3, profiles, encryption, and sync architecture are unchanged.

## Environment limitation
The Chromium tests above are real DOM interactions but not a live-origin/service-worker test because this environment blocks local browser navigation. Native macOS `.command` execution is also not available here and must be verified on the user's Mac.
