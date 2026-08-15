from pathlib import Path

root = Path(__file__).resolve().parents[1]
old = "finance-v15-20260815-month-nav-borderless-r23"
new = "finance-v15-20260815-finance-marquee-r24"
files = [
    root / "tests" / "validate-safe-multidevice-sync.mjs",
    root / "tests" / "validate-expense-screenshot.mjs",
]

for path in files:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path.name}: expected exactly one old cache pin, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

print("Updated exactly two remaining r24 test pins.")
