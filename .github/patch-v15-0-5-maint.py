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

p = root / 'tests/validate-pwa-updater-v15-0-5.mjs'
s = p.read_text()
s = s.replace('const worker = fs.readFileSync("sw.js", "utf8");', 'const worker = fs.readFileSync("sw.js", "utf8");\nconst updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");')
s = s.replace('assert.match(index, /const FINANCE_CACHE_PATTERN = \\/\\\\^finance-v\\\\\\\\d\\\\\\+-\\//);', 'assert.match(updater, /const FINANCE_CACHE_PATTERN = \\/\\^finance-v\\\\d\\+-\\//);')
s = s.replace('assert.match(index, /names\\.includes\\(`\\\\$\\\\{APP_CACHE_VERSION\\\\}-shell`\\)/);', 'assert.match(index, /FinancePwaUpdate\\.shellCacheName\\(APP_CACHE_VERSION\\)/);')
s = s.replace('assert.match(index, /deleteFinanceAppCaches\\(\\)/);', 'assert.match(index, /FinancePwaUpdate\\.clearFinanceCaches\\(\\)/);')
s = s.replace('assert.match(index, /sw\\.js\\?v=\\\\$\\\\{encodeURIComponent\\(APP_VERSION\\)\\\\}&cache=\\\\$\\\\{encodeURIComponent\\(APP_CACHE_VERSION\\)\\\\}/);', 'assert.match(index, /FinancePwaUpdate\\.serviceWorkerUrl\\(APP_VERSION, APP_CACHE_VERSION\\)/);')
s = s.replace('assert.match(index, /const cacheChanged=Boolean\\(remote\\?\\.cacheVersion&&remote\\.cacheVersion!==APP_CACHE_VERSION\\)/);', 'assert.match(index, /FinancePwaUpdate\\.updateState\\(remote, APP_VERSION, APP_CACHE_VERSION\\)/);')
s += '\nassert.match(updater, /async clearFinanceCaches\\(\\)/);\nassert.match(updater, /serviceWorkerUrl\\(version, cacheVersion\\)/);\n'
p.write_text(s)

p = root / 'tests/validate-v15-0-5.mjs'
s = p.read_text()
s = s.replace('const worker = read("sw.js");', 'const worker = read("sw.js");\nconst updater = read("pwa-update-v15-0-5.js");')
s = s.replace('assert.match(worker,/const APP_VERSION = "15\\\\.0\\\\.5";/);', 'assert.match(worker,/const APP_VERSION = "15\\\\.0\\\\.5";/);\nassert.match(updater,/finance-v\\\\d\\+-/);')
p.write_text(s)

print('PWA updater helper extracted from index.html')
