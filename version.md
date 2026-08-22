# V2.0.0 — Organized Complete

**Current production version:** V2.0.0  
**Release date:** 2026-08-22  
**Release name:** Organized Complete

V2.0.0 is the active product baseline for My Finance Records. This document describes only the current release.

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
- Final PNG mascot system

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

V2.0.0 preserves the current finance-data and synchronization contracts:

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

Compatibility-sensitive filenames and URLs may remain stable when renaming them would create unnecessary PWA or installed-client risk. Their names do not change the current product version.

## Release identity

- **Product version:** `2.0.0`
- **Display version:** `V2.0.0`
- **Release name:** `Organized Complete`
- **PWA cache:** `finance-v2-20260822-organized-complete-r1`

All future product updates continue forward from the current V2 release line using semantic versioning.
