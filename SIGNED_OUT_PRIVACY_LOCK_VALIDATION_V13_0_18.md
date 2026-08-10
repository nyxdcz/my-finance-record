# V13.0.18 Signed-Out Privacy Lock Validation

## Scope
- Signed-out and authentication-pending startup privacy.
- Zero-only finance placeholders on Dashboard, Budget & Expenses, Income, Paid Expenses, Projects, Project Payments, and Reports.
- Top-bar Sign in replacement for Cloud Sync while signed out.
- Finance-action blocking and sensitive-dialog closure on sign-out.
- Authentication, password recovery, cloud setup, basic app controls, and backup restore availability while locked.
- Service-worker finance-notification suppression while signed out.
- Preservation of local/profile data; no deletion or reset on sign-out.

## Automated source and regression validation
- `npm run inspect`: **0 errors, 0 warnings**.
- `npm run quality`: **passed** for V13.0.18.
- Finance Schema 12, Cloud Schema V3, profile/encryption, ledger, rollback, and credential safeguards remain covered by the cumulative regression suite.

## Chromium privacy-state audit
The real `privacy-lock.js` was executed against the real V13.0.18 markup/CSS in headless Chromium at:
- 1440 × 900
- 1024 × 768
- 393 × 852
- 360 × 800

For every tested viewport:
- Startup begins `finance-signed-out finance-auth-pending` and the underlying finance page is already `display:none` before auth resolves.
- Resolved signed-out mode shows the zero-only privacy view with `₱0.00` totals and `0` projects.
- The underlying finance page remains hidden.
- The top-bar **Sign in** action is visible while Cloud Sync and contextual Add are hidden.
- A synthetic finance mutation button was blocked before its handler ran and returned the message `Sign in to use finance records.`
- Simulated authenticated state removed the privacy lock and restored the normal page.
- Re-locking closed an open Edit Account dialog immediately.

Browser audit artifact: `audit_v13_0_18/privacy-lock-audit.json`.

## Storage preservation
`privacy-lock.js` contains no `localStorage.setItem`, `localStorage.removeItem`, or `localStorage.clear` operation. The privacy layer changes visibility and interaction state only; it does not replace or delete stored finance data.

## Notification privacy
The service worker defaults to `signed-out` and rejects finance notification delivery unless the active app has sent a `FINANCE_AUTH_STATE` message with `authenticated: true`. A worker restart therefore fails closed and may suppress a background finance alert until the authenticated app is opened again.

## Test limitations
- The browser audit runs in Chromium in the available Linux environment, not native iOS WebKit/Brave/Safari.
- A live Supabase account/session was not used in this environment. Cloud-auth integration is source/regression validated; the user’s real device remains the final live sign-in/sign-out verification.
