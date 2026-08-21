# Version History — My Finance Records

This file summarizes every release recorded in the repository from the earliest documented version through the current app version.

> The repository changelog begins at **V12.19.0**. No earlier release entries are documented in `CHANGELOG.md`.

## Current release

- **Version:** V15.2.24
- **Release date:** 2026-08-22
- **Release name:** Compact Expense Status & Collapse
- **Finance Schema:** 12
- **Cloud Schema:** V3
- **Cache:** `finance-v15-20260822-compact-expense-collapse-r60`

### V15.2.24 current maintenance

The app version remains V15.2.24 while the following post-release interface maintenance is delivered under the same schema and Finance cache generation:

- Compact desktop expense cards use the approved typography, spacing, inline due-warning placement, and simplified labels.
- First half, Second half, and Other expenses use 20×20 section collapse controls.
- Expense-card actions keep the 30×30 repeat artwork followed by 74×30 Mark paid and 48×30 Edit controls with 5px gaps.
- Budget summary mascot artwork was replaced with the supplied 256×256 transparent PNG assets and continues to render at 30×30 in the interface.
- Mascot mappings remain red/pink for First half, orange/beige for Second half, blue for Other expenses, and green/red for positive/negative difference states.
- Legacy smile artwork is hidden when the mascot layer owns the visual state.
- Lower period mascots keep a 10px horizontal gap from the 20×20 collapse control and use the current `translateY(-16px)` optical alignment.
- Mascot runtime delivery is cache-busted through `15.2.24-mascot8` so existing PWA/browser clients receive the current alignment rules.
- Finance Schema 12, Cloud Schema V3, calculations, balances, recurrence, payments, storage, and sync behavior remain unchanged.

---

# Chronological release history

## V12 series

| Version | Date | Main updates |
| --- | --- | --- |
| **V12.19.0** | 2026-08-05 | Added optional MacBook/iPhone synchronization through Supabase, including first-sync choices, offline pending changes, connected devices, conflict recovery, deletion tombstones, Realtime updates, and idempotent payment-operation records. |
| **V12.19.1** | 2026-08-06 | Added GitHub Actions quality validation, controlled GitHub Pages deployment, locked Node metadata, repository security/privacy/contribution docs, CODEOWNERS/Dependabot, and stronger Supabase RLS/security checks. |
| **V12.20.0** | 2026-08-06 | Added the append-only Account Ledger, opening-balance migration, ledger-derived balances, transfers, reconciliations, income posting/reversal, ledger search/filter/export, and cloud synchronization of ledger/reconciliation data. |
| **V12.21.0** | 2026-08-06 | Introduced Cloud Schema V2 with record-level queues, incremental pull, Realtime audit notifications, atomic RPC commits, conflict recovery, Sync Health, device revocation, and compatibility safeguards. |
| **V12.22.0** | 2026-08-06 | Added monthly category budgets, Fixed/Flexible and Personal/Project scopes, rollover, templates, savings allocation, month-end forecasting, Dashboard/Report budget summaries, CSV export, and Cloud V2 plan synchronization. |
| **V12.23.0** | 2026-08-06 | Added multi-month/YTD/custom financial insights, account/category filters, cash-flow and spending KPIs, utility/Gym/savings/project analytics, consolidated CSV export, and print-ready PDF output. |
| **V12.24.0** | 2026-08-06 | Added Universal Quick Add, synchronized templates, global search, advanced filters, bulk category changes, payment-account corrections, recent-account suggestions, recent edits, 12-step local undo, shortcuts, and iPhone bottom sheets. |
| **V12.25.0** | 2026-08-06 | Added configurable finance reminders, grouped notification scheduling, alert/status/history controls, service-worker notification handling, periodic/foreground checks, and Cloud V2 synchronization of reminder settings. |

## V13 series

| Version | Date | Main updates |
| --- | --- | --- |
| **V13.0.0** | 2026-08-06 | Added personal/household profiles, Owner/Editor/Viewer roles, Cloud Schema V3 profile-scoped sync, AES-256-GCM encryption, PBKDF2 key derivation, encrypted backups, invitations/member management, app lock, MFA, and experimental passkeys. |
| **V13.0.1** | 2026-08-07 | Rebuilt the iPhone top bar, removed duplicate mobile Add Expense controls, shortened mobile workspace labels, restored two-column summaries, collapsed mobile filters, and refined Settings/Reports tab behavior. |
| **V13.0.2** | 2026-08-07 | Simplified Settings into clearer sections, reduced the visible toolbar, moved secondary tools into More tools, added independent budget-panel collapse controls, and refined Edit Account field alignment. |
| **V13.0.3** | 2026-08-07 | Added repository readiness inspection/install guidance, compacted Quick Add and modal spacing, replaced emoji interface icons with SVGs, and grouped recurring/Gym auto-payment controls into expandable sections. |
| **V13.0.4** | 2026-08-07 | Standardized Settings/Household/Work/Calendar/Ledger typography, added richer sync states, responsive month formatting and a month picker, tightened Add Expense/Quick Add geometry, and fixed V13 cache cleanup. |
| **V13.0.5** | 2026-08-07 | Fixed duplicate Dashboard calendar events by scoping recurring Gym visits correctly and adding stable event source keys with idempotent deduplication. |
| **V13.0.6** | 2026-08-07 | Added numbered project revision cycles, reopen/complete-revision actions, revision history, active revision deadlines, and calendar updates while preserving original project identity and finance values. |
| **V13.0.7** | 2026-08-07 | Added persistent Monthly budget plan expand/collapse with compact KPI mode and tightened budget-plan toolbar, Category plan, Cash-flow forecast, and summary spacing. |
| **V13.0.8** | 2026-08-07 | Removed paid expenses from due/upcoming calendar markers, improved Completed Projects behavior for remaining balances, compacted project actions, and standardized disclosure controls. |
| **V13.0.9** | 2026-08-07 | Reordered phone top-bar actions, rebuilt phone Projects into compact cards, compacted Budget & Expenses summaries, and refreshed dependent totals immediately after account reconciliation. |
| **V13.0.10** | 2026-08-07 | Added direct account spending from Edit Account/Available Money; purchases create Paid Expenses and append-only ledger debits with safe reversal behavior. |
| **V13.0.11** | 2026-08-07 | Rebuilt Record Spending event wiring and single-submit protection, removed mobile Edit Project overflow, compacted project controls, and moved secondary project actions into More actions. |
| **V13.0.12** | 2026-08-07 | Made Spend persist in account cards, added stronger quick-spend verification, compacted phone Available Money/Budget summaries, and versioned first-party JS/CSS assets with safer service-worker activation. |
| **V13.0.13** | 2026-08-07 | Hardened Record Spending transaction integrity with full persistence verification, rollback on failure, disabled inactive fields, durable ledger/reconciliation normalization, and corrected utility classification. |
| **V13.0.14** | 2026-08-07 | Added Brave-aware PWA install detection and in-app Brave installation guidance with clearer Installed/menu/HTTPS-required states. |
| **V13.0.15** | 2026-08-07 | Added Forgot password, reset-email delivery, password-recovery completion UI, Show/Hide password, processing states, cloud connection testing, and privacy-preserving authentication messages. |
| **V13.0.16** | 2026-08-07 | Added dedicated recovery redirects, explicit reset-link error parsing, resend/recovery-code options, URL cleanup, and preserved the valid Supabase password-recovery flow. |
| **V13.0.17** | 2026-08-07 | Prevented iPhone WebKit/PWA auto-zoom by enforcing 16px minimum rendered font size for editable controls while preserving manual zoom and accessibility. |
| **V13.0.18** | 2026-08-07 | Added a signed-out privacy lock before the first finance render, zero-only placeholders, Sign in action, hidden private finance surfaces, and blocked finance-data actions until authentication. |

## V14 series

| Version | Date | Main updates |
| --- | --- | --- |
| **V14.0.0** | 2026-08-07 | Integrated Project Schedule Calendar events with the Dashboard financial calendar, added real-time event projection/listener callbacks, and tightened calendar layouts across desktop/mobile. |
| **V14.0.1** | 2026-08-11 | Restored executable scripts, aligned release metadata, added real ESLint/Playwright/inspection/dependency/release automation, extracted `app.css`, and added safer contribution/release guidance. |
| **V14.0.2** | 2026-08-11 | Centralized app/build version identity, stopped needless ledger timestamp rewrites, removed device-local timestamps from cloud preferences, and added migration/merge handling for timestamp-only conflicts. |
| **V14.0.3** | 2026-08-11 | Replaced the Projects monthly calendar with Project Agenda, retained scheduling/reminders/ICS, and projected agenda events onto the Dashboard calendar using stable identities. |
| **V14.0.4** | 2026-08-11 | Added Dashboard Project Agenda preview/full popup, project completion/reopen controls, local-vs-cloud conflict comparison, explicit conflict choices, and a persistent expandable desktop icon rail. |
| **V14.0.5** | 2026-08-11 | Fixed dark-theme active navigation contrast, removed duplicate desktop hamburger behavior, introduced pin/unpin rail states, renamed navigation groups, and improved hover/tooltip behavior. |
| **V14.0.6** | 2026-08-12 | Reserved layout space for pinned navigation, improved dark-theme contrast, restored signed-out Help/maintenance controls, and hid finance-private Settings surfaces while signed out. |
| **V14.0.7** | 2026-08-12 | Fixed persistence for Use cloud version / Use this device, rebased device choices correctly, improved conflict error messages, and made conflict actions transactional and refresh-safe. |
| **V14.0.8** | 2026-08-12 | Recovered conflict actions when snapshots exist without queue entries, cleared stale conflicts after cloud confirmation, and preserved local sort/deletion intent in recovery. |
| **V14.0.9** | 2026-08-12 | Replaced the long README with a concise product summary and five recent releases, aligned release metadata, and removed external application links. |
| **V14.0.10** | 2026-08-12 | Rebuilt Settings overview as compact status rows, grouped navigation into clearer categories, added Back/Next navigation, More options sections, and separate Danger zones. |
| **V14.0.11** | 2026-08-12 | Added persistent accessible Undo/Redo controls, mobile More-tool history actions, keyboard shortcuts, and Settings topic search with privacy-aware behavior. |
| **V14.0.12** | 2026-08-12 | Made the approved Dashboard card order/widths the default/reset layout, migrated uncustomized layouts, and added smooth compact-navigation expansion after icon selection. |
| **V14.0.13** | 2026-08-12 | Renamed primary destinations to Overview/Finance/Work/Insights and replaced OS theme following with an Asia/Manila automatic day/night schedule while keeping manual Light/Dark choices. |
| **V14.0.14** | 2026-08-12 | Removed duplicated uppercase navigation group headings and tightened the four primary navigation rows while preserving routes and active states. |
| **V14.0.15** | 2026-08-12 | Added the one-week Dashboard marquee, Dashboard card drag-and-drop with keyboard/ARIA support, semantic overflow menus, native progress indicators, truncation utilities, separators, and reduced-motion/accessibility behavior. |
| **V14.0.16** | 2026-08-12 | Published repaired More-menu initialization and navigation icon styling through fresh asset URLs, rotated service-worker caches, repinned assets, and added release validation against stale pins. |
| **V14.0.17** | 2026-08-13 | Fixed expense editing by binding shared overflow-menu helpers so `closeOverflowMenu` is available after rerenders; added live browser regression coverage. |
| **V14.0.18** | 2026-08-13 | Added a Finance/Budget one-week marquee, dismissible filter Chips, numeric Badges, status Pills, category Tags, restored native keyboard focus rings, and accessible names for icon-only removals. |
| **V14.0.19** | 2026-08-13 | Routed all shared Finance persistence into the encrypted queue, added phone resume/foreground/reconnect pulls, Realtime recovery with backoff, and a visible-device polling fallback. |
| **V14.0.20** | 2026-08-13 | Added pre-pull reconciliation against the last cloud baseline to recover divergent local changes safely, preserving revisions and routing genuine same-record changes into conflict review. |
| **V14.0.21** | 2026-08-13 | Moved weekly marquees above Dashboard/Finance strips, changed routine sync to five minutes, made sidebar expansion click-only, used supplied navigation PNGs, removed the Insights icon, and shortened Current month to Current. |
| **V14.0.22** | 2026-08-13 | Matched marquees to the 43px tab-strip height, removed phone marquees, kept desktop sidebar open until pointer leave, stabilized rail geometry, compacted Monthly budget plan, and improved Toast behavior. |
| **V14.0.23** | 2026-08-13 | Hardened conflict persistence for constrained iPhone storage, rebuilt phone Paid Expenses as compact cards, fixed Settings/cloud/device overflow, and improved phone conflict comparison/accessibility. |

## V15 series

| Version | Date | Main updates |
| --- | --- | --- |
| **V15.0.0** | 2026-08-15 | Introduced the adaptive Liquid Glass control layer across navigation/toolbars/menus/modals/toasts with accessible fallbacks while keeping finance content surfaces opaque and preserving schemas/data. |
| **V15.0.1** | 2026-08-15 | Simplified the expanded desktop sidebar header to a larger Records title, preserved route positions/pin behavior, and rotated V15 release/cache pins. |
| **V15.0.2** | 2026-08-15 | Simplified Dashboard cash-flow presentation by removing exact-value/forecast cards and expanding chart plotting areas without changing calculations or neighboring bento geometry. |
| **V15.0.3** | 2026-08-15 | Prevented newer cloud revisions from silently deleting pending local edits, added three-way merging/conflict preservation, fixed Use this device, and added a protected Make this device current cloud copy recovery action. |
| **V15.0.4** | 2026-08-15 | Fixed Record spending rollback caused by a stale `renderDashboardBudgetForecast()` call and protected successfully persisted spending from later interface-refresh errors. |
| **V15.0.5** | 2026-08-15 | Released the PWA delivery repair as a real version update, versioned service-worker registration/cache checks, improved stale-cache cleanup/repair, and constrained repair to the Finance app scope. |
| **V15.1.0** | 2026-08-15 | Delivered Desktop UI Phase 1, rounded compact Finance surfaces, standardized 38px desktop controls, changed the app canvas to black with `#173e76` primary blue, and retinted Liquid Glass UI. |
| **V15.2.0** | 2026-08-16 | Improved desktop UX consistency, validation feedback, month/filter reporting, Productivity dialogs, busy states, Search shortcuts, and simpler Cloud Sync error copy. |
| **V15.2.1** | 2026-08-16 | Added actionable empty/filtered states, Income filter chips, Clear search recovery, standardized Project Agenda validation/deletion, and moved secondary Agenda/Budget actions into accessible More menus. |
| **V15.2.2** | 2026-08-16 | Refined 320–428px phone layouts, sticky navigation, 44px targets, overflow menus, Paid Expenses fallback, mobile filter/empty-state treatments, and responsive regression coverage. |
| **V15.2.3** | 2026-08-17 | Replaced Cloud Sync toolbar artwork with supplied Synced/Syncing/Needs attention/Issue icons and unified icon/text state colors across desktop and phone. |
| **V15.2.4** | 2026-08-18 | Reworked More tools and Appearance controls, revised monthly-save/legend/receipt/completion artwork, flattened the desktop month selector, and strengthened GitHub Pages/PWA delivery and browser regression coverage. |
| **V15.2.5** | 2026-08-18 | Aligned Monthly budget plan, Available money, First half, Second half, and Other expenses disclosure controls to one exact desktop right-side column while preserving 44px mobile targets. |
| **V15.2.6** | 2026-08-19 | Extracted the calculator/numeric form-input subsystem into `assets/js/form-inputs.js` and added it to runtime preparation, Pages packaging, service-worker precache, and regression coverage. |
| **V15.2.7** | 2026-08-19 | Extracted Application Help registry/dialog wiring into `assets/js/ui/application-help.js`, added nested UI runtime mapping, and expanded source/browser validation. |
| **V15.2.8** | 2026-08-19 | Consolidated Dashboard Cash Flow CSS ownership into `desktop-ux-v15-2-0.css`, removed duplicate runtime-injected styling, and added ownership regressions. |
| **V15.2.9** | 2026-08-20 | Versioned sidebar PNG delivery with network-first recovery, restored the native sliders SVG for Quick actions, and moved the Monthly budget disclosure into its own desktop grid column. |
| **V15.2.10** | 2026-08-20 | Embedded canonical navigation PNG artwork directly in sidebar markup, removed obsolete broken-image CSS overrides and runtime retry logic, and simplified service-worker ownership. |
| **V15.2.11** | 2026-08-20 | Extracted stable shell/privacy/navigation/history/Settings/install/iPhone-protection rules from `app.css` into `shell-ui-v15-2-11.css` with focused source/deployment regressions. |
| **V15.2.12** | 2026-08-20 | Single-flighted Supabase/auth initialization, stopped accidental cloud-profile creation when unlock fails, and unified header/Settings/recovery/sync availability behind one cloud-readiness state. |
| **V15.2.13** | 2026-08-20 | Compacted phone Budget shells/expense records, standardized desktop toolbar height/spacing and 56px summary rows, replaced moving summary effects, and added responsive production-audit coverage. |
| **V15.2.14** | 2026-08-20 | Extended the compact 56px Budget summary geometry to 1280px/1366px desktop widths and hid secondary descriptions only when wrapping would break row alignment. |
| **V15.2.15** | 2026-08-20 | Added structured mouse/touch/keyboard drag-and-drop for Project Agenda and Projects with destination states, safe return, screen-reader/reduced-motion handling, and five-second Undo. |
| **V15.2.16** | 2026-08-21 | Stabilized production Finance geometry audits by waiting for rendered summaries/period controls, validating named toolbar controls, and excluding hidden duplicate phone controls from touch-target checks. |
| **V15.2.17** | 2026-08-21 | Made responsive Finance tests wait for service-worker/network settling, restored privacy authentication and Budget workspace activation, and required visible summary/period-card readiness before measurement. |
| **V15.2.18** | 2026-08-21 | Rebuilt Project Agenda and Projects as horizontal Kanban boards with custom named/colored/reorderable columns, mouse/touch/keyboard movement, persistence, invalid-drop return, and Undo. |
| **V15.2.19** | 2026-08-21 | Compacted First/Second/Other expense cards, tightened metadata/actions, restored functional Repeat monthly placement beside Mark paid, and kept phone layouts unchanged. |
| **V15.2.20** | 2026-08-21 | Corrected production desktop expense-card padding/gaps/action sizing and guaranteed the Repeat monthly control remains visible/non-shrinking before Mark paid. |
| **V15.2.21** | 2026-08-21 | Replaced the repeat pseudo-label with real Repeat monthly / Repeats monthly text while preserving recurrence behavior and compact geometry. |
| **V15.2.22** | 2026-08-21 | Isolated the repeat label from legacy icon-only CSS with a dedicated class and strengthened browser measurements for the 82×30 recurrence control. |
| **V15.2.23** | 2026-08-21 | Restored the existing icon-only monthly-repeat artwork and approved footer arrangement: checkbox left; repeat, Mark paid, and Edit grouped right. |
| **V15.2.24** | 2026-08-22 | Compact Expense Status & Collapse: approved desktop typography/spacing, due warnings beside Unpaid, simplified labels, 20×20 section collapse controls, and 30×30 repeat + 74×30 Mark paid + 48×30 Edit footer geometry. Current same-version maintenance also delivers supplied PNG summary mascots, versioned mascot loading, legacy-smile replacement, and the current lower-mascot alignment/cache-bust. |

---

## Version count

This document contains **83 documented releases**, from **V12.19.0** through **V15.2.24**.

For the complete original per-release notes, see `CHANGELOG.md`. The authoritative current runtime identity remains `version.json`.
