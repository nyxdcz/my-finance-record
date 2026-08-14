from pathlib import Path

path = Path('.github/scripts/v15_0_2_patch.py')
text = path.read_text()
old = "cash_assertions = '''assert.doesNotMatch(index, /View exact cash-flow values/"
new = "cash_assertions = r'''assert.doesNotMatch(index, /View exact cash-flow values/"
if text.count(old) != 1:
    raise SystemExit(f'expected one cash_assertions marker, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
