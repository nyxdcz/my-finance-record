#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-10.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.10 payment and Gym baseline failed");

const html = read("index.html");
const ledger = read("account-ledger.js");
const ledgerCss = read("account-ledger.css");
const cloud = read("cloud-sync.js");
const worker = read("sw.js");
const workflow = read(".github/workflows/quality-pages.yml");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const version = JSON.parse(read("version.json"));
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));

assert(/^12\.(?:2[0-9]|[3-9][0-9])\./.test(version.version), "release is older than V12.20.0");
assert(version.schemaVersion === 12, "core finance schema changed from 12");
assert(Number(version.cloudSchemaVersion) >= 1, "cloud schema metadata is missing");
assert(version.ledgerVersion === 1, "Ledger Version 1 is missing");
assert(html.includes(`<title>My Finance Records · V${version.version}</title>`), "HTML title version mismatch");
assert(html.includes(`const APP_VERSION = "${version.version}";`), "HTML APP_VERSION mismatch");
assert(html.includes('href="./account-ledger.css"'), "account ledger stylesheet is not loaded");
assert(html.includes('<script src="./cloud-sync.js"></script>\n  <script src="./account-ledger.js"></script>'), "account ledger script must load after cloud sync and before DOMContentLoaded");
assert(html.includes('{"version": "V12.20.0", "title": "Account Ledger, Transfers & Reconciliation"'), "in-app V12.20.0 history entry missing");
assert(worker.includes(`const APP_VERSION = "${version.version}";`), "service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "service-worker cache mismatch");
assert(worker.includes('asset("./account-ledger.js")') && worker.includes('asset("./account-ledger.css")'), "ledger runtime files are not precached");
assert(packageJson.version === version.version && packageLock.version === version.version, "package metadata version mismatch");
assert(/^node tests\/validate-v12-(?:20-0|2[1-9]-[0-9]+)\.mjs$/.test(packageJson.scripts?.quality || ""), "quality script does not include the V12.20.0 baseline");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README heading mismatch");
assert(readme.includes("## V12.20.0 · Account Ledger, Transfers & Reconciliation"), "README V12.20.0 notes missing");
assert(changelog.includes("## 12.20.0 · 2026-08-06"), "CHANGELOG V12.20.0 entry missing");

for (const token of [
  'const LEDGER_VERSION = 1;',
  '"opening-balance"',
  '"expense-payment"',
  '"expense-payment-reversal"',
  '"income-deposit"',
  '"income-deposit-reversal"',
  '"transfer-out"',
  '"transfer-in"',
  '"reconciliation-adjustment"',
  'function openingEntriesFromAccounts',
  'function ensureLedgerShape',
  'function recalculateBalances',
  'function appendLedgerEntries',
  'function appendReconciliation',
  'applyExpensePayment = function ledgerExpensePayment',
  'restoreExpensePayment = function ledgerExpensePaymentRestore',
  'function submitTransfer',
  'if (from === to)',
  'insufficient funds',
  'function submitAccountsReconciliationForm',
  'function reverseIncomeLedger',
  'function postIncomeLedger',
  'Transfer or reconcile ${name} to ₱0.00 before deleting it',
  'function exportLedgerCsv',
  'function exportReconciliationsCsv',
  'window.FinanceAccountLedger'
]) assert(ledger.includes(token), `ledger safeguard missing: ${token}`);

for (const token of [
  'ledgerCard.id = "accountLedgerCard"',
  'id="openTransferDialog"',
  'id="accountLedgerBody"',
  'id="accountReconciliationBody"',
  'id="incomePostToLedger"',
  'id="accountTransferDialog"',
  'id="transferFromAccount"',
  'id="transferToAccount"',
  'id="transferAmount"',
  'id="transferDate"'
]) assert(ledger.includes(token), `ledger UI token missing: ${token}`);

assert(cloud.includes('"accountLedger", "accountReconciliations"'), "cloud sync does not merge ledger and reconciliation records by ID");
assert(cloud.includes(`My Finance Records V${version.version}`), "cloud-sync release version mismatch");
for (const file of ["account-ledger.js", "account-ledger.css"]) {
  assert(workflow.includes(file), `GitHub Pages deployment omits ${file}`);
  assert(worker.includes(file), `service worker omits ${file}`);
}
for (const token of ["actions/checkout@v7", "actions/setup-node@v7", "actions/configure-pages@v6", "actions/upload-pages-artifact@v5", "actions/deploy-pages@v5"]) assert(workflow.includes(token), `current GitHub Action missing: ${token}`);

assert(ledgerCss.includes(".ledger-summary-grid") && ledgerCss.includes(".ledger-transfer-preview"), "ledger responsive styles missing");
assert(ledgerCss.includes("@media (max-width: 620px)"), "phone ledger styles missing");

const syntaxFiles = ["account-ledger.js", "cloud-sync.js", "sw.js", "tests/validate-v12-20-0.mjs"];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(syntax.status === 0, `${file} syntax failed: ${syntax.stderr}`);
}

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(code => code.trim());
inlineScripts.forEach((code, index) => {
  const temp = path.join(root, `.v12200-inline-${index}.js`);
  fs.writeFileSync(temp, code);
  const syntax = spawnSync(process.execPath, ["--check", temp], { encoding:"utf8" });
  fs.unlinkSync(temp);
  assert(syntax.status === 0, `inline script ${index + 1} syntax failed: ${syntax.stderr}`);
});

const staticIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const injectedIds = [...ledger.matchAll(/id=\\?"([^"\\]+)\\?"/g)].map(match => match[1]).filter(id => !id.includes("${"));
const allIds = [...staticIds, ...injectedIds];
const duplicates = [...new Set(allIds.filter((id, index) => allIds.indexOf(id) !== index))];
assert(duplicates.length === 0, `duplicate static/injected HTML IDs: ${duplicates.join(", ")}`);

const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const protectedHashes = {
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":"96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png":"a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png":"c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"
};
for (const [file, expected] of Object.entries(protectedHashes)) assert(sha256(file) === expected, `${file} changed unexpectedly`);

for (const [file, text] of [["index.html",html],["account-ledger.js",ledger],["cloud-sync.js",cloud],["sw.js",worker]]) {
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text), `Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text), `service-role credential detected in ${file}`);
}

if (failures.length) {
  console.error("V12.20.0 account ledger, transfers, and reconciliation validation failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V12.20.0 Account Ledger, Transfers & Reconciliation validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected ledger IDs checked with no duplicates`);
console.log("- Opening-balance migration, ledger-derived balances, expense/reversal posting, transfers, income posting, reconciliation, exports, cloud collections, and responsive UI safeguards passed");
console.log("- Core finance schema 12, cloud compatibility, manifest, offline page, and icons remain protected");
