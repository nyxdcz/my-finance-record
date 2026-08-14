from pathlib import Path

path = Path('.github/scripts/v15_0_2_patch.py')
text = path.read_text()

old = r'assert.doesNotMatch(v1502CashFlowCss, /\[data-dashboard-card="cash-flow"\]\[data-size="wide"\]\s*\{[^}]*\b(?:height|min-height|max-height)\s*:/, "V15.0.2 must not change the cash-flow bento height");'
new = r'assert.doesNotMatch(v1502CashFlowCss, /\[data-dashboard-card="cash-flow"\]\[data-size="wide"\]\s*\{[^}]*\\b(?:height|min-height|max-height)\s*:/, "V15.0.2 must not change the cash-flow bento height");'
if text.count(old) != 1:
    raise SystemExit(f'expected one JS bento-height assertion, found {text.count(old)}')
text = text.replace(old, new, 1)

old_sidebar = 'validator = validator.replace("V15.0.2 · expanded sidebar Records header cleanup", "V15.0.1 · expanded sidebar Records header cleanup")'
new_sidebar = 'validator = validator.replace(r"V15\\.0\\.2 · expanded sidebar Records header cleanup", r"V15\\.0\\.1 · expanded sidebar Records header cleanup")'
if text.count(old_sidebar) != 1:
    raise SystemExit(f'expected one sidebar release-label fix, found {text.count(old_sidebar)}')
text = text.replace(old_sidebar, new_sidebar, 1)

path.write_text(text)
