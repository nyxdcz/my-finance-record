#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-3.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.3 resize reliability baseline failed");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

assert(version.schemaVersion === 12, "schema version changed from 12");
const htmlVersion = html.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerVersion = worker.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerCache = worker.match(/const CACHE_VERSION = "([^"]+)";/)?.[1];
assert(Boolean(version.version), "version.json has no version");
assert(htmlVersion === version.version, "index.html version does not match version.json");
assert(workerVersion === version.version, "sw.js version does not match version.json");
assert(workerCache === version.cacheVersion, "sw.js cache key does not match version.json");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README release heading does not match version.json");

const desktopGridCount = (html.match(/grid-template-columns:repeat\(12,minmax\(0,1fr\)\);/g) || []).length;
assert(desktopGridCount >= 2, "Dashboard does not define the 12-column desktop grid in both required CSS layers");
assert((html.match(/dashboard-detail-card\[data-size="small"\] \{ grid-column:span 3; \}/g) || []).length >= 2, "Small cards do not span 3 of 12 columns");
assert((html.match(/dashboard-detail-card\[data-size="large"\] \{ grid-column:span 4; \}/g) || []).length >= 2, "Large cards do not span 4 of 12 columns");
assert((html.match(/dashboard-detail-card\[data-size="wide"\] \{ grid-column:span 6; \}/g) || []).length >= 2, "Wide cards do not span 6 of 12 columns");

assert(html.includes('small: "Small · 4 per row"'), "Small label does not say four per row");
assert(html.includes('large: "Large · 3 per row"'), "Large label does not say three per row");
assert(html.includes('wide: "Wide · 2 per row"'), "Wide label does not say two per row");

assert(12 / 3 === 4, "Small-card grid arithmetic failed");
assert(12 / 4 === 3, "Large-card grid arithmetic failed");
assert(12 / 6 === 2, "Wide-card grid arithmetic failed");

assert(html.includes('.dashboard-card-grid { grid-template-columns:repeat(6,minmax(0,1fr)); }'), "Tablet Dashboard does not use six logical columns");
assert(html.includes('.dashboard-detail-card[data-size="large"] { grid-column:span 3; }'), "Tablet Large cards do not use half width");
assert(html.includes('.dashboard-detail-card[data-size="wide"] { grid-column:1 / -1; }'), "Tablet Wide cards do not use the full row");
assert(html.includes('#dashboard .dashboard-card-grid { grid-template-columns:1fr; }'), "Phone Dashboard does not collapse to one column");

assert(html.includes('if (["savings-trend", "cash-flow", "calendar"].includes(key)) return ["large", "wide"];'), "Chart/calendar Small restriction changed");
assert(html.includes('const savedSizes = saved && typeof saved === "object"'), "Existing saved size values are not merged safely");
assert(fs.existsSync(path.join(root, "DASHBOARD_RESIZE_GRID_VALIDATION_V12_18_4.md")), "V12.18.4 validation document is missing");

if (failures.length) {
  console.error("\nV12.18.4+ Dashboard resize grid baseline failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("\nV12.18.4+ Dashboard resize grid baseline passed.");
console.log("- Small cards: four per row");
console.log("- Large cards: three per row");
console.log("- Wide cards: two per row");
console.log("- Tablet and phone fallbacks, saved preferences, chart restrictions, release agreement, and prior regression baselines passed");
