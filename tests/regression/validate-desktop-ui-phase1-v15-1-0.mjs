import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const fail = message => { throw new Error(message); };

const html = read("index.html");
const css = read("desktop-ui-phase1-v15-1-0.css");
const worker = read("sw.js");
const workflow = read(".github/workflows/quality-pages.yml");
const version = JSON.parse(read("version.json"));

if (!html.includes('href="./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1"')) fail("Production HTML does not load the desktop Phase 1 stylesheet.");
if (!worker.includes('asset("./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1")')) fail("Service worker does not precache the desktop Phase 1 stylesheet.");
if (!workflow.includes("desktop-ui-phase1-v15-1-0.css")) fail("GitHub Pages packaging omits the desktop Phase 1 stylesheet.");
if (version.cacheVersion !== "finance-v15-20260821-runtime-stable-audit-r53") fail(`Unexpected cache version: ${version.cacheVersion}`);
if (!worker.includes('const CACHE_VERSION = "finance-v15-20260821-runtime-stable-audit-r53";')) fail("Service worker cache version is not the V15.2.17 production UI audit cache.");

for (const token of [
  '#income > .page-heading',
  '#money > .page-heading',
  '#projects > .page-heading',
  '#income .income-kpi-card',
  '.report-export-menu-panel',
  '.pc-date-near',
  '.advanced-settings-disclosure',
  '.paid-expenses-info-note',
  '.context-help-button',
  'dialog:not(.pc-full-dialog):not(.cloud-conflict-review-dialog)',
  '@media (min-width:1600px)'
]) if (!css.includes(token)) fail(`Desktop Phase 1 CSS is missing ${token}.`);

if (!css.includes('@media (min-width:851px)')) fail("Desktop Phase 1 CSS is not explicitly desktop-scoped.");
if (/max-width\s*:\s*700px/.test(css)) fail("Desktop Phase 1 stylesheet must not own phone layout rules.");

if (!html.includes('id="settingsOverviewAppStatus">Version 15.2.2</strong>')) fail("Settings overview starts with a stale app version.");
if (!html.includes('class="paid-expenses-info-note"')) fail("Paid Expenses contextual behavior note is missing.");
if (!html.includes('class="advanced-settings-disclosure"')) fail("Advanced cloud connection disclosure is missing.");
if (!html.includes('id="reportExportMenuPanel" role="menu"')) fail("Report export menu panel is missing.");
if (!html.includes('aria-controls="reportExportMenuPanel" aria-expanded="false"')) fail("Report export trigger does not expose menu state semantics.");

for (const id of ["exportMonthlyReportCsv","exportMonthlyReportJson","exportIncomeReportCsv","exportExpensesCsv","exportProjectsCsv"]) {
  if ((html.match(new RegExp(`id=\\"${id}\\"`, "g")) || []).length !== 1) fail(`${id} must remain unique after export-menu consolidation.`);
}

console.log("Desktop UI Phase 1 validation passed under V15.2.9: desktop hierarchy, compact Income, report export menu, calendar states, Settings disclosure, contextual Paid note, deployment packaging, and preserved phone-Finance/cloud-profile delivery are source-aligned.");
