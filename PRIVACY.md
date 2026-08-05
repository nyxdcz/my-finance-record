# Privacy Notes

My Finance Records is a local-first personal finance PWA.

## Data stored locally

The browser may store finance records, preferences, recovery information, device metadata, pending sync changes, and cached app files. Clearing browser or installed-app storage may remove local records.

## Optional cloud synchronization

When Cloud Sync is enabled, finance state, connected-device information, deletion markers, conflict metadata, and payment-operation audit rows are stored in the user's configured Supabase project. Access is restricted by Supabase authentication and Row Level Security.

## Data not requested

The app does not request online-banking usernames, banking passwords, card PINs, or Supabase secret/service-role credentials.

## User responsibilities

- Protect the Supabase account and email account.
- Keep recovery exports in a secure location.
- Review connected devices and remove devices no longer controlled.
- Avoid placing private finance exports in a public GitHub repository.
- Verify the account and project URL before uploading existing records.

## Deletion

Local records can be removed through the app or by clearing site data. Cloud records can be removed from the app where supported or directly from the user's Supabase project. Backups remain separate and must be deleted independently.
