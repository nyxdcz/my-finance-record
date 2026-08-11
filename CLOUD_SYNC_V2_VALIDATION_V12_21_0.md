# V12.21.0 Record-level Cloud Sync 2.0 Validation

## Automated validation

- All V12.18.1 through V12.20.0 regression baselines pass.
- App, package, service-worker, cache, README, changelog, and version metadata agree on V12.21.0.
- Core finance schema remains 12 and Ledger Version remains 1.
- Cloud Schema is 2.
- Static and dynamically injected HTML IDs are unique.
- Inline JavaScript, `cloud-sync.js`, `account-ledger.js`, service worker, and validation scripts pass syntax checks.
- Protected manifest, offline page, icons, and browser-safe Supabase configuration remain unchanged.

## Record model

- Arrays, accounts, map-based records, settings, and extra root values round-trip through the record store.
- A one-record local edit creates one pending record.
- Deletion creates a tombstone rather than silently removing cloud history.
- Non-overlapping object fields merge safely; overlapping fields create an explicit conflict.
- Record keys are URL-encoded before being placed in HTML data attributes.

## Server safeguards

- V2 profile, records, batches, and audit tables are created with forced RLS.
- Anonymous access and direct authenticated writes are revoked.
- RPC functions validate authentication, device status, expected revisions, and minimum writer versions.
- Batch ownership is claimed before mutation so repeated requests return the same result.
- Revision conflicts reject the complete batch.
- Financial-operation retries use an operation-and-payload batch key and remain protected by append-only payment operation IDs.
- Audit events are immutable and published for Realtime notifications.

## Device validation still required

After the Supabase migration and GitHub Pages deployment, verify with non-sensitive records:

1. MacBook V1-to-V2 upload or merge.
2. iPhone initial V2 download.
3. One edit in each direction.
4. Offline edit and reconnect retry.
5. Same-record conflict controls.
6. Payment, reversal, transfer, and reconciliation atomic behavior.
7. Remote device revocation on reconnect.
8. Installed-PWA update replacement and true offline reload.
