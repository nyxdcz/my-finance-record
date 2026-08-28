import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const worker = read("sw.js");
const updater = read("pwa-update.js");
const cashFlow = read("cash-flow-summary.js");
const headerTools = read("header-tools-compat.js");
const phoneFinance = read("phone-finance-compat.js");
const version = JSON.parse(read("version.json"));
const query = "2.5.0-talaan1";

assert.equal(version.version, "2.5.0");
assert.equal(version.cacheVersion, "finance-v2-20260828-household-splits-r13");
assert.match(index, /FinancePwaUpdate\.shellCacheName\(APP_CACHE_VERSION\)/);
assert.match(index, /FinancePwaUpdate\.clearFinanceCaches\(\)/);
assert.match(index, /FinancePwaUpdate\.serviceWorkerUrl\(APP_VERSION, APP_CACHE_VERSION\)/);
assert.match(index, /FinancePwaUpdate\.updateState\(remote, APP_VERSION, APP_CACHE_VERSION\)/);
assert.match(updater, /const FINANCE_CACHE_PATTERN = \/\^finance-v\\d\+-\//);
assert.match(updater, /const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";/, "pre-Talaan cache alias stays compatibility-only");
assert.match(updater, /const CURRENT_CACHE_VERSION = "finance-v2-20260828-household-splits-r13";/);
assert.match(updater, /const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v2-0-1-talaan7";/);
assert.match(updater, /"\/cash-flow-summary\.js"/, "dashboard analytics runtime must be included in the generic stale-cache purge list");
assert.match(updater, /const DASHBOARD_PRESENTATION_REFRESH_KEY = "finance-dashboard-presentation-v2-5-0-talaan8";/);
assert.match(updater, /"\/income-expenses-compact\.css"/, "dashboard presentation stylesheet must be included in the dedicated stale-cache purge list");
assert.match(updater, /desktop-ui-phase1\.css/);
assert.match(updater, /black-canvas\.css/);
assert.match(updater, /production-ui-audit\.css/);
assert.doesNotMatch(updater, /desktop-ui-phase1-v15|black-canvas-v15|production-ui-audit-v15/);
assert.doesNotMatch(updater, /installSidebarBrand|installCashFlowStyles|installPhoneFinanceCompactUi/);
assert.match(phoneFinance, /function bindPhoneIconOnlyButton\(button, label, iconMarkup\)/);
assert.match(phoneFinance, /function enhancePhoneCompactButtons\(\)/);
assert.match(phoneFinance, /function installPhoneFinanceCompactUi\(\)/);
assert.match(headerTools, /function installQuickEntryToolsMenuRelocation\(\)/);
assert.match(headerTools, /function installHeaderToolsRelocation\(\)/);
assert.match(cashFlow, /function renderAnalytics\(force = false\)/);
assert.match(cashFlow, /function comparisonCopy\(current, previous\)/);
assert.match(cashFlow, /function rangeMonths\(rangeValue = activeRange, month = anchorMonth\(\)\)/);
assert.match(cashFlow, /FinanceIncomeExpensesDashboard/);
assert.match(cashFlow, /income-expenses-chart-card/);

for (const file of ["pwa-update.js", "phone-finance-compat.js", "header-tools-compat.js", "cash-flow-summary.js", "import-formats.js", "import-center.js", "import-center.css"]) {
  assert.ok(index.includes(`./${file}?v=${query}`), `index must load ${file}`);
  assert.ok(worker.includes(`./${file}?v=${query}`), `service worker must precache ${file}`);
}
assert.match(worker, /networkFirstCriticalAsset/);
assert.match(worker, /url\.pathname\.endsWith\("pwa-update\.js"\)/);
assert.match(worker, /url\.pathname\.endsWith\("production-ui-audit\.css"\)/);
assert.match(worker, /url\.pathname\.endsWith\("mobile\.css"\)/);
assert.match(worker, /url\.pathname\.endsWith\("black-canvas\.css"\)/);
assert.match(worker, /url\.pathname\.endsWith\("import-center\.js"\)/);
assert.match(worker, /url\.pathname\.endsWith\("import-formats\.js"\)/);
assert.match(worker, /url\.pathname\.endsWith\("import-center\.css"\)/);
assert.match(worker, /url\.pathname\.endsWith\("repeat-monthly-off\.png"\)/);
assert.match(worker, /url\.pathname\.endsWith\("repeat-monthly-on\.png"\)/);
assert.ok(worker.includes(version.cacheVersion));

console.log("Talaan PWA update, service-worker delivery, Income vs Expenses analytics ownership and cache refresh, replaceable repeat icons, and dedicated runtime ownership validated.");
