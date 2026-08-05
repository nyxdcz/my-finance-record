# Privacy Notes

My Finance Records is a local-first personal finance PWA.

## Data stored locally

The browser may store finance records, preferences, recovery information, device metadata, pending record changes, conflict evidence, cloud cursors, and cached application files. Clearing browser or installed-app storage may remove the local copy.

## Optional cloud synchronization

When Cloud Sync V2 is enabled, the configured Supabase project stores:

- Current record rows for finance collections and saved settings
- Connected-device names, versions, cursors, and revocation state
- Atomic batch results
- Immutable record-level audit events
- Append-only payment-operation audit rows
- Legacy Cloud Sync V1 state until the project owner removes it

Access is restricted through Supabase authentication, Row Level Security, table grants, and authenticated RPC functions.

## Data not requested

The app does not request online-banking usernames, banking passwords, card PINs, Supabase secret/service-role credentials, or direct bank access.

## User responsibilities

- Protect the Supabase and email accounts.
- Keep recovery exports in a secure location.
- Review and revoke devices no longer controlled.
- Avoid placing finance exports in a public repository.
- Verify the project URL and signed-in account before migration or upload.
- Delete legacy V1 cloud state only after V2 operation and independent backups are confirmed.

## Deletion

Local records can be removed through the app or by clearing site data. V2 deletions are synchronized as tombstones and retained in immutable audit history. Removing the current cloud rows or audit history requires deliberate database administration and may affect recovery or other connected devices. Independent backups must be deleted separately.
