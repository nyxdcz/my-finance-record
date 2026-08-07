# V13.0.2 Toolbar & Budget Bento UI Validation

## Scope

- MacBook desktop toolbar at 1440 × 900 and 1280 × 800.
- iPhone toolbar at 393 × 852 and 360 × 800.
- Light and dark appearance modes.
- More tools menu with Theme, Search, and Quick actions.
- Category plan and Cash-flow forecast expanded, collapsed, and mixed states.
- Edit Account balance and account-type alignment on MacBook and stacked layout on iPhone.

## Approved changes

1. Keep Cloud Sync, previous month, month selector, next month, Current month, and the contextual Add action visible.
2. Move Theme, Search, and Quick actions into one More tools menu.
3. Use standard SVG interface icons instead of emoji-style toolbar icons.
4. Add independent collapse buttons to Category plan and Cash-flow forecast.
5. Match both expanded budget bento panel heights and header controls on the desktop two-column layout.
6. Stack the two panels naturally on iPhone while preserving equal width, matching styling, and independent collapse controls.
7. Align Reconciled balance and Account type as equal-width desktop controls, keep the reconciliation note directly below the balance input, improve label contrast, and stack both fields on iPhone.

## Render validation

- No horizontal page overflow at 1440 × 900, 1280 × 800, 393 × 852, or 360 × 800.
- MacBook expanded Category plan and Cash-flow forecast panels matched exactly:
  - 1440 × 900: 706.58 px each.
  - 1280 × 800: 737.02 px each.
- iPhone Cloud Sync, Add, and More controls rendered as 44 × 44 px touch targets at 393 px width.
- The More tools menu displayed Theme, Search, and Quick actions correctly in light and dark modes.
- At 360 px width, both collapsed budget panels matched at 95.09 px high and retained their labels, status chips, and expand controls.
- Category plan and Cash-flow forecast can be collapsed independently, and their state is stored only as a local UI preference.
- Edit Account uses matching 42 px desktop controls, 44 px iPhone controls, aligned labels, and no horizontal overflow.

## Automated validation

`npm run quality` passed with:

- 562 static HTML IDs and 216 injected runtime IDs checked with no duplicates.
- JavaScript syntax checks for all app modules and inline scripts.
- Profile roles, AES-256-GCM, PBKDF2, encrypted backup, Cloud Sync V3 envelope, SQL/RLS, rollback, and credential safeguards.
- Protected manifest, offline page, icons, Finance Schema 12, and Cloud Schema V2 rollback files unchanged.

## Safety boundaries

- No financial formulas or stored records were modified.
- Finance Schema remains 12 and Cloud Schema remains 3.
- No Supabase migration is required.
- Cloud encryption, profiles, ledger, reports, reminders, and protected rollback files remain unchanged.
- Mobile filter badges now avoid rewriting unchanged text, preventing a self-triggered MutationObserver refresh loop during responsive validation.
