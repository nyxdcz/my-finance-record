from pathlib import Path
import json

OLD_VERSION = "15.2.18"
NEW_VERSION = "15.2.19"
OLD_CACHE = "finance-v15-20260821-horizontal-kanban-r54"
NEW_CACHE = "finance-v15-20260821-compact-expense-cards-r55"
RELEASE_NAME = "Compact Expense Cards"
RELEASE_DATE = "August 21, 2026"


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace_required(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing required marker in {label}: {old}")
    return text.replace(old, new, 1)


# Static production CSS owns the compact expense-card layout and recurrence button.
css_path = Path("assets/css/production-ui-audit-v15-2-13.css")
css = css_path.read_text()
marker = "/* V15.2.19 · Compact expense cards: static ownership and non-shrinking monthly-repeat action. */"
block = r'''

/* V15.2.19 · Compact expense cards: static ownership and non-shrinking monthly-repeat action. */
@media (min-width: 851px) {
  html body #money .section-stack {
    align-items: start !important;
    gap: 8px !important;
  }

  html body #money .period-card {
    min-width: 0 !important;
    margin: 0 !important;
    padding: 6px !important;
    overflow: visible !important;
  }

  html body #money .period-header {
    min-height: 50px !important;
    margin: 0 !important;
    padding: 4px 5px 6px !important;
  }

  html body #money .period-header h3 {
    font-size: .86rem !important;
  }

  html body #money .period-header p {
    margin-top: 2px !important;
    font-size: .63rem !important;
  }

  html body #money .period-total {
    font-size: .88rem !important;
  }

  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) {
    display: grid !important;
    align-content: start !important;
    gap: 5px !important;
  }

  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row],
  html body #money :is(#earlyExpenses, #lateExpenses, #otherExpenses) > .record-row[data-expense-row] + .record-row[data-expense-row] {
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    padding: 7px !important;
    gap: 4px 8px !important;
    align-self: start !important;
    align-items: center !important;
  }

  html body #money .record-row[data-expense-row] .expense-record-title .record-title-copy > strong {
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
  }

  html body #money .record-row[data-expense-row] > .due-cell {
    gap: 2px 6px !important;
    padding-top: 0 !important;
    font-size: .6rem !important;
  }

  html body #money .record-row[data-expense-row] > [data-label="Planned account"] {
    font-size: .61rem !important;
  }

  html body #money .record-row[data-expense-row] > .amount {
    font-size: .73rem !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions {
    margin-top: 1px !important;
    padding-top: 5px !important;
    gap: 4px !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button {
    min-height: 30px !important;
    height: 30px !important;
    padding: 4px 7px !important;
    border-radius: 7px !important;
    font-size: .65rem !important;
  }

  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:hover,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:focus-visible,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved:active,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved.active,
  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button-saved.active:hover {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 auto !important;
    flex-shrink: 0 !important;
    width: max-content !important;
    min-width: max-content !important;
    max-width: none !important;
    height: 30px !important;
    min-height: 30px !important;
    padding: 4px 7px !important;
    border: 1px solid var(--line) !important;
    border-radius: 7px !important;
    background: var(--surface) !important;
    color: var(--text) !important;
    box-shadow: none !important;
    transform: none !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-icon-container {
    display: none !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text {
    display: inline !important;
    font-size: 0 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  html body #money .record-row[data-expense-row] .button-saved .saved-button-text::after {
    content: "Repeat monthly" !important;
    font-size: .65rem !important;
    line-height: 1 !important;
  }

  html body #money .record-row[data-expense-row] .button-saved.active .saved-button-text::after {
    content: "Repeats monthly" !important;
  }
}
'''
if marker not in css:
    css += block
css_path.write_text(css)
Path("production-ui-audit-v15-2-13.css").write_text(css)

# Branding module returns to icon-only ownership.
brand = '''"use strict";
(function installFinanceBrandIcons(root) {
  const doc = root.document;
  if (!doc) return;

  const ensureLink = ({ rel, sizes, href, type }) => {
    let selector = `link[rel="${rel}"]`;
    if (sizes) selector += `[sizes="${sizes}"]`;
    let link = doc.head?.querySelector(selector);
    if (!link) {
      link = doc.createElement("link");
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      if (type) link.type = type;
      doc.head?.appendChild(link);
    }
    if (link) link.href = href;
  };

  ensureLink({ rel:"icon", sizes:"32x32", type:"image/png", href:"./icons/favicon-32-logo2.png" });
  ensureLink({ rel:"icon", sizes:"192x192", type:"image/png", href:"./icons/icon-192-logo2.png" });
  ensureLink({ rel:"apple-touch-icon", href:"./icons/apple-touch-icon-logo2.png" });
})(typeof window !== "undefined" ? window : globalThis);
'''
write("assets/js/brand-icons-v15-2-18.js", brand)
write("brand-icons-v15-2-18.js", brand)

# PWA updater: rotate cache and brand import URL.
for path in ["assets/js/pwa-update-v15-0-5.js", "pwa-update-v15-0-5.js"]:
    text = read(path)
    text = text.replace(OLD_CACHE, NEW_CACHE)
    text = text.replace("finance-ui-hotfix-v15-2-18-kanban-menu3-neutral-border1-light-label3", "finance-ui-hotfix-v15-2-19-compact-expense1")
    text = text.replace("./brand-icons-v15-2-18.js?v=compact-expense-cards-1", "./brand-icons-v15-2-18.js?v=15.2.19-brand1")
    write(path, text)

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
    "notes": "V15.2.19 compacts the First half, Second half, and Other expense cards, keeps 5px card spacing, and restores a non-shrinking Repeat monthly / Repeats monthly action directly beside Mark paid. Finance Schema 12, Cloud Schema V3, calculations, balances, recurrence semantics, filters, payments, phone touch layouts, and sync behavior are unchanged."
})
version_path.write_text(json.dumps(version, indent=2) + "\n")

# README + changelog.
readme = read("README.md")
readme = replace_required(readme, "# My Finance Records · V15.2.18", "# My Finance Records · V15.2.19", "README.md")
readme = replace_required(readme, "version-V15.2.18-2563eb", "version-V15.2.19-2563eb", "README.md")
readme = replace_required(readme, "| **V15.2.18** · Horizontal Project Kanban | **12** | **V3** | **5 minutes** |", "| **V15.2.19** · Compact Expense Cards | **12** | **V3** | **5 minutes** |", "README.md")
old_summary = "The current release turns Project Agenda and Projects into horizontal Kanban boards with full-card drag-and-drop, protected start and Completed columns, custom workflow columns, completion safeguards, and Undo. Project values, payments, revision history, finance calculations, schemas, and sync behavior remain protected."
new_summary = "The current release compacts First half, Second half, and Other expense cards while preserving the three-column desktop layout, 5px card spacing, and the full Repeat monthly / Repeats monthly action directly beside Mark paid. Finance calculations, recurrence behavior, schemas, balances, filters, payments, phone touch layouts, and sync behavior remain protected."
readme = replace_required(readme, old_summary, new_summary, "README.md")
write("README.md", readme)

changelog = read("CHANGELOG.md")
if not changelog.startswith("## 15.2.18 · 2026-08-21"):
    raise SystemExit("Unexpected CHANGELOG latest release")
entry = f'''## 15.2.19 · 2026-08-21
- Compacted First half, Second half, and Other expense cards with 7px card padding, tighter metadata rhythm, 30px desktop actions, and the existing 5px spacing between separate expense cards.
- Restored the functional Repeat monthly / Repeats monthly control directly beside Mark paid and prevented it from shrinking to an icon-sized button in three-column layouts.
- Returned branding code to icon-only ownership, kept the phone touch layout unchanged, and rotated the PWA shell to `{NEW_CACHE}` while preserving Finance Schema 12, Cloud Schema V3, calculations, balances, recurrence semantics, filters, payments, and sync.

'''
write("CHANGELOG.md", entry + changelog)

# Main HTML release metadata and cache-busted production assets.
index = read("index.html")
replacements = [
    ("<title>My Finance Records · V15.2.18</title>", "<title>My Finance Records · V15.2.19</title>"),
    ('<small id="buildBadge" title="V15.2.18 · Horizontal Project Kanban · August 21, 2026">V15.2.18</small>', '<small id="buildBadge" title="V15.2.19 · Compact Expense Cards · August 21, 2026">V15.2.19</small>'),
    ('const APP_VERSION = "15.2.18";', 'const APP_VERSION = "15.2.19";'),
    ('const APP_RELEASE_NAME = "Horizontal Project Kanban";', 'const APP_RELEASE_NAME = "Compact Expense Cards";'),
    (f'const APP_CACHE_VERSION = "{OLD_CACHE}";', f'const APP_CACHE_VERSION = "{NEW_CACHE}";'),
    ('production-ui-audit-v15-2-13.css?v=15.2.14-audit2', 'production-ui-audit-v15-2-13.css?v=15.2.19-compact1'),
    ('pwa-update-v15-0-5.js?v=15.2.18-release14', 'pwa-update-v15-0-5.js?v=15.2.19-release1'),
]
for old, new in replacements:
    index = replace_required(index, old, new, "index.html")
history_anchor = 'VERSION_HISTORY.unshift({"version":"V15.2.18","title":"Horizontal Project Kanban","changes":["Rebuilds Project Agenda and Projects as horizontal boards with full-card mouse, touch, and keyboard dragging.","Adds protected start and Completed columns plus named, colored, reorderable custom workflow columns.","Preserves completion confirmation, payments, balances, revisions, safe invalid-drop return, and five-second Undo."]});'
history_new = history_anchor + '\n    VERSION_HISTORY.unshift({"version":"V15.2.19","title":"Compact Expense Cards","changes":["Compacts First half, Second half, and Other expense cards while preserving the three-column desktop layout and 5px card spacing.","Restores Repeat monthly / Repeats monthly directly beside Mark paid with a non-shrinking desktop text button.","Moves compact expense-card presentation into the final static production stylesheet and preserves phone touch layouts, recurrence, calculations, filters, balances, payments, and sync behavior."]});'
index = replace_required(index, history_anchor, history_new, "index.html")
write("index.html", index)

# Service worker rotation.
sw = read("sw.js")
sw = replace_required(sw, 'const APP_VERSION = "15.2.18";', 'const APP_VERSION = "15.2.19";', "sw.js")
sw = sw.replace(OLD_CACHE, NEW_CACHE)
sw = replace_required(sw, 'production-ui-audit-v15-2-13.css?v=15.2.14-audit2', 'production-ui-audit-v15-2-13.css?v=15.2.19-compact1', "sw.js")
sw = replace_required(sw, 'pwa-update-v15-0-5.js?v=15.2.18-release14', 'pwa-update-v15-0-5.js?v=15.2.19-release1', "sw.js")
sw = sw.replace('asset("./brand-icons-v15-2-18.js")', 'asset("./brand-icons-v15-2-18.js?v=15.2.19-brand1")')
write("sw.js", sw)

# Browser regression uses the new cache and explicitly locks non-shrinking recurrence geometry.
browser_path = Path("tests/browser/production-ui-audit-v15-2-13.spec.mjs")
browser = browser_path.read_text().replace(OLD_CACHE, NEW_CACHE)
browser = browser.replace('recurrenceButtonWidth:saved?.getBoundingClientRect().width || 0,', 'recurrenceButtonWidth:saved?.getBoundingClientRect().width || 0,\n      recurrenceFlexShrink:saved ? getComputedStyle(saved).flexShrink : "",')
browser = browser.replace('expect(metrics.recurrenceButtonWidth).toBeGreaterThan(65);', 'expect(metrics.recurrenceButtonWidth).toBeGreaterThan(65);\n  expect(metrics.recurrenceFlexShrink).toBe("0");')
browser_path.write_text(browser)

# Source-contract regression tracks the new release and static recurrence ownership.
prod_path = Path("tests/regression/validate-production-ui-audit-v15-2-13.mjs")
prod = prod_path.read_text()
prod = prod.replace('assert.equal(version.version, "15.2.18");', 'assert.equal(version.version, "15.2.19");')
prod = prod.replace('assert.equal(pkg.version, "15.2.18");', 'assert.equal(pkg.version, "15.2.19");')
prod = prod.replace(OLD_CACHE, NEW_CACHE)
prod = prod.replace('15\\.2\\.14-audit2', '15\\.2\\.19-compact1')
insert_after = 'assert.match(css, /#money :is\\(#earlyExpenses, #lateExpenses, #otherExpenses\\) > \\.record-row\\[data-expense-row\\] \\+ \\.record-row\\[data-expense-row\\][\\s\\S]*margin-top:\\s*5px !important;/);'
extra = insert_after + '\nassert.match(css, /Compact expense cards: static ownership[\\s\\S]*flex-shrink:\\s*0 !important;[\\s\\S]*width:\\s*max-content !important;[\\s\\S]*content:\\s*"Repeat monthly" !important;/);'
if insert_after not in prod:
    raise SystemExit("Production UI regression insertion marker missing")
prod = prod.replace(insert_after, extra, 1)
prod = prod.replace('V15.2.18 production UI/UX audit source contract passed.', 'V15.2.19 production UI/UX audit source contract passed.')
prod_path.write_text(prod)

# PWA regression tracks V15.2.19 cache/updater delivery.
pwa_path = Path("tests/regression/validate-pwa-updater-v15-0-5.mjs")
pwa = pwa_path.read_text()
pwa = pwa.replace('assert.equal(version.version, "15.2.18");', 'assert.equal(version.version, "15.2.19");')
pwa = pwa.replace(OLD_CACHE, NEW_CACHE)
pwa = pwa.replace('finance-ui-hotfix-v15-2-18-kanban-menu3-neutral-border1-light-label3', 'finance-ui-hotfix-v15-2-19-compact-expense1')
pwa = pwa.replace('const APP_VERSION = "15\\.2\\.18";', 'const APP_VERSION = "15\\.2\\.19";')
pwa = pwa.replace('pwa-update-v15-0-5\\.js\\?v=15\\.2\\.18-release14', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.19-release1')
pwa = pwa.replace('V15.2.18 PWA updater regression passed', 'V15.2.19 PWA updater regression passed')
pwa_path.write_text(pwa)

# Repository inspector expects the new release metadata.
inspect_path = Path("tests/helpers/inspect-project.mjs")
inspect = inspect_path.read_text()
inspect = inspect.replace('pkg.version !== "15.2.18"', 'pkg.version !== "15.2.19"')
inspect = inspect.replace('Expected current package version 15.2.18', 'Expected current package version 15.2.19')
inspect = inspect.replace('startsWith("# My Finance Records · V15.2.18")', 'startsWith("# My Finance Records · V15.2.19")')
inspect = inspect.replace('README release heading is not V15.2.18', 'README release heading is not V15.2.19')
inspect = inspect.replace('startsWith("## 15.2.18 · 2026-08-21")', 'startsWith("## 15.2.19 · 2026-08-21")')
inspect = inspect.replace('CHANGELOG latest entry is not V15.2.18', 'CHANGELOG latest entry is not V15.2.19')
inspect = inspect.replace('Repository inspection passed: V15.2.18 release sources', 'Repository inspection passed: V15.2.19 release sources')
inspect_path.write_text(inspect)

print("V15.2.19 compact expense-card release files prepared.")
