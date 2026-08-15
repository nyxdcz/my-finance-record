from pathlib import Path
import re

OLD_CACHE = "finance-v15-20260815-pwa-update-r13"
NEW_CACHE = "finance-v15-20260815-header-ui-r14"
OLD_UI = "ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1"
NEW_UI = "ui-icon-alignment-v15-0-5.css?v=15.0.5-ui2"
OLD_PRIVACY = "privacy-lock.js?v=14.0.23"
NEW_PRIVACY = "privacy-lock.js?v=15.0.5-ui1"


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)

# Remove the duplicate topbar Sign in shortcut while retaining all Settings sign-in actions.
path = Path("privacy-lock.js")
text = path.read_text()
text = text.replace('    "#topbarToolsTrigger", "#themeToggleButton", "#privacySignInButton", ".finance-privacy-signin",\n',
                    '    "#topbarToolsTrigger", "#themeToggleButton", ".finance-privacy-signin",\n')
pattern = re.compile(r'  function ensureTopbarSignIn\(\)\{.*?\n  \}\n\n  function ensureSettingsPrivacyNote\(\)\{', re.S)
replacement = '''  function removeTopbarSignIn(){\n    document.getElementById("privacySignInButton")?.remove();\n  }\n\n  function ensureSettingsPrivacyNote(){'''
text, count = pattern.subn(replacement, text, count=1)
assert count == 1, "Could not replace ensureTopbarSignIn"
text = text.replace("    ensureTopbarSignIn();\n", "    removeTopbarSignIn();\n")
assert "ensureTopbarSignIn" not in text
assert 'id="cloudSignIn"' not in text  # Settings auth markup lives in index.html, not this module.
path.write_text(text)

# Apply a tiny optical correction to the existing centered 38x38 Dashboard utility button.
path = Path("ui-icon-alignment-v15-0-5.css")
text = path.read_text()
marker = "/* V15.0.5 header hotfix: optical centering for the asymmetric widget glyph. */"
if marker not in text:
    text += '''\n\n/* V15.0.5 header hotfix: optical centering for the asymmetric widget glyph. */\nhtml body #customizeDashboardButton[data-dashboard-toolbar-action]::before {\n  transform:translateY(1px) !important;\n  transform-origin:center !important;\n}\n'''
path.write_text(text)

# Rotate the PWA shell and pin the changed CSS/privacy module to fresh URLs.
for filename in ["index.html", "sw.js"]:
    path = Path(filename)
    text = path.read_text()
    assert OLD_CACHE in text, f"{OLD_CACHE} missing from {filename}"
    text = text.replace(OLD_CACHE, NEW_CACHE)
    text = text.replace(OLD_UI, NEW_UI)
    text = text.replace(OLD_PRIVACY, NEW_PRIVACY)
    path.write_text(text)

# Release metadata: same V15.0.5 app release, fresh cache generation only.
path = Path("version.json")
text = path.read_text()
assert OLD_CACHE in text
text = text.replace(OLD_CACHE, NEW_CACHE)
text = text.replace(
    '"notes": "Repairs V15 PWA update detection and stale-cache cleanup so existing V15.0.4 desktop and phone clients reliably load the delivered text-only badge and compact icon alignment while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."',
    '"notes": "Repairs V15 PWA update detection and stale-cache cleanup, removes the duplicate topbar Sign in shortcut, and optically centers the Dashboard utility glyph while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."'
)
path.write_text(text)

# Keep inherited release/cache assertions aligned with the new shell generation.
for path in Path("tests").glob("*.mjs"):
    text = path.read_text()
    changed = text.replace(OLD_CACHE, NEW_CACHE).replace(OLD_UI, NEW_UI).replace(OLD_PRIVACY, NEW_PRIVACY)
    if changed != text:
        path.write_text(changed)

# Extend the existing UI browser regression with the exact reported header conditions.
path = Path("tests/ui-icon-alignment.spec.mjs")
text = path.read_text()
if 'header omits duplicate sign-in shortcut' not in text:
    text += '''\n\ntest("V15.0.5 header omits duplicate sign-in shortcut and optically centers Dashboard utility glyph", async ({ page }) => {\n  await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });\n\n  await expect(page.locator("#privacySignInButton")).toHaveCount(0);\n  await expect(page.locator("#cloudSignIn")).toHaveCount(1);\n\n  const customize = page.locator("#customizeDashboardButton");\n  await expect(customize).toHaveAttribute("data-dashboard-toolbar-action", "true");\n  const geometry = await customize.evaluate(element => {\n    const button = getComputedStyle(element);\n    const glyph = getComputedStyle(element, "::before");\n    return {\n      width:button.width,\n      height:button.height,\n      display:button.display,\n      justifyItems:button.justifyItems,\n      alignItems:button.alignItems,\n      glyphWidth:glyph.width,\n      glyphHeight:glyph.height,\n      glyphTransform:glyph.transform,\n      glyphMargin:glyph.margin\n    };\n  });\n  expect(geometry.width).toBe("38px");\n  expect(geometry.height).toBe("38px");\n  expect(geometry.display).toBe("grid");\n  expect(geometry.justifyItems).toBe("center");\n  expect(geometry.alignItems).toBe("center");\n  expect(geometry.glyphWidth).toBe("20px");\n  expect(geometry.glyphHeight).toBe("20px");\n  expect(geometry.glyphTransform).toBe("matrix(1, 0, 0, 1, 0, 1)");\n  expect(geometry.glyphMargin).toBe("0px");\n});\n'''
path.write_text(text)

# Structural guard: the topbar shortcut must not be recreated and Settings sign-in stays intact.
path = Path("tests/validate-header-ui-v15-0-5.mjs")
path.write_text('''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst privacy = fs.readFileSync("privacy-lock.js", "utf8");\nconst index = fs.readFileSync("index.html", "utf8");\nconst css = fs.readFileSync("ui-icon-alignment-v15-0-5.css", "utf8");\nconst sw = fs.readFileSync("sw.js", "utf8");\nconst version = JSON.parse(fs.readFileSync("version.json", "utf8"));\nassert.doesNotMatch(privacy, /ensureTopbarSignIn/);\nassert.doesNotMatch(privacy, /createElement\\("button"\\)[\\s\\S]*privacySignInButton/);\nassert.match(privacy, /removeTopbarSignIn/);\nassert.match(index, /id="cloudSignIn"/);\nassert.match(css, /customizeDashboardButton\\[data-dashboard-toolbar-action\\]::before[\\s\\S]*translateY\\(1px\\)/);\nassert.match(index, /privacy-lock\\.js\\?v=15\\.0\\.5-ui1/);\nassert.match(index, /ui-icon-alignment-v15-0-5\\.css\\?v=15\\.0\\.5-ui2/);\nassert.equal(version.cacheVersion, "finance-v15-20260815-header-ui-r14");\nassert.match(sw, /finance-v15-20260815-header-ui-r14/);\nconsole.log("V15.0.5 header UI regression passed.");\n''')

# Include structural header regression in the normal quality gate.
path = Path("package.json")
text = path.read_text()
needle = '"test": "node tests/validate-pwa-updater-v15-0-5.mjs && '
if 'validate-header-ui-v15-0-5.mjs' not in text:
    assert needle in text
    text = text.replace(needle, '"test": "node tests/validate-header-ui-v15-0-5.mjs && node tests/validate-pwa-updater-v15-0-5.mjs && ')
path.write_text(text)
