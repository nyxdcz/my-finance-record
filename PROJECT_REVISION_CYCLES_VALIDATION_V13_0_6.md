# V13.0.6 Project Revision Cycles Validation

## Scope
- Completed project → Reopen for revision → In revision → Mark revision complete → Completed.
- Original project completion date remains unchanged.
- Numbered revision history stores requested date, optional revision deadline, notes, and revision completion date.
- Project value, received amount, payment history, fixed-salary classification, work month, and project ID remain unchanged.
- Dashboard and Apple Calendar use the active revision deadline.
- Apple Calendar keeps the existing project UID so a revision deadline updates the same project calendar identity rather than creating a new project event identity.

## Browser test environment
- Headless Chromium 144.0.7559.96 was used in the available Linux x86_64 environment.
- Project scripts and styles were loaded locally for the UI workflow; no live Supabase write was required for this project-metadata feature.

## Browser workflow tested
A fixed-salary `Taburi` fixture was created as Completed on August 1, 2026.

The browser test then:
1. Confirmed **Reopen for revision** is available on the completed project.
2. Started Revision 1 on August 7 with an August 10 deadline and client revision notes.
3. Confirmed the project moved to **In revision** and Active Projects.
4. Confirmed the original project completion date remained **August 1, 2026**.
5. Confirmed project ID, value, received amount, and payment history did not change.
6. Confirmed Dashboard calendar showed **Revision 1 deadline** on August 10.
7. Confirmed the generated `.ics` content retained `UID:taburi-1@my-finance-records.local` and used `Revision 1 deadline`.
8. Confirmed Edit Project displayed Revision 1 history and locked the normal Status control while a revision is active.
9. Marked Revision 1 complete and confirmed the project returned to Completed while retaining the August 1 original completion date and adding its own revision-completion date.
10. Reopened the project again and confirmed the next cycle was labeled **Revision 2**.

## Responsive browser checks
- MacBook: 1440 × 900 — passed, 0px horizontal overflow.
- iPad: 1024 × 768 — passed, 0px horizontal overflow.
- iPhone: 393 × 852 — passed, 0px horizontal overflow.
- Narrow phone fallback: 360 × 800 — passed, 0px horizontal overflow.

## Automated quality
- `npm run inspect` — passed with 0 errors and 0 warnings.
- `npm run quality` — passed.
- 611 static HTML IDs and 216 injected runtime IDs checked with no duplicates.
- Finance Schema 12, Cloud Schema V3, profile/encryption safeguards, SQL/RLS safeguards, rollback files, manifest, offline page, and icons remain protected.

## Protected behavior
- No Finance Schema 12 or Cloud Schema V3 change.
- No account-balance, project-payment, fixed-salary, or project-value calculation change.
- No destructive migration of completed project history.
- Revision history is additional project metadata inside the existing project record.
