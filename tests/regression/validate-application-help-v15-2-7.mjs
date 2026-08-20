import fs from "node:fs";
import assert from "node:assert/strict";

const read = file => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const html = read("index.html");
const help = read("assets/js/ui/application-help.js");
const prepare = read("scripts/prepare-runtime.mjs");
const worker = read("sw.js");
const workflow = read(".github/workflows/quality-pages.yml");
const version = JSON.parse(read("version.json"));

for (const marker of ["const HELP_CONTENT =", "function helpButtonFor", "function setupApplicationHelp", "function openContextHelp"]) assert.ok(help.includes(marker), `Missing extracted Help marker: ${marker}`);
for (const topic of ["dashboard-overview", "budget-page", "paid-page", "projects-page", "income-page", "settings-salary-work"]) assert.ok(help.includes(`"${topic}"`) || help.includes(`${topic}:`), `Missing Help topic: ${topic}`);
for (const forbidden of ["function clearAccountDropTargets", "function runV12Migration", "saveData(", "const SCHEMA_VERSION"]) assert.ok(!help.includes(forbidden), `Phase 5B crossed boundary: ${forbidden}`);
assert.ok(!html.includes("const HELP_CONTENT ="), "Help content still exists inline");
assert.ok(!html.includes("function setupApplicationHelp"), "Help setup still exists inline");
assert.ok(html.includes('<script src="./application-help.js?v=15.2.9-phase5b1"></script>'), "Application Help runtime tag missing");
assert.ok(html.includes("function clearAccountDropTargets()"), "Approved post-Help boundary changed");
assert.ok(prepare.includes('"assets/js/ui"') && prepare.includes('"application-help.js"'), "Nested runtime mapping missing");
assert.ok(worker.includes('asset("./application-help.js?v=15.2.9-phase5b1")'), "Service worker does not precache Application Help");
assert.ok(workflow.includes("cp assets/js/ui/*.js _site/") && workflow.includes("test -f _site/application-help.js"), "Pages nested packaging missing");
assert.equal(version.version, "15.2.18");
assert.equal(version.cacheVersion, "finance-v15-20260821-horizontal-kanban-r54");
console.log("Application Help V15.2.9 extraction validation passed.");
