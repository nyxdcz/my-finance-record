# MacBook and iPhone Installation · V12.21.0

## Before updating

1. Open V12.20.0 on the MacBook while online.
2. Wait for **Synced**.
3. Export a recovery backup.
4. Run `supabase/cloud-sync-v2.sql` in the Supabase SQL Editor.
5. Deploy V12.21.0 and wait for the GitHub Pages workflow to finish.

## MacBook

1. Open the hosted HTTPS address.
2. Reload once when the update notice appears.
3. Confirm **Settings → Advanced → Version History** shows V12.21.0.
4. Open **Settings → Cloud Sync & Devices**.
5. Sign in when required.
6. Choose **Upload this device’s data** when the MacBook contains the authoritative records, or use **Review and merge** when both copies contain changes.
7. Wait until the status says **Synced** and Sync Health shows zero pending records.

## iPhone

1. Open the same HTTPS address in Safari.
2. Launch or replace the Home Screen PWA.
3. Fully close and reopen it if the previous service-worker copy remains visible.
4. Confirm V12.21.0 in Version History.
5. Sign in with the same cloud account.
6. Choose **Download cloud data** on a new or empty installation.
7. Confirm balances, ledger totals, expenses, income, projects, and Sync Health match the MacBook.

## Daily use

- Local edits remain available immediately, including while offline.
- Wait for **Synced** after important payments, restorations, transfers, or reconciliations.
- Sync Health lists the exact records waiting when a connection fails.
- Open the app online after a long offline period so incremental audit events can be pulled.
- Keep regular recovery exports outside both devices and outside the public repository.

## Device-specific values

Theme, installation state, current page, current month, sidebar state, and responsive presentation remain local. Finance records, account ledger, reconciliations, expenses, income, projects, goals, report data, recurrence settings, and payment states synchronize at record level.
