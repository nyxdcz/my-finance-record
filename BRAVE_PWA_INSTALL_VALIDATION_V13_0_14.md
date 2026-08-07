# V13.0.14 Brave PWA Install Validation

## Scope
- Brave-specific install detection and fallback guidance.
- Native `beforeinstallprompt` behavior for browsers that provide it.
- Installed, secure-site, and local-file states.
- Existing manifest, service worker, offline cache, and finance behavior preserved.

## Implemented behavior
- Brave + native prompt: **Install app** continues to use the browser-provided prompt.
- Brave without native prompt: **Install with Brave** opens an in-app guide with **Brave menu → Save and Share → Install page as app…**.
- Installed display mode: install status reads **Installed** and the install action is disabled.
- Secure non-Brave browser without a prompt: the existing generic browser-menu guidance remains available.
- Insecure/local-file context: installation explains that HTTPS or localhost is required.

## Tests actually run
- `npm ci --ignore-scripts --no-audit --no-fund` — passed.
- `npm run inspect` — passed with 0 errors and 0 warnings.
- `npm run quality` — passed.
- Browser harness using the actual V13.0.14 install functions in headless Chromium:
  - Brave API emulation with no `beforeinstallprompt` — **Install with Brave** and the four Brave menu steps verified.
  - Native `beforeinstallprompt` stub — native prompt branch called exactly once.
  - Installed/standalone state — status and disabled button verified.

## Browser-test limitation
A native Brave browser binary is not installed in this execution environment. The Brave-specific path was tested in Chromium by exposing the same `navigator.brave.isBrave()` API used by Brave. The final menu wording/location should still be verified in the user's installed Brave version on macOS.

## Safety
The install flow does not modify finance records, profiles, account ledger entries, cloud configuration, or backups.
