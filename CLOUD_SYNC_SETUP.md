# Cloud Sync Setup · V13.0.0

Cloud Sync is optional. The app remains local-first when Supabase is not configured.

## Required components

- A Supabase project already configured for V12 Cloud Sync V2
- The browser-safe Supabase publishable key or legacy anon key
- One HTTPS PWA address
- `supabase/cloud-profiles-v13.sql`
- A unique profile encryption passphrase stored outside the app

Never place a Supabase secret key or `service_role` key in this browser application.

## 1. Back up V12.25.0

On the MacBook, open V12.25.0, wait for **Synced**, export a recovery backup, and keep it unchanged. Do not start V13 migration from an empty iPhone installation.

## 2. Install Cloud Schema V3

Run the complete `supabase/cloud-profiles-v13.sql` file in the Supabase SQL Editor. The migration creates profile, member, encrypted record, batch, audit, device, payment-operation, invitation, and restore-point tables plus profile-scoped RLS and RPC functions.

The migration does not delete or alter the V2 cloud tables.

## 3. Configure the hosted app

Use a browser-safe configuration:

```js
window.FINANCE_SYNC_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabasePublishableKey: "sb_publishable_REPLACE_ME"
};
```

A device-only configuration may instead be saved in **Settings → Cloud Sync & Devices** on each device.

## 4. Create the first encrypted profile

1. Open V13.0.0 on the MacBook.
2. Sign in to Supabase.
3. Open **Settings → Profiles & Security**.
4. Confirm the active local profile contains the expected V12 records.
5. Create an encrypted personal or household cloud profile.
6. Choose a strong unique passphrase and save it in a password manager or another secure location.
7. Return to **Cloud Sync & Devices** and select **Upload this device’s data**.
8. Wait for **Synced**.

Every outgoing record payload is encrypted in the browser. Supabase receives ciphertext envelopes and synchronization metadata.

## 5. Connect another device

1. Update or reinstall the hosted PWA on the second device.
2. Sign in with an authorized account.
3. For a personal profile, open **Profiles & Security**, select **Find existing profiles**, and connect the matching profile with its passphrase.
4. For a household profile, accept an invitation code, then enter the shared profile passphrase received through a separate trusted channel.
5. Unlock the profile and choose **Download cloud data**.
6. Confirm balances, ledger totals, and profile name match.

## Household roles

- **Owner:** Full finance access, invitation management, role changes, member removal, restore points, and device revocation.
- **Editor:** Can read and edit synchronized finance records.
- **Viewer:** Can read and download records but cannot save or upload financial changes.

## Encryption and metadata

Encrypted with the profile passphrase:

- Record payloads
- Cloud restore-point snapshots
- Portable `.mfrx` backups

Visible as operational metadata:

- Profile and user membership
- Collection and record identifiers
- Revisions, deletion markers, timestamps, app version, and device metadata

The active local browser copy remains plaintext. The optional app lock is a screen-access control, not localStorage encryption.

## MFA and passkeys

Authenticator MFA may be enrolled after normal password sign-in and recovery have been tested. Do not enforce an AAL2-only policy until every intended device can complete MFA.

Passkeys are experimental. They require supported Supabase project configuration, a compatible browser, a secure HTTPS origin, and the V13 pinned Supabase client. Keep password sign-in and account recovery available.

## Recovery

- Export both a normal pre-migration V12 backup and an encrypted V13 `.mfrx` backup.
- Test the encrypted backup passphrase before relying on it.
- Create encrypted cloud restore points before large changes.
- Keep the profile passphrase separate from the backup file.
- A lost passphrase cannot be recovered by Supabase or this app.
