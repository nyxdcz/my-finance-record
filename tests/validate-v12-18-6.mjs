#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-5.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.5 compact summary baseline failed");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

assert(version.schemaVersion === 12, "schema version changed from 12");
const htmlVersion = html.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerVersion = worker.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerCache = worker.match(/const CACHE_VERSION = "([^"]+)";/)?.[1];
assert(Boolean(version.version), "version.json has no version");
assert(htmlVersion === version.version, "index.html APP_VERSION does not match version.json");
assert(workerVersion === version.version, "sw.js APP_VERSION does not match version.json");
assert(workerCache === version.cacheVersion, "sw.js cache key does not match version.json");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README heading does not match version.json");

const releaseCssStart = html.indexOf("/* V12.18.6 · Compact Dashboard monthly overview and Project Payments summaries. */");
const releaseCssEnd = html.indexOf("</style>", releaseCssStart);
const releaseCss = releaseCssStart >= 0 && releaseCssEnd > releaseCssStart ? html.slice(releaseCssStart, releaseCssEnd) : "";
assert(Boolean(releaseCss), "V12.18.6 CSS layer is missing");
for (const token of [
  "#dashboard > .kpi-grid .kpi-card",
  "#payments > .kpi-grid .kpi-card",
  "min-height:54px",
  "height:auto",
  "padding:6px 9px",
  "#dashboard > .kpi-grid .kpi-meta",
  "text-overflow:ellipsis",
  "@media (max-width:850px)"
]) assert(releaseCss.includes(token), `V12.18.6 safeguard missing: ${token}`);

assert(!/(^|[;{\s])height\s*:\s*54px/.test(releaseCss.replace(/min-height\s*:\s*54px/g, "")), "Summary cards must not use a fixed 54px height");
assert(html.includes("#dashboard .month-insights-card { margin-top:9px; padding:11px 13px; }"), "Monthly Comparison styling changed unexpectedly");
assert(html.includes("--compact-summary-height:70px"), "Income/Paid Expenses V12.18.5 height changed unexpectedly");
assert(fs.existsSync(path.join(root, "COMPACT_DASHBOARD_PAYMENT_HEIGHT_VALIDATION_V12_18_6.md")), "V12.18.6 validation document is missing");

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicates.length === 0, `Duplicate HTML IDs found: ${duplicates.join(", ")}`);

if (failures.length) {
  console.error("\nCompact Dashboard/Project Payments baseline validation failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("\nCompact Dashboard/Project Payments baseline validation passed.");
console.log("- Dashboard Monthly Overview uses a flexible 54px minimum height");
console.log("- Project Payments summaries use a flexible 54px minimum height");
console.log("- Monthly Comparison and V12.18.5 Income/Paid Expenses sizing remain protected");
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- Release agreement, schema 12, and all earlier regression baselines passed");
