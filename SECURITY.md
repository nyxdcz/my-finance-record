# Security Policy · V13.0.0

## Protected architecture

- Finance Schema 12 remains local-first.
- Cloud Schema V3 isolates records by authenticated profile membership and RLS.
- Browser clients write through authenticated security-definer RPCs rather than direct table mutation.
- Cloud payloads and restore points must contain AES-256-GCM ciphertext envelopes.
- Payment operation IDs remain idempotent within each profile.
- Viewer roles are read-only in both the interface and database functions.
- Supabase secret and `service_role` keys are prohibited from all client files.

## Encryption model

The profile passphrase is processed in the browser with PBKDF2-SHA-256. The resulting AES-256-GCM key is kept in memory for the unlocked session. The passphrase and key are not uploaded.

Encryption covers cloud payloads and encrypted backup/restore files. It does not cover the active localStorage working copy, collection/record IDs, revisions, timestamps, membership, or device metadata.

## User responsibilities

- Store the profile passphrase in a secure external location.
- Keep the passphrase separate from encrypted backup files.
- Test backup decryption before deleting or replacing devices.
- Use HTTPS and only a publishable/anon Supabase key.
- Review Supabase Security Advisor, authentication rate limits, redirect URLs, and MFA recovery.
- Share household passphrases separately from invitation codes.

## Reporting a vulnerability

Do not include real finance records, passwords, keys, passphrases, backup files, or screenshots containing sensitive values in a public issue. Describe reproduction steps with sample data and identify the affected release.
