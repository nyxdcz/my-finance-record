# My Finance Records V12.18.1 — UX Reliability Validation

Validation date: August 5, 2026  
Authoritative baseline: V12.18.0 Compact Consistent UI  
Corrected release: V12.18.1 UX Reliability  
Schema: 12

## Issues corrected

1. **Cross-page monthly calculation mismatch**
   - Dashboard, cash-flow charts, monthly comparisons, and live Monthly Reports now use the full included monthly expense amount.
   - Budget & Expenses continues to use the current outstanding amount, including the remaining-day Daily Reserved Budget countdown.
   - Existing finalized report snapshots are not silently rewritten.

2. **Money and Projects workspace keyboard access**
   - Arrow Left, Arrow Right, Home, and End now switch and focus tabs.
   - Mouse, touch, Enter, Space, browser history, and active-route behavior remain intact.

3. **Incorrect Dashboard KPI help mappings**
   - Available Money, Monthly Income, Total Savings, Monthly Expenses, and Money Remaining now use stable IDs and open the matching explanation.

4. **Missing Current Month action**
   - A Current button appears when another month is selected and returns directly to the present month.

5. **Missing Project duplication**
   - Duplicate Project is available inside Edit Project.
   - The copy receives a new ID and Calendar UID and resets status, received amount, payment history, payment date, completion data, and previous Calendar-export state.

6. **Small phone touch targets**
   - Menu, month controls, month input, Dashboard calendar controls, and calendar days now provide at least a 44 × 44-pixel interaction area at phone widths.

7. **Blocking errors announced politely**
   - Blocking errors now use a dedicated assertive `role="alert"` announcer.
   - Success and informational messages remain polite.

8. **Incorrect collapse-control accessible label**
   - Help-button text is excluded when generating collapse-control names.

## Automated validation

Run from the package root with Node.js:

```bash
node tests/validate-v12-18-1.mjs
```

The dependency-free validator checks:

- V12.18.1 agreement in `index.html`, `sw.js`, `version.json`, and README
- Schema version 12
- Existing local-storage, IndexedDB, device, backup, and BroadcastChannel identifiers
- Inline JavaScript and service-worker syntax
- Duplicate HTML IDs
- Monthly versus outstanding expense calculation separation
- Keyboard-operable workspace tablists
- Current Month control
- Stable Dashboard help mappings
- Safe Project duplication defaults
- Assertive error announcements
- Correct collapse-label generation
- Seven compact Monthly Report groups with Summary open by default
- Mobile touch-target safeguards
- Service-worker app-shell paths and cache version
- Unchanged manifest, offline page, and icons through SHA-256 hashes
- Absence of new remote dependencies and common credential patterns

Result:

```text
V12.18.1 UX reliability validation passed.
- Parsed 2 inline scripts and sw.js
- Checked 479 HTML IDs with no duplicates
- Confirmed schema 12 and protected browser-data identifiers
- Confirmed calculation, keyboard, help, Current Month, duplication, accessibility, report, touch-target, cache, and asset safeguards
```

## Browser regression results

A clean-browser Chromium test loaded the corrected app and produced these results:

- Initial route: Dashboard
- Dashboard Monthly Expenses: **₱17,732.00**
- Monthly Report Monthly Expenses: **₱17,732.00**
- Dashboard Money Remaining: **-₱8,467.00**
- Monthly Report Money Remaining: **-₱8,467.00**
- Monthly Report compact groups: **7**
- Summary group open by default: **Passed**
- Current button appears outside the current month: **Passed**
- Current button restores August 2026: **Passed**
- Money workspace Arrow Right, Home, and End navigation: **Passed**
- Settings keyboard navigation: **Passed**
- All five Dashboard KPI help titles: **Passed**
- Invalid backup assertive announcement: **Passed**
- Completed Projects collapse label: **Expand Completed projects**
- Project duplicate form reset state: **Passed**
- No browser console errors: **Passed**
- No page exceptions: **Passed**

### Phone measurements at 390 pixels

| Control | Measured size |
|---|---:|
| Menu | 44 × 44 px |
| Previous month | 44 × 44 px |
| Next month | 44 × 44 px |
| Month input | 110 × 44 px |
| Calendar previous | 44 × 44 px |
| Calendar next | 44 × 44 px |
| Calendar today | 54.1 × 44 px |
| Calendar day | 44 × 44 px |

Page-level horizontal overflow at 390 pixels:

- Dashboard: 0 px
- Budget & Expenses: 0 px
- Projects: 0 px
- Monthly Reports: 0 px
- Settings: 0 px

## Dynamic data and export checks

A separate clean-state workflow verified:

- Project count increased from 4 to 5 after saving a duplicate.
- The duplicate received a new ID and Calendar UID.
- Status reset to Ongoing.
- Amount Received reset to zero.
- Payment history and payment date were empty.
- Calendar was disabled and prior export metadata was empty.
- Completion date was empty.
- Formula fixture: full monthly amount 1,500; current outstanding amount 1,100; report amount 1,500.
- Monthly Report JSON download was created.
- Apple Calendar `.ics` download was created.
- No page errors occurred.

## Preserved files and systems

The following files are byte-for-byte unchanged from V12.18.0:

- `manifest.webmanifest`
- `offline.html`
- All PWA icons

The following systems remain compatible:

- Schema version 12 and existing records
- Accounts, Income, Expenses, Projects, Project Payments, Savings, and reports
- Existing backup and recovery formats
- Archived monthly snapshots
- Dashboard customization and privacy mode
- Salary-work and fixed-salary rules
- Apple Calendar identity and update behavior
- Device registry, local sync history, reminders, and persistent-storage controls
- Light and dark themes
- Local-only architecture with no remote database, analytics, or credentials

## Required final device checks

The browser sandbox used for automated UI testing cannot fully reproduce installed-PWA and operating-system integrations. Before treating those integrations as fully verified, test the extracted package in normal Chrome and Safari for:

- Service-worker registration and update detection
- Offline reload after first successful online load
- Installed-PWA launch
- Browser notification permission and reminder delivery
- Persistent-storage permission
- Native print / Save PDF dialog
- Real file downloads and restoration from an exported backup

These limitations do not affect the completed static, calculation, keyboard, responsive, data-duplication, and export-generation checks above.
