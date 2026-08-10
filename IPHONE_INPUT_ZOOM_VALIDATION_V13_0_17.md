# V13.0.17 iPhone Input Zoom Prevention Validation

Date: 2026-08-07

## Scope

V13.0.17 prevents the unwanted iPhone/WebKit focus zoom caused when editable controls render below 16px. The change is intentionally limited to phone widths and does not disable user zoom.

## Implementation

- Added one late mobile override at `max-width:700px`.
- Editable `input`, `select`, `textarea`, `contenteditable`, date/month/time, number, numeric-inputmode, amount/calculator, password, search, and dynamically created controls use a minimum rendered text size of 16px.
- Checkbox, radio, range, and color controls are excluded from the text-size rule.
- Labels, helper copy, badges, tables, buttons, and normal interface text remain on the existing compact typography system.
- The viewport remains `width=device-width, initial-scale=1.0`; no `user-scalable=no` or `maximum-scale=1` lock was introduced.

## Automated project validation

- `npm ci --ignore-scripts --no-audit --no-fund` — passed.
- `npm run inspect` — passed with 0 errors and 0 warnings after restoring normal repository permissions.
- `npm run quality` — passed.
- V13.0.17 regression validation preserved Finance Schema 12, Cloud Schema V3, ledger, profile/encryption, password recovery, rollback, and credential safeguards.

## Browser CSS audit

The browser sandbox blocks `file://` and localhost navigation, so the audit loaded the real inline V13.0.17 CSS/HTML into headless Chromium with application scripts suppressed. It measured every static editable form control and representative dynamically-created controls.

| Viewport | Editable controls checked | Minimum computed font | Controls below 16px | Horizontal overflow |
| --- | ---: | ---: | ---: | ---: |
| 393 × 852 | 115 | 16px | 0 | 0px |
| 360 × 800 | 115 | 16px | 0 | 0px |
| 1024 × 768 | 115 | 12.16px | desktop/tablet compact typography preserved | 0px |

Representative runtime-created controls checked at phone widths:
- text input — 16px
- decimal/amount input — 16px
- date input — 16px
- password input — 16px
- select — 16px
- textarea — 16px
- contenteditable — 16px

## Limitation / real-device verification

Chromium does not reproduce iOS Safari/Brave's automatic form-focus zoom behavior, and no native iPhone/WebKit device is available in this environment. Therefore the actual iOS zoom gesture was **not** claimed as directly tested. The browser audit verifies the documented CSS precondition that avoids iPhone focus zoom: editable form text is at least 16px at phone widths.

Final production check on iPhone:
1. Open the hosted/PWA app.
2. Tap Amount, Search, Password, Date, Select, Notes, and other form fields.
3. Type and move between fields.
4. Confirm the viewport stays at the same scale.
5. Confirm manual pinch zoom still works.

## Preserved behavior

No finance calculations, records, balances, projects, cloud sync, password recovery, ledger history, schema, or desktop/iPad workflow was changed.
