from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_VERSION = "15.1.1"
NEW_CACHE = "finance-v15-20260815-finance-marquee-r24"
INTERACTION_QUERY = "15.1.1-finance-marquee1"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 occurrence, found {count}")
    return text.replace(old, new, 1)


def wrap_finance_row(html: str, page_id: str, marquee_id: str) -> str:
    marker = f'<section class="page" id="{page_id}"'
    page_start = html.find(marker)
    if page_start < 0:
        raise RuntimeError(f"{page_id}: page not found")
    next_page = html.find('<section class="page', page_start + len(marker))
    page_end = len(html) if next_page < 0 else next_page
    segment = html[page_start:page_end]

    if 'class="finance-workspace-marquee-row no-print"' in segment:
        raise RuntimeError(f"{page_id}: row already exists; refusing to double-wrap")

    marquee_marker = f'          <section class="dashboard-week-marquee finance-week-marquee" id="{marquee_id}"'
    marquee_start = segment.find(marquee_marker)
    if marquee_start < 0:
        raise RuntimeError(f"{page_id}: marquee not found")
    marquee_line_end = segment.find("\n", marquee_start)
    if marquee_line_end < 0:
        raise RuntimeError(f"{page_id}: marquee line end not found")
    marquee_line = segment[marquee_start:marquee_line_end]

    switcher_marker = '          <div class="workspace-switcher money-workspace-switcher no-print" role="tablist" aria-label="Money workspace">'
    switcher_start = segment.find(switcher_marker, marquee_line_end)
    if switcher_start < 0:
        raise RuntimeError(f"{page_id}: workspace switcher not found after marquee")
    switcher_end_marker = "\n          </div>"
    switcher_end = segment.find(switcher_end_marker, switcher_start)
    if switcher_end < 0:
        raise RuntimeError(f"{page_id}: workspace switcher end not found")
    switcher_end += len(switcher_end_marker)
    switcher_block = segment[switcher_start:switcher_end]

    switcher_block = replace_once(
        switcher_block,
        'workspace-switcher money-workspace-switcher no-print',
        'workspace-switcher money-workspace-switcher',
        f"{page_id} inner no-print",
    )
    switcher_block = "\n".join("  " + line for line in switcher_block.splitlines())
    marquee_line = "  " + marquee_line
    replacement = (
        '          <div class="finance-workspace-marquee-row no-print">\n'
        f"{switcher_block}\n"
        f"{marquee_line}\n"
        '          </div>'
    )

    old = segment[marquee_start:switcher_end]
    if segment.count(old) != 1:
        raise RuntimeError(f"{page_id}: expected one source block")
    segment = segment.replace(old, replacement, 1)
    return html[:page_start] + segment + html[page_end:]


index = read("index.html")
index = wrap_finance_row(index, "income", "incomeFinanceWeekMarquee")
index = wrap_finance_row(index, "paid-expenses", "paidFinanceWeekMarquee")
index = index.replace("V15.1.0", "V15.1.1")
index = replace_once(index, 'const APP_VERSION = "15.1.0";', 'const APP_VERSION = "15.1.1";', "index APP_VERSION")
index = replace_once(
    index,
    'const APP_CACHE_VERSION = "finance-v15-20260815-month-nav-borderless-r23";',
    f'const APP_CACHE_VERSION = "{NEW_CACHE}";',
    "index APP_CACHE_VERSION",
)
index = replace_once(
    index,
    './interaction-patterns.js?v=14.0.23',
    f'./interaction-patterns.js?v={INTERACTION_QUERY}',
    "index interaction query",
)
index = replace_once(index, './pwa-update-v15-0-5.js?v=15.1.0', './pwa-update-v15-0-5.js?v=15.1.1', "index updater query")
write("index.html", index)

interaction = read("interaction-patterns.js")
interaction, removed = re.subn(
    r'\n  function alignFinanceWorkspaceMarquees\(\) \{.*?\n  \}\n',
    "\n",
    interaction,
    count=1,
    flags=re.S,
)
if removed != 1:
    raise RuntimeError(f"interaction helper: expected 1 function, removed {removed}")
interaction = replace_once(interaction, "    alignFinanceWorkspaceMarquees();\n", "", "interaction setup call")
interaction = replace_once(
    interaction,
    "renderDuplicatedMarquee, alignFinanceWorkspaceMarquees, renderActiveFilterChips",
    "renderDuplicatedMarquee, renderActiveFilterChips",
    "interaction export",
)
write("interaction-patterns.js", interaction)

sw = read("sw.js")
sw = replace_once(sw, 'const APP_VERSION = "15.1.0";', 'const APP_VERSION = "15.1.1";', "sw APP_VERSION")
sw = replace_once(
    sw,
    'const CACHE_VERSION = "finance-v15-20260815-month-nav-borderless-r23";',
    f'const CACHE_VERSION = "{NEW_CACHE}";',
    "sw CACHE_VERSION",
)
sw = replace_once(sw, './interaction-patterns.js?v=14.0.23', f'./interaction-patterns.js?v={INTERACTION_QUERY}', "sw interaction query")
sw = replace_once(sw, './pwa-update-v15-0-5.js?v=15.1.0', './pwa-update-v15-0-5.js?v=15.1.1', "sw updater query")
write("sw.js", sw)

version_path = ROOT / "version.json"
version_data = json.loads(version_path.read_text(encoding="utf-8"))
version_data["version"] = NEW_VERSION
version_data["cacheVersion"] = NEW_CACHE
version_data["released"] = "2026-08-15"
version_data["name"] = "Finance marquee source alignment"
version_data["notes"] = (
    "Moves the Income and Paid Expenses weekly marquees into the same source-level Finance workspace row as Budget & Expenses, "
    "preserves the 43px desktop/tablet geometry and phone marquee hiding, and refreshes the PWA shell so installed clients receive the corrected layout."
)
version_path.write_text(json.dumps(version_data, indent=2) + "\n", encoding="utf-8")

package_path = ROOT / "package.json"
package_data = json.loads(package_path.read_text(encoding="utf-8"))
package_data["version"] = NEW_VERSION
source_test = "node tests/validate-finance-marquee-source-v15-1-1.mjs"
current_test = package_data["scripts"]["test"]
if source_test not in current_test:
    package_data["scripts"]["test"] = f"{source_test} && {current_test}"
package_path.write_text(json.dumps(package_data, indent=2) + "\n", encoding="utf-8")

lock_path = ROOT / "package-lock.json"
lock_data = json.loads(lock_path.read_text(encoding="utf-8"))
lock_data["version"] = NEW_VERSION
if "" in lock_data.get("packages", {}):
    lock_data["packages"][""]["version"] = NEW_VERSION
lock_path.write_text(json.dumps(lock_data, indent=2) + "\n", encoding="utf-8")

test_path = ROOT / "tests" / "validate-finance-marquee-source-v15-1-1.mjs"
test_path.write_text(
    '''import assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst index = fs.readFileSync("index.html", "utf8");\nconst interaction = fs.readFileSync("interaction-patterns.js", "utf8");\nconst sw = fs.readFileSync("sw.js", "utf8");\nconst version = JSON.parse(fs.readFileSync("version.json", "utf8"));\nconst pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));\nconst lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));\n\nconst expectedVersion = "15.1.1";\nconst expectedCache = "finance-v15-20260815-finance-marquee-r24";\nconst interactionQuery = "15.1.1-finance-marquee1";\n\nfor (const [pageId, marqueeId] of [["income", "incomeFinanceWeekMarquee"], ["money", "financeWeekMarquee"], ["paid-expenses", "paidFinanceWeekMarquee"]]) {\n  const start = index.indexOf(`id="${pageId}"`);\n  assert.notEqual(start, -1, `${pageId} page must exist`);\n  const next = index.indexOf('<section class="page', start + 1);\n  const segment = index.slice(start, next === -1 ? index.length : next);\n  const row = segment.indexOf('class="finance-workspace-marquee-row no-print"');\n  assert.notEqual(row, -1, `${pageId} must use the shared Finance row in source HTML`);\n  const switcher = segment.indexOf('class="workspace-switcher money-workspace-switcher"', row);\n  const marquee = segment.indexOf(`id="${marqueeId}"`, row);\n  assert.notEqual(switcher, -1, `${pageId} switcher must be inside the shared row`);\n  assert.notEqual(marquee, -1, `${pageId} marquee must be inside the shared row`);\n  assert.ok(switcher < marquee, `${pageId} tabs must precede the marquee`);\n}\n\nassert.equal(interaction.includes("alignFinanceWorkspaceMarquees"), false, "runtime DOM rearrangement workaround must be removed");\nassert.ok(index.includes(`const APP_VERSION = "${expectedVersion}";`));\nassert.ok(index.includes(`const APP_CACHE_VERSION = "${expectedCache}";`));\nassert.ok(index.includes(`./interaction-patterns.js?v=${interactionQuery}`));\nassert.ok(sw.includes(`const APP_VERSION = "${expectedVersion}";`));\nassert.ok(sw.includes(`const CACHE_VERSION = "${expectedCache}";`));\nassert.ok(sw.includes(`./interaction-patterns.js?v=${interactionQuery}`));\nassert.equal(version.version, expectedVersion);\nassert.equal(version.cacheVersion, expectedCache);\nassert.equal(pkg.version, expectedVersion);\nassert.equal(lock.version, expectedVersion);\nassert.equal(lock.packages[""].version, expectedVersion);\n\nconsole.log("Finance marquee source layout and PWA cache metadata validated.");\n''',
    encoding="utf-8",
)

changelog_path = ROOT / "CHANGELOG.md"
changelog = changelog_path.read_text(encoding="utf-8")
heading = "## V15.1.1 - 2026-08-15"
if heading not in changelog:
    insertion = (
        f"{heading}\n\n"
        "- Aligns Income and Paid Expenses with the Budget & Expenses Finance workspace row directly in source HTML: tabs left, weekly marquee right.\n"
        "- Keeps the existing 43px desktop/tablet row geometry and hides the Finance weekly marquee on phone.\n"
        "- Bumps the PWA shell cache so installed clients fetch the corrected interaction script and layout instead of reporting stale files as current.\n\n"
    )
    first_heading = changelog.find("## ")
    changelog = changelog[:first_heading] + insertion + changelog[first_heading:] if first_heading >= 0 else insertion + changelog
    changelog_path.write_text(changelog, encoding="utf-8")

print("Finance marquee V15.1.1 source patch prepared successfully.")
