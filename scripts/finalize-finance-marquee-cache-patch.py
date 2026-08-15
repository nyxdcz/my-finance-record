from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "15.1.0"
CACHE = "finance-v15-20260815-finance-marquee-r24"
QUERY = "15.1.0-finance-marquee1"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


index = read("index.html")
index = index.replace("V15.1.1", "V15.1.0")
index = index.replace('const APP_VERSION = "15.1.1";', 'const APP_VERSION = "15.1.0";')
index = index.replace('./interaction-patterns.js?v=15.1.1-finance-marquee1', f'./interaction-patterns.js?v={QUERY}')
index = index.replace('./pwa-update-v15-0-5.js?v=15.1.1', './pwa-update-v15-0-5.js?v=15.1.0')
write("index.html", index)

sw = read("sw.js")
sw = sw.replace('const APP_VERSION = "15.1.1";', 'const APP_VERSION = "15.1.0";')
sw = sw.replace('./interaction-patterns.js?v=15.1.1-finance-marquee1', f'./interaction-patterns.js?v={QUERY}')
sw = sw.replace('./pwa-update-v15-0-5.js?v=15.1.1', './pwa-update-v15-0-5.js?v=15.1.0')
write("sw.js", sw)

version_path = ROOT / "version.json"
version = json.loads(version_path.read_text(encoding="utf-8"))
version["version"] = VERSION
version["cacheVersion"] = CACHE
version["name"] = "Black Canvas UI"
version["notes"] = "Black Canvas UI with a source-level Finance marquee alignment delivery refresh: Income and Paid Expenses now use the same tabs-left, weekly-marquee-right row as Budget & Expenses while preserving 43px desktop/tablet geometry, phone marquee hiding, Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."
version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")

for filename in ["package.json", "package-lock.json"]:
    path = ROOT / filename
    data = json.loads(path.read_text(encoding="utf-8"))
    data["version"] = VERSION
    if filename == "package-lock.json" and "" in data.get("packages", {}):
        data["packages"][""]["version"] = VERSION
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

old_test = ROOT / "tests" / "validate-finance-marquee-source-v15-1-1.mjs"
new_test = ROOT / "tests" / "validate-finance-marquee-source-v15-1-0.mjs"
test = old_test.read_text(encoding="utf-8")
test = test.replace('const expectedVersion = "15.1.1";', 'const expectedVersion = "15.1.0";')
test = test.replace('const interactionQuery = "15.1.1-finance-marquee1";', f'const interactionQuery = "{QUERY}";')
new_test.write_text(test, encoding="utf-8")
old_test.unlink()

package_path = ROOT / "package.json"
package_text = package_path.read_text(encoding="utf-8").replace(
    'node tests/validate-finance-marquee-source-v15-1-1.mjs',
    'node tests/validate-finance-marquee-source-v15-1-0.mjs',
)
package_path.write_text(package_text, encoding="utf-8")

release_test_path = ROOT / "tests" / "validate-v15-1-0.mjs"
release_test = release_test_path.read_text(encoding="utf-8")
release_test = release_test.replace('finance-v15-20260815-month-nav-borderless-r23', CACHE)
release_test_path.write_text(release_test, encoding="utf-8")

changelog_path = ROOT / "CHANGELOG.md"
changelog = changelog_path.read_text(encoding="utf-8")
original_heading = "## 15.1.0 · 2026-08-15"
original_index = changelog.find(original_heading)
if original_index < 0:
    raise RuntimeError("Original V15.1.0 changelog heading not found")
if original_index > 0:
    changelog = changelog[original_index:]
changelog_path.write_text(changelog, encoding="utf-8")

print("Finance marquee source fix finalized on V15.1.0 with r24 PWA delivery cache.")
