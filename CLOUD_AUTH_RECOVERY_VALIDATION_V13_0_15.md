# V13.0.15 Cloud Sign-in Recovery & Diagnostics Validation

## Scope
- Sync & Backup sign-in form and cloud authentication UX.
- Password-reset request and recovery-completion UI.
- User-facing auth error mapping and local-first failure behavior.
- Cloud project/network reachability diagnostics.
- Desktop and iPhone responsive sign-in layout.

## Implemented
- Added `Forgot password?` using Supabase `resetPasswordForEmail`.
- Added an in-app new-password form shown for the Supabase `PASSWORD_RECOVERY` auth event and saved with `updateUser({ password })`.
- Added Show/Hide password controls for sign-in and recovery fields.
- Added busy/disabled states for sign in, account creation, reset email, connection test, and password update.
- Mapped common Supabase errors to plain-language guidance, including invalid credentials and unconfirmed email.
- Added `Test cloud connection`, which checks the configured Supabase Auth health endpoint independently of login credentials.
- Preserved local finance records and local-first operation after sign-in failure.
- Password-reset request confirmation intentionally says “If a cloud account exists…” so the UI does not disclose whether an email is registered.

## Tests actually performed
- `npm run inspect`: passed with 0 errors and 0 warnings.
- `npm run quality`: passed.
- JavaScript syntax checks: passed through the regression suite.
- Unit/VM checks verified:
  - `Invalid login credentials` maps to `Wrong email or password`.
  - `Email not confirmed` maps to plain-language confirmation guidance.
  - Password-recovery redirect strips query/hash and returns the HTTPS app URL.
  - The reset request calls `resetPasswordForEmail` with the configured email and redirect URL.
  - Password recovery completion calls `updateUser({ password })`.
- Headless Chromium interaction test with mocked Supabase Auth responses verified:
  - Show/Hide password toggles the actual input type.
  - Invalid login shows friendly guidance and explicitly states local finance records remain available.
  - Sign-in button returns to an enabled state after failure.
  - Cloud connection diagnostic reports Connected when the mocked Auth health endpoint responds successfully.
  - Non-HTTPS/local-context password-reset attempts show clear hosted-HTTPS guidance instead of silently failing.
  - `PASSWORD_RECOVERY` opens the new-password UI.
  - Password mismatch is rejected inline.
  - A matching password calls the update-user path and closes the recovery card.
  - 393×852 phone layout has 0 px horizontal overflow and a 44 px Show/Hide control.
  - No browser page errors were observed in this interaction test.

## Test boundaries
- Supabase responses in the browser test were mocked. No real password-reset email was sent.
- The real Supabase project, mailbox delivery, and the user’s actual credentials were not accessed or tested in this environment.
- Browser navigation to localhost/HTTPS test hosts is restricted in this environment, so the browser test used an inlined build for UI interaction; secure HTTPS redirect construction was verified separately in the VM/unit test.
- A final real-device password-reset email, recovery-link redirect, and login should be verified by the user on the hosted HTTPS PWA.
