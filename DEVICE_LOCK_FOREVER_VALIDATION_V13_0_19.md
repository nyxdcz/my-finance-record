# V13.0.19 Forever Device Auto-Lock Validation

## Automated validation

- `npm run inspect` checks the repository file set, local paths, metadata, permissions, and configuration.
- `npm run quality` executes `tests/validate-v13-0-19.mjs`.
- The V13.0.19 validation loads the real `security-profiles.js` in a Node VM and verifies that `forever` normalizes to the explicit non-timed value, is recognized as Forever, and that timed values retain their existing behavior.

## Behavior covered

- The Protect this device / Device app lock selector includes **Forever**.
- Forever does not create an inactivity-lock timer.
- Existing 5-, 15-, 30-, and 60-minute choices continue to use timed locking.
- V13.0.19 appears first in the offline in-app Version history.
