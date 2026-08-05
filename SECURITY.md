# Security Policy

## Supported version

Security fixes are applied to the latest release on `main`. The current supported release is V12.21.0.

## Report a vulnerability

Do not publish passwords, database credentials, private finance exports, recovery bundles, or screenshots containing personal financial information in a public issue.

Contact the repository owner privately through the contact method shown on the GitHub profile. Include the affected version, reproduction steps using sample data, impact, and a proposed correction when available.

## Credential rules

Browser files may contain only a Supabase publishable key or legacy `anon` key. Never commit:

- Supabase `sb_secret_` or `service_role` keys
- Database passwords
- Personal access tokens
- Private recovery bundles
- Credential-bearing `.env` files

A publishable key does not replace authentication or Row Level Security.

## Cloud Schema V2 controls

- RLS is enabled and forced on profiles, records, batches, and audit rows.
- Anonymous access is revoked.
- Authenticated browser clients have read-only table grants for their own V2 rows.
- Record writes occur only through authenticated RPC functions.
- Every commit verifies the user, device status, expected revision, and minimum writer version.
- Related financial records commit in one database transaction.
- Audit events are immutable to browser users.
- Revoked devices are rejected by V2 registration and commit functions.

## Financial-data boundaries

The app does not request bank-login credentials and does not directly connect to a bank. Finance records are stored locally and, when enabled, in the user’s configured Supabase project.

## Before a security-sensitive release

1. Export a recovery backup.
2. Run `npm run quality`.
3. Review the Supabase Security Advisor.
4. Verify V1 and V2 RLS smoke-test guidance.
5. Confirm payment, restoration, transfer, and reconciliation operations remain atomic and idempotent.
6. Confirm no secret credentials appear in the repository or deployed artifact.
