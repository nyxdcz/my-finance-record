# Cloud Schema V3 Controlled Migration Guide

## Stop conditions

Do not continue unless authoritative-device balances match, Cloud Sync is Synced, a fresh recovery backup can be opened, and the earlier Cloud Schema V2 migration has completed.

## Stage 1 — Recovery

1. Export a recovery backup from the authoritative device.
2. Save a second copy outside the Downloads folder.
3. Record the current account total and one recent ledger transaction for comparison.

## Stage 2 — Database

1. Open the Supabase SQL Editor.
2. Run `supabase/cloud-profiles-v3.sql` once.
3. Confirm the transaction completes successfully.
4. Review `supabase/rls-smoke-tests-v3.sql` and the Security Advisor.

Cloud Schema V3 creates new profile-scoped tables. It does not delete earlier cloud records.

## Stage 3 — App

1. Deploy the current Talaan release.
2. Open the authoritative device first.
3. Confirm existing local data is assigned to the default personal profile.
4. Create the encrypted cloud profile and store the passphrase externally.
5. Upload from the authoritative device and wait for Synced.
6. Create and test an encrypted `.mfrx` backup.

## Stage 4 — Second device

1. Update the Home Screen app.
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

Stop all Cloud Schema V3 writers before rollback. Preserve encrypted backups and the pre-migration recovery backup. Earlier cloud tables remain available for controlled rollback, but records written only to Cloud Schema V3 will not automatically appear in earlier schemas.
