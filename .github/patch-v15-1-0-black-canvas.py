from pathlib import Path
import json, re

VERSION = "15.1.0"
RELEASE = "Black Canvas UI"
CACHE = "finance-v15-20260815-black-canvas-r15"
OLD_CACHE = "finance-v15-20260815-header-ui-r14"


def read(path): return Path(path).read_text()
def write(path, text): Path(path).write_text(text)

def replace_required(text, old, new, label):
    if old not in text:
        raise AssertionError(f"Missing {label}: {old}")
    return text.replace(old, new)

# Dedicated final palette layer. Both time-driven appearances retain the requested black canvas and blue primary.
Path("black-canvas-v15-1-0.css").write_text('''/* My Finance Records · V15.1.0 · Black Canvas UI */
/* Final palette layer. Geometry, finance content, and interaction behavior remain unchanged. */
:root,
html[data-theme="light"],
html[data-theme="dark"] {
  color-scheme:dark;
  --bg:#000000;
  --surface:#080b10;
  --surface-soft:#0e131b;
  --text:#f4f7fb;
  --muted:#9ca8b8;
  --line:#202938;
  --nav:#000000;
  --primary:#173e76;
  --primary-dark:#102f5c;
  --primary-contrast:#ffffff;
  --field-label:#dbe3ef;
  --nav-active-bg:#173e76;
  --nav-active-text:#ffffff;
  --shadow:0 10px 30px rgba(0,0,0,.42);
}
html, body, .app, .main { background:#000000; }
body { color:var(--text); }
.topbar { border-bottom-color:var(--line); }
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
.workspace-switcher-button:focus-visible {
  outline-color:color-mix(in srgb,var(--primary) 58%,transparent) !important;
}
.button-primary { background:var(--primary); color:var(--primary-contrast); }
.button-primary:hover { background:var(--primary-dark); }
input[type="checkbox"], input[type="radio"], progress { accent-color:var(--primary); }
''')

# Browser/PWA document identity and final palette asset.
path = Path("index.html")
text = path.read_text()
text = text.replace('<meta name="theme-color" content="#173b67">','<meta name="theme-color" content="#173e76">')
text = text.replace('<title>My Finance Records · V15.0.5</title>','<title>My Finance Records · V15.1.0</title>')
needle = '<link rel="stylesheet" href="./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui2">'
assert needle in text
text = text.replace(needle, needle + '\n  <link rel="stylesheet" href="./black-canvas-v15-1-0.css?v=15.1.0">')
text = text.replace('./pwa-update-v15-0-5.js?v=15.0.5','./pwa-update-v15-0-5.js?v=15.1.0')
text = text.replace('title="V15.0.5 · PWA Update Recovery · August 15, 2026">V15.0.5</small>', 'title="V15.1.0 · Black Canvas UI · August 15, 2026">V15.1.0</small>')
text = text.replace('const APP_VERSION = "15.0.5";', 'const APP_VERSION = "15.1.0";')
text = text.replace('const APP_RELEASE_NAME = "PWA Update Recovery";', 'const APP_RELEASE_NAME = "Black Canvas UI";')
text = text.replace(OLD_CACHE, CACHE)
text = text.replace('./cloud-sync.js?v=15.0.5','./cloud-sync.js?v=15.1.0')
text = text.replace('./sync-config.js?v=15.0.5','./sync-config.js?v=15.1.0')
path.write_text(text)

# PWA manifest uses the same black canvas and requested primary.
path = Path("manifest.webmanifest")
manifest = json.loads(path.read_text())
manifest["background_color"] = "#000000"
manifest["theme_color"] = "#173e76"
path.write_text(json.dumps(manifest, indent=2) + "\n")

# Offline page matches the V15.1.0 shell instead of flashing the legacy light/green palette.
path = Path("offline.html")
text = path.read_text()
text = text.replace('#173b67','#173e76').replace('background:#f5f7fa;color:#182230','background:#000000;color:#f4f7fb')
text = text.replace('border:1px solid #e4e7ec;border-radius:8px;background:#fff;box-shadow:0 14px 40px rgba(16,24,40,.08)', 'border:1px solid #202938;border-radius:8px;background:#080b10;box-shadow:0 14px 40px rgba(0,0,0,.42)')
text = text.replace('p{color:#667085;', 'p{color:#9ca8b8;')
text = text.replace('body { background:#101614; color:#f1f5f3; }', 'body { background:#000000; color:#f4f7fb; }')
text = text.replace('main { background:#18211f; border-color:#34413d;', 'main { background:#080b10; border-color:#202938;')
text = text.replace('p { color:#a8b2ae; }', 'p { color:#9ca8b8; }')
text = text.replace('a { color:#73d4ae; }', 'a { color:#7aa6e8; }')
path.write_text(text)

# Liquid Glass chrome is retinted from green/light material to black + #173e76.
path = Path("liquid-glass-v15.css")
text = path.read_text()
text = re.sub(r':root \{\n  --liquid-glass-surface:.*?\n\}', ''':root {
  --liquid-glass-surface:rgba(4,8,14,.74);
  --liquid-glass-surface-strong:rgba(7,12,20,.90);
  --liquid-glass-surface-soft:rgba(18,27,41,.58);
  --liquid-glass-border:rgba(93,139,204,.20);
  --liquid-glass-edge:rgba(125,166,224,.26);
  --liquid-glass-shadow:0 14px 36px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(0,0,0,.28);
  --liquid-glass-shadow-soft:0 8px 22px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.07);
  --liquid-glass-active:rgba(23,62,118,.82);
  --liquid-glass-hover:rgba(25,42,66,.78);
  --liquid-glass-blur:22px;
  --liquid-glass-saturate:145%;
  --liquid-glass-radius:7px;
}''', text, count=1, flags=re.S)
text = re.sub(r'html\[data-theme="dark"\] \{\n  --liquid-glass-surface:.*?\n\}', '''html[data-theme="dark"] {
  --liquid-glass-surface:rgba(4,8,14,.74);
  --liquid-glass-surface-strong:rgba(7,12,20,.90);
  --liquid-glass-surface-soft:rgba(18,27,41,.58);
  --liquid-glass-border:rgba(93,139,204,.20);
  --liquid-glass-edge:rgba(125,166,224,.26);
  --liquid-glass-shadow:0 14px 36px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(0,0,0,.28);
  --liquid-glass-shadow-soft:0 8px 22px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.07);
  --liquid-glass-active:rgba(23,62,118,.82);
  --liquid-glass-hover:rgba(25,42,66,.78);
}''', text, count=1, flags=re.S)
path.write_text(text)

# Release metadata.
version_path = Path("version.json")
version = json.loads(version_path.read_text())
version.update({
  "version": VERSION,
  "cacheVersion": CACHE,
  "released": "2026-08-15",
  "name": RELEASE,
  "notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, and Liquid Glass controls while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."
})
version_path.write_text(json.dumps(version, indent=2) + "\n")

for filename in ["package.json", "package-lock.json"]:
    path = Path(filename)
    data = json.loads(path.read_text())
    data["version"] = VERSION
    if filename == "package-lock.json": data.setdefault("packages", {}).setdefault("", {})["version"] = VERSION
    path.write_text(json.dumps(data, indent=2) + "\n")

# Runtime release identities; no cloud algorithm/schema changes.
path = Path("sync-config.js")
text = path.read_text().replace('const VERSION = "15.0.5";', 'const VERSION = "15.1.0";').replace('const RELEASE_NAME = "PWA Update Recovery";', 'const RELEASE_NAME = "Black Canvas UI";')
path.write_text(text)
path = Path("cloud-sync.js")
text = path.read_text().replace('const APP_VERSION_FALLBACK = "15.0.5";', 'const APP_VERSION_FALLBACK = "15.1.0";')
path.write_text(text)

# Service worker: new version/cache generation and fresh palette assets.
path = Path("sw.js")
text = path.read_text()
text = text.replace('const APP_VERSION = "15.0.5";', 'const APP_VERSION = "15.1.0";').replace(OLD_CACHE, CACHE)
text = text.replace('asset("./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui2"),', 'asset("./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui2"),\n  asset("./black-canvas-v15-1-0.css?v=15.1.0"),')
text = text.replace('asset("./pwa-update-v15-0-5.js?v=15.0.5")', 'asset("./pwa-update-v15-0-5.js?v=15.1.0")')
text = text.replace('asset("./liquid-glass-v15.css?v=15.0.5")', 'asset("./liquid-glass-v15.css?v=15.1.0")')
text = text.replace('asset("./cloud-sync.js?v=15.0.5")', 'asset("./cloud-sync.js?v=15.1.0")')
text = text.replace('asset("./sync-config.js?v=15.0.5")', 'asset("./sync-config.js?v=15.1.0")')
path.write_text(text)

# Installer rename/update.
old_installer = Path("Install_V15_0_5.command")
new_installer = Path("Install_V15_1_0.command")
text = old_installer.read_text().replace("V15.0.5", "V15.1.0").replace("15.0.5", "15.1.0")
new_installer.write_text(text)
old_installer.unlink()

# README / changelog.
path = Path("README.md")
text = path.read_text()
text = re.sub(r'^# My Finance Records · V15\.0\.5', '# My Finance Records · V15.1.0', text, count=1)
anchor = '## Recent updates\n\n'
entry = '- **V15.1.0 · Black Canvas UI** — Changes the app canvas to #000000 and the primary interface color to #173e76 across desktop, phone, PWA chrome, and Liquid Glass controls while preserving finance and sync behavior.\n'
assert anchor in text
text = text.replace(anchor, anchor + entry, 1)
path.write_text(text)

path = Path("CHANGELOG.md")
text = path.read_text()
entry = '''## 15.1.0 · 2026-08-15

### Changed
- Set the app canvas/background to `#000000` across both appearance modes and the offline/PWA shell.
- Set the primary interface color to `#173e76`, including primary buttons, active navigation, focus accents, browser chrome, and manifest theme color.
- Retinted V15 Liquid Glass navigation, toolbars, menus, popovers, and active controls to the black-and-blue palette without changing their geometry or blur behavior.

### Delivery
- Released the visual refresh as V15.1.0 and rotated the PWA shell to `finance-v15-20260815-black-canvas-r15` with a dedicated final palette stylesheet.
- Finance Schema 12, Cloud Schema V3, finance records, calculations, ledger behavior, Dashboard/card dimensions, and five-minute Cloud Sync cadence are unchanged.

'''
path.write_text(entry + text)

# Release inspection + current validators.
path = Path("tests/inspect-project.mjs")
text = path.read_text()
text = text.replace('"ui-icon-alignment-v15-0-5.css", "pwa-update-v15-0-5.js"', '"ui-icon-alignment-v15-0-5.css", "black-canvas-v15-1-0.css", "pwa-update-v15-0-5.js"')
text = text.replace('"Install_V15_0_5.command"', '"Install_V15_1_0.command"')
text = text.replace('"tests/validate-v15-0-5.mjs"', '"tests/validate-v15-1-0.mjs"')
text = text.replace('if (!deploySources.has("ui-icon-alignment-v15-0-5.css")) fail("GitHub Pages must package ui-icon-alignment-v15-0-5.css");', 'if (!deploySources.has("ui-icon-alignment-v15-0-5.css")) fail("GitHub Pages must package ui-icon-alignment-v15-0-5.css");\nif (!deploySources.has("black-canvas-v15-1-0.css")) fail("GitHub Pages must package black-canvas-v15-1-0.css");')
text = text.replace('pkg.version !== "15.0.5"', 'pkg.version !== "15.1.0"').replace('Expected current package version 15.0.5', 'Expected current package version 15.1.0')
text = text.replace('# My Finance Records · V15.0.5', '# My Finance Records · V15.1.0').replace('README release heading is not V15.0.5', 'README release heading is not V15.1.0')
text = text.replace('## 15.0.5 · 2026-08-15', '## 15.1.0 · 2026-08-15').replace('CHANGELOG latest entry is not V15.0.5', 'CHANGELOG latest entry is not V15.1.0')
text = text.replace('["Install_V15_0_5.command", "run_audit.sh"]', '["Install_V15_1_0.command", "run_audit.sh"]')
text = text.replace('Repository inspection passed: V15.0.5 release files', 'Repository inspection passed: V15.1.0 release files')
path.write_text(text)

# Rename the main release validator and align current-release assertions across tests.
old_validator = Path("tests/validate-v15-0-5.mjs")
new_validator = Path("tests/validate-v15-1-0.mjs")
text = old_validator.read_text()
text = text.replace('validate-v15-0-5', 'validate-v15-1-0').replace('15.0.5','15.1.0').replace('15\\.0\\.5','15\\.1\\.0').replace('PWA Update Recovery','Black Canvas UI').replace(OLD_CACHE,CACHE).replace('Install_V15_0_5.command','Install_V15_1_0.command')
text = text.replace('const uiCss = read("ui-icon-alignment-v15-0-5.css");', 'const uiCss = read("ui-icon-alignment-v15-0-5.css");\nconst palette = read("black-canvas-v15-1-0.css");')
text = text.replace('assert.match(uiCss,/gap:4px !important/);', 'assert.match(uiCss,/gap:4px !important/);\nassert.match(palette,/--bg:#000000/);\nassert.match(palette,/--primary:#173e76/);')
new_validator.write_text(text)
old_validator.unlink()

for test in Path("tests").glob("*.mjs"):
    text = test.read_text()
    text = text.replace(OLD_CACHE, CACHE)
    text = text.replace('15\\.0\\.5', '15\\.1\\.0').replace('15.0.5','15.1.0')
    text = text.replace('PWA Update Recovery', 'Black Canvas UI')
    text = text.replace('Install_V15_0_5.command', 'Install_V15_1_0.command')
    test.write_text(text)

# Dedicated palette regression.
Path("tests/validate-black-canvas-v15-1-0.mjs").write_text('''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const read = file => fs.readFileSync(file,"utf8");
const css = read("black-canvas-v15-1-0.css");
const liquid = read("liquid-glass-v15.css");
const index = read("index.html");
const offline = read("offline.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const version = JSON.parse(read("version.json"));
const worker = read("sw.js");
assert.match(css,/--bg:#000000/);
assert.match(css,/--primary:#173e76/);
assert.match(css,/html\\[data-theme="light"\\]/);
assert.match(css,/html\\[data-theme="dark"\\]/);
assert.match(css,/--nav-active-bg:#173e76/);
assert.match(liquid,/--liquid-glass-active:rgba\\(23,62,118,/);
assert.match(index,/<meta name="theme-color" content="#173e76">/);
assert.match(index,/black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0/);
assert.equal(manifest.background_color,"#000000");
assert.equal(manifest.theme_color,"#173e76");
assert.match(offline,/background:#000000/);
assert.equal(version.version,"15.1.0");
assert.equal(version.cacheVersion,"finance-v15-20260815-black-canvas-r15");
assert.match(worker,/black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0/);
console.log("V15.1.0 Black Canvas palette regression passed.");
''')

# Browser computed-style regression for both appearance modes.
Path("tests/black-canvas-v15-1-0.spec.mjs").write_text('''import { test, expect } from "@playwright/test";
for (const theme of ["light","dark"]) {
  test(`V15.1.0 Black Canvas uses exact palette in ${theme} appearance`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("simple-finance-theme-v1", value), theme);
    await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });
    const result = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return { bg:root.getPropertyValue("--bg").trim(), primary:root.getPropertyValue("--primary").trim(), bodyBg:body.backgroundColor };
    });
    expect(result.bg).toBe("#000000");
    expect(result.primary).toBe("#173e76");
    expect(result.bodyBg).toBe("rgb(0, 0, 0)");
  });
}
''')

# Test chain uses the new release + palette guards.
path = Path("package.json")
data = json.loads(path.read_text())
test_script = data["scripts"]["test"]
test_script = test_script.replace('node tests/validate-v15-0-5.mjs','node tests/validate-v15-1-0.mjs')
if 'validate-black-canvas-v15-1-0.mjs' not in test_script:
    test_script = 'node tests/validate-black-canvas-v15-1-0.mjs && ' + test_script
data["scripts"]["test"] = test_script
path.write_text(json.dumps(data, indent=2) + "\n")

# Ensure package-lock still reflects package.json version after package.json rewrite.
lock = json.loads(Path("package-lock.json").read_text())
lock["version"] = VERSION
lock.setdefault("packages",{}).setdefault("",{})["version"] = VERSION
Path("package-lock.json").write_text(json.dumps(lock, indent=2) + "\n")
