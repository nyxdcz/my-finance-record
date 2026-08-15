#!/usr/bin/env python3
from pathlib import Path

root = Path('.')
module_name = 'pwa-update-v15-0-5.js'

module = '''"use strict";\n(function exposeFinancePwaUpdate(root) {\n  const FINANCE_CACHE_PATTERN = /^finance-v\\d+-/;\n  const api = {\n    financeCachePattern:FINANCE_CACHE_PATTERN,\n    shellCacheName(cacheVersion) { return `${cacheVersion}-shell`; },\n    serviceWorkerUrl(version, cacheVersion) { return `./sw.js?v=${encodeURIComponent(version)}&cache=${encodeURIComponent(cacheVersion)}`; },\n    updateState(remote, version, cacheVersion) {\n      return {\n        versionChanged:Boolean(remote?.version && remote.version !== version),\n        cacheChanged:Boolean(remote?.cacheVersion && remote.cacheVersion !== cacheVersion)\n      };\n    },\n    async clearFinanceCaches() {\n      if (!("caches" in root)) return 0;\n      const keys = await root.caches.keys();\n      const targets = keys.filter(key => FINANCE_CACHE_PATTERN.test(key));\n      await Promise.all(targets.map(key => root.caches.delete(key)));\n      return targets.length;\n    }\n  };\n  root.FinancePwaUpdate = api;\n})(typeof window !== "undefined" ? window : globalThis);\n'''
(root / module_name).write_text(module)

p = root / 'index.html'
s = p.read_text()
link = '  <link rel="stylesheet" href="./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1">'
script = '  <script src="./pwa-update-v15-0-5.js?v=15.0.5"></script>'
if script not in s:
    if link not in s: raise SystemExit('V15.0.5 UI link missing before PWA module insertion')
    s = s.replace(link, link + '\n' + script, 1)
helper = '''    const FINANCE_CACHE_PATTERN = /^finance-v\\d+-/;\n\n    async function deleteFinanceAppCaches() {\n      if (!("caches" in window)) return 0;\n      const keys = await caches.keys();\n      const targets = keys.filter(key => FINANCE_CACHE_PATTERN.test(key));\n      await Promise.all(targets.map(key => caches.delete(key)));\n      return targets.length;\n    }\n\n'''
if helper not in s: raise SystemExit('inline PWA cache helper block missing')
s = s.replace(helper, '', 1)
s = s.replace('names.includes(`${APP_CACHE_VERSION}-shell`)', 'names.includes(FinancePwaUpdate.shellCacheName(APP_CACHE_VERSION))')
s = s.replace('await deleteFinanceAppCaches();', 'await FinancePwaUpdate.clearFinanceCaches();')
s = s.replace('navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(APP_VERSION)}&cache=${encodeURIComponent(APP_CACHE_VERSION)}`, { scope: "./", updateViaCache:"none" })', 'navigator.serviceWorker.register(FinancePwaUpdate.serviceWorkerUrl(APP_VERSION, APP_CACHE_VERSION), { scope: "./", updateViaCache:"none" })')
old = '''            const remote=await response.json();\n            const versionChanged=Boolean(remote?.version&&remote.version!==APP_VERSION);\n            const cacheChanged=Boolean(remote?.cacheVersion&&remote.cacheVersion!==APP_CACHE_VERSION);\n            if(versionChanged||cacheChanged){\n              document.getElementById("pwaUpdateStatus").textContent=versionChanged?`Version ${remote.version} available`:"App shell update available";\n              await registration.update();\n              if(registration.waiting)showUpdateReady(registration);\n            }'''
new = '''            const remote=await response.json();\n            const { versionChanged, cacheChanged }=FinancePwaUpdate.updateState(remote, APP_VERSION, APP_CACHE_VERSION);\n            if(versionChanged||cacheChanged){ document.getElementById("pwaUpdateStatus").textContent=versionChanged?`Version ${remote.version} available`:"App shell update available"; await registration.update(); if(registration.waiting)showUpdateReady(registration); }'''
if old not in s: raise SystemExit('expanded remote update block missing')
s = s.replace(old, new, 1)
p.write_text(s)

p = root / 'sw.js'
s = p.read_text()
anchor = '  asset("./ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1"),'
module_asset = '  asset("./pwa-update-v15-0-5.js?v=15.0.5"),'
if module_asset not in s:
    if anchor not in s: raise SystemExit('worker UI asset anchor missing')
    s = s.replace(anchor, anchor + '\n' + module_asset, 1)
p.write_text(s)

p = root / '.github/workflows/quality-pages.yml'
s = p.read_text()
if module_name not in s:
    s = s.replace('ui-icon-alignment-v15-0-5.css dashboard-interactions-core-v14-0-23.css', 'ui-icon-alignment-v15-0-5.css pwa-update-v15-0-5.js dashboard-interactions-core-v14-0-23.css')
    s = s.replace('test -f _site/ui-icon-alignment-v15-0-5.css', 'test -f _site/ui-icon-alignment-v15-0-5.css\n          test -f _site/pwa-update-v15-0-5.js')
p.write_text(s)

p = root / 'tests/inspect-project.mjs'
s = p.read_text()
if '"pwa-update-v15-0-5.js"' not in s:
    s = s.replace('"ui-icon-alignment-v15-0-5.css", "liquid-glass-v15.css"', '"ui-icon-alignment-v15-0-5.css", "pwa-update-v15-0-5.js", "liquid-glass-v15.css"')
p.write_text(s)

(root / 'tests/validate-pwa-updater-v15-0-5.mjs').write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
assert.equal(version.version, "15.0.5");
assert.equal(version.cacheVersion, "finance-v15-20260815-pwa-update-r13");
assert.match(index, /const APP_CACHE_VERSION = "finance-v15-20260815-pwa-update-r13";/);
assert.match(index, /FinancePwaUpdate\.shellCacheName\(APP_CACHE_VERSION\)/);
assert.match(index, /FinancePwaUpdate\.clearFinanceCaches\(\)/);
assert.match(index, /registration\.scope === financeScope/);
assert.match(index, /FinancePwaUpdate\.serviceWorkerUrl\(APP_VERSION, APP_CACHE_VERSION\)/);
assert.match(index, /FinancePwaUpdate\.updateState\(remote, APP_VERSION, APP_CACHE_VERSION\)/);
assert.doesNotMatch(index, /finance-v\(\?:12\|13\)/);
assert.match(updater, /const FINANCE_CACHE_PATTERN = \/\^finance-v\\d\+-\//);
assert.match(updater, /serviceWorkerUrl\(version, cacheVersion\)/);
assert.match(updater, /cacheChanged:Boolean\(remote\?\.cacheVersion && remote\.cacheVersion !== cacheVersion\)/);
assert.match(updater, /async clearFinanceCaches\(\)/);
assert.match(worker, /const APP_VERSION = "15\.0\.5";/);
assert.match(worker, /finance-v15-20260815-pwa-update-r13/);
assert.match(worker, /pwa-update-v15-0-5\.js\?v=15\.0\.5/);
assert.match(worker, /ui-icon-alignment-v15-0-5\.css\?v=15\.0\.5-ui1/);
console.log("V15.0.5 PWA updater regression passed.");
''')

(root / 'tests/validate-v15-0-5.mjs').write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const version = JSON.parse(read("version.json"));
const index = read("index.html");
const uiCss = read("ui-icon-alignment-v15-0-5.css");
const worker = read("sw.js");
const updater = read("pwa-update-v15-0-5.js");
const cloud = read("cloud-sync.js");
const runtime = read("sync-config.js");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const installer = read("Install_V15_0_5.command");
assert.equal(pkg.version,"15.0.5");
assert.equal(lock.version,"15.0.5");
assert.equal(lock.packages?.[""]?.version,"15.0.5");
assert.equal(version.version,"15.0.5");
assert.equal(version.schemaVersion,12);
assert.equal(version.cloudSchemaVersion,3);
assert.equal(version.name,"PWA Update Recovery");
assert.equal(version.cacheVersion,"finance-v15-20260815-pwa-update-r13");
assert.match(index,/<title>My Finance Records · V15\.0\.5<\/title>/);
assert.match(index,/const APP_VERSION = "15\.0\.5";/);
assert.match(index,/const APP_RELEASE_NAME = "PWA Update Recovery";/);
assert.match(index,/ui-icon-alignment-v15-0-5\.css\?v=15\.0\.5-ui1/);
assert.match(index,/pwa-update-v15-0-5\.js\?v=15\.0\.5/);
assert.ok(index.indexOf('dashboard-interactions.css?v=14.0.23') < index.indexOf('ui-icon-alignment-v15-0-5.css?v=15.0.5-ui1'));
assert.match(uiCss,/html body #buildBadge::before/);
assert.match(uiCss,/content:none !important/);
assert.match(uiCss,/gap:4px !important/);
assert.match(updater,/FINANCE_CACHE_PATTERN/);
assert.match(worker,/const APP_VERSION = "15\.0\.5";/);
assert.match(worker,/finance-v15-20260815-pwa-update-r13/);
assert.match(cloud,/const APP_VERSION_FALLBACK = "15\.0\.5";/);
assert.match(runtime,/const VERSION = "15\.0\.5";/);
assert.match(runtime,/const RELEASE_NAME = "PWA Update Recovery";/);
assert.ok(readme.startsWith("# My Finance Records · V15.0.5"));
assert.ok(changelog.startsWith("## 15.0.5 · 2026-08-15"));
assert.match(installer,/V15\.0\.5/);
console.log("V15.0.5 release validation passed.");
''')

print('PWA updater helper extracted from index.html')
