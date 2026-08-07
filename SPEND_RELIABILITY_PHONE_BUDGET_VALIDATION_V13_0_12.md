# V13.0.12 Spend Reliability & Phone Budget Compaction Validation

## Scope
- Permanent Spend actions in Budget & Expenses account cards.
- Record Spending module compatibility, submit reliability, and post-save verification.
- Release-versioned PWA assets and service-worker activation behavior.
- Phone Budget & Expenses summary compaction and Available Money collapse/header layout.

## Actual browser interaction checks
- Re-rendered the Budget & Expenses account-card source of truth six consecutive times; Wallet retained exactly one Spend button after every render.
- Six fixture accounts rendered six Spend actions: Wallet, UnionBank, RCBC, Maya, GCash, and GoTyme PH.
- Simulated an incompatible Account Ledger spending capability while the form was valid. Submit remained open and displayed `App update incomplete — reload to finish updating` instead of silently doing nothing.
- Restored the compatible module and recorded `dinner` for ₱500 from Wallet ₱1,600.
- Verified Wallet recalculated to ₱1,100, exactly one Paid Expense was created, and exactly one `expense-payment` ledger debit was created.
- Verified the modal closed only after those states were confirmed and Spend remained present after the resulting rerender.

## Responsive browser checks
- 1024 × 768: 0px document overflow; Available Money disclosure 40 × 40px.
- 393 × 852: 0px document overflow; Available Money disclosure 44 × 44px.
- 360 × 800: 0px document overflow; Available Money disclosure 44 × 44px.
- Paired phone Budget summary cards stayed equal in height and below the V13.0.11 oversized-card height.
- Collapsing Available Money hides the account grid, removes its unused vertical space, keeps the compact header visible, and expanding/rerendering restores Spend.

## PWA consistency
- First-party JS/CSS references include the V13.0.12 release query.
- The service-worker shell precaches those same release URLs.
- Service-worker install calls `skipWaiting()` only after successful shell precaching.
- Runtime Record Spending verifies the Account Ledger capability before calling the submit API.

## Protected behavior
Finance Schema 12, Cloud Schema V3, account-ledger history, reconciliation behavior, Paid Expense reversal behavior, budget calculations, profile/encryption architecture, cloud sync data, and stored records are unchanged.
