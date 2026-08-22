#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const budget = read("budget-planning.js");
const ledger = read("account-ledger.js");
const index = read("index.html");
const worker = read("sw.js");
const pkg = JSON.parse(read("package.json"));
const version = JSON.parse(read("version.json"));

assert.doesNotMatch(budget, /renderDashboardBudgetForecast\(\);/, "obsolete Dashboard forecast renderer must not be called");
assert.match(budget, /budgetRenderDashboard\(\.\.\.args\).*injectUi\(\); return result;/s, "Budget dashboard wrapper should render only supported UI");
assert.match(ledger, /try \{\s*renderAll\(false\);\s*\} catch \(error\)/, "saved spending must survive a render-only failure");
assert.match(ledger, /renderMoneyPage\(\)/, "Money workspace should have a best-effort refresh fallback");
assert.match(ledger, /const saved = saveData\(`/s, "Record spending must persist before final UI refresh");
assert.match(ledger, /storedLedger\.length !== 1/, "Record spending must still verify exactly one ledger debit");
const saveAt = ledger.indexOf("const saved = saveData(");
const refreshAt = ledger.indexOf("refreshReconciledAccountState(account, expectedAfter)", saveAt);
assert.ok(saveAt >= 0 && refreshAt > saveAt, "verified persistence must happen before final UI refresh");
assert.match(index, /account-ledger\.js\?v=15\.0\.4/, "account-ledger asset must remain on its repaired pin");
assert.match(index, /budget-planning\.js\?v=15\.2\.1-ux1/, "budget-planning asset must remain on its repaired pin");
assert.match(index, /Talaan · V2\.0\.1/);
assert.ok(worker.includes(version.cacheVersion), "PWA cache must match the current Talaan release");
assert.match(worker, /account-ledger\.js\?v=15\.0\.4/, "worker must precache repaired account ledger");
assert.match(worker, /budget-planning\.js\?v=15\.2\.1-ux1/, "worker must precache repaired budget planning");
assert.equal(pkg.version, "2.0.1");
assert.equal(version.version, "2.0.1");
console.log("Record spending regression validation passed under Talaan V2.0.1 with repaired compatibility module pins preserved.");
