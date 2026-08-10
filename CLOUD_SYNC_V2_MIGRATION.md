# Cloud Sync V2 Migration · V12.21.0

## Purpose

Cloud Schema V2 replaces the single `finance_cloud_state` JSON row with independently revisioned records and an immutable audit cursor.

## Migration order

1. On the authoritative MacBook, wait for V12.20.0 to show **Synced**.
2. Export a recovery bundle.
3. Run `supabase/cloud-sync-v2.sql` in the same Supabase project.
4. Deploy V12.21.0.
5. Open the MacBook first and initialize V2 using Upload or Review and merge.
6. Verify zero pending records and matching account/ledger totals.
7. Open the iPhone, update to V12.21.0, and download or merge.
8. Test one non-sensitive record in each direction.

## Compatibility

- Core finance schema: 12
- Cloud schema: 2
- Ledger version: 1
- Legacy Cloud Sync V1 data remains untouched during the migration.
- Existing local-storage keys and Supabase project configuration remain compatible.

## Rollback boundary

The SQL creates new tables and functions without deleting V1 state. Before V2 initialization, the deployed app may be rolled back to V12.20.0. After V2 records have diverged, do not return to V1 for active editing because V1 cannot read V2 audit changes. Keep the recovery export and confirm both devices before deleting any legacy data.

## Verification

- `finance_sync_profiles` contains the signed-in user after the first V2 commit.
- `finance_sync_records` contains separate rows for collections and settings.
- `finance_sync_audit` receives one event per changed record.
- Sync Health shows Cloud Schema V2 and an increasing audit cursor.
- An unchanged local save does not create new cloud record events.
