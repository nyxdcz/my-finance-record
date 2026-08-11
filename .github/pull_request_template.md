## Summary

Describe the approved change and why it is needed.

## Safety checklist

- [ ] The change matches the approved scope.
- [ ] `npm run quality` passes locally.
- [ ] `npm run test:browser` passes, or the browser-test limitation is documented below.
- [ ] The pull-request title uses Conventional Commit format.
- [ ] Finance schema remains compatible or includes a documented migration.
- [ ] App, service-worker, cache, README, and `version.json` versions agree.
- [ ] No Supabase secret or `service_role` key is included.
- [ ] Payment, balance, recurrence, backup, restore, and cloud-sync behavior were considered.
- [ ] Protected PWA assets changed only when required.
- [ ] A recovery backup was exported before testing destructive workflows.

## Validation evidence

List the tests performed and any limitations.
