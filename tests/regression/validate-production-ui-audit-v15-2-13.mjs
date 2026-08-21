import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const css = read("assets/css/production-ui-audit-v15-2-13.css");
const index = read("index.html");
const worker = read("sw.js");
const prepare = read("scripts/prepare-runtime.mjs");
const desktopUx = read("assets/css/desktop-ux-v15-2-0.css");
const browserAudit = read("tests/browser/production-ui-audit-v15-2-13.spec.mjs");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));

assert.equal(version.version, "15.2.19");
assert.equal(pkg.version, "15.2.19");
assert.equal(version.cacheVersion, "finance-v15-20260821-compact-expense-cards-r55");
assert.match(index, /production-ui-audit-v15-2-13\.css\?v=15\.2\.19-compact1/);
assert.ok(index.indexOf("production-ui-audit-v15-2-13.css") > index.indexOf("desktop-ux-v15-2-0.css"));
assert.match(worker, /production-ui-audit-v15-2-13\.css\?v=15\.2\.19-compact1/);
assert.match(prepare, /production-ui-audit-v15-2-13\.css/);

assert.match(css, /animation:\s*financeSummaryConfirm 420ms ease-out/);
assert.doesNotMatch(css, /translateY\s*\(/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /height:\s*38px !important/);
assert.match(css, /min-height:\s*56px !important/);
assert.match(css, /#money \.section-stack[\s\S]*gap:\s*8px !important/);
assert.match(css, /#money \.period-card[\s\S]*margin-top:\s*0 !important/);
assert.match(css, /#money \.period-header \.collapse-toggle[\s\S]*min-width:\s*44px !important/);
assert.match(css, /border-top:\s*1px solid var\(--line\) !important/);
assert.match(css, /-webkit-line-clamp:\s*2/);
assert.match(css, /Finance expense-period cleanup:[\s\S]*#money \.period-card \{[\s\S]*background:\s*var\(--surface\) !important;[\s\S]*border-color:\s*var\(--line\) !important;/);
assert.match(css, /#money :is\(#earlyExpenses, #lateExpenses, #otherExpenses\) > \.record-row\[data-expense-row\] \+ \.record-row\[data-expense-row\][\s\S]*margin-top:\s*5px !important;/);
assert.match(css, /Compact expense cards: static ownership[\s\S]*flex-shrink:\s*0 !important;[\s\S]*width:\s*max-content !important;[\s\S]*content:\s*"Repeat monthly" !important;/);

assert.match(desktopUx, /--budget-disclosure-reference-size/);
assert.match(desktopUx, /#dashCashFlowChart \.cash-flow-chart-grid/);
assert.match(browserAudit, /navigator\.serviceWorker\?\.controller\?\.scriptURL/);
assert.match(browserAudit, /finance-signed-in/);
assert.match(browserAudit, /window\.goToPage\("money"/);
assert.match(browserAudit, /summaries:8, periods:3/);

console.log("V15.2.19 production UI/UX audit source contract passed.");
