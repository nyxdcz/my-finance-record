# V13.0.0 Cloud, Encryption & Profile Architecture Validation

## Scope

- Personal and household local profiles
- Owner, Editor, and Viewer roles
- Finance Schema 12 profile migration and switching
- Cloud Schema V3 encrypted record synchronization
- AES-256-GCM cloud payloads and encrypted backups
- PBKDF2-SHA-256 passphrase derivation
- Invitation codes, member roles, device revocation, and encrypted restore points
- Optional app lock, TOTP MFA controls, and experimental passkeys

## Automated checks

- V12.25.0 quality baseline is run against the clean repository before the updater applies V13 files.
- V13 app, service worker, Cloud Sync, profile architecture, and module syntax checks.
- Static and injected HTML ID uniqueness.
- AES-GCM round trip and wrong-passphrase failure.
- Encrypted backup round trip and tamper/context failure.
- Profile normalization and Viewer write-block checks.
- Cloud Sync V3 record-map round trip and encryption-envelope checks.
- SQL structure, profile-scoped RLS, RPC-only writes, encrypted-payload constraints, audit, payment-operation, invitation, restore-point, and Realtime checks.
- Protected Finance Schema 12 identifiers, manifest, offline page, icons, and V2 rollback SQL hashes.
- Exact approved-file and `git diff --check` validation in the updater.

## Important limitations

- The SQL migration was not executed against the user’s live Supabase project in the build environment.
- Actual MFA enrollment, passkey registration, WebAuthn prompts, iPhone Secure Enclave behavior, and cross-device household invitations require live-device testing.
- Client-side encryption does not encrypt the active localStorage working copy or operational sync metadata.
- Passkeys are experimental and may require project configuration changes.
- Lost encryption passphrases cannot be recovered.
