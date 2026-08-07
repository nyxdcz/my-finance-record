# V13.0.3 Compact Modal & SVG Icon Validation

## Scope
- Quick Add at MacBook and iPhone sizes.
- Add/Edit Expense including Gym recurring and automatic-payment controls.
- Shared Add/Edit Account, Income, Project, Transfer, Productivity, and Settings dialog rhythm.
- Light and dark themes.

## Approved corrections
- Quick Add remains six actions but uses a shorter 3 × 2 desktop grid and 2-column iPhone grid.
- System interface icons use theme-aware monochrome SVGs rather than emoji glyphs.
- User-selected record icons and uploaded logos remain supported.
- Recurring and Automatic payment controls are progressive-disclosure sections in Expense forms.
- Helper text is shorter and gym-day controls are more compact on desktop while retaining 44px touch targets on phones.
- Dialog headers and footers remain visible while long form bodies scroll.

## Protected behavior
No finance formula, recurring-series rule, Gym auto-pay deduction, template behavior, account ledger rule, Cloud Schema V3 path, profile role, encryption function, backup format, or stored record was changed.

## Rendered device checks
- MacBook 1440 × 900: Quick Add 690px wide; all six action cards 62px high; no horizontal overflow.
- MacBook 1280 × 800: same compact Quick Add geometry; expanded Gym form scrolls within the modal body.
- iPhone 393 × 852: Quick Add uses two columns with 68px action cards; Gym-day touch targets are 44px; no horizontal overflow.
- iPhone 360 × 800: two-column Quick Add and stacked expense disclosures remain within the viewport; no horizontal overflow.
- Account, Income, Project, and Productivity dialogs were also opened at MacBook and iPhone widths with no page overflow.
- Browser audit reported no page errors in the Quick Add and Expense flows.
