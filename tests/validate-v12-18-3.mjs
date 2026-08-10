#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const run = script => {
  const result = spawnSync(process.execPath, [path.join(here, script)], { encoding:"utf8" });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) failures.push(`${script} failed`);
};
run("validate-v12-18-1.mjs");
run("validate-v12-18-2.mjs");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const assert = (condition, message) => { if (!condition) failures.push(message); };
const includes = (token, message = `Missing token: ${token}`) => assert(html.includes(token), message);

assert(version.schemaVersion === 12, "schema version changed from 12");

for (const token of [
  'id="dashboardCustomizeToolbar" hidden',
  'id="dashboardCardSettingsButton"',
  'id="dashboardToolbarResetButton"',
  'id="dashboardCustomizeDoneButton"',
  'id="previewDashboardLayoutButton"',
  'function startDashboardPointerResize(event)',
  'function moveDashboardPointerResize(event)',
  'function finishDashboardPointerResize(event)',
  'button.addEventListener("pointerdown", startDashboardPointerResize);',
  'button.addEventListener("pointermove", moveDashboardPointerResize);',
  'button.addEventListener("pointerup", finishDashboardPointerResize);',
  'button.addEventListener("pointercancel", finishDashboardPointerResize);',
  'Math.round(delta / 110)',
  'dataset.suppressResizeClick',
  'function setDashboardCustomizeMode(active, returnFocus = false)',
  'function resetDashboardLayout()',
  'pageId !== "dashboard" && document.getElementById("dashboard")?.classList.contains("dashboard-customizing")'
]) includes(token, `Bento resize safeguard missing: ${token}`);

includes('if (["savings-trend", "cash-flow", "calendar"].includes(key)) return ["large", "wide"];', "Chart size restriction missing");

for (const [key, order] of [["due-soon",1],["expense-schedule",2],["calendar",3],["savings-trend",4],["savings-goals",5],["cash-flow",6],["payment-progress",7],["accounts",8],["projects",9],["activity",10]]) {
  const token = `.dashboard-default-layout [data-dashboard-card="${key}"] { order:${order}; }`;
  assert((html.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length >= 2, `Complete mobile order missing or inconsistent for ${key}`);
}

assert(!fs.existsSync(path.join(here, "extracted-v12182.js")), "Temporary extracted JavaScript is still included");
assert(fs.existsSync(path.join(root, "BENTO_RESIZE_VALIDATION_V12_18_3.md")), "V12.18.3 validation document is missing");

if (failures.length) {
  console.error("\nV12.18.3 resize reliability baseline failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}
console.log("\nV12.18.3 resize reliability baseline passed.");
console.log("- Baseline UX reliability passed");
console.log("- Bento and compact-summary safeguards passed");
console.log("- Persistent customization, pointer drag snapping, keyboard alternatives, mobile order, and package cleanliness passed");
