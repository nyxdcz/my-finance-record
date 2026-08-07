# V13.0.16 Password Recovery Redirect Validation

Date: 2026-08-07

## Scope

V13.0.16 fixes the Supabase password-reset redirect failure observed when a reset email returned to the Finance app with `#error=access_denied` / expired-token details and the app silently opened the normal Dashboard.

## Changes verified

- Password-reset requests use the dedicated hosted route `?auth=recovery`.
- Supabase recovery failures parse `error`, `error_code`, and `error_description` from the URL fragment.
- Expired, invalid, reused, and access-denied links map to a plain-language recovery message.
- Recovery URLs are cleaned after their error/token fragment is processed.
- Recovery mode routes the user to Settings → Sync & Backup instead of leaving the normal Dashboard as the only visible result.
- The recovery help card provides **Send new reset email**, **Verify recovery code**, and **Back to sign in**.
- Recovery-code verification uses `verifyOtp({ email, token, type: "recovery" })`.
- A verified recovery code opens the existing **Choose a new password** flow.
- A valid Supabase `PASSWORD_RECOVERY` event continues to open the new-password flow.
- Local finance records, Finance Schema 12, Cloud Schema V3, ledger history, profiles, and encryption logic are unchanged.

## Tests actually run

### Repository / regression

- `npm ci --ignore-scripts --no-audit --no-fund` — passed.
- `npm run inspect` — passed with **0 errors and 0 warnings**.
- `npm run quality` (`tests/validate-v13-0-16.mjs`) — passed.
- JavaScript syntax checks for `cloud-sync.js` and `sw.js` — passed.
- JSON parsing for `package.json` and `version.json` — passed.

The V13.0.16 regression test includes mocked Supabase checks for:

- dedicated reset redirect URL;
- `access_denied` / `otp_expired` URL parsing;
- plain-language expired-link mapping;
- password-reset resend request;
- recovery OTP verification with `type: "recovery"`;
- existing new-password completion through `updateUser()`;
- all prior Finance Schema 12, encrypted Cloud Sync V3, profile, ledger, and rollback safeguards.

### Responsive recovery UI

Headless Chromium was used with the actual V13.0.16 HTML/CSS loaded through `page.set_content` because direct `file://`, localhost, and intercepted test-host navigation are blocked by this execution environment.

Results at 393px width:

- horizontal overflow: **0px**;
- Send new reset email: **44px** high;
- Verify recovery code: **44px** high;
- Back to sign in: **44px** high.

Screenshots were captured for 393px phone and 1440px desktop recovery-help layouts.

## Environment limitation

A full browser navigation through a real Supabase recovery link could not be executed here. Chromium navigation to local/test origins is blocked by the environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore this report does **not** claim that a real Supabase recovery email, production redirect allowlist, Gmail link handling, or live Brave recovery click was tested.

The final production test must be performed on the user's Mac against the hosted GitHub Pages app and real Supabase project.

## Required Supabase configuration

In Supabase → Authentication → URL Configuration:

- Site URL: `https://nyxdcz.github.io/my-finance-record/`
- Redirect URL: `https://nyxdcz.github.io/my-finance-record/index.html?auth=recovery`

For the optional recovery-code fallback, the Supabase Recovery email template must expose `{{ .Token }}` while retaining the normal recovery link.
