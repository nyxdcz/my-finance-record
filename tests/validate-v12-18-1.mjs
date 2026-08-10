#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) failures.push(message); };
const includes = (text, token, message = `Missing token: ${token}`) => assert(text.includes(token), message);
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");

for (const file of ["index.html", "README.md", "sw.js", "version.json", "manifest.webmanifest", "offline.html"]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}
for (const file of ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}

const html = read("index.html");
const worker = read("sw.js");
const readme = read("README.md");
let version = {};
try { version = JSON.parse(read("version.json")); } catch (error) { failures.push(`Invalid version.json: ${error.message}`); }

// Release agreement without locking this baseline to a single patch version.
const htmlVersion = html.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerVersion = worker.match(/const APP_VERSION = "([^"]+)";/)?.[1];
const workerCache = worker.match(/const CACHE_VERSION = "([^"]+)";/)?.[1];
assert(Boolean(version.version), "version.json has no version");
assert(version.schemaVersion === 12, "Schema version changed from 12");
assert(htmlVersion === version.version, `index.html version ${htmlVersion} does not match version.json ${version.version}`);
assert(workerVersion === version.version, `sw.js version ${workerVersion} does not match version.json ${version.version}`);
assert(workerCache === version.cacheVersion, "sw.js cache key does not match version.json");
includes(readme, `# My Finance Records · V${version.version} PWA`, "README release heading does not match version.json");
for (const token of [
  'const SCHEMA_VERSION = 12;',
  'const V12_META_KEY = "simple-finance-project-records-v12-meta";',
  'const V11_BACKUP_KEY = "simple-finance-project-records-v11-backup";',
  'const DEVICE_ID_KEY = "simple-finance-project-records-v12-device-id";',
  'const V12_DB_NAME = "simple-finance-project-records-v12-db";',
  'const V12_CHANNEL_NAME = "simple-finance-project-records-v12-channel";'
]) includes(html, token, `Protected storage/database token changed: ${token}`);

// Parse inline JavaScript and service worker without shipping extracted copies.
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
assert(inlineScripts.length >= 2, "Expected at least two inline scripts");
inlineScripts.forEach((source, index) => {
  try { new vm.Script(source, { filename: `index-inline-${index + 1}.js` }); }
  catch (error) { failures.push(`Inline script ${index + 1} syntax error: ${error.message}`); }
});
try { new vm.Script(worker, { filename: "sw.js" }); }
catch (error) { failures.push(`Service-worker syntax error: ${error.message}`); }

// Duplicate IDs.
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
const counts = new Map();
for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
for (const [id, count] of counts) if (count > 1) failures.push(`Duplicate HTML id: ${id} (${count})`);

// V12.18.1 UX reliability baseline.
for (const token of [
  "function monthlyExpenseAmount(item)",
  "function sumMonthlyExpenseAmounts(items)",
  "const expenseTotal = sumMonthlyExpenseAmounts(expenses);",
  "const total = sumMonthlyExpenseAmounts(expenses);",
  "function sumExpenseAmounts(items)",
  "effectiveExpenseAmount(item)"
]) includes(html, token, `Monthly/outstanding calculation safeguard missing: ${token}`);
for (const token of [
  "function setupWorkspaceNavigation()",
  '["ArrowLeft", "ArrowRight", "Home", "End"]',
  "goToPage(target.dataset.workspacePage, { smooth:false });",
  "setupWorkspaceNavigation();"
]) includes(html, token, `Workspace keyboard safeguard missing: ${token}`);
for (const token of [
  'id="currentMonthButton"',
  'aria-label="Go to current month"',
  'document.getElementById("currentMonthButton").addEventListener("click", () => applySelectedMonth(currentMonth, true));'
]) includes(html, token, `Current-month safeguard missing: ${token}`);
for (const id of ["dashAvailableLabel", "dashIncomeLabel", "dashSavingsLabel", "dashExpensesLabel", "dashRemainingLabel"])
  includes(html, `id="${id}"`, `Missing stable Dashboard KPI help id: ${id}`);
for (const token of [
  'id="duplicateProjectFromDialog"',
  'function openProjectDialog(item = null, options = {})',
  'const duplicate = Boolean(item && options.duplicate);',
  'openProjectDialog(sourceProject, { duplicate:true });'
]) includes(html, token, `Safe Project duplication safeguard missing: ${token}`);
for (const token of [
  'id="errorAnnouncer" role="alert" aria-live="assertive"',
  'if (resolvedType === "error")',
  'section.dataset.collapseLabel || headingCopy?.textContent'
]) includes(html, token, `Accessibility safeguard missing: ${token}`);
for (const token of [
  'createCompactReportGroup("Summary", "Key totals and month-to-month comparison", between(summaryHeading, incomeHeading), true);',
  'createCompactReportGroup("Income"',
  'createCompactReportGroup("Expenses"',
  'createCompactReportGroup("Expense records"',
  'createCompactReportGroup("Projects & payments"',
  'createCompactReportGroup("Accounts & savings"',
  'createCompactReportGroup("Exports"'
]) includes(html, token, `Compact report group missing: ${token}`);

// Touch targets may live in any later V12.18 CSS block.
for (const selector of [".menu-button", ".month-nav-button", ".month-current-button", '.month-control input[type="month"]', "#dashboardCalendarPrevious", "#dashboardCalendarNext", ".calendar-day"])
  includes(html, selector, `Missing mobile touch-target selector: ${selector}`);
assert((html.match(/44px/g) || []).length >= 10, "Expected at least ten 44px touch-target declarations");

// App shell and approved protected assets.
for (const file of ["./index.html", "./offline.html", "./manifest.webmanifest", "./version.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"])
  includes(worker, `asset("${file}")`, `Service-worker app shell is missing ${file}`);
const protectedHashes = {
  "manifest.webmanifest": "28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html": "eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png": "96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png": "a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png": "c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png": "7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png": "7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"
};
for (const [file, expected] of Object.entries(protectedHashes)) assert(sha256(file) === expected, `Protected file changed unexpectedly: ${file}`);

const remoteAssets = [...html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/gi)].map(match => match[1]);
assert(remoteAssets.length === 0, `Unexpected remote dependency: ${remoteAssets.join(", ")}`);
for (const pattern of [/api[_-]?key\s*[:=]/i, /client[_-]?secret\s*[:=]/i, /bearer\s+[A-Za-z0-9._-]{16,}/i, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/])
  assert(!pattern.test(html + worker), `Potential credential pattern found: ${pattern}`);

if (failures.length) {
  console.error("\nUX reliability baseline validation failed:\n");
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}
console.log("UX reliability baseline validation passed.");
console.log(`- Release agreement confirmed for V${version.version}`);
console.log(`- Parsed ${inlineScripts.length} inline scripts and sw.js`);
console.log(`- Checked ${ids.length} HTML IDs with no duplicates`);
console.log("- Confirmed schema 12, protected identifiers, calculations, keyboard, duplication, accessibility, reports, touch targets, and protected assets");
