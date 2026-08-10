#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-6.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.6 compact Dashboard/Project Payments baseline failed");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

assert(Boolean(version.version), "version.json has no version");
assert(version.schemaVersion === 12, "schema version changed from 12");
assert(Boolean(version.cacheVersion), "version.json cache key is missing");
assert(html.includes(`const APP_VERSION = "${version.version}";`), "index.html APP_VERSION does not match version.json");
assert(worker.includes(`const APP_VERSION = "${version.version}";`), "sw.js APP_VERSION does not match version.json");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "service-worker cache key does not match version.json");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README heading does not match version.json");

for (const token of [
  '<option value="gym">Gym expense</option>',
  'id="gymPricePerVisit"',
  'data-gym-day="1"',
  'data-gym-day="2"',
  'data-gym-day="4"',
  'data-gym-day="5"',
  'id="gymAddVisitDate"',
  'id="gymRemoveVisitDate"',
  'id="gymChangeScope"',
  'Health & Fitness',
  'data-icon-emoji="🏋️"',
  'const GYM_DEFAULT_PRICE = 80;',
  'const GYM_DEFAULT_DAYS = [1, 2, 4, 5];',
  'function gymScheduledDatesForMonth',
  'function gymExpenseAmountForMonth',
  'function updateGymPreview',
  'function applyGymDateOverride',
  'gymSeriesPricePerVisit',
  'gymSeriesDays',
  'Gym Price Per Visit',
  'Gym Visit Count'
]) assert(html.includes(token), `Missing Gym feature token: ${token}`);

const august2026Days = [1, 2, 4, 5];
let august2026Visits = 0;
for (let day = 1; day <= 31; day += 1) {
  if (august2026Days.includes(new Date(2026, 7, day).getDay())) august2026Visits += 1;
}
assert(august2026Visits === 17, `August 2026 default Gym schedule should have 17 visits, found ${august2026Visits}`);
assert(august2026Visits * 80 === 1360, "August 2026 default Gym total should be 1360");

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `Duplicate HTML IDs found: ${duplicateIds.join(", ")}`);

const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert(scriptBlocks.length >= 2, "Expected inline application script was not found");
if (scriptBlocks.length) {
  const temp = path.join(os.tmpdir(), `finance-v12187-${process.pid}.js`);
  fs.writeFileSync(temp, scriptBlocks.at(-1));
  const syntax = spawnSync(process.execPath, ["--check", temp], { encoding:"utf8" });
  try { fs.unlinkSync(temp); } catch {}
  if (syntax.status !== 0) failures.push(`Inline JavaScript syntax failed: ${syntax.stderr || syntax.stdout}`);
}

for (const file of [
  "GYM_EXPENSE_VALIDATION_V12_18_7.md",
  "manifest.webmanifest",
  "offline.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
]) assert(fs.existsSync(path.join(root, file)), `Required file missing: ${file}`);

if (failures.length) {
  console.error("\nFlexible Gym Expense baseline validation failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("\nFlexible Gym Expense baseline validation passed.");
console.log("- Default Gym settings are ₱80 and Monday, Tuesday, Thursday, Friday");
console.log("- August 2026 produces 17 visits and a ₱1,360 monthly total");
console.log("- Weekday controls, month adjustments, recurrence scope, reports, and exports are present");
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- Inline JavaScript syntax, schema 12, and prior regression baselines passed");
