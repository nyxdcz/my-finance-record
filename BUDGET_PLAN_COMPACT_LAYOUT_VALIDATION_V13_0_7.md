# V13.0.7 Budget Plan Compact Layout Validation

## Scope
- Added a persistent expand/collapse control for the complete Monthly budget plan.
- Collapsed mode keeps Planned budget, Budget remaining, and Forecast month-end visible.
- Tightened planner toolbar actions, KPI cards, Category plan, Cash-flow forecast, and surrounding spacing.
- Kept Category plan and Cash-flow forecast as matching paired bento panels.
- Preserved 44 × 44px planner and panel collapse targets on phone layouts.

## Automated regression validation
- `npm run inspect`: passed with 0 errors and 0 warnings.
- `npm run quality`: passed.
- 611 static HTML IDs and 218 injected runtime IDs checked with no duplicates.
- Profile roles, AES-256-GCM, PBKDF2, encrypted backup, Cloud Sync V3, SQL/RLS, rollback, and credential safeguards passed.
- Finance Schema 12 and protected manifest, offline page, icons, and Cloud Schema V2 rollback files remain unchanged.

## Browser layout validation
Headless Chromium was run with the local project assets inlined because the test environment does not expose the project through a normal localhost web server.

Tested viewports:
- MacBook: 1440 × 900 — passed, 0px horizontal overflow.
- iPad-size: 1024 × 768 — passed, 0px horizontal overflow.
- iPhone: 393 × 852 — passed, 0px horizontal overflow.
- Narrow phone: 360 × 800 — passed, 0px horizontal overflow.

MacBook expanded state measured:
- Category plan height: 497.2px.
- Cash-flow forecast height: 497.2px.
- Gap from Monthly budget plan to Available money: 12px.

Collapsed-state validation:
- Exactly three summary cards remain visible: Planned budget, Budget remaining, and Forecast month-end.
- Category plan and Cash-flow forecast editing content is hidden.
- Collapse preference is stored in `simple-finance-budget-panel-state-v1` under `planner`.
- Re-expanding restores the full planning interface.
- Phone planner collapse controls measure 44 × 44px.

## Protected behavior
No budget formula, category limit, actual/committed calculation, forecast calculation, expense record, account balance, Savings setting, cloud-sync payload, profile/security behavior, or stored finance record was changed by this release.
