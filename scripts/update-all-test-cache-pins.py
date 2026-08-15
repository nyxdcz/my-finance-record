from pathlib import Path

root = Path(__file__).resolve().parents[1]
tests = root / "tests"
old = "finance-v15-20260815-month-nav-borderless-r23"
new = "finance-v15-20260815-finance-marquee-r24"
changed = []

for path in sorted(tests.rglob("*")):
    if not path.is_file():
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    count = text.count(old)
    if count:
        path.write_text(text.replace(old, new), encoding="utf-8")
        changed.append((path.relative_to(root).as_posix(), count))

remaining = []
for path in sorted(tests.rglob("*")):
    if not path.is_file():
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    if old in text:
        remaining.append(path.relative_to(root).as_posix())

if remaining:
    raise RuntimeError(f"old cache pin remains in: {remaining}")
if not changed:
    raise RuntimeError("expected at least one remaining stale test cache pin")
print("Updated stale cache pins:")
for name, count in changed:
    print(f"- {name}: {count}")
