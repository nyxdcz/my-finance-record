# V13.0.4 Settings & Top Bar UI Validation

## Approved scope
- Align Household Sharing fields and actions; keep the accept action disabled until the invitation code and passphrase are valid.
- Reduce Account Ledger typography and row density without changing ledger data or calculations.
- Equalize Savings and Work & Calendar controls in the same row; stack them cleanly on phones.
- Replace ambiguous/stuck cloud-toolbar status with explicit states: Synced, Syncing…, Offline, Needs sync, and Sync issue, while retaining setup states for Cloud off and Sign in.
- Add a compact sync-status popover with last-sync information, Sync now, and a shortcut to Sync & Backup.
- Use a responsive month display: `YYYY-MM` on phones and full month/year on iPad/Mac-sized screens; clicking it opens a direct month picker.
- Compact the month/top-bar spacing while preserving previous, next, Current month, Quick Add, and More controls.
- Align Add Expense fields and make adjacent controls use consistent heights, baselines, and proportional widths.
- Make Quick Add visibly compact with six SVG-interface actions: 3×2 on larger screens and 2×3 on phones.
- Prevent stale V13 PWA assets by cleaning old V12/V13 finance caches and reading only the current service-worker caches.

## Protected behavior
No Finance Schema 12 formula, Cloud Schema V3 record format, encryption/profile behavior, household-sharing data flow, recurring-expense logic, Gym month-end payment behavior, account deduction, backup, or stored finance record format is changed.

## Automated repository validation
- `npm run inspect`: passed with 0 errors and 0 warnings.
- `npm run quality`: passed V13.0.4 validation.
- Static and injected HTML IDs: 596 + 216 checked with no duplicates.
- Node syntax checks passed for `cloud-sync.js`, `security-profiles.js`, `sw.js`, and `tests/validate-v13-0-4.mjs`.
- `git diff --no-index --check` reported no whitespace-error output for the V13.0.3 → V13.0.4 source changes.
- Protected manifest, offline page, app icons, Finance Schema 12 assets, and Cloud Schema V2 rollback files remain byte-identical to the protected baseline.

## Browser layout validation
Headless Chromium was tested with the project CSS/JS assets inlined into the page because this execution environment blocks direct `file://` and localhost navigation. Browser storage was mocked for layout/runtime verification; live service-worker activation and a real Supabase session were not claimed as browser-tested here.

| Viewport | Month display | Quick Add | Form/control check | Horizontal overflow |
| --- | --- | --- | --- | --- |
| 1440×900 | February 2027 | 3×2, 50px cards | Expense 38px; Savings 40px; ledger text 11.52px | 0px |
| 1280×800 | February 2027 | desktop layout retained | responsive top bar | 0px |
| 1024×768 | February 2027 | larger-screen layout retained | iPad month format verified | 0px |
| 393×852 | 2027-02 | 2×3, 56px cards | Expense controls 44px | 0px |
| 360×800 | 2027-02 | phone layout retained | Expense controls 44px | 0px |

Additional interactive browser checks passed:
- Month picker opens with all 12 months and updates the displayed month.
- Cloud status popover opens and exposes status/detail/last-sync controls.
- Quick Add contains six SVG interface icons and hides long action descriptions in the compact layout.
- Add Expense type/name/icon, amount/totals, period/date, and due-day/category pairs align as approved.
- Savings controls use equal heights.
- Work & Calendar fields use equal heights and equal two-column widths on desktop.
- Household Sharing accept action starts disabled and becomes enabled only after a valid `MFR3-` invitation code and a passphrase of at least 10 characters are entered.

## PWA cache/version fix
V13.0.3 could leave older V13 assets visible because service-worker activation removed only `finance-v12-*` caches and the old cache-first path could search every cache. V13.0.4 now:
- removes old `finance-v12-*` and `finance-v13-*` caches except the current shell/runtime caches;
- reads cache-first assets only from the current V13.0.4 shell/runtime caches;
- registers the service worker with `updateViaCache: "none"`;
- fetches remote version metadata with `cache: "no-store"`;
- updates the visible build/version metadata to V13.0.4 without clearing stored finance records.

## Result
V13.0.4 passed the available repository, regression, syntax, and responsive-browser checks. The release is ready for local Mac verification before any GitHub publish step.
