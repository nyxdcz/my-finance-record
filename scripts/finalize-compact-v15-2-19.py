from pathlib import Path
import json

OLD_VERSION = "15.2.18"
NEW_VERSION = "15.2.19"
OLD_CACHE = "finance-v15-20260821-horizontal-kanban-r54"
NEW_CACHE = "finance-v15-20260821-compact-expense-cards-r55"
RELEASE_NAME = "Compact Expense Cards"


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing marker for {label}: {old}")
    return text.replace(old, new, 1)


# Desktop Finance card compaction only. Phone rules are left untouched.
css_path = Path("assets/css/production-ui-audit-v15-2-13.css")
css = css_path.read_text()
marker = "/* V15.2.19 · Expense card-list columns, matching the Project Agenda card rhythm. */"
if marker not in css:
    raise SystemExit("Expense-card CSS marker missing")
prefix, suffix = css.split(marker, 1)

blocks = [
    (
        """  html body #money .section-stack {
    align-items: start !important;
    gap: 10px !important;
  }""",
        """  html body #money .section-stack {
    align-items: start !important;
    gap: 8px !important;
  }""",
        "period column spacing",
    ),
    (
        """  html body #money .period-card {
    min-width: 0 !important;
    margin: 0 !important;
    padding: 8px !important;
    overflow: visible !important;
    border: 1px solid var(--line) !important;
    border-top-width: 3px !important;
    border-radius: 9px !important;
    box-shadow: none !important;
  }""",
        """  html body #money .period-card {
    min-width: 0 !important;
    margin: 0 !important;
    padding: 6px !important;
    overflow: visible !important;
    border: 1px solid var(--line) !important;
    border-top-width: 3px !important;
    border-radius: 9px !important;
    box-shadow: none !important;
  }""",
        "period shell compaction",
    ),
    (
        """  html body #money .period-header {
    min-height: 58px !important;
    margin: 0 !important;
    padding: 6px 6px 9px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }""",
        """  html body #money .period-header {
    min-height: 50px !important;
    margin: 0 !important;
    padding: 4px 5px 6px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
  }""",
        "period header compaction",
    ),
    (
        """  html body #money .period-header h3 {
    font-size: .9rem !important;
  }

  html body #money .period-header p {
    margin-top: 3px !important;
    font-size: .66rem !important;
  }

  html body #money .period-total {
    font-size: .92rem !important;
  }""",
        """  html body #money .period-header h3 {
    font-size: .86rem !important;
  }

  html body #money .period-header p {
    margin-top: 2px !important;
    font-size: .63rem !important;
  }

  html body #money .period-total {
    font-size: .88rem !important;
  }""",
        "period typography compaction",
    ),
    (
        """  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row],
  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row] + .record-row[data-expense-row] {
    min-height: 0 !important;
    margin: 0 !important;
    padding: 10px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 6px 10px !important;
    align-items: center !important;
    border: 1px solid var(--line) !important;
    border-left-width: 3px !important;
    border-radius: 8px !important;
    background: var(--surface) !important;
    box-shadow: 0 2px 8px rgb(0 0 0 / .06) !important;
  }""",
        """  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row],
  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row] + .record-row[data-expense-row] {
    min-height: 0 !important;
    margin: 0 !important;
    padding: 7px !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 4px 8px !important;
    align-items: center !important;
    border: 1px solid var(--line) !important;
    border-left-width: 3px !important;
    border-radius: 8px !important;
    background: var(--surface) !important;
    box-shadow: 0 2px 8px rgb(0 0 0 / .06) !important;
  }""",
        "expense card geometry",
    ),
    (
        """  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > strong {
    font-size: .8rem !important;
    line-height: 1.3 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > small {
    margin-top: 3px !important;
    font-size: .62rem !important;
    line-height: 1.35 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-statuses {
    margin-top: 5px !important;
    gap: 4px !important;
  }""",
        """  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > strong {
    font-size: .78rem !important;
    line-height: 1.25 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > small {
    margin-top: 2px !important;
    font-size: .61rem !important;
    line-height: 1.3 !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-statuses {
    margin-top: 3px !important;
    gap: 3px !important;
  }""",
        "expense title and status compaction",
    ),
    (
        """  html body #money .record-row[data-expense-row] > .due-cell {
    grid-column: 1 / -1 !important;
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) !important;
    align-items: center !important;
    justify-content: start !important;
    gap: 4px 7px !important;
    padding-top: 1px !important;
    color: var(--muted) !important;
    font-size: .61rem !important;
  }""",
        """  html body #money .record-row[data-expense-row] > .due-cell {
    grid-column: 1 / -1 !important;
    display: grid !important;
    grid-template-columns: auto minmax(0, 1fr) !important;
    align-items: center !important;
    justify-content: start !important;
    gap: 2px 6px !important;
    padding-top: 0 !important;
    color: var(--muted) !important;
    font-size: .6rem !important;
  }""",
        "deadline metadata compaction",
    ),
    (
        """  html body #money .record-row[data-expense-row] > .desktop-record-actions {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    margin-top: 2px !important;
    padding-top: 8px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 6px !important;
    border-top: 1px solid var(--line) !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button {
    min-height: 32px !important;
    height: 32px !important;
    padding: 5px 8px !important;
    border-radius: 7px !important;
    font-size: .67rem !important;
  }""",
        """  html body #money .record-row[data-expense-row] > .desktop-record-actions {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    margin-top: 1px !important;
    padding-top: 5px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 4px !important;
    border-top: 1px solid var(--line) !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button {
    min-height: 30px !important;
    height: 30px !important;
    padding: 4px 7px !important;
    border-radius: 7px !important;
    font-size: .65rem !important;
  }""",
        "desktop action compaction",
    ),
    (
        """  html body #money .record-row[data-expense-row] .button-saved .saved-button-text {
    font-size: 0 !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text::after {
    content: "Repeat monthly";
    font-size: .67rem !important;
  }

  html body #money .record-row[data-expense-row] .button-saved.active .saved-button-text::after {
    content: "Repeats monthly";
  }""",
        """  html body #money .record-row[data-expense-row] .button-saved .saved-button-text {
    font-size: .65rem !important;
    white-space: nowrap !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text::after {
    content: none !important;
  }""",
        "monthly repeat label presentation",
    ),
]
for old, new, label in blocks:
    suffix = replace_once(suffix, old, new, label)
css_path.write_text(prefix + marker + suffix)

# Browser regression: cache rotation, compact geometry, and functional action order.
test_path = Path("tests/browser/production-ui-audit-v15-2-13.spec.mjs")
test = test_path.read_text()
test = replace_once(test, f'const APP_CACHE = "{OLD_CACHE}";', f'const APP_CACHE = "{NEW_CACHE}";', "browser cache")
test = replace_once(
    test,
    '''      rowGap:spacing,
      actionCount:actions.length,''',
    '''      rowGap:spacing,
      rowPaddingTop:rowStyle ? parseFloat(rowStyle.paddingTop) : 0,
      actionFooterPaddingTop:firstRow ? parseFloat(getComputedStyle(firstRow.querySelector(":scope > .desktop-record-actions")).paddingTop) : 0,
      recurrenceButtonHeight:saved ? saved.getBoundingClientRect().height : 0,
      actionCount:actions.length,''',
    "browser compact metrics",
)
test = replace_once(
    test,
    '''      savedLabel:saved?.classList.contains("active") ? getComputedStyle(savedText, "::after").content : getComputedStyle(savedText, "::after").content,''',
    '''      savedLabel:savedText?.textContent?.trim() || "",''',
    "browser recurrence label",
)
test = replace_once(
    test,
    '''  expect(metrics.rowGap).toBeCloseTo(5, 0);
  expect(metrics.actionCount).toBeGreaterThanOrEqual(3);''',
    '''  expect(metrics.rowGap).toBeCloseTo(5, 0);
  expect(metrics.rowPaddingTop).toBeCloseTo(7, 0);
  expect(metrics.actionFooterPaddingTop).toBeCloseTo(5, 0);
  expect(metrics.recurrenceButtonHeight).toBeCloseTo(30, 0);
  expect(metrics.actionCount).toBeGreaterThanOrEqual(3);''',
    "browser compact assertions",
)
test_path.write_text(test)

# index.html recurrence text and release metadata.
index_path = Path("index.html")
index = index_path.read_text()
old_repeat_text = '<span class="saved-button-text">${item.recurring === "Monthly" ? "Repeats" : "Repeat"}</span>'
new_repeat_text = '<span class="saved-button-text">${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>'
if index.count(old_repeat_text) < 2:
    raise SystemExit("Expected recurrence labels in unpaid and paid renderers")
index = index.replace(old_repeat_text, new_repeat_text)
index = replace_once(index, "<title>My Finance Records · V15.2.18</title>", "<title>My Finance Records · V15.2.19</title>", "page title")
index = replace_once(index, '<small id="buildBadge" title="V15.2.18 · Horizontal Project Kanban · August 21, 2026">V15.2.18</small>', '<small id="buildBadge" title="V15.2.19 · Compact Expense Cards · August 21, 2026">V15.2.19</small>', "build badge")
index = replace_once(index, 'const APP_VERSION = "15.2.18";', 'const APP_VERSION = "15.2.19";', "index app version")
index = replace_once(index, 'const APP_RELEASE_NAME = "Horizontal Project Kanban";', 'const APP_RELEASE_NAME = "Compact Expense Cards";', "release name")
index = replace_once(index, f'const APP_CACHE_VERSION = "{OLD_CACHE}";', f'const APP_CACHE_VERSION = "{NEW_CACHE}";', "index cache")
index = replace_once(index, 'production-ui-audit-v15-2-13.css?v=15.2.14-audit2', 'production-ui-audit-v15-2-13.css?v=15.2.19-compact1', "production CSS cache bust")
index = replace_once(index, 'pwa-update-v15-0-5.js?v=15.2.18-release14', 'pwa-update-v15-0-5.js?v=15.2.19-release1', "PWA updater cache bust")
history_anchor = 'VERSION_HISTORY.unshift({"version":"V15.2.18","title":"Horizontal Project Kanban","changes":["Rebuilds Project Agenda and Projects as horizontal boards with full-card mouse, touch, and keyboard dragging.","Adds protected start and Completed columns plus named, colored, reorderable custom workflow columns.","Preserves completion confirmation, payments, balances, revisions, safe invalid-drop return, and five-second Undo."]});'
history_new = history_anchor + '\n    VERSION_HISTORY.unshift({"version":"V15.2.19","title":"Compact Expense Cards","changes":["Compacts First half, Second half, and Other expenses into dense three-column desktop card lists with 7px card padding and 5px card spacing.","Restores the full Repeat/Repeats monthly action immediately before Mark paid, followed by Edit.","Preserves phone touch layouts, recurrence semantics, Finance calculations, balances, filters, payments, schemas, and sync behavior."]});'
index = replace_once(index, history_anchor, history_new, "version history")
index_path.write_text(index)

# Package metadata.
pkg_path = Path("package.json")
pkg = json.loads(pkg_path.read_text())
if pkg.get("version") != OLD_VERSION:
    raise SystemExit(f"Unexpected package version: {pkg.get('version')}")
pkg["version"] = NEW_VERSION
pkg_path.write_text(json.dumps(pkg, indent=2) + "\n")

lock_path = Path("package-lock.json")
lock = json.loads(lock_path.read_text())
if lock.get("version") != OLD_VERSION or lock.get("packages", {}).get("", {}).get("version") != OLD_VERSION:
    raise SystemExit("Unexpected package-lock release version")
lock["version"] = NEW_VERSION
lock["packages"][""]["version"] = NEW_VERSION
lock_path.write_text(json.dumps(lock, indent=2) + "\n")

version_path = Path("version.json")
version = json.loads(version_path.read_text())
if version.get("version") != OLD_VERSION:
    raise SystemExit(f"Unexpected version.json version: {version.get('version')}")
version.update({
    "version": NEW_VERSION,
    "cacheVersion": NEW_CACHE,
    "released": "2026-08-21",
    "name": RELEASE_NAME,
    "notes": "V15.2.19 compacts the First half, Second half, and Other expenses card lists with 7px card padding, tighter metadata, 5px inter-card spacing, 30px desktop actions, and the full Repeat/Repeats monthly control directly before Mark paid. Finance Schema 12, Cloud Schema V3, calculations, balances, recurrence semantics, phone touch behavior, filters, payments, and sync are unchanged."
})
version_path.write_text(json.dumps(version, indent=2) + "\n")

# README and changelog.
readme_path = Path("README.md")
readme = readme_path.read_text()
readme = replace_once(readme, "# My Finance Records · V15.2.18", "# My Finance Records · V15.2.19", "README heading")
readme = replace_once(readme, "version-V15.2.18-2563eb", "version-V15.2.19-2563eb", "README badge")
readme = replace_once(readme, "| **V15.2.18** · Horizontal Project Kanban | **12** | **V3** | **5 minutes** |", "| **V15.2.19** · Compact Expense Cards | **12** | **V3** | **5 minutes** |", "README release table")
old_summary = "The current release turns Project Agenda and Projects into horizontal Kanban boards with full-card drag-and-drop, protected start and Completed columns, custom workflow columns, completion safeguards, and Undo. Project values, payments, revision history, finance calculations, schemas, and sync behavior remain protected."
new_summary = "The current release compacts First half, Second half, and Other expenses into dense responsive card lists with 7px card padding, 5px spacing between expense cards, tighter metadata, 30px desktop actions, and the full Repeat/Repeats monthly control directly before Mark paid. Finance calculations, recurrence behavior, schemas, balances, filters, payments, phone touch behavior, and sync remain protected."
readme = replace_once(readme, old_summary, new_summary, "README release summary")
readme_path.write_text(readme)

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text()
if not changelog.startswith("## 15.2.18 · 2026-08-21"):
    raise SystemExit("Unexpected latest changelog release")
entry = f'''## 15.2.19 · 2026-08-21
- Compacted First half, Second half, and Other expenses into dense responsive card lists with 7px card padding, tighter metadata, and 5px vertical spacing between cards.
- Restored the full Repeat/Repeats monthly action directly before Mark paid, kept Edit next, and reduced desktop expense actions to 30px without changing recurrence behavior.
- Preserved Finance Schema 12, Cloud Schema V3, calculations, balances, filters, payment behavior, phone touch layouts, and sync while rotating the PWA shell to `{NEW_CACHE}`.

'''
changelog_path.write_text(entry + changelog)

# PWA cache delivery.
sw_path = Path("sw.js")
sw = sw_path.read_text()
sw = replace_once(sw, 'const APP_VERSION = "15.2.18";', 'const APP_VERSION = "15.2.19";', "worker version")
sw = replace_once(sw, f'const CACHE_VERSION = "{OLD_CACHE}";', f'const CACHE_VERSION = "{NEW_CACHE}";', "worker cache")
sw = replace_once(sw, 'production-ui-audit-v15-2-13.css?v=15.2.14-audit2', 'production-ui-audit-v15-2-13.css?v=15.2.19-compact1', "worker CSS query")
sw = replace_once(sw, 'pwa-update-v15-0-5.js?v=15.2.18-release14', 'pwa-update-v15-0-5.js?v=15.2.19-release1', "worker updater query")
sw_path.write_text(sw)

updater_path = Path("assets/js/pwa-update-v15-0-5.js")
updater = updater_path.read_text()
updater = replace_once(updater, f'const CURRENT_CACHE_VERSION = "{OLD_CACHE}";', f'const CURRENT_CACHE_VERSION = "{NEW_CACHE}";', "PWA updater cache")
updater_path.write_text(updater)

# Repository inspector release expectations.
inspect_path = Path("tests/helpers/inspect-project.mjs")
inspect = inspect_path.read_text()
for old, new, label in [
    ('pkg.version !== "15.2.18"', 'pkg.version !== "15.2.19"', "inspector package version"),
    ('Expected current package version 15.2.18', 'Expected current package version 15.2.19', "inspector package message"),
    ('startsWith("# My Finance Records · V15.2.18")', 'startsWith("# My Finance Records · V15.2.19")', "inspector README version"),
    ('README release heading is not V15.2.18', 'README release heading is not V15.2.19', "inspector README message"),
    ('startsWith("## 15.2.18 · 2026-08-21")', 'startsWith("## 15.2.19 · 2026-08-21")', "inspector changelog version"),
    ('CHANGELOG latest entry is not V15.2.18', 'CHANGELOG latest entry is not V15.2.19', "inspector changelog message"),
]:
    inspect = replace_once(inspect, old, new, label)
inspect = inspect.replace('Repository inspection passed: V15.2.18 release sources', 'Repository inspection passed: V15.2.19 release sources')
inspect_path.write_text(inspect)

# Production UI source contract.
prod_path = Path("tests/regression/validate-production-ui-audit-v15-2-13.mjs")
prod = prod_path.read_text()
for old, new, label in [
    ('assert.equal(version.version, "15.2.18");', 'assert.equal(version.version, "15.2.19");', "production version"),
    ('assert.equal(pkg.version, "15.2.18");', 'assert.equal(pkg.version, "15.2.19");', "production package version"),
    (f'assert.equal(version.cacheVersion, "{OLD_CACHE}");', f'assert.equal(version.cacheVersion, "{NEW_CACHE}");', "production cache"),
    (r'assert.match(index, /production-ui-audit-v15-2-13\.css\?v=15\.2\.14-audit2/);', r'assert.match(index, /production-ui-audit-v15-2-13\.css\?v=15\.2\.19-compact1/);', "production index CSS query"),
    (r'assert.match(worker, /production-ui-audit-v15-2-13\.css\?v=15\.2\.14-audit2/);', r'assert.match(worker, /production-ui-audit-v15-2-13\.css\?v=15\.2\.19-compact1/);', "production worker CSS query"),
    ('console.log("V15.2.18 production UI/UX audit source contract passed.");', 'console.log("V15.2.19 compact expense-card UI source contract passed.");', "production regression message"),
]:
    prod = replace_once(prod, old, new, label)
prod_path.write_text(prod)

# PWA updater regression expectations.
pwa_path = Path("tests/regression/validate-pwa-updater-v15-0-5.mjs")
pwa = pwa_path.read_text()
for old, new, label in [
    ('assert.equal(version.version, "15.2.18");', 'assert.equal(version.version, "15.2.19");', "PWA version"),
    (f'assert.equal(version.cacheVersion, "{OLD_CACHE}");', f'assert.equal(version.cacheVersion, "{NEW_CACHE}");', "PWA cache"),
    (f'assert.match(index, /const APP_CACHE_VERSION = "{OLD_CACHE}";/);', f'assert.match(index, /const APP_CACHE_VERSION = "{NEW_CACHE}";/);', "PWA index cache"),
    (f'assert.match(updater, /const CURRENT_CACHE_VERSION = "{OLD_CACHE}";/);', f'assert.match(updater, /const CURRENT_CACHE_VERSION = "{NEW_CACHE}";/);', "PWA updater cache"),
    (r'assert.match(worker, /const APP_VERSION = "15\.2\.18";/);', r'assert.match(worker, /const APP_VERSION = "15\.2\.19";/);', "PWA worker version"),
    (f'assert.match(worker, /{OLD_CACHE}/);', f'assert.match(worker, /{NEW_CACHE}/);', "PWA worker cache"),
    (r'assert.match(worker, /pwa-update-v15-0-5\.js\?v=15\.2\.18-release14/);', r'assert.match(worker, /pwa-update-v15-0-5\.js\?v=15\.2\.19-release1/);', "PWA worker updater query"),
    ('console.log("V15.2.18 PWA updater regression passed with pure PWA/cache ownership, static sidebar branding, neutral Finance border delivery, and light-mode account-name-only refresh delivery.");', 'console.log("V15.2.19 PWA updater regression passed with compact expense-card delivery and preserved PWA/cache ownership.");', "PWA regression message"),
]:
    pwa = replace_once(pwa, old, new, label)
pwa_path.write_text(pwa)

# Functional recurrence control stays in both unpaid/paid renderers.
final_index = index_path.read_text()
if final_index.count('data-toggle-saved="${item.id}"') < 2:
    raise SystemExit("Monthly recurrence controls were unexpectedly removed")
if final_index.count('"Repeats monthly" : "Repeat monthly"') < 2:
    raise SystemExit("Full monthly recurrence labels were not applied")

print("Prepared V15.2.19 compact expense-card release")
