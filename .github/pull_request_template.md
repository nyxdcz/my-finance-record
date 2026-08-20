## Summary

Explain the approved change, the user or maintainer problem it solves, and the intended outcome.

## Scope

**Changed**

- Describe the focused change.

**Explicitly unchanged**

- List nearby behavior intentionally left untouched.

## Risk and compatibility

| Contract | Impact or rationale |
| --- | --- |
| Finance schema | None / describe the migration |
| Cloud schema | None / describe the migration |
| Data migration | None / describe the recovery path |
| PWA cache and service worker | None / describe the compatibility plan |

## Visual evidence

Add before-and-after screenshots for user-interface changes. Redact names, balances, email addresses, identifiers, keys, and other private finance data.

## Validation

| Check | Result |
| --- | --- |
| `npm run quality` | Not run / Pass / Fail |
| `npm run test:browser` | Not run / Pass / Fail |
| Additional focused checks | Describe |

## Final checklist

- [ ] The change matches the approved scope and the pull-request title uses Conventional Commit format.
- [ ] Relevant tests pass, or each limitation is documented above.
- [ ] No secrets, private finance data, or privileged Supabase credentials are included.
- [ ] Finance data, sync, backup, restore, recurrence, and payment compatibility were considered.
- [ ] Runtime version metadata is aligned when runtime or PWA output changed; documentation-only work does not require a version bump.
- [ ] User-facing behavior and operational changes are documented where needed.
