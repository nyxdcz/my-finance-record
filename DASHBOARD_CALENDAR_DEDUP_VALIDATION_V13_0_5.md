# V13.0.5 Dashboard Calendar Deduplication Validation

## Scope
- Dashboard Monthly calendar event projection and selected-day event list.
- Recurring Gym expenses across prior, current, duplicate-current, and future saved months.
- Stable source identity for Income, Expenses, Project deadlines, and Project payments.
- Repeat render and month-navigation safety.
- MacBook, iPad-sized, and iPhone responsive calendar layouts.

## Root cause fixed
The Dashboard calendar previously projected every unpaid Gym record onto the month being viewed. A recurring Gym series keeps one saved expense record per month, so prior and future monthly copies could all project the same visit date into August and produce repeated identical Gym rows.

V13.0.5 now requires an unpaid Gym record's saved expense month to match the calendar month before generating its scheduled visits.

## Deduplication behavior
- Calendar events now receive a stable `sourceKey`.
- A recurring Gym series key contains the series ID, saved month, visit date, and planned state.
- Duplicate same-month records from the same recurring series collapse to one calendar representation.
- Non-Gym recurring expenses use series ID plus saved month to prevent duplicate logical events.
- Income, project deadlines, and project payments also receive stable source identities.
- Legitimately distinct events with different source identities remain separate.

## Preserved behavior
- No expense, recurring-series, payment, ledger, or account record is deleted or merged.
- Finance Schema 12, Cloud Schema V3, encryption, profiles, budgets, reports, reminders, and payment behavior are unchanged.
- Gym day schedules, per-visit price, month-specific date overrides, auto-pay, paid status, and account deductions are unchanged.

## Tests actually performed
1. V13.0.4 baseline `npm run quality` passed before modification.
2. V13.0.4 baseline `npm run inspect` passed with 0 errors and 0 warnings.
3. V13.0.5 `npm run quality` passed.
4. V13.0.5 `npm run inspect` passed with 0 errors and 0 warnings.
5. Headless Chromium test fixture contained:
   - July Gym record for recurring series A
   - August Gym record for recurring series A
   - duplicate August Gym record for recurring series A
   - September Gym record for recurring series A
   - separate August Gym record for recurring series B
6. On August 7, the selected-day list rendered exactly two legitimate events: `Gym · ₱80.00` and `Gym B · ₱100.00`.
7. Eight consecutive calendar rerenders still produced exactly two events.
8. Navigating to the next month and back still produced exactly two events.
9. The August 7 calendar button announced `2 financial events`, matching the selected-day list.
10. Responsive browser checks passed at 1440×900, 1024×768, 393×852, and 360×800 with 0px horizontal overflow.

## Browser-test limitation
The browser audit used headless Chromium with project assets inlined because the execution environment blocks normal localhost/file navigation. No live Supabase synchronization or real installed service-worker activation was required for this calendar projection test.
