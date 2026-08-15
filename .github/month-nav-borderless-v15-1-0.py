from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_required(path, old, new, expected=1):
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s) of {old!r}, found {count}")
    write(path, text.replace(old, new, expected))


def replace_all_text(old, new):
    changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or "node_modules" in path.parts:
            continue
        if path.suffix.lower() not in {".html", ".js", ".mjs", ".json", ".css", ".md", ".command"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if old in text:
            path.write_text(text.replace(old, new), encoding="utf-8")
            changed += 1
    if not changed:
        raise SystemExit(f"global replacement found no files for {old!r}")
    return changed


old_flat = '''/* V15.0.0 · flat top toolbar and toast cleanup. */
.topbar :is(.month-navigator,.topbar-history-actions),
.topbar :is(.cloud-sync-toolbar-button,#customizeDashboardButton,.topbar-tools-trigger) {
  background:var(--surface)!important;
  border-color:var(--line)!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}'''
new_flat = '''/* V15.0.0 · flat top toolbar and toast cleanup. */
.topbar :is(.cloud-sync-toolbar-button,#customizeDashboardButton,.topbar-tools-trigger) {
  background:var(--surface)!important;
  border-color:var(--line)!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}'''
replace_required("liquid-glass-v15.css", old_flat, new_flat)

old_history = '''.topbar .topbar-history-actions {
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}'''
new_history = '''/* V15.1.0 · borderless month navigation shell. Keep the 1px layout slot transparent so toolbar geometry does not move. */
.topbar .month-navigator {
  border-color:transparent!important;
  background:transparent!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}

.topbar .topbar-history-actions {
  border:0!important;
  background:transparent!important;
  box-shadow:none!important;
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
}'''
replace_required("liquid-glass-v15.css", old_history, new_history)

replace_required(
    "sync-config.js",
    'link.href = `./liquid-glass-v15.css?v=${VERSION}-desktop1`;',
    'link.href = `./liquid-glass-v15.css?v=${VERSION}-monthnav1`;',
)
replace_all_text(
    "liquid-glass-v15.css?v=15.1.0-desktop1",
    "liquid-glass-v15.css?v=15.1.0-monthnav1",
)
replace_all_text(
    "finance-v15-20260815-desktop-consistency-r22",
    "finance-v15-20260815-month-nav-borderless-r23",
)

version_path = ROOT / "version.json"
version = json.loads(version_path.read_text(encoding="utf-8"))
if version.get("version") != "15.1.0" or version.get("schemaVersion") != 12 or version.get("cloudSchemaVersion") != 3:
    raise SystemExit("version/schema identity changed unexpectedly")
version["notes"] = "Black Canvas UI desktop consistency plus a borderless top month-navigation shell: removes the visible surrounding line around Previous, Month, Next, and Current while preserving 38px toolbar geometry, focus states, mobile behavior, Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."
version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")

validator = '''import assert from "node:assert/strict";
import fs from "node:fs";

const liquid = fs.readFileSync("liquid-glass-v15.css", "utf8");
const sync = fs.readFileSync("sync-config.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "15.1.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260815-month-nav-borderless-r23");
assert.match(liquid, /\.topbar \.month-navigator \{[\s\S]*?border-color:transparent!important;[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important;/);
assert.doesNotMatch(liquid, /\.topbar :is\(\.month-navigator,\.topbar-history-actions\),\s*\.topbar :is\(\.cloud-sync-toolbar-button/);
assert.match(sync, /liquid-glass-v15\.css\?v=\$\{VERSION\}-monthnav1/);
assert.match(sw, /liquid-glass-v15\.css\?v=15\.1\.0-monthnav1/);
assert.match(sw, /finance-v15-20260815-month-nav-borderless-r23/);
assert.match(index, /finance-v15-20260815-month-nav-borderless-r23/);
console.log("V15.1.0 borderless month-navigation regression passed.");
'''
write("tests/validate-month-navigation-borderless-v15-1-0.mjs", validator)

package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
test_script = package["scripts"]["test"]
prefix = "node tests/validate-month-navigation-borderless-v15-1-0.mjs && "
if not test_script.startswith(prefix):
    package["scripts"]["test"] = prefix + test_script
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

browser_path = ROOT / "tests/ui-icon-alignment.spec.mjs"
browser = browser_path.read_text(encoding="utf-8")
if "desktop month navigation removes its surrounding line" not in browser:
    browser += '''\n\ntest("V15.1.0 desktop month navigation removes its surrounding line", async ({ page }) => {\n  await page.setViewportSize({ width:1440, height:900 });\n  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });\n  await page.evaluate(() => window.FinancePrivacyLock?.unlock?.({ email:"month-nav-border-test@example.invalid" }));\n\n  const shell = page.locator(".topbar-actions .month-navigator");\n  await expect(shell).toBeVisible();\n  const shellStyle = await shell.evaluate(element => {\n    const style = getComputedStyle(element);\n    const rect = element.getBoundingClientRect();\n    return {\n      height:rect.height,\n      borderColor:style.borderTopColor,\n      background:style.backgroundColor,\n      shadow:style.boxShadow\n    };\n  });\n  expect(shellStyle.height).toBe(38);\n  expect(shellStyle.borderColor).toBe("rgba(0, 0, 0, 0)");\n  expect(shellStyle.background).toBe("rgba(0, 0, 0, 0)");\n  expect(shellStyle.shadow).toBe("none");\n\n  for (const selector of ["#previousMonthButton", "#monthControl", "#nextMonthButton"]) {\n    const borderColor = await page.locator(selector).evaluate(element => getComputedStyle(element).borderTopColor);\n    expect(borderColor, `${selector} should not show a surrounding border`).toBe("rgba(0, 0, 0, 0)");\n  }\n\n  const current = page.locator("#currentMonthButton:not([hidden]), #monthStatusChip:not([hidden])").first();\n  await expect(current).toBeVisible();\n  const currentBorder = await current.evaluate(element => getComputedStyle(element).borderTopColor);\n  expect(["rgba(0, 0, 0, 0)", "rgb(32, 41, 56)"]).toContain(currentBorder);\n});\n'''
    browser_path.write_text(browser, encoding="utf-8")

print("V15.1.0 month-navigation border patch staged.")
