# Talaan V2.0.1

**Current production version:** V2.0.1  
**Release date:** 2026-08-22  
**Release name:** Talaan

Talaan V2.0.1 is the active product baseline. This document describes only the current release.

## Product identity

- **Product name:** Talaan
- **Product version:** `2.0.1`
- **Display version:** `V2.0.1`
- **Release name:** `Talaan`
- **PWA cache:** `finance-v2-20260822-talaan-r2`
- **Finance Schema:** 12
- **Cloud Schema:** V3

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
