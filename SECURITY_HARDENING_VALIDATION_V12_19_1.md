# V12.19.1 Repository & Security Hardening Validation

## Automated checks

Run:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
```

The validator checks:

- Every earlier V12.18.1–V12.19.0 regression baseline
- V12.19.1 version and cache agreement
- JavaScript and service-worker syntax
- Duplicate HTML IDs
- Protected manifest, offline page, and icon hashes
- GitHub Actions validation and Pages deployment structure
- Required repository documentation
- Forced RLS and append-only payment-operation policies
- Browser credential safety

## Manual checks

- Enable GitHub Pages from GitHub Actions.
- Run the workflow and confirm the quality job passes.
- Apply `supabase/security-hardening-v12-19-1.sql` to the existing Supabase project.
- Follow `supabase/rls-smoke-tests.sql` with two non-production test users.
- Verify MacBook and iPhone sync after the policy migration.
- Test Mark Paid, Move to Unpaid, bulk payment, and Gym month-end auto-pay with sample data.

## Expected unchanged behavior

- Core finance schema remains 12.
- Cloud Schema remains V1.
- Existing Supabase records remain compatible.
- Existing payment-operation rows remain readable.
- New payment-operation rows can be inserted but not updated or deleted by browser users.
- Local-first operation and backups remain available.
