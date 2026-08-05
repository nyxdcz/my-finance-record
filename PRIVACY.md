# Privacy Notes · V13.0.0

My Finance Records has no analytics or advertising code. Local finance records remain in the browser unless the user explicitly enables Supabase synchronization or exports a file.

## Cloud Sync V3

Cloud record payloads are encrypted in the browser before upload. Supabase stores ciphertext envelopes. Operational metadata remains visible to the configured project, including profile membership, collection and record identifiers, revisions, deletion markers, timestamps, app versions, and device information.

Authentication email addresses and MFA/passkey information are handled by the configured Supabase Auth project under its policies.

## Local browser data

The active profile working copy remains plaintext in localStorage for compatibility with the existing local-first app. The optional device app lock prevents casual on-screen access but is not full storage encryption. Anyone with access to the unlocked operating-system account and browser profile may be able to inspect local data.

## Household profiles

Owners can invite members and manage roles. Authorized members can see profile metadata. Editors can change finance records. Viewers can read synchronized records. The shared encryption passphrase must be communicated outside the invitation workflow.

## Backups

Normal legacy exports may be plaintext. V13 encrypted `.mfrx` exports use a user-supplied passphrase. Losing that passphrase makes the encrypted file unrecoverable.
