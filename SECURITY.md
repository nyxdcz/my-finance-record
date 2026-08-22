# Security Policy · V2.0.0

My Finance Records is currently organized around **V2.0.0 — Organized Complete**. Security changes must preserve the local-first finance model, Finance Schema 12, Cloud Schema V3, encrypted synchronization, recovery paths, and installed-PWA compatibility unless a reviewed migration explicitly changes one of those contracts.

## Current security baseline

- **Current product release:** V2.0.0.
- **Finance Schema:** 12.
- **Cloud Schema:** V3.
- **Encryption:** client-side AES-256-GCM for encrypted cloud payloads and encrypted backup/restore files.
- **Key derivation:** PBKDF2-SHA-256 from the profile passphrase.
- **Cloud access:** authenticated profile membership plus Row Level Security and approved RPC paths.
- **Browser credentials:** publishable/anonymous Supabase credentials only; privileged secrets are prohibited from client files.

All security fixes and releases continue forward from the current V2.0.0 baseline using semantic versioning.

## Protected architecture

- Finance Schema 12 remains local-first.
- Cloud Schema V3 isolates records by authenticated profile membership and RLS.
- Browser clients write through authenticated security-definer RPCs rather than direct table mutation where the current cloud architecture requires those RPCs.
- Cloud payloads and restore points must contain AES-256-GCM ciphertext envelopes.
- Payment operation IDs remain idempotent within each profile.
- Viewer roles are read-only in both the interface and database functions.
- Supabase secret and `service_role` keys are prohibited from all client files, generated PWA assets, examples, logs, and committed configuration.
- Security fixes must not silently discard local pending changes, encrypted recovery data, payment history, ledger history, or conflict state.

## Encryption model

The profile passphrase is processed in the browser with PBKDF2-SHA-256. The resulting AES-256-GCM key is kept in memory for the unlocked session. The passphrase and derived encryption key are not uploaded as part of the application’s encrypted-sync model.

Encryption covers encrypted cloud payloads and encrypted backup/restore files. It does **not** cover the active localStorage working copy, collection/record IDs, revisions, timestamps, membership, or device metadata.

Changes to encryption format, key derivation, encrypted backups, restore behavior, profile membership, or cloud-record envelopes require compatibility tests and a recovery-safe migration plan before release.

## Data and recovery safety

Security work must preserve the same safety requirements as finance work:

- Never silently rewrite paid status, ledger deductions, account balances, recurring-series identity, or payment-operation identity.
- Preserve unknown fields when reading or migrating records unless an explicit migration documents their removal.
- Keep offline/local records usable when cloud services are unavailable.
- Preserve backup and restore paths when tightening access controls.
- Keep conflict review available when the same cloud record changed on multiple devices.
- Treat service-worker and cache changes as security-sensitive when they affect delivery of privacy, authentication, encryption, or sync code.

## User responsibilities

- Store the profile passphrase in a secure external location.
- Keep the passphrase separate from encrypted backup files.
- Test backup decryption before deleting or replacing devices.
- Use HTTPS and only a publishable/anonymous Supabase key in browser-delivered configuration.
- Review Supabase Security Advisor, authentication rate limits, redirect URLs, RLS policies, and MFA recovery settings.
- Share household passphrases separately from invitation codes.
- Keep browsers and devices updated when they hold an unlocked local finance workspace.

## Reporting a vulnerability

Do not include real finance records, passwords, keys, passphrases, backup files, authentication tokens, or screenshots containing sensitive values in a public issue.

When reporting a security problem, provide only the minimum reproducible information needed, using sample data where possible. Include the affected app version (currently **V2.0.0**), the affected area, reproduction steps, expected behavior, actual behavior, and whether the issue involves local storage, cloud sync, authentication, encryption, backups, payments, or the service worker.

If sensitive information is required to demonstrate the issue, use the repository’s private security-reporting mechanism rather than posting the secret or private record publicly.

## Security-related contribution requirements

Security-sensitive pull requests should include focused regression coverage and must pass the repository’s **Regression quality** and **Browser privacy and accessibility** checks before merge. Changes affecting Finance Schema 12, Cloud Schema V3, encryption, authentication, RLS/RPC behavior, payments, recovery, or stored finance data also require an explicit migration/recovery review.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution and release process, [`PRIVACY.md`](PRIVACY.md) for privacy boundaries, and [`CHANGELOG.md`](CHANGELOG.md) for the current V2.0.0 release notes.
