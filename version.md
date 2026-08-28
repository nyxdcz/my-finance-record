# Talaan V2.5.0

**Current production version:** V2.5.0
**Release date:** 2026-08-28
**Release name:** Talaan

Talaan V2.5.0 is the active product baseline. This document describes only the current release.

## Product identity

- **Product name:** Talaan
- **Product version:** `2.5.0`
- **Display version:** `V2.5.0`
- **Release name:** `Talaan`
- **PWA cache:** `finance-v2-20260828-household-splits-r12`
- **Finance Schema:** 12
- **Cloud Schema:** V3

## Manual net worth ledger

- Assets and liabilities are entered manually with dated valuation history.
- Insights shows current assets, liabilities, net worth, stale values, category composition, and value evolution.
- Net worth does not change Available Money, Cash Flow, Accounts, Account Ledger entries, paid state, or project payments.
- Foreign values require a manually entered PHP conversion rate and remain labeled as converted.
- Archive/restore and destructive deletion use recovery snapshots and Undo.
- Data remains under `ledgerSettings.netWorth`, preserving Finance Schema 12 and Cloud Schema V3.

## Household expense splits

- Household groups contain manually named members with one owner representing the active user.
- Expenses can use equal, percentage, or exact PHP shares with deterministic cent rounding.
- Personal expense totals use only the owner's share; Account Ledger payments retain the complete amount actually paid by the owner.
- If another member paid, the expense can be completed without deducting a Talaan account.
- Explicit settlements adjust member balances only and never create income, expenses, paid records, or Account Ledger entries.
- Groups and settlements live under `ledgerSettings.householdSplits`; expense allocation snapshots preserve historical member names and shares.
- Backup conflict handling, encrypted synchronization, recovery snapshots, and Undo preserve Finance Schema 12 and Cloud Schema V3.

## Local statement import center

- CSV, OFX bank/credit-card, and QIF bank/cash/credit-card/asset/liability statements are parsed entirely inside the current browser session.
- OFX 1.x SGML and OFX 2.x XML banking records share one normalized mapping and preview path. FITID is required for a valid OFX transaction.
- QIF opening balances are ignored, bracketed categories become internal transfers, and unsupported investment or split records are rejected or isolated before commit.
- Non-PHP OFX statements are blocked. QIF users must explicitly confirm that the file uses Philippine pesos because QIF has no reliable currency declaration.
- Reusable profiles map dates, signed amounts or debit/credit columns, descriptions, references, categories, payees, and transaction types.
- Preview identifies invalid, ignored, transfer, and duplicate rows before commit and shows reviewed transaction-rule suggestions.
- Commit creates a recovery snapshot and Undo point, then writes all selected records through one finance save.
- A completed batch can be rolled back without changing account balances or Account Ledger entries.

The visible application, PWA metadata, offline experience, installation messaging, calendar export branding, and current documentation use the **Talaan** name.

## Product scope

### Finance

- Dashboard
- Income
- Budget & Expenses
- Paid Expenses
- Accounts
- Account Ledger
- Transfers
- Reconciliation
- Direct account spending
- Monthly budget planning
- Category budgets
- Savings allocation
- Forecasting
- Financial insights
- Reports
- CSV/PDF export

### Budget & Expenses

- Compact desktop expense cards
- First half, Second half, and Other expenses sections
- Independent collapse controls
- Repeat monthly
- Mark paid
- Edit and selection controls
- Compact Monthly budget plan
- PNG mascot summaries
- Phone numeric fallbacks
- Accessible numeric labels

### Projects & productivity

- Projects and Completed Projects
- Project revisions
- Project Agenda
- Dashboard calendar integration
- Horizontal Kanban workflow
- Quick Add
- Templates
- Global Search
- Filters and bulk actions
- Undo/Redo
- Keyboard shortcuts
- Reminders and notifications

### Cloud & security

- Finance Schema 12
- Cloud Schema V3
- Record-level synchronization
- Five-minute routine synchronization
- Immediate manual synchronization
- Realtime incoming changes
- Offline pending queue
- Explicit conflict resolution
- Device management
- Personal and household profiles
- Owner, Editor, and Viewer roles
- AES-256-GCM encrypted cloud records
- PBKDF2-SHA-256 key derivation
- Encrypted backups
- MFA support
- Device app lock
- Signed-out privacy lock

### User interface

- Talaan application and PWA branding
- Responsive desktop, tablet, and phone layouts
- Desktop navigation rail
- Mobile navigation drawer
- Accessible menus and dialogs
- Progress indicators
- Toast notifications
- Chips, badges, pills, and tags
- Reduced-motion support
- Visible keyboard focus
- Automatic appearance scheduling for Asia/Manila
- PNG mascot system

### PWA & deployment

- Offline support
- Version-aware service worker
- Cache cleanup and repair
- Stable compatibility-sensitive runtime URLs
- GitHub Actions quality validation
- Browser regression testing
- Privacy and accessibility validation
- GitHub Pages deployment

## Compatibility contract

Talaan V2.0.1 preserves the current finance-data and synchronization contracts:

- **Finance Schema:** 12
- **Cloud Schema:** V3
- Existing finance records
- Account and ledger history
- Budgets
- Projects and revisions
- Payment state
- Recurrence behavior
- Encryption model
- Backup/restore compatibility
- Cloud conflict semantics
- Five-minute routine synchronization

Compatibility-sensitive storage keys, identifiers, filenames, URLs, and calendar UID domains may remain stable when renaming them would create unnecessary data, PWA, or installed-client risk. These internal compatibility identifiers do not change the visible **Talaan** product name.
