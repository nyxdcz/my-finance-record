# MacBook and iPhone Installation · V13.0.0

## Before deploying

1. Verify V12.25.0 is synchronized on both devices.
2. Export a recovery backup from the authoritative MacBook.
3. Run `supabase/cloud-profiles-v13.sql`.
4. Deploy the complete V13 PWA through HTTPS.

## MacBook first

1. Open the hosted PWA in Chrome or Safari and reload once online.
2. Confirm **V13.0.0** in Settings → Advanced.
3. Confirm existing accounts, balances, ledger, budgets, reports, and reminders are unchanged.
4. Sign in to Supabase.
5. Open **Profiles & Security** and create an encrypted cloud profile.
6. Store the passphrase outside the app.
7. Choose **Upload this device’s data** in Cloud Sync.
8. Wait for **Synced** and create an encrypted restore point.
9. Export and test an encrypted `.mfrx` backup.

## iPhone

1. Open the exact HTTPS address in Safari.
2. Use **Share → Add to Home Screen** or update the existing installed PWA.
3. Open the Home Screen app and confirm V13.0.0.
4. Sign in to an authorized account.
5. In **Profiles & Security**, use **Find existing profiles** and connect the personal profile, or accept the household invitation.
6. Enter the same profile passphrase to verify and unlock encryption.
7. Choose **Download cloud data**.
8. Compare account totals, ledger balances, and one recent expense with the MacBook.
9. Enable notifications only through a direct user action in the installed app.

## Rollback reference

V13 does not remove V2 cloud tables. If migration cannot be completed, stop using V13 sync, retain all backups, and return to the known V12.25.0 package before making further cloud changes. Do not alternate V12 and V13 writers against the same active finance workflow.
