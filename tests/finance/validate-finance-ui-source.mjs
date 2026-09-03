import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const worker = read("sw.js");
const interaction = read("interaction-patterns.js");
const budget = read("budget-planning.js");
const productivity = read("productivity-tools.js");
const ledger = read("account-ledger.js");
const formInputs = read("form-inputs.js");
const compactCss = read("assets/css/expense-compact.css");
const compactJs = read("assets/js/ui/expense-compact.js");
const budgetCss = read("assets/css/budget-planning.css");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const query = "2.5.0-talaan1";
const accountIntegrityQuery = "2.5.0-account-integrity2";

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
assert.match(index, /<h2 id="income-title">Income &amp; Planning<\/h2>/, "Income page must expose its planning role");
assert.equal((index.match(/workspace-label-desktop">Income &amp; Planning/g) || []).length, 3, "Every Finance switcher must use the renamed desktop label");
assert.match(budget, /incomeSummary\?\.insertAdjacentHTML\("beforebegin"/, "Monthly budget plan must be inserted before the Income summary");
assert.match(budget, /PAGE_RENDERERS\.income = renderIncomePage/, "Income renderer must own monthly budget presentation");
assert.doesNotMatch(budget, /PAGE_RENDERERS\.money = renderMoneyPage/, "Budget & Expenses must no longer own monthly budget presentation");
assert.match(productivity, /monthlyBudgets:\{label:"Monthly budget",page:"income"\}/, "Monthly budget navigation must target Income & Planning");
assert.match(productivity, /budgetTemplates:\{label:"Budget template",page:"income"\}/, "Budget template navigation must follow the planner");
assert.match(budget, /<h4>Cash-flow &amp; savings forecast<\/h4>/, "The existing forecast panel must own the savings outlook");
assert.match(budget, /id="monthlySavingsTarget"/, "Savings target must be directly editable");
assert.match(budget, /id="savingsMonthConfirmed" type="checkbox"/, "Each selected month must have an explicit savings confirmation");
assert.match(budget, /savingsProgress:normalizeSavingsProgress\(value\?\.savingsProgress\)/, "Savings confirmation must persist independently on each monthly plan");
assert.match(budget, /Tracking only:<\/strong> confirming savings does not change any account balance/, "Savings confirmation must not imply a balance transfer");
assert.match(budget, /function savingsProjection\(startMonth, previewTarget = null\)/, "Savings outlook must calculate a four-month projection");
assert.match(budget, /plan\.savingsProgress = \{confirmed,actualAmount/, "Savings confirmation must preserve the actual amount");
assert.match(budgetCss, /\.cash-forecast-panel \{ border-radius:7px; \}/, "The integrated savings panel must use the approved 7px radius");
assert.match(budgetCss, /\.savings-money-input \.input,\.savings-target-controls \.button \{ border-radius:7px !important; \}/, "Savings controls must use the approved 7px radius");
assert.match(budgetCss, /\.savings-check-row input \{[^}]*border-radius:7px;/, "Savings confirmation must use the approved 7px radius");
assert.match(ledger, /const saved = saveData\(/s, "Record spending must persist before final UI refresh");
assert.match(ledger, /storedLedger\.length !== 1/, "Record spending must verify one ledger debit");
assert.match(formInputs, /function evaluateArithmeticExpression/);
assert.match(formInputs, /function validateMoneyInput/);
assert.match(formInputs, /function setupNumericInputs/);
assert.match(formInputs, /Object\.assign\(root/);
assert.match(compactCss, /\.period-header h3[\s\S]*font-size:\s*15px !important;[\s\S]*font-weight:\s*700 !important/);
assert.match(compactCss, /\.period-card \.period-header \.collapse-toggle[\s\S]*width:\s*30px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactCss, /\[data-mark-paid\][\s\S]*width:\s*74px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactCss, /\[data-edit-expense\][\s\S]*width:\s*48px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactJs, /statuses\.insertBefore\(warning/);
assert.match(compactJs, /ensureCollapseChanged/);
assert.match(compactJs, /toggleCollapsibleSection/);

for (const icon of ["repeat-monthly-off.png", "repeat-monthly-on.png"]) {
  assert.ok(fs.existsSync(`icons/${icon}`), `${icon} must exist`);
  assert.ok(compactCss.includes(`./icons/${icon}?v=${query}`), `compact expense styles must use ${icon}`);
  assert.ok(worker.includes(`./icons/${icon}?v=${query}`), `service worker must precache ${icon}`);
}
assert.match(compactCss, /\[data-toggle-saved\] \.saved-icon\s*\{[\s\S]*opacity:\s*0 !important;/, "text star must remain visually hidden behind PNG artwork");

for (const file of ["interaction-patterns.js", "budget-planning.js", "form-inputs.js"]) {
  assert.ok(index.includes(`./${file}?v=${query}`), `index must load ${file} with the Talaan query`);
  assert.ok(worker.includes(`./${file}?v=${query}`), `service worker must precache ${file}`);
}
assert.ok(index.includes(`./account-ledger.js?v=${accountIntegrityQuery}`), "index must load account-ledger.js with the Account Integrity query");
assert.ok(worker.includes(`./account-ledger.js?v=${accountIntegrityQuery}`), "service worker must precache account-ledger.js with the Account Integrity query");
assert.equal(version.version, "2.5.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(pkg.version, version.version);
assert.equal(lock.version, version.version);
assert.equal(lock.packages[""].version, version.version);

console.log("Finance UI, spending persistence, form inputs, compact expenses, replaceable repeat icons, and Talaan runtime pins validated.");
