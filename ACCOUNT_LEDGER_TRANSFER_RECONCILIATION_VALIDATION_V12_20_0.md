# Account Ledger, Transfers & Reconciliation Validation · V12.20.0

## Release agreement

- App version: V12.20.0
- Core finance schema: 12
- Cloud Schema: V1
- Ledger Version: 1
- Protected assets: `manifest.webmanifest`, `offline.html`, and `icons/*`

## Opening-balance migration

1. Export a recovery backup from V12.19.1.
2. Record each active account balance and total Available Money.
3. Open V12.20.0 once.
4. Confirm one opening-balance ledger entry exists for every active account.
5. Confirm every account balance and total Available Money are unchanged.
6. Reload the app and confirm no duplicate opening entries are created.

## Expense payment and reversal

1. Create an unpaid sample expense.
2. Mark it paid using a funded account.
3. Confirm one negative ledger entry uses the expense payment transaction ID.
4. Confirm the account balance decreases once.
5. Move the expense back to unpaid.
6. Confirm one linked reversal restores the exact amount once.
7. Repeat or reload and confirm no duplicate debit or reversal appears.

## Transfers

1. Transfer a sample amount between two different active accounts.
2. Confirm one `transfer-out` and one `transfer-in` entry share the same transfer ID.
3. Confirm the source decreases and destination increases by the same amount.
4. Confirm total Available Money is unchanged.
5. Confirm same-account, zero, negative, and insufficient-funds transfers are blocked.

## Reconciliation

1. Note the calculated balance for one account.
2. Enter a different actual balance with a date and note.
3. Confirm one reconciliation adjustment equals actual minus calculated.
4. Confirm the account balance becomes the actual value.
5. Confirm Reconciliation History stores the previous balance, actual balance, difference, date, and note.
6. Submitting the same actual balance again must not create a zero adjustment.

## Income posting

1. Add income and enable **Add to account balance**.
2. Confirm one positive income-deposit ledger entry and balance increase.
3. Edit the amount and confirm the old entry is reversed before the replacement is posted.
4. Delete the income and confirm the active deposit is reversed once.
5. Confirm recurring copies do not post automatically without explicit confirmation.

## Account maintenance

- Renaming an account updates linked ledger, reconciliation, expense, paid-account, Gym auto-pay, income, and savings references.
- A non-zero account cannot be deleted.
- A zero-balance account may be deleted while its historical ledger remains available.

## Cloud and offline checks

- `accountLedger` and `accountReconciliations` synchronize between MacBook and iPhone.
- Offline entries queue and synchronize after reconnecting.
- Stable operation IDs prevent duplicate payment, reversal, transfer, and income entries.
- Existing Supabase tables and Cloud Schema V1 remain unchanged.

## Automated validation

Run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
```

Then run browser checks at desktop and approximately 390-pixel phone width before publishing.
