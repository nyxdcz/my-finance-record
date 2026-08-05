# My Finance Records V12.18.3 — Bento Resize Validation

> Historical baseline: V12.18.4 changes only the cards-per-row grid geometry. The pointer, keyboard, persistence, mobile-order, and cleanliness checks below remain applicable.

## Automated validation completed

- `node tests/validate-v12-18-3.mjs` passed.
- Version agreement passed for `index.html`, `sw.js`, `version.json`, and README.
- Schema version remains 12.
- Protected local-storage, IndexedDB, device, backup, and sync identifiers remain unchanged.
- Both inline scripts and the service worker passed JavaScript syntax checks.
- 484 HTML IDs were checked with no duplicates.
- Protected manifest, offline page, and icon hashes remain unchanged.
- No remote scripts, fonts, APIs, credentials, or analytics were introduced.
- No temporary extracted JavaScript is included in the package.

## Browser interaction validation completed

The application was loaded in headless Chromium with an in-memory local-storage test adapter because this managed environment blocks direct local-file and local-server navigation.

Passed checks:

- Customize Dashboard opens the settings dialog and persistent customization toolbar.
- Preview on Dashboard closes the modal while keeping card handles usable.
- Click-to-cycle resizing works.
- Pointer dragging previews and snaps to an approved card size.
- Resized values save to the existing Dashboard preferences object.
- Saved sizes restore through the production preference reader.
- Savings Trend, Income versus Expenses, and Monthly Calendar remain limited to Large or Wide.
- Keyboard End changes a chart card to Wide.
- Done exits customization and hides the toolbar.
- Leaving Dashboard exits customization safely.
- Income displays five compact summary cards on desktop and one column on phones.
- Paid Expenses displays four compact summary cards on desktop and one column on phones.
- Default mobile Dashboard order is Due-soon, Expense Schedule, Monthly Calendar, Savings Trend, Savings Goals, Income versus Expenses, Payment Progress, Accounts, Projects, and Activity.
- Edge drag controls remain hidden on phones.
- No page-level horizontal overflow was found on tested desktop or 390px phone layouts.
- No page errors or unhandled promise rejections occurred during the tested flows.

## Visual review completed

Desktop screenshots were inspected for:

- Dashboard three-small/two-large bento behavior
- Compact Income summaries
- Compact Paid Expenses summaries
- Card alignment, spacing, readable values, and no visible overlap

## Remaining device checks

The following operating-system integrations still require testing in normal Chrome or Safari after extraction:

- Service-worker registration and update replacement
- Installed-PWA launch
- True offline reload
- Browser notification permission
- Persistent-storage permission
- Native print and download dialogs

These integrations were not claimed as browser-tested in the managed environment.
