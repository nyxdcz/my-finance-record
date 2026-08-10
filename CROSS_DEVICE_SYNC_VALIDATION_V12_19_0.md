# Cross-Device Cloud Sync Validation · V12.19.0

## Configuration and security

- [ ] Cloud Sync remains optional when configuration is blank.
- [ ] Secret and service-role keys are rejected by the browser configuration form.
- [ ] SQL enables Row Level Security on all cloud tables.
- [ ] Policies restrict rows to `auth.uid()`.
- [ ] Only a publishable or legacy anon key is documented for the browser.
- [ ] Core finance schema remains 12; cloud schema is independently identified as V1.

## First synchronization

- [ ] Existing MacBook records can be uploaded as the first cloud copy.
- [ ] A new empty iPhone cannot overwrite cloud data without an explicit choice.
- [ ] Download cloud data replaces the empty iPhone records correctly.
- [ ] Merge keeps different record IDs from both devices.
- [ ] A local recovery point is created before first-sync replacement or merge.

## Automatic and offline behavior

- [ ] Local saves complete before any network request.
- [ ] Pending changes show in Settings and the toolbar indicator.
- [ ] Reconnection, focus, visibility return, Realtime events, and Sync now trigger a check.
- [ ] Offline changes remain local until internet access returns.
- [ ] Sign-out does not erase local records.

## Conflicts and deletions

- [ ] Record timestamps and tombstones are included in the cloud payload.
- [ ] Different-record edits merge.
- [ ] Same-record overlaps create a recoverable conflict snapshot.
- [ ] Payment-state and account conflicts retain the cloud-confirmed copy.
- [ ] Download, restore-local, and keep-current conflict actions work.
- [ ] Deleted records are not resurrected by an older offline copy when the tombstone is newer.

## Payment safeguards

- [ ] Paid expense transaction IDs are synchronized.
- [ ] Payment, Gym auto-payment, and restoration operations are inserted idempotently.
- [ ] The database uniqueness key includes user, operation, expense, and operation type.
- [ ] An optimistic cloud revision prevents silent overwrite by simultaneous devices.
- [ ] A revision conflict retries after downloading and merging the latest cloud state.

## Devices and interface

- [ ] Connected devices show name, platform, status, and last-seen time.
- [ ] The current device can be renamed.
- [ ] An old device entry can be removed without deleting finance records.
- [ ] Cloud Sync & Devices is available in Settings navigation.
- [ ] The toolbar indicator opens the Cloud Sync panel.
- [ ] Desktop and 390-pixel phone layouts avoid horizontal overflow.

## Regression

- [ ] All V12.18.1–V12.18.10 validations still pass.
- [ ] Existing local backups import normally.
- [ ] Manifest, offline page, and icons remain unchanged.
- [ ] Service-worker shell includes the new local cloud-sync files.
- [ ] JavaScript syntax, duplicate IDs, version strings, and cache keys pass.
