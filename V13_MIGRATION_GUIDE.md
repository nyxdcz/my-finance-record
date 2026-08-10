# V13.0.0 Controlled Migration Guide

## Stop conditions

Do not continue if the MacBook and iPhone do not show matching V12.25.0 balances, Cloud Sync is not Synced, a fresh recovery backup cannot be opened, or the Supabase V2 migration was never completed.

## Stage 1 — Recovery

1. Export a V12.25.0 recovery backup from the authoritative MacBook.
2. Save a second copy outside the Downloads folder.
3. Record the current account total and one recent ledger transaction for comparison.

## Stage 2 — Database

1. Open the Supabase SQL Editor.
2. Run `supabase/cloud-profiles-v13.sql` once.
3. Confirm the transaction completes successfully.
4. Review `supabase/rls-smoke-tests-v3.sql` and the Security Advisor.

The V3 migration creates new tables. It does not delete V2 records.

## Stage 3 — App

1. Deploy V13.0.0.
2. Open the MacBook app first.
3. Confirm local V12 data was assigned to the default personal profile.
4. Create the encrypted cloud profile and store the passphrase externally.
5. Upload from the MacBook and wait for Synced.
6. Create and test an encrypted `.mfrx` backup.

## Stage 4 — Second device

1. Update the iPhone Home Screen app.
2. Sign in, open **Profiles & Security**, and use **Find existing profiles** or accept the household invitation.
3. Connect and unlock using the same passphrase.
4. Download the cloud records.
5. Compare the recorded account total and ledger transaction.

## Stage 5 — Household access

1. The Owner creates an Editor or Viewer invitation code.
2. Send the invitation code and encryption passphrase through separate trusted channels.
3. The invited user signs in, accepts the code, unlocks the profile, and downloads records.
4. Verify Viewer accounts cannot save or upload.

## Rollback

Stop all V13 writers before rollback. Preserve V13 encrypted backups and the V12 recovery backup. Return to the exact V12.25.0 package and V2 workflow. The V13 SQL intentionally leaves V2 tables unchanged, but data written only to V3 will not automatically appear in V2.
