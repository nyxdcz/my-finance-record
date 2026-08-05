# Cloud Sync Setup · V12.20.0

Cloud Sync is optional. The app remains fully usable as a local offline PWA when cloud configuration is blank.

## What you need

- One Supabase project
- One HTTPS address hosting this PWA
- The same sign-in email and password on the MacBook and iPhone
- A Supabase **publishable key** (`sb_publishable_...`) or legacy **anon key**

Never use a Supabase secret key or `service_role` key in this browser app.

## 1. Create the Supabase project

1. Create a new Supabase project.
2. Open the project SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/security-policies.sql`.
5. Run `supabase/payment-operations.sql`.
6. In Authentication → URL Configuration, add the final HTTPS app address as the Site URL and an allowed redirect URL.
7. Review the Supabase Security Advisor before entering real finance records.

The SQL creates:

- `finance_cloud_state` — one encrypted-in-transit JSON state row per authenticated user
- `finance_cloud_devices` — device names and last-seen information
- `finance_payment_operations` — idempotent payment and restoration audit records
- Row Level Security policies that restrict every row to `auth.uid()`

## 2. Add the browser-safe project values

Two setup methods are supported.

### Hosted configuration

Copy `sync-config.example.js` to `sync-config.js`, then replace:

```js
window.FINANCE_SYNC_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabasePublishableKey: "sb_publishable_REPLACE_ME"
};
```

Deploy the edited `sync-config.js` with the PWA. Both devices then use the same project automatically.

### Device-only configuration

Leave `sync-config.js` blank. Open:

`Settings → Cloud Sync & Devices`

Paste the project URL and publishable key, then choose **Save on this device**. This method must be repeated on each device.

## 3. Deploy through HTTPS

Cloud Sync, installation, service workers, and iPhone home-screen use require one HTTPS website. GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, or another HTTPS host can serve the package.

Do not use `file://` for cross-device synchronization. A local HTML file on the MacBook cannot be opened as the same origin on the iPhone.

## 4. Initialize the MacBook first

1. Open the hosted app on the MacBook.
2. Export a recovery bundle.
3. Open **Settings → Cloud Sync & Devices**.
4. Create an account or sign in.
5. Choose **Upload this device’s data**.
6. Confirm that the status becomes **Synced**.

The upload choice is recommended when the MacBook already contains the authoritative records.

## 5. Connect the iPhone

1. Open the exact same HTTPS address in Safari.
2. Use **Share → Add to Home Screen**.
3. Open the installed app.
4. Open **Settings → Cloud Sync & Devices**.
5. Sign in with the same account.
6. Choose **Download cloud data**.
7. Confirm that account totals and records match the MacBook.

An empty new iPhone installation does not overwrite an existing cloud copy automatically. The first-sync choice must be confirmed.

## Synchronization behavior

- Every normal save is written locally first.
- Online changes are queued and synchronized shortly afterward.
- Offline changes remain queued until the app is opened online.
- Returning from the background, focusing the app, reconnecting, or selecting **Sync now** checks for cloud changes.
- Supabase Realtime prompts an open device to download a revision created by the other device.
- When both devices changed different records, both versions are merged.
- When both devices changed the same payment state or account value, the cloud-confirmed version is retained and a recoverable conflict snapshot is listed.


## V12.20.0 ledger synchronization

No additional Supabase SQL migration is required for V12.20.0. The existing `finance_cloud_state` JSON payload now also includes:

- `accountLedger` — append-only account balance entries
- `accountReconciliations` — documented actual-versus-calculated balance checks

Both collections use stable record IDs, update metadata, tombstones, and the existing three-way merge process. Core finance schema remains 12 and Cloud Schema remains V1.

For safest cross-device use:

1. Open the first device online and wait for **Synced** before the first V12.20.0 migration.
2. Confirm that Available Money is unchanged after opening-balance entries are created.
3. Wait for **Synced** before using transfers or reconciliation on the second device.
4. Never manually edit ledger rows in the Supabase Table Editor.

## Payment safety

Each paid expense stores a transaction ID. Cloud Sync also writes an idempotent operation row containing:

- user ID
- operation ID
- expense ID
- payment or restoration type
- account
- amount
- device

The unique database constraint prevents the same operation from being inserted twice during retries. The state merger gives the cloud-confirmed payment state priority when the same expense was changed on two devices.

For the strongest protection, synchronize before marking an expense paid when the other device may also be open.

## Conflict recovery

The Cloud Sync panel lists unresolved conflicts. Each entry supports:

- **Download copies** — exports the local, cloud, and merged snapshots
- **Restore local copy** — replaces the current copy after saving a recovery point
- **Keep current** — resolves the notice without replacing data

Conflict snapshots are stored locally and are limited to the most recent entries to protect browser storage.

## Security boundaries

- Finance data is sent only to the configured Supabase project.
- Row Level Security must remain enabled.
- The publishable key identifies the project but does not grant unrestricted access.
- The signed-in user’s JWT is used by Supabase to enforce `auth.uid()` policies.
- No bank login, card credential, or banking API is used.
- Local backups remain necessary before replacing devices, clearing browser data, or changing cloud projects.

## V12.19.1 security hardening

For an existing V12.19.0 Supabase project, run this additional migration once after creating a recovery backup:

```text
supabase/security-hardening-v12-19-1.sql
```

Then review `supabase/rls-smoke-tests.sql`. The migration forces RLS on all finance tables and makes payment-operation rows append-only for authenticated browser clients.

Authentication rate limits are configured in the Supabase Dashboard under **Authentication → Rate Limits**; they are not stored in this repository. Review the current project values before using real finance records.

Optional MFA should be enabled only after testing enrollment and recovery with a separate test account. Do not enforce an `aal2` database policy until every intended device can complete MFA and a recovery method is documented.
