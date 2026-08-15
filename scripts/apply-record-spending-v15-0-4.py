from pathlib import Path
import json, re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)

# 1) Remove the obsolete Dashboard forecast renderer call that breaks Record spending.
budget = read('budget-planning.js')
old_budget = 'renderDashboard = function budgetRenderDashboard(...args) { const result=originalRenderDashboard(...args); injectUi(); renderDashboardBudgetForecast(); return result; };'
new_budget = 'renderDashboard = function budgetRenderDashboard(...args) { const result=originalRenderDashboard(...args); injectUi(); return result; };'
budget = replace_once(budget, old_budget, new_budget, 'budget dashboard wrapper')
if 'renderDashboardBudgetForecast();' in budget:
    raise SystemExit('obsolete renderDashboardBudgetForecast call still exists')
write('budget-planning.js', budget)

# 2) Do not roll back a successfully persisted spend only because a later UI refresh throws.
ledger = read('account-ledger.js')
old_refresh = '''  function refreshReconciledAccountState(account, targetBalance = null) {\n    recalculateBalances(data);\n    const actual = roundMoney(data.accounts?.[account] || 0);\n    if (targetBalance != null && Number.isFinite(Number(targetBalance)) && actual !== roundMoney(targetBalance)) {\n      console.warn(`Account ledger refresh mismatch for ${account}: expected ${roundMoney(targetBalance)}, calculated ${actual}`);\n    }\n    renderAll(false);\n    try { window.dispatchEvent(new CustomEvent("finance:account-balance-refreshed", { detail:{ account, balance:actual } })); } catch (error) {}\n    return actual;\n  }'''
new_refresh = '''  function refreshReconciledAccountState(account, targetBalance = null) {\n    recalculateBalances(data);\n    const actual = roundMoney(data.accounts?.[account] || 0);\n    if (targetBalance != null && Number.isFinite(Number(targetBalance)) && actual !== roundMoney(targetBalance)) {\n      console.warn(`Account ledger refresh mismatch for ${account}: expected ${roundMoney(targetBalance)}, calculated ${actual}`);\n    }\n    try {\n      renderAll(false);\n    } catch (error) {\n      console.error("Finance data was saved but the full interface refresh failed.", error);\n      try { renderMoneyPage(); } catch (refreshError) { console.error("Money workspace refresh also failed.", refreshError); }\n    }\n    try { window.dispatchEvent(new CustomEvent("finance:account-balance-refreshed", { detail:{ account, balance:actual } })); } catch (error) {}\n    return actual;\n  }'''
ledger = replace_once(ledger, old_refresh, new_refresh, 'account refresh guard')
write('account-ledger.js', ledger)

# 3) Release metadata.
pkg = json.loads(read('package.json'))
pkg['version'] = '15.0.4'
pkg['scripts']['test'] = 'node tests/validate-record-spending-v15-0-4.mjs && node tests/validate-safe-multidevice-sync.mjs && node tests/validate-expense-screenshot.mjs && node tests/validate-v15-0-4.mjs'
write('package.json', json.dumps(pkg, indent=2) + '\n')

lock = json.loads(read('package-lock.json'))
lock['version'] = '15.0.4'
lock['packages']['']['version'] = '15.0.4'
write('package-lock.json', json.dumps(lock, indent=2) + '\n')

version = json.loads(read('version.json'))
version.update({
    'version':'15.0.4',
    'cacheVersion':'finance-v15-20260815-record-spending-r8',
    'released':'2026-08-15',
    'name':'Record Spending Reliability',
    'notes':'Fixes Record spending and Add Expense refresh failures by removing the obsolete Dashboard forecast renderer, protects already-saved spend transactions from render-only rollback, and refreshes the PWA asset cache without changing Finance Schema 12 or Cloud Schema V3.'
})
write('version.json', json.dumps(version, indent=2) + '\n')

# 4) Main app release markers and fresh first-party asset pins.
index = read('index.html')
index = index.replace('<title>My Finance Records · V15.0.3</title>', '<title>My Finance Records · V15.0.4</title>')
index = index.replace('title="V15.0.3 · Safe Multi-device Sync · August 15, 2026">V15.0.3</small>', 'title="V15.0.4 · Record Spending Reliability · August 15, 2026">V15.0.4</small>')
index = replace_once(index, 'const APP_VERSION = "15.0.3";', 'const APP_VERSION = "15.0.4";', 'index APP_VERSION')
index = replace_once(index, 'const APP_RELEASE_NAME = "Safe Multi-device Sync";', 'const APP_RELEASE_NAME = "Record Spending Reliability";', 'index release name')
index = index.replace('./cloud-sync.js?v=15.0.3', './cloud-sync.js?v=15.0.4')
index = index.replace('./sync-config.js?v=15.0.3', './sync-config.js?v=15.0.4')
index = index.replace('./budget-planning.js?v=14.0.23', './budget-planning.js?v=15.0.4')
index = index.replace('./account-ledger.js?v=14.0.23', './account-ledger.js?v=15.0.4')
entry = '{"version":"V15.0.4","title":"Record Spending Reliability","changes":["Removes the obsolete Dashboard budget-forecast renderer that caused Record spending to throw and roll back.","Protects a verified saved spending transaction from being undone by a later render-only failure and keeps the Money workspace refresh best-effort.","Refreshes account-ledger and budget-planning PWA assets for desktop and phone without changing Finance Schema 12, Cloud Schema V3, or finance calculations."]},'
index = replace_once(index, '    VERSION_HISTORY.unshift(', '    VERSION_HISTORY.unshift(' + entry, 'version history insert')
write('index.html', index)

sync = read('sync-config.js')
sync = replace_once(sync, 'const VERSION = "15.0.3";', 'const VERSION = "15.0.4";', 'sync-config VERSION')
sync = replace_once(sync, 'const RELEASE_NAME = "Safe Multi-device Sync";', 'const RELEASE_NAME = "Record Spending Reliability";', 'sync-config release name')
write('sync-config.js', sync)

cloud = read('cloud-sync.js')
cloud = replace_once(cloud, 'const APP_VERSION_FALLBACK = "15.0.3";', 'const APP_VERSION_FALLBACK = "15.0.4";', 'cloud fallback version')
write('cloud-sync.js', cloud)

worker = read('sw.js')
worker = replace_once(worker, 'const APP_VERSION = "15.0.3";', 'const APP_VERSION = "15.0.4";', 'worker APP_VERSION')
worker = replace_once(worker, 'const CACHE_VERSION = "finance-v15-20260815-safe-multidevice-sync-r7";', 'const CACHE_VERSION = "finance-v15-20260815-record-spending-r8";', 'worker cache')
worker = worker.replace('./cloud-sync.js?v=15.0.3', './cloud-sync.js?v=15.0.4')
worker = worker.replace('./sync-config.js?v=15.0.3', './sync-config.js?v=15.0.4')
worker = worker.replace('./budget-planning.js?v=14.0.23', './budget-planning.js?v=15.0.4')
worker = worker.replace('./account-ledger.js?v=14.0.23', './account-ledger.js?v=15.0.4')
worker = worker.replace('// V15.0.3 safe multi-device sync refresh · preserves pending device edits, reviews overlapping conflicts, adds protected device-to-cloud recovery, and forces installed PWAs to fetch the repaired sync client.', '// V15.0.4 record-spending reliability refresh · removes the obsolete budget forecast renderer, protects verified spend persistence from render-only failures, and forces installed PWAs to fetch repaired finance modules.')
write('sw.js', worker)

# 5) README and changelog.
readme = read('README.md')
readme = replace_once(readme, '# My Finance Records · V15.0.3', '# My Finance Records · V15.0.4', 'README heading')
needle = '## Recent updates\n\n'
readme = replace_once(readme, needle, needle + '- **V15.0.4 · Record Spending Reliability** — Fixes Record spending/Add Expense refresh failures, protects verified saved spends from render-only rollback, and refreshes the repaired account-ledger/budget modules on desktop and phone.\n', 'README recent updates')
write('README.md', readme)

changelog = read('CHANGELOG.md')
new_log = '''## 15.0.4 · 2026-08-15\n\n### Fixed\n- Removed the stale `renderDashboardBudgetForecast()` call left behind after the Dashboard cash-flow forecast boxes were intentionally removed.\n- Restored **Record spending** and related expense saves that were rolling back with `renderDashboardBudgetForecast is not defined`.\n- Protected a successfully persisted spending transaction from being undone solely because a later interface refresh throws.\n\n### Delivery\n- Pinned `account-ledger.js` and `budget-planning.js` to V15.0.4 and rotated the PWA cache so phones and installed PWAs receive the repaired modules.\n- Finance Schema 12, Cloud Schema V3, ledger rules, expense calculations, and five-minute Cloud Sync cadence are unchanged.\n\n'''
write('CHANGELOG.md', new_log + changelog)

# 6) Rename installer and release validator, then update release guards.
old_installer = ROOT / 'Install_V15_0_3.command'
new_installer = ROOT / 'Install_V15_0_4.command'
old_installer.rename(new_installer)
installer = read('Install_V15_0_4.command').replace('15.0.3','15.0.4').replace('V15.0.3','V15.0.4')
write('Install_V15_0_4.command', installer)

old_validator = ROOT / 'tests/validate-v15-0-3.mjs'
new_validator = ROOT / 'tests/validate-v15-0-4.mjs'
old_validator.rename(new_validator)
validator = read('tests/validate-v15-0-4.mjs')
validator = validator.replace('15.0.3','15.0.4').replace('V15.0.3','V15.0.4')
validator = validator.replace('Safe Multi-device Sync','Record Spending Reliability')
validator = validator.replace('finance-v15-20260815-safe-multidevice-sync-r7','finance-v15-20260815-record-spending-r8')
validator = validator.replace('Install_V15_0_3.command','Install_V15_0_4.command')
validator = validator.replace('V15.0.3 release validation passed.','V15.0.4 release validation passed.')
write('tests/validate-v15-0-4.mjs', validator)

inspect = read('tests/inspect-project.mjs')
inspect = inspect.replace('Install_V15_0_3.command','Install_V15_0_4.command')
inspect = inspect.replace('tests/validate-v15-0-3.mjs','tests/validate-v15-0-4.mjs')
inspect = inspect.replace('"tests/validate-safe-multidevice-sync.mjs"', '"tests/validate-record-spending-v15-0-4.mjs", "tests/validate-safe-multidevice-sync.mjs"')
inspect = inspect.replace('15.0.3','15.0.4').replace('V15.0.3','V15.0.4')
write('tests/inspect-project.mjs', inspect)

safe = read('tests/validate-safe-multidevice-sync.mjs')
safe = safe.replace('finance-v15-20260815-safe-multidevice-sync-r7','finance-v15-20260815-record-spending-r8')
safe = safe.replace('cloud-sync.js?v=15.0.3','cloud-sync.js?v=15.0.4')
write('tests/validate-safe-multidevice-sync.mjs', safe)

shot = read('tests/validate-expense-screenshot.mjs')
shot = shot.replace('finance-v15-20260815-safe-multidevice-sync-r7','finance-v15-20260815-record-spending-r8')
write('tests/validate-expense-screenshot.mjs', shot)

# 7) Add focused regression validation for the exact failure path.
record_test = '''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst read = file => fs.readFileSync(file, "utf8");\nconst budget = read("budget-planning.js");\nconst ledger = read("account-ledger.js");\nconst index = read("index.html");\nconst worker = read("sw.js");\nconst pkg = JSON.parse(read("package.json"));\n\nassert.doesNotMatch(budget, /renderDashboardBudgetForecast\\(\\);/, "obsolete Dashboard forecast renderer must not be called");\nassert.match(budget, /budgetRenderDashboard\\(\\.\\.\\.args\\).*injectUi\\(\\); return result;/s, "Budget dashboard wrapper should render only supported UI");\nassert.match(ledger, /try \\{\\s*renderAll\\(false\\);\\s*\\} catch \\(error\\)/, "saved spending must survive a render-only failure");\nassert.match(ledger, /renderMoneyPage\\(\\)/, "Money workspace should have a best-effort refresh fallback");\nassert.match(ledger, /const saved = saveData\\(`/s, "Record spending must persist before final UI refresh");\nassert.match(ledger, /storedLedger\\.length !== 1/, "Record spending must still verify exactly one ledger debit");\nconst saveAt = ledger.indexOf("const saved = saveData(");\nconst refreshAt = ledger.indexOf("refreshReconciledAccountState(account, expectedAfter)", saveAt);\nassert.ok(saveAt >= 0 && refreshAt > saveAt, "verified persistence must happen before final UI refresh");\nassert.match(index, /account-ledger\\.js\\?v=15\\.0\\.4/, "account-ledger asset must be freshly pinned");\nassert.match(index, /budget-planning\\.js\\?v=15\\.0\\.4/, "budget-planning asset must be freshly pinned");\nassert.match(worker, /finance-v15-20260815-record-spending-r8/, "PWA cache must rotate for phone delivery");\nassert.match(worker, /account-ledger\\.js\\?v=15\\.0\\.4/, "worker must precache repaired account ledger");\nassert.match(worker, /budget-planning\\.js\\?v=15\\.0\\.4/, "worker must precache repaired budget planning");\nassert.equal(pkg.version, "15.0.4");\nconsole.log("V15.0.4 Record spending regression validation passed.");\n'''
write('tests/validate-record-spending-v15-0-4.mjs', record_test)

print('V15.0.4 patch applied successfully.')
