import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const shell = read("assets/css/shell-ui.css");
const app = read("assets/css/app.css");
const help = read("assets/js/ui/application-help.js");
const headerTools = read("assets/js/ui/header-tools-compat.js");
const worker = read("sw.js");
const workflow = read(".github/workflows/quality-pages.yml");
const query = "2.0.1-talaan5";

for (const contract of [".pwa-install-guide-dialog", ".finance-privacy-lock-view", "--nav-active-bg", ".settings-search-panel", "body.sidebar-layout-pinned .main"]) {
  assert.ok(shell.includes(contract), `shell stylesheet must own ${contract}`);
  assert.ok(!app.includes(contract), `app.css must not duplicate ${contract}`);
}
for (const marker of ["const HELP_CONTENT =", "function helpButtonFor", "function setupApplicationHelp", "function openContextHelp"]) {
  assert.ok(help.includes(marker), `Application Help must contain ${marker}`);
}
for (const topic of ["dashboard-overview", "budget-page", "paid-page", "projects-page", "income-page", "settings-salary-work"]) {
  assert.ok(help.includes(`"${topic}"`) || help.includes(`${topic}:`), `Application Help must retain ${topic}`);
}
for (const forbidden of ["function clearAccountDropTargets", "function runLegacyDataMigration", "saveData(", "const SCHEMA_VERSION"]) {
  assert.ok(!help.includes(forbidden), `Application Help crossed a finance-data boundary: ${forbidden}`);
}
assert.ok(!index.includes("const HELP_CONTENT ="));
assert.ok(!index.includes("function setupApplicationHelp"));
assert.match(headerTools, /function installQuickEntryToolsMenuRelocation\(\)/);
assert.match(headerTools, /function installHeaderToolsRelocation\(\)/);
for (const file of ["shell-ui.css", "application-help.js", "header-tools-compat.js"]) {
  assert.ok(index.includes(`./${file}?v=${query}`), `index must load ${file}`);
  assert.ok(worker.includes(`./${file}?v=${query}`), `service worker must precache ${file}`);
}
assert.ok(workflow.includes("cp assets/js/ui/*.js _site/"));
assert.ok(workflow.includes("test -f _site/application-help.js"));
assert.ok(app.split(/\r?\n/).length < 5500, "app.css must retain maintainability headroom");

console.log("Application shell, Help boundaries, header tools, and CSS ownership validated.");
