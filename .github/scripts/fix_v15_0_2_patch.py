from pathlib import Path

path = Path('.github/scripts/v15_0_2_patch.py')
text = path.read_text()
old = r'assert.doesNotMatch(v1502CashFlowCss, /\[data-dashboard-card="cash-flow"\]\[data-size="wide"\]\s*\{[^}]*\b(?:height|min-height|max-height)\s*:/, "V15.0.2 must not change the cash-flow bento height");'
new = r'assert.doesNotMatch(v1502CashFlowCss, /\[data-dashboard-card="cash-flow"\]\[data-size="wide"\]\s*\{[^}]*\\b(?:height|min-height|max-height)\s*:/, "V15.0.2 must not change the cash-flow bento height");'
if text.count(old) != 1:
    raise SystemExit(f'expected one JS bento-height assertion, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
