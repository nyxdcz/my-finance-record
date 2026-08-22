import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const css = read("assets/css/production-ui-audit.css");
const compactCss = read("assets/css/expense-compact.css");
const compactJs = read("assets/js/ui/expense-compact.js");
const runtimeCss = read("production-ui-audit.css");
const runtimePhone = read("phone-finance-compat.js");
const index = read("index.html");
const worker = read("sw.js");
const desktopUx = read("assets/css/desktop-ux.css");
const version = JSON.parse(read("version.json"));
const query = "2.0.1-talaan2";

assert.equal(version.version, "2.0.1");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.ok(index.includes(`./production-ui-audit.css?v=${query}`));
assert.ok(worker.includes(`./production-ui-audit.css?v=${query}`));
assert.ok(index.indexOf("production-ui-audit.css") > index.indexOf("desktop-ux.css"));
assert.match(runtimeCss, /TALAAN RUNTIME OVERLAY/);
assert.match(runtimePhone, /installCompactExpenseCardEnhancements/);

assert.match(css, /animation:\s*financeSummaryConfirm 420ms ease-out/);
assert.doesNotMatch(css, /translateY\s*\(/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /min-height:\s*56px !important/);
assert.match(css, /#money \.section-stack[\s\S]*gap:\s*8px !important/);
assert.match(css, /#money \.period-header \.collapse-toggle[\s\S]*min-width:\s*44px !important/);
assert.match(index, /data-toggle-saved="\$\{item\.id\}"[^>]*>[\s\S]*class="saved-icon-container"/);
assert.match(index, /class="expense-select-footer"><input class="expense-select-checkbox"/);

assert.match(compactCss, /\.period-header h3[\s\S]*font-size:\s*15px !important;[\s\S]*font-weight:\s*700 !important/);
assert.match(compactCss, /\.period-header p[\s\S]*font-size:\s*10px !important;[\s\S]*font-weight:\s*400 !important/);
assert.match(compactCss, /\.period-card \.period-header \.collapse-toggle[\s\S]*width:\s*20px !important;[\s\S]*height:\s*20px !important/);
assert.match(compactCss, /\.collapse-icon[\s\S]*width:\s*16px !important;[\s\S]*height:\s*16px !important/);
assert.match(compactCss, /\.due-cell::before[\s\S]*content:\s*none !important/);
assert.match(compactCss, /\[data-mark-paid\][\s\S]*width:\s*74px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactCss, /\[data-edit-expense\][\s\S]*width:\s*48px !important;[\s\S]*height:\s*30px !important/);
assert.match(compactJs, /statuses\.insertBefore\(warning/);
assert.match(compactJs, /ensureCollapseChanged/);
assert.match(compactJs, /toggleCollapsibleSection/);
assert.match(desktopUx, /--budget-disclosure-reference-size/);
assert.match(desktopUx, /#dashCashFlowChart \.cash-flow-chart-grid/);

console.log("Production UI, compact expenses, independent collapse behavior, and neutral runtime overlay validated.");
