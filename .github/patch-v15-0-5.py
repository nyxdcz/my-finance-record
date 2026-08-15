#!/usr/bin/env python3
from pathlib import Path
import json
import re

root = Path('.')

def read(path):
    return (root / path).read_text()

def write(path, text):
    (root / path).write_text(text)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

VERSION = '15.0.5'
RELEASE = 'PWA Update Recovery'
DATE_TEXT = 'August 15, 2026'
CACHE = 'finance-v15-20260815-pwa-update-r13'
UI_FILE = 'ui-icon-alignment-v15-0-5.css'
UI_QUERY = '15.0.5-ui1'

# ----- index.html -----
p = root / 'index.html'
s = p.read_text()
s = replace_once(s, '<title>My Finance Records · V15.0.4</title>', '<title>My Finance Records · V15.0.5</title>', 'index title')
s = replace_once(s, '<link rel="stylesheet" href="./ui-icon-alignment-v15-0-4.css?v=15.0.4-ui3">', '<link rel="stylesheet" href="./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1">', 'alignment stylesheet link')
s = replace_once(s, '<small id="buildBadge" title="V15.0.4 · Record Spending Reliability · August 15, 2026">V15.0.4</small>', '<small id="buildBadge" title="V15.0.5 · PWA Update Recovery · August 15, 2026">V15.0.5</small>', 'build badge')
s = replace_once(s, '    const APP_VERSION = "15.0.4";\n    const APP_RELEASE_NAME = "Record Spending Reliability";\n    const APP_RELEASE_DATE = "August 15, 2026";', '    const APP_VERSION = "15.0.5";\n    const APP_RELEASE_NAME = "PWA Update Recovery";\n    const APP_RELEASE_DATE = "August 15, 2026";\n    const APP_CACHE_VERSION = "finance-v15-20260815-pwa-update-r13";', 'release constants')
# Fresh first-party scripts whose contents change in this release.
s = s.replace('cloud-sync.js?v=15.0.4', 'cloud-sync.js?v=15.0.5')
s = s.replace('sync-config.js?v=15.0.4', 'sync-config.js?v=15.0.5')

history_anchor = '    VERSION_HISTORY.unshift({"version":"V15.0.4","title":"Record Spending Reliability"'
if history_anchor not in s:
    raise SystemExit('version history V15.0.4 anchor not found')
entry = '    VERSION_HISTORY.unshift({"version":"V15.0.5","title":"PWA Update Recovery","changes":["Forces existing V15.0.4 clients to recognize a real app-version update and fetch the current service worker instead of treating cache-only releases as unchanged.","Tracks the exact current shell cache, clears stale V12-V15 Finance caches safely, and repairs only this Finance app service-worker scope without touching finance records.","Keeps the text-only build badge, compact 4px icon spacing, and centered Dashboard utility icon while preserving Finance Schema 12 and Cloud Schema V3."]},'
s = s.replace('    VERSION_HISTORY.unshift(', entry, 1)

status_old = 'document.getElementById("pwaCacheStatus").textContent = names.some(name => name.includes("finance-v13")) ? "Cached for offline use" : (serviceWorkerRegistration?.active ? "Ready · cache builds on use" : document.getElementById("pwaCacheStatus").textContent);'
status_new = 'document.getElementById("pwaCacheStatus").textContent = names.includes(`${APP_CACHE_VERSION}-shell`) ? "Cached for offline use" : (serviceWorkerRegistration?.active ? "Ready · cache builds on use" : document.getElementById("pwaCacheStatus").textContent);'
s = replace_once(s, status_old, status_new, 'PWA cache status')

helper_anchor = '    async function renderPwaStatus() {'
helper = '''    const FINANCE_CACHE_PATTERN = /^finance-v\\d+-/;\n\n    async function deleteFinanceAppCaches() {\n      if (!("caches" in window)) return 0;\n      const keys = await caches.keys();\n      const targets = keys.filter(key => FINANCE_CACHE_PATTERN.test(key));\n      await Promise.all(targets.map(key => caches.delete(key)));\n      return targets.length;\n    }\n\n'''
if helper_anchor not in s:
    raise SystemExit('renderPwaStatus anchor missing')
s = s.replace(helper_anchor, helper + helper_anchor, 1)

clear_pattern = re.compile(r'    async function clearAppCaches\(\) \{[\s\S]*?\n    \}\n\n    async function repairPwa\(\) \{', re.M)
clear_replacement = '''    async function clearAppCaches() {\n      if (!("caches" in window)) return showToast("Cache Storage is unavailable", "warning");\n      await deleteFinanceAppCaches();\n      if (serviceWorkerRegistration) {\n        try { await serviceWorkerRegistration.update(); } catch (error) {}\n        if (serviceWorkerRegistration.waiting) serviceWorkerRegistration.waiting.postMessage({ type:"SKIP_WAITING" });\n      }\n      await renderPwaStatus();\n      showToast("Offline app cache cleared · latest shell requested", "success");\n    }\n\n    async function repairPwa() {'''
s, n = clear_pattern.subn(clear_replacement, s, count=1)
if n != 1:
    raise SystemExit(f'clearAppCaches block replacement failed: {n}')

repair_pattern = re.compile(r'    async function repairPwa\(\) \{[\s\S]*?\n    \}\n\n    function showUpdateReady', re.M)
repair_replacement = '''    async function repairPwa() {\n      if (!isSecurePwaContext() || !("serviceWorker" in navigator)) return showToast("Open the app through HTTPS or localhost to repair PWA files", "warning");\n      if (!confirm("Repair the offline app shell? Finance records and PDF packs will remain.")) return;\n      const financeScope = new URL("./", location.href).href;\n      const registrations = await navigator.serviceWorker.getRegistrations();\n      await Promise.all(registrations.filter(registration => registration.scope === financeScope).map(registration => registration.unregister()));\n      await deleteFinanceAppCaches();\n      showToast("Offline app repaired · loading the latest shell", "success");\n      const repairUrl = new URL(location.href);\n      repairUrl.searchParams.set("pwa-repair", Date.now());\n      setTimeout(() => location.replace(repairUrl.toString()), 700);\n    }\n\n    function showUpdateReady'''
s, n = repair_pattern.subn(repair_replacement, s, count=1)
if n != 1:
    raise SystemExit(f'repairPwa block replacement failed: {n}')

register_old = 'const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`, { scope: "./", updateViaCache:"none" });'
register_new = 'const registration = await navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(APP_VERSION)}&cache=${encodeURIComponent(APP_CACHE_VERSION)}`, { scope: "./", updateViaCache:"none" });'
s = replace_once(s, register_old, register_new, 'service worker registration URL')
remote_old = 'if(response.ok){const remote=await response.json(); if(remote?.version&&remote.version!==APP_VERSION){document.getElementById("pwaUpdateStatus").textContent=`Version ${remote.version} available`; await registration.update(); if(registration.waiting)showUpdateReady(registration);}}'
remote_new = '''if(response.ok){\n            const remote=await response.json();\n            const versionChanged=Boolean(remote?.version&&remote.version!==APP_VERSION);\n            const cacheChanged=Boolean(remote?.cacheVersion&&remote.cacheVersion!==APP_CACHE_VERSION);\n            if(versionChanged||cacheChanged){\n              document.getElementById("pwaUpdateStatus").textContent=versionChanged?`Version ${remote.version} available`:"App shell update available";\n              await registration.update();\n              if(registration.waiting)showUpdateReady(registration);\n            }\n          }'''
s = replace_once(s, remote_old, remote_new, 'remote version/cache update check')
p.write_text(s)

# ----- fresh alignment stylesheet path -----
old_ui = root / 'ui-icon-alignment-v15-0-4.css'
new_ui = root / UI_FILE
ui = old_ui.read_text()
ui = ui.replace('V15.0.4 · cascade-safe icon alignment hotfix', 'V15.0.5 · delivered icon alignment layer')
ui = ui.replace('This file is the final visual layer after legacy interaction CSS.', 'This file is the final visual layer after legacy interaction CSS and ships under a new V15.0.5 URL.')
new_ui.write_text(ui)

# ----- sw.js -----
p = root / 'sw.js'
s = p.read_text()
s = replace_once(s, 'const APP_VERSION = "15.0.4";', 'const APP_VERSION = "15.0.5";', 'worker version')
s = replace_once(s, 'const CACHE_VERSION = "finance-v15-20260815-ui-align-r12";', 'const CACHE_VERSION = "finance-v15-20260815-pwa-update-r13";', 'worker cache')
s = s.replace('ui-icon-alignment-v15-0-4.css?v=15.0.4-ui3', 'ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1')
s = s.replace('cloud-sync.js?v=15.0.4', 'cloud-sync.js?v=15.0.5')
s = s.replace('sync-config.js?v=15.0.4', 'sync-config.js?v=15.0.5')
s = s.replace('liquid-glass-v15.css?v=15.0.3', 'liquid-glass-v15.css?v=15.0.5')
p.write_text(s)

# ----- release/runtime metadata -----
p = root / 'version.json'
v = json.loads(p.read_text())
v['version'] = VERSION
v['cacheVersion'] = CACHE
v['name'] = RELEASE
v['notes'] = 'Repairs V15 PWA update detection and stale-cache cleanup so existing V15.0.4 desktop and phone clients reliably load the delivered text-only badge and compact icon alignment while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior.'
p.write_text(json.dumps(v, indent=2) + '\n')

p = root / 'sync-config.js'
s = p.read_text()
s = replace_once(s, 'const VERSION = "15.0.4";', 'const VERSION = "15.0.5";', 'sync-config version')
s = replace_once(s, 'const RELEASE_NAME = "Record Spending Reliability";', 'const RELEASE_NAME = "PWA Update Recovery";', 'sync-config release name')
p.write_text(s)

p = root / 'cloud-sync.js'
s = p.read_text()
s = replace_once(s, 'const APP_VERSION_FALLBACK = "15.0.4";', 'const APP_VERSION_FALLBACK = "15.0.5";', 'cloud fallback version')
p.write_text(s)

# ----- package metadata -----
p = root / 'package.json'
pkg = json.loads(p.read_text())
pkg['version'] = VERSION
pkg['scripts']['test'] = 'node tests/validate-pwa-updater-v15-0-5.mjs && node tests/validate-record-spending-v15-0-4.mjs && node tests/validate-safe-multidevice-sync.mjs && node tests/validate-expense-screenshot.mjs && node tests/validate-v15-0-5.mjs'
p.write_text(json.dumps(pkg, indent=2) + '\n')

p = root / 'package-lock.json'
lock = json.loads(p.read_text())
lock['version'] = VERSION
lock['packages']['']['version'] = VERSION
p.write_text(json.dumps(lock, indent=2) + '\n')

# ----- installer rename -----
old_installer = root / 'Install_V15_0_4.command'
new_installer = root / 'Install_V15_0_5.command'
installer = old_installer.read_text().replace('V15.0.4', 'V15.0.5')
new_installer.write_text(installer)
new_installer.chmod(old_installer.stat().st_mode)
old_installer.unlink()

# ----- docs -----
p = root / 'README.md'
s = p.read_text()
s = replace_once(s, '# My Finance Records · V15.0.4', '# My Finance Records · V15.0.5', 'README heading')
recent = '- **V15.0.4 · Record Spending Reliability**'
if recent not in s:
    raise SystemExit('README recent release anchor missing')
s = s.replace(recent, '- **V15.0.5 · PWA Update Recovery** — Forces V15.0.4 clients onto a real app-version update, tracks the exact PWA shell cache, clears stale V12–V15 Finance caches safely, and delivers the corrected text-only badge/icon alignment on desktop and phone.\n' + recent, 1)
p.write_text(s)

p = root / 'CHANGELOG.md'
s = p.read_text()
entry = '''## 15.0.5 · 2026-08-15\n\n### Fixed\n- Released the UI delivery repair as a real app-version change so existing V15.0.4 clients detect and install the new service worker instead of treating cache-only revisions as unchanged.\n- Updated the service-worker registration URL to include both app version and shell cache generation.\n- Made the update check compare both `version` and `cacheVersion`.\n- Fixed App & About cache status, Clear app cache, and Repair offline app so stale V12–V15 Finance caches are recognized and removed.\n- Limited offline-app repair to this Finance app service-worker scope and preserved finance records and PDF packs.\n\n### Delivery\n- Rotated the PWA shell to `finance-v15-20260815-pwa-update-r13` and moved the final icon-alignment rules to a fresh V15.0.5 stylesheet URL.\n- Finance Schema 12, Cloud Schema V3, finance calculations, records, ledger behavior, and five-minute Cloud Sync cadence are unchanged.\n\n'''
if s.startswith('## 15.0.5'):
    raise SystemExit('CHANGELOG already contains V15.0.5 at top')
p.write_text(entry + s)

# ----- GitHub Pages production packaging -----
p = root / '.github/workflows/quality-pages.yml'
s = p.read_text()
s = s.replace('ui-icon-alignment-v15-0-4.css', 'ui-icon-alignment-v15-0-5.css')
p.write_text(s)

# ----- inspector -----
p = root / 'tests/inspect-project.mjs'
s = p.read_text()
s = s.replace('ui-icon-alignment-v15-0-4.css', 'ui-icon-alignment-v15-0-5.css')
s = s.replace('Install_V15_0_4.command', 'Install_V15_0_5.command')
s = s.replace('"tests/validate-v15-0-4.mjs",', '"tests/validate-v15-0-5.mjs", "tests/validate-pwa-updater-v15-0-5.mjs",')
s = s.replace('pkg.version !== "15.0.4"', 'pkg.version !== "15.0.5"')
s = s.replace('Expected current package version 15.0.4', 'Expected current package version 15.0.5')
s = s.replace('# My Finance Records · V15.0.4', '# My Finance Records · V15.0.5')
s = s.replace('README release heading is not V15.0.4', 'README release heading is not V15.0.5')
s = s.replace('## 15.0.4 · 2026-08-15', '## 15.0.5 · 2026-08-15')
s = s.replace('CHANGELOG latest entry is not V15.0.4', 'CHANGELOG latest entry is not V15.0.5')
s = s.replace('Repository inspection passed: V15.0.4 release files', 'Repository inspection passed: V15.0.5 release files')
p.write_text(s)

# ----- existing validators aligned to the release-only cache rotation -----
for name in ['validate-record-spending-v15-0-4.mjs', 'validate-safe-multidevice-sync.mjs', 'validate-expense-screenshot.mjs']:
    p = root / 'tests' / name
    s = p.read_text().replace('finance-v15-20260815-ui-align-r12', CACHE)
    p.write_text(s)

# ----- browser alignment regression now tests the fresh delivered file -----
p = root / 'tests/ui-icon-alignment.spec.mjs'
s = p.read_text()
s = s.replace('production V15.0.4 UI alignment uses the final ui2 stylesheet', 'production V15.0.5 UI alignment uses the delivered final stylesheet')
s = s.replace('ui-icon-alignment-v15-0-4.css?v=15.0.4-ui3', 'ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1')
s = s.replace('const ui2Css =', 'const uiCss =')
s = s.replace('expect(ui2Css).toBeGreaterThan(dashboardCss);', 'expect(uiCss).toBeGreaterThan(dashboardCss);')
p.write_text(s)

# ----- new structural PWA updater regression -----
(root / 'tests/validate-pwa-updater-v15-0-5.mjs').write_text('''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst index = fs.readFileSync("index.html", "utf8");\nconst worker = fs.readFileSync("sw.js", "utf8");\nconst version = JSON.parse(fs.readFileSync("version.json", "utf8"));\nassert.equal(version.version, "15.0.5");\nassert.equal(version.cacheVersion, "finance-v15-20260815-pwa-update-r13");\nassert.match(index, /const APP_CACHE_VERSION = "finance-v15-20260815-pwa-update-r13";/);\nassert.match(index, /const FINANCE_CACHE_PATTERN = \/\\^finance-v\\\\d\\\+-\//);\nassert.match(index, /names\.includes\(`\\$\\{APP_CACHE_VERSION\\}-shell`\)/);\nassert.match(index, /deleteFinanceAppCaches\(\)/);\nassert.doesNotMatch(index, /finance-v\(\?:12\\\|13\)/);\nassert.match(index, /registration\.scope === financeScope/);\nassert.match(index, /sw\.js\?v=\\$\\{encodeURIComponent\(APP_VERSION\)\\}&cache=\\$\\{encodeURIComponent\(APP_CACHE_VERSION\)\\}/);\nassert.match(index, /const cacheChanged=Boolean\(remote\?\.cacheVersion&&remote\.cacheVersion!==APP_CACHE_VERSION\)/);\nassert.match(worker, /const APP_VERSION = "15\.0\.5";/);\nassert.match(worker, /finance-v15-20260815-pwa-update-r13/);\nassert.match(worker, /ui-icon-alignment-v15-0-5\.css\?v=15\.0\.5-ui1/);\nconsole.log("V15.0.5 PWA updater regression passed.");\n''')

# ----- current release validator -----
(root / 'tests/validate-v15-0-5.mjs').write_text('''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst read = file => fs.readFileSync(file, "utf8");\nconst pkg = JSON.parse(read("package.json"));\nconst lock = JSON.parse(read("package-lock.json"));\nconst version = JSON.parse(read("version.json"));\nconst index = read("index.html");\nconst uiCss = read("ui-icon-alignment-v15-0-5.css");\nconst worker = read("sw.js");\nconst cloud = read("cloud-sync.js");\nconst runtime = read("sync-config.js");\nconst readme = read("README.md");\nconst changelog = read("CHANGELOG.md");\nconst installer = read("Install_V15_0_5.command");\nassert.equal(pkg.version,"15.0.5");\nassert.equal(lock.version,"15.0.5");\nassert.equal(lock.packages?.[""]?.version,"15.0.5");\nassert.equal(version.version,"15.0.5");\nassert.equal(version.schemaVersion,12);\nassert.equal(version.cloudSchemaVersion,3);\nassert.equal(version.name,"PWA Update Recovery");\nassert.equal(version.cacheVersion,"finance-v15-20260815-pwa-update-r13");\nassert.match(index,/<title>My Finance Records · V15\\.0\\.5<\\/title>/);\nassert.match(index,/const APP_VERSION = "15\\.0\\.5";/);\nassert.match(index,/const APP_RELEASE_NAME = "PWA Update Recovery";/);\nassert.match(index,/ui-icon-alignment-v15-0-5\\.css\\?v=15\\.0\\.5-ui1/);\nassert.ok(index.indexOf('dashboard-interactions.css?v=14.0.23') < index.indexOf('ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1'));\nassert.match(uiCss,/html body #buildBadge::before/);\nassert.match(uiCss,/content:none !important/);\nassert.match(uiCss,/gap:4px !important/);\nassert.match(worker,/const APP_VERSION = "15\\.0\\.5";/);\nassert.match(worker,/finance-v15-20260815-pwa-update-r13/);\nassert.match(cloud,/const APP_VERSION_FALLBACK = "15\\.0\\.5";/);\nassert.match(runtime,/const VERSION = "15\\.0\\.5";/);\nassert.match(runtime,/const RELEASE_NAME = "PWA Update Recovery";/);\nassert.ok(readme.startsWith("# My Finance Records · V15.0.5"));\nassert.ok(changelog.startsWith("## 15.0.5 · 2026-08-15"));\nassert.match(installer,/V15\\.0\\.5/);\nconsole.log("V15.0.5 release validation passed.");\n''')

# ----- JS-enabled stale V15 cache + current worker URL browser regression -----
(root / 'tests/pwa-upgrade-v15-0-5.spec.mjs').write_text('''import { test, expect } from "@playwright/test";\n\ntest("V15.0.5 registers the cache-qualified worker and clears stale Finance caches", async ({ page }) => {\n  await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });\n  await page.evaluate(async () => {\n    await navigator.serviceWorker.ready;\n    await caches.open("finance-v15-20260815-ui-align-r11-shell");\n    await caches.open("finance-v14-legacy-shell");\n    await caches.open("unrelated-test-cache");\n  });\n\n  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || ""), { timeout:15000 }).toContain("v=15.0.5");\n  const workerUrl = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || "");\n  expect(workerUrl).toContain("cache=finance-v15-20260815-pwa-update-r13");\n\n  await page.evaluate(async () => { await window.clearAppCaches(); });\n  const names = await page.evaluate(async () => caches.keys());\n  expect(names.filter(name => /^finance-v\\d+-/.test(name))).toEqual([]);\n  expect(names).toContain("unrelated-test-cache");\n});\n''')

# ----- ensure deployment explicitly packages the fresh stylesheet -----
workflow = read('.github/workflows/quality-pages.yml')
if UI_FILE not in workflow or f'test -f _site/{UI_FILE}' not in workflow:
    raise SystemExit('Pages workflow does not explicitly package/guard V15.0.5 alignment CSS')

print('V15.0.5 PWA updater patch applied successfully')
