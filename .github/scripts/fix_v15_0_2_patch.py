from pathlib import Path

path = Path('.github/scripts/v15_0_2_patch.py')
text = path.read_text()
old = r'[^}]*\b(?:height|min-height|max-height)'
new = r'[^}]*\\b(?:height|min-height|max-height)'
if text.count(old) != 1:
    raise SystemExit(f'expected one bento-height regex marker, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
