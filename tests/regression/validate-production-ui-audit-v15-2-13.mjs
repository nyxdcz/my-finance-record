import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const css = read("assets/css/production-ui-audit-v15-2-13.css");
const index = read("index.html");
const worker = read("sw.js");
const prepare = read("scripts/prepare-runtime.mjs");
const desktopUx = read("assets/css/desktop-ux-v15-2-0.css");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));

assert.equal(version.version, "15.2.13");
assert.equal(pkg.version, "15.2.13");
assert.equal(version.cacheVersion, "finance-v15-20260820-production-ui-audit-r49");
assert.match(index, /production-ui-audit-v15-2-13\.css\?v=15\.2\.13-audit1/);
assert.ok(index.indexOf("production-ui-audit-v15-2-13.css") > index.indexOf("desktop-ux-v15-2-0.css"));
assert.match(worker, /production-ui-audit-v15-2-13\.css\?v=15\.2\.13-audit1/);
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

assert.match(desktopUx, /--budget-disclosure-reference-size/);
assert.match(desktopUx, /#dashCashFlowChart \.cash-flow-chart-grid/);

console.log("V15.2.13 production UI/UX audit source contract passed.");
