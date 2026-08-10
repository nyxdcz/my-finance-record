#!/usr/bin/env node
import fs from "node:fs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const version = JSON.parse(fs.readFileSync(new URL("../version.json", import.meta.url), "utf8"));
const checks = [
  [version.schemaVersion === 12, "schema version remains 12"],
  [/dashboard-card-grid[\s\S]*grid-auto-flow:dense/.test(html), "Dashboard uses dense bento placement"],
  [/dashboard-detail-card\[data-size="small"\]/.test(html), "Small Dashboard card rule exists"],
  [/dashboard-detail-card\[data-size="large"\]/.test(html), "Large Dashboard card rule exists"],
  [/dashboard-detail-card\[data-size="wide"\]/.test(html), "Wide Dashboard card rule exists"],
  [/DEFAULT_DASHBOARD_SIZES/.test(html), "default Dashboard sizes exist"],
  [/dashboardAllowedSizes/.test(html), "restricted chart sizes exist"],
  [/data-dashboard-size=/.test(html), "customizer size selector exists"],
  [/sizes:\s*\{\s*\.\.\.DEFAULT_DASHBOARD_SIZES\s*\}/.test(html), "Reset restores Dashboard size defaults"],
  [/compact-income-grid/.test(html), "compact Income summary grid exists"],
  [/compact-paid-grid/.test(html), "compact Paid Expenses summary grid exists"],
  [/#income \.compact-income-grid \{ grid-template-columns:repeat\(5,minmax\(0,1fr\)\); \}/.test(html), "Income uses five desktop columns"],
  [/#paid-expenses \.compact-paid-grid \{ grid-template-columns:repeat\(4,minmax\(0,1fr\)\); \}/.test(html), "Paid Expenses uses four desktop columns"],
  [/--compact-summary-height:70px/.test(html), "shared compact summary height is 70px"],
  [/#income \.compact-summary-grid \.kpi-card,[\s\S]*#paid-expenses \.compact-summary-grid \.kpi-card[\s\S]*height:var\(--compact-summary-height\)/.test(html), "Income and Paid Expenses use the shared summary height"],
  [/dashboardPreferences\.sizes/.test(html), "saved Dashboard size preferences are used"],
  [/normalizeDashboardSize/.test(html), "saved Dashboard sizes are normalized"]
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error("V12.18.2 bento/compact baseline failed:");
  failed.forEach(([, label]) => console.error(`- ${label}`));
  process.exit(1);
}
console.log("V12.18.2 bento/compact baseline passed.");
checks.forEach(([, label]) => console.log(`- ${label}`));
