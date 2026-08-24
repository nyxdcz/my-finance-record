# Privacy Notes · Talaan V2.1.0

**Talaan** has no analytics or advertising code. Local finance records remain in the browser unless the user explicitly enables Supabase synchronization or exports a file.

## Cloud Sync

Cloud record payloads are encrypted in the browser before upload. Supabase stores ciphertext envelopes. Operational metadata remains visible to the configured project, including profile membership, collection and record identifiers, revisions, deletion markers, timestamps, app versions, and device information.

Normalized payees, aliases, and transaction-rule configuration are part of the profile finance settings. They remain local unless encrypted synchronization is enabled or the user exports a backup or rule file. Rule matching and preview run in the browser.

Authentication email addresses and MFA/passkey information are handled by the configured Supabase Auth project under its policies.

## Local browser data

The active profile working copy remains plaintext in localStorage for compatibility with Talaan's local-first model. The optional device app lock prevents casual on-screen access but is not full storage encryption. Anyone with access to the unlocked operating-system account and browser profile may be able to inspect local data.

## Household profiles

Owners can invite members and manage roles. Authorized members can see profile metadata. Editors can change finance records. Viewers can read synchronized records. The shared encryption passphrase must be communicated outside the invitation workflow.

## Backups

Encrypted `.mfrx` exports use a user-supplied passphrase. Losing that passphrase makes the encrypted file unrecoverable. Keep backup files and their passphrases in separate secure locations and test recovery before replacing a device.

## Branding and compatibility

The current visible product name is **Talaan**. Technical storage keys, record identifiers, repository paths, and compatibility-sensitive runtime filenames may retain stable internal names so a branding change does not reset or disconnect saved finance data.
