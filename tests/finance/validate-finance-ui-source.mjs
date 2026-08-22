import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const worker = read("sw.js");
const interaction = read("interaction-patterns.js");
const budget = read("budget-planning.js");
const ledger = read("account-ledger.js");
const formInputs = read("form-inputs.js");
const compactCss = read("assets/css/expense-compact.css");
const compactJs = read("assets/js/ui/expense-compact.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const query = "2.0.1-talaan2";

for (const [pageId, marqueeId] of [["income", "incomeFinanceWeekMarquee"], ["money", "financeWeekMarquee"], ["paid-expenses", "paidFinanceWeekMarquee"]]) {
  const start = index.indexOf(`id="${pageId}"`);
  assert.notEqual(start, -1, `${pageId} page must exist`);
  const next = index.indexOf('<section class="page', start + 1);
  const segment = index.slice(start, next === -1 ? index.length : next);
  const row = segment.indexOf('class="finance-workspace-marquee-row no-print"');
  const switcher = segment.indexOf('class="workspace-switcher money-workspace-switcher"', row);
  const marquee = segment.indexOf(`id="${marqueeId}"`, row);
  assert.ok(row >= 0 && switcher > row && marquee > switcher, `${pageId} tabs and marquee must share the Finance row`);
}

assert.equal(interaction.includes("alignFinanceWorkspaceMarquees"), false, "Finance marquee placement must be source-owned");
assert.match(budget, /budgetRenderDashboard\(\.\.\.args\).*injectUi\(\); return result;/s, "Budget dashboard wrapper must preserve supported UI injection");
assert.match(ledger, /const saved = saveData\(/s, "Record spending must persist before final UI refresh");
assert.match(ledger, /storedLedger\.length !== 1/, "Record spending must verify one ledger debit");
assert.match(formInputs, /function evaluateArithmeticExpression/);
assert.match(formInputs, /function validateMoneyInput/);
assert.match(formInputs, /function setupNumericInputs/);
assert.match(formInputs, /Object\.assign\(root/);
assert.match(compactCss, /\.period-header h3[\s\S]*font-size:\s*15px !important;[\s\S]*font-weight:\s*700 !important/);
assert.match(compactCss, /\.period-card \.period-header \.collapse-toggle[\s\S]*width:\s*20px !important;[\s\S]*height:\s*20px !important/);
assert.match(compactCss, /\[data-mark-paid\][\s\S]*width:\s*74px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactCss, /\[data-edit-expense\][\s\S]*width:\s*48px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactJs, /statuses\.insertBefore\(warning/);
assert.match(compactJs, /ensureCollapseChanged/);
assert.match(compactJs, /toggleCollapsibleSection/);

for (const file of ["interaction-patterns.js", "account-ledger.js", "budget-planning.js", "form-inputs.js"]) {
  assert.ok(index.includes(`./${file}?v=${query}`), `index must load ${file} with the Talaan query`);
  assert.ok(worker.includes(`./${file}?v=${query}`), `service worker must precache ${file}`);
}
assert.equal(version.version, "2.0.1");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(pkg.version, version.version);
assert.equal(lock.version, version.version);
assert.equal(lock.packages[""].version, version.version);

console.log("Finance UI, spending persistence, form inputs, compact expenses, and Talaan runtime pins validated.");
