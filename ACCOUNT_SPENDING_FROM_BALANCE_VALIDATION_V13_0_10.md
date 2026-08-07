# V13.0.10 Account Spending from Balance Validation

## Scope

V13.0.10 separates account balance correction from real spending. A purchase recorded from an account must create one already-paid expense and one append-only expense-payment ledger debit, then refresh the visible account balance and dependent totals without using reconciliation.

## Automated validation performed

- `npm run inspect` passed with **0 errors and 0 warnings**.
- `npm run quality` passed the V13.0.10 regression suite.
- JavaScript syntax checks passed for the application, service worker, account ledger, cloud/profile modules, and validation test.
- Finance Schema 12, Cloud Schema V3, account-ledger version 1, encryption/profile safeguards, protected rollback files, manifest, icons, and offline page remained protected by regression checks.

## Browser interaction validation performed

Headless Chromium was used with the project CSS/JavaScript inlined because direct localhost/file navigation is restricted in this execution environment. The following interactions were executed through the real application UI unless explicitly noted otherwise.

### Wallet purchase

Starting fixture:

- Wallet: **₱1,100.00**
- RCBC: **₱2,500.00**
- Maya: **₱5,000.00**

From the Wallet account card, **Spend** opened Edit Account directly in **Record spending** mode. A purchase was entered as:

- Amount: **₱100.00**
- Description: **Lunch**
- Category: **Personal**
- Date: **2026-08-07**
- Note: **Lunch test**
- Include in calculated totals: enabled

Before saving, the form preview showed the expected Wallet balance of **₱1,000.00**. Clicking **Record spending** succeeded.

Validated results:

- Wallet recalculated from **₱1,100.00 → ₱1,000.00**.
- One Paid Expense named **Lunch** was created.
- The Paid Expense stored Wallet as its payment account and recorded **₱100.00** as paid.
- Exactly one `expense-payment` ledger debit of **-₱100.00** was created for that expense.
- Repeated `renderAll()` calls did not create another debit or deduct the Wallet again.
- The paid Lunch purchase did not appear as an upcoming Dashboard calendar expense.

### Insufficient funds

A Wallet spend larger than the available balance was submitted. The transaction was rejected; the Wallet balance remained unchanged and no expense record was created.

### Bank and e-wallet coverage

The same ledger transaction path was exercised for:

- RCBC Bank: **₱2,500.00 → ₱2,300.00** after a ₱200 purchase.
- Maya E-wallet: **₱5,000.00 → ₱4,700.00** after a ₱300 purchase.

### Quick-spend deletion reversal

The Lunch Paid Expense was deleted through the normal Edit Expense confirmation flow. Validation confirmed:

- the Lunch expense was removed;
- Wallet was restored from **₱1,000.00 → ₱1,100.00**;
- exactly one `expense-payment-reversal` ledger entry was created.

This preserves append-only ledger history rather than rewriting the original debit.

### Balance correction remains separate

Opening Wallet through Edit Account still defaults to **Correct account balance**, with the reconciliation controls visible and Record spending hidden until selected. Existing reconciliation behavior remains separate from purchase recording.

## Responsive validation

The Record spending UI was checked at:

- MacBook: **1440 × 900**
- iPad-sized: **1024 × 768**
- iPhone: **393 × 852**
- Narrow phone: **360 × 800**

All tested widths reported **0px horizontal overflow**. Phone spending fields retain at least 44px touch height, and the mode selector remains usable without horizontal scrolling.

## Protected behavior

V13.0.10 does not change project payments, recurring-expense scheduling, Gym auto-pay, budget formulas, Cloud Schema V3, encryption/profile roles, or existing reconciliation history. A purchase is represented as one expense record plus one ledger debit; it is not also posted as a reconciliation adjustment.

## Environment limitation

These browser checks were performed in headless Chromium in the available Linux execution environment. Native Safari/PWA behavior and the macOS `.command` installer still require final verification on the user's Mac before claiming native macOS execution testing.
