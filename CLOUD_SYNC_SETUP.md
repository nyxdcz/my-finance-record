# Cloud Sync Setup · V12.21.0

Cloud Sync remains optional. The app continues to work locally when no Supabase project is configured or the device is offline.

## Required components

- One Supabase project
- One HTTPS address hosting the complete PWA
- The same Supabase sign-in account on the MacBook and iPhone
- A browser-safe Supabase publishable key or legacy `anon` key

Never place a Supabase secret key, `service_role` key, database password, or personal access token in browser files.

## Existing project upgrade from V12.20.0

1. Open the app on the authoritative MacBook and export a recovery backup.
2. Wait until the existing Cloud Sync status shows **Synced**.
3. In the Supabase SQL Editor, run:

```text
supabase/cloud-sync-v2.sql
```

4. Confirm the query completes without an error.
5. Deploy V12.21.0 through GitHub Pages.
6. Open the MacBook app online first.
7. Sign in and review the first Cloud Sync V2 choice:
   - **Upload this device’s data** when the MacBook is authoritative.
   - **Download cloud data** only when the V2 cloud already contains the intended records.
   - **Review and merge** when both copies contain valid changes.
8. Wait for **Synced** before opening the iPhone.
9. Open or update the iPhone PWA and sign in to the same account.
10. Confirm the balances, ledger totals, expenses, income, projects, and Sync Health values match.

The migration does not delete the legacy `finance_cloud_state` row. It creates the V2 record store separately so the old cloud payload remains available as migration evidence until it is removed manually.

## New Supabase project

Run the SQL files in this order:

```text
supabase/schema.sql
supabase/security-policies.sql
supabase/payment-operations.sql
supabase/security-hardening-v12-19-1.sql
supabase/cloud-sync-v2.sql
```

Then review:

```text
supabase/rls-smoke-tests.sql
supabase/rls-smoke-tests-v2.sql
```

The V2 migration creates:

- `finance_sync_profiles` — cloud protocol, audit cursor, and minimum supported writer version
- `finance_sync_records` — one current row per synchronized record
- `finance_sync_batches` — idempotent all-or-nothing commit results
- `finance_sync_audit` — immutable record-level history used for incremental pull and Realtime notification

It also adds version, cursor, push, and revocation fields to `finance_cloud_devices`.

## Browser configuration

The hosted `sync-config.js` may contain only:

```js
window.FINANCE_SYNC_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabasePublishableKey: "sb_publishable_REPLACE_ME"
};
```

The same values can instead be saved separately on each device under **Settings → Cloud Sync & Devices**.

## How Cloud Sync V2 works

- Every app save completes in local browser storage first.
- The client compares the previous and current normalized finance data.
- Only added, changed, reordered, or deleted records enter the pending queue.
- Pending records are committed through RPC functions in atomic batches.
- The database verifies each record’s expected revision before applying any record in the batch.
- A successful commit increments record revisions and writes immutable audit events.
- Other open devices receive an audit notification and pull only events after their saved cursor.
- Offline or failed records retry with a capped exponential delay.
- Deleted records remain as cloud tombstones so an older device cannot recreate them accidentally.

## Financial-operation protection

Payment and restoration changes may affect an expense, one or more account values, and ledger entries. V12.21.0 sends these related records through one financial-operation RPC. The database either commits the complete batch or rejects the complete batch.

Payment-operation IDs remain unique and append-only. A repeated network request can return the previously committed result without applying the same deduction again.

## Conflict controls

A conflict occurs when the cloud revision no longer matches the revision used by the pending local record.

The Cloud Sync panel provides:

- **Retry** — automatically merges non-overlapping object fields and retries
- **Discard local** — removes the pending local version and activates the cloud-confirmed record
- **Keep this version** — explicitly rebases the local version onto the current cloud revision and resubmits it
- **Download copies** — exports the base, local, and remote versions for review

Overlapping fields are never silently merged. Payment and account-related batches remain atomic.

## Sync Health

Sync Health displays:

- Cloud Schema and protocol
- Last audit cursor
- Last successful pull and push
- Pending and conflicted record counts
- Installed app version
- Minimum writer version required by the cloud
- Recent cloud audit events

A device running below the cloud minimum is allowed to read but is blocked from committing changes until it updates.

## Remote device removal

Removing a connected device sets a server-side revocation timestamp. The revoked device is blocked from future V2 registration and commits and clears its local cloud session the next time it connects. Remove the device’s browser/site data separately when physical access is available.

## Security boundaries

- V2 tables have Row Level Security enabled and forced.
- Authenticated browser users may select only rows owned by their `auth.uid()`.
- Direct browser insert, update, and delete access to V2 rows is revoked.
- Writes occur through authenticated security-definer RPC functions with explicit user, device, revision, and version checks.
- Anonymous access is revoked.
- Cloud sync is not a replacement for independent backups.

## V12.22.0 budget synchronization

No additional Supabase migration is required after Cloud Sync V2 is installed.

V12.22.0 synchronizes these new record types through the existing Cloud Schema V2 record tables and RPC functions:

- `monthlyBudgets` — one monthly plan record keyed by `YYYY-MM`
- `budgetTemplates` — reusable category-plan templates
- `budgetSettings` — savings-allocation, low-balance, and forecast preferences

Open the MacBook online first after deployment, wait for **Synced**, and then open the iPhone. Budget-plan changes remain local-first and are included in the same pending-record, conflict, audit, and revision safeguards as other Cloud Sync V2 records.
