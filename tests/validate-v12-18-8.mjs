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

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-7.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("Flexible Gym Expense baseline failed");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

assert(Boolean(version.version), "version.json has no version");
assert(version.schemaVersion === 12, "schema version changed from 12");
assert(Boolean(version.cacheVersion), "cache key is missing");
assert(html.includes(`const APP_VERSION = "${version.version}";`), "index.html APP_VERSION does not match version.json");
assert(worker.includes(`const APP_VERSION = "${version.version}";`), "sw.js APP_VERSION does not match version.json");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "service-worker cache key does not match version.json");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README heading does not match version.json");

for (const forbidden of [
  'data-settings-tab="appearance"',
  'data-settings-panel="appearance"',
  'if (!pickerIcon("expense")) setIconPicker("expense", { type:"emoji", value:"🏋️" })',
  'pickerIcon("expense") || (gymItem ? { type:"emoji", value:"🏋️" } : null)',
  'normalizeRecordIcon(item.icon || (isGym ? { type:"emoji", value:"🏋️" } : null)'
]) assert(!html.includes(forbidden), `Removed behavior still present: ${forbidden}`);

for (const required of [
  'data-settings-tab="accounts"',
  'Version History',
  'versionHistoryCardHtml',
  'class="version-history-entry"',
  'data-icon-emoji="🏋️"',
  'icon: pickerIcon("expense") || null',
  'icon: normalizeRecordIcon(item.icon || null, iconLibrary)',
  'function cycleThemePreference()'
]) assert(html.includes(required), `Required V12.18.8 token missing: ${required}`);


assert(/SETTINGS_PANELS = \["accounts", "calendar",(?: "cloud",)? "backup", "offline", "advanced"\]/.test(html), "Settings panel order no longer preserves the V12.18.8 categories");
assert(html.includes("Manage accounts, calendar, recovery, offline app controls, and advanced information.") || html.includes("Manage accounts, calendar, cloud sync, recovery, offline app controls, and advanced information."), "Settings description no longer covers the preserved categories");

assert(html.includes('<details class="version-history-entry" ${index === 0 ? "open" : ""}>'), "Newest version is not configured to open by default");
assert(html.includes('if (!SETTINGS_PANELS.includes(key)) key = "accounts";'), "Invalid Settings keys do not fall back to Accounts & Savings");
assert(html.includes('activateSettingsPanel(SETTINGS_PANELS.includes(initial) ? initial : "accounts", false);'), "Settings default is not Accounts & Savings");
assert((html.match(/"version": "V12\./g) || []).length >= 10, "Version history has too few documented releases");

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `Duplicate HTML IDs found: ${duplicateIds.join(", ")}`);

const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert(scriptBlocks.length >= 2, "Expected inline application script was not found");
if (scriptBlocks.length) {
  const temp = path.join(os.tmpdir(), `finance-v12188-${process.pid}.js`);
  fs.writeFileSync(temp, scriptBlocks.at(-1));
  const syntax = spawnSync(process.execPath, ["--check", temp], { encoding:"utf8" });
  try { fs.unlinkSync(temp); } catch {}
  if (syntax.status !== 0) failures.push(`Inline JavaScript syntax failed: ${syntax.stderr || syntax.stdout}`);
}
const workerSyntax = spawnSync(process.execPath, ["--check", path.join(root, "sw.js")], { encoding:"utf8" });
if (workerSyntax.status !== 0) failures.push(`Service-worker syntax failed: ${workerSyntax.stderr || workerSyntax.stdout}`);

for (const file of [
  "OPTIONAL_GYM_ICON_VALIDATION_V12_18_8.md",
  "SETTINGS_VERSION_HISTORY_VALIDATION_V12_18_8.md",
  "manifest.webmanifest",
  "offline.html",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
]) assert(fs.existsSync(path.join(root, file)), `Required file missing: ${file}`);

if (failures.length) {
  console.error("\nV12.18.8 Optional Gym Emoji & Settings History validation failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log("\nV12.18.8 Optional Gym Emoji & Settings History validation passed.");
console.log("- Gym icons are optional and the manual Gym emoji remains available");
console.log("- Appearance was removed from Settings while toolbar theme cycling remains");
console.log("- Accounts & Savings is the Settings fallback and default");
console.log("- Advanced contains offline collapsible version history");
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- Inline JavaScript, service worker, schema 12, and prior regression baselines passed");
