import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const worker = read("sw.js");
const desktop = read("assets/css/desktop-ui-phase1.css");
const desktopUx = read("assets/css/desktop-ux.css");
const icons = read("assets/css/ui-icon-alignment.css");
const blackCanvas = read("assets/css/black-canvas.css");
const workflow = read(".github/workflows/quality-pages.yml");
const version = JSON.parse(read("version.json"));
const query = "2.5.0-talaan1";

for (const token of [
  '#income > .page-heading', '#money > .page-heading', '#projects > .page-heading',
  '#income .income-kpi-card', '.report-export-menu-panel', '.pc-date-near',
  '.advanced-settings-disclosure', '.paid-expenses-info-note', '.context-help-button',
  'dialog:not(.pc-full-dialog):not(.cloud-conflict-review-dialog)', '@media (min-width:1600px)'
]) assert.ok(desktop.includes(token), `desktop stylesheet must retain ${token}`);
assert.ok(desktop.includes('@media (min-width:851px)'));
assert.doesNotMatch(desktop, /max-width\s*:\s*700px/);
assert.match(desktop, /#availableMoneySection\s*\{[\s\S]*?border-color\s*:\s*var\(--line\)/);
assert.doesNotMatch(desktop, /border-color\s*:\s*color-mix\(in srgb,var\(--green\) 22%,var\(--line\)\)/);

assert.match(desktopUx, /--budget-disclosure-reference-size:var\(--ui-disclosure-size,40px\)/);
assert.match(desktopUx, /--budget-disclosure-reference-inset:17px/);
assert.match(desktopUx, /#money \.period-card \.period-header/);
assert.match(desktopUx, /#dashCashFlowChart \.cash-flow-chart-grid/);
assert.match(desktopUx, /\.cash-flow-summary-panel\{[\s\S]*padding:10px/);
assert.match(icons, /#money #moneyAccounts \.account-card-icon/);
assert.match(icons, /width:35px !important/);
assert.match(icons, /object-fit:contain !important/);
assert.ok(blackCanvas.length > 1000, "black canvas stylesheet must remain substantive");

for (const file of ["desktop-ui-phase1.css", "desktop-ux.css", "ui-icon-alignment.css", "black-canvas.css"]) {
  assert.ok(index.includes(`./${file}?v=${query}`), `index must load ${file}`);
  assert.ok(worker.includes(`./${file}?v=${query}`), `service worker must precache ${file}`);
  assert.ok(workflow.includes(`_site/${file}`) || workflow.includes("cp assets/css/*.css _site/"), `Pages workflow must package ${file}`);
}
assert.equal(version.version, "2.5.0");
assert.ok(worker.includes(version.cacheVersion));

console.log("Desktop UI hierarchy, budget disclosure geometry, account icons, and neutral Talaan assets validated.");
