#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-4.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.4 Dashboard grid baseline failed");

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

for (const token of [
  "--compact-summary-height:70px",
  "--compact-summary-padding-block:10px",
  "--compact-summary-padding-inline:11px",
  "height:var(--compact-summary-height)",
  "min-height:var(--compact-summary-height)",
  "padding:var(--compact-summary-padding-block) var(--compact-summary-padding-inline)",
  "#income .compact-income-grid { grid-template-columns:repeat(5,minmax(0,1fr)); }",
  "#paid-expenses .compact-paid-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }",
  "#income .compact-summary-grid .kpi-meta",
  "#paid-expenses .compact-summary-grid .kpi-meta",
  "white-space:nowrap",
  "text-overflow:ellipsis",
  "height:auto; min-height:var(--compact-summary-height)"
]) assert(html.includes(token), `Compact summary safeguard missing: ${token}`);

assert(fs.existsSync(path.join(root, "COMPACT_SUMMARY_HEIGHT_VALIDATION_V12_18_5.md")), "V12.18.5 validation document is missing");

if (failures.length) {
  console.error("\nV12.18.5+ compact summary baseline failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("\nV12.18.5+ compact summary baseline passed.");
console.log("- Income and Paid Expenses share the 70px desktop summary height");
console.log("- Five-column Income and four-column Paid Expenses layouts remain protected");
console.log("- Tablet/phone expansion, release agreement, schema 12, and earlier regression baselines passed");
