# My Finance Records V12.18.5 — Compact Summary Height Validation

## Target

The browser-computed height of the first Budget & Expenses summary row is 70px. V12.18.5 applies that same desktop height to the Income and Paid Expenses summary cards.

## Desktop rules

- Budget & Expenses reference height: 70px
- Income summary height: 70px
- Paid Expenses summary height: 70px
- Vertical padding: 10px
- Horizontal padding: 11px
- Income: five columns at wide desktop widths
- Paid Expenses: four columns at wide desktop widths
- Long helper text is limited to one ellipsized line to prevent card growth

## Responsive rules

- At tablet widths, cards retain a 70px minimum but may expand when text wrapping is required.
- At phone widths, cards stack into one column and may grow for readable content.
- Amounts remain single-line and do not alter finance calculations.

## Protected behavior

- Schema version remains 12.
- Existing storage keys and records remain unchanged.
- Dashboard card resizing, project rules, reports, exports, backups, local sync, PWA installation, and offline support remain unchanged.

## Required validation

Run:

```bash
node tests/validate-v12-18-5.mjs
```

Then verify the browser-computed heights at desktop, tablet, and phone widths, check light and dark modes, and confirm there is no page-level horizontal overflow.
