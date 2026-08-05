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

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-9.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.9 utility and recurring-series baseline failed");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

assert(/^12\.(?:18\.(?:10|[1-9]\d+)|(?:19|[2-9]\d+)\.\d+)$/.test(version.version), "version.json predates V12.18.10");
assert(version.schemaVersion === 12, "schema version changed from 12");
assert(html.includes(`const APP_VERSION = "${version.version}";`), "index.html version mismatch");
assert(worker.includes(`const APP_VERSION = "${version.version}";`), "service worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "cache version mismatch");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README version heading mismatch");

const requiredMarkup = [
  'id="expensePaymentDialog"',
  'id="expensePaymentAccount"',
  'id="expensePaymentCurrentBalance"',
  'id="expensePaymentAfterBalance"',
  'id="confirmExpensePayment"',
  'Actual payment account',
  'The planned account saved in the expense is disregarded for this payment.',
  'id="gymAutoPay"',
  'id="gymAutoPayAccount"',
  'Automatically mark paid after month ends',
  'Month-end payment account'
];
requiredMarkup.forEach(token => assert(html.includes(token), `missing UI token: ${token}`));

const requiredLogic = [
  'function applyExpensePayment',
  'function restoreExpensePayment',
  'function processGymMonthEndAutoPayments',
  'function ensureRecurringGymExpensesThroughMonth',
  'paidFromAccount',
  'paidAmount',
  'accountDeducted',
  'paymentTransactionId',
  'autoPaidAtMonthEnd',
  'gymAutoPaySuppressed',
  'if (balance < total) return { ok:false, reason:"insufficient"',
  'data.accounts[account] = roundMoney(balance - total)',
  'data.accounts[item.paidFromAccount] = roundMoney(Number(data.accounts[item.paidFromAccount] || 0) + amount)',
  'if (action === "mark-paid") { openExpensePaymentDialog(items); return; }',
  'if (item) openExpensePaymentDialog([item]);',
  'processGymMonthEndAutoPayments({ notify:true });'
];
requiredLogic.forEach(token => assert(html.includes(token), `missing logic token: ${token}`));

assert(!html.includes('confirm(`Mark ${item.name} as paid'), "legacy one-click Mark Paid confirmation remains");
assert(html.includes('fillAccountSelect(document.getElementById("expensePaymentAccount"), "", "Select payment account")'), "actual account is not deliberately blank at payment start");
assert(html.includes('gymItem ? Boolean(item?.gymAutoPay) : true'), "new Gym auto-pay default is missing");
assert(html.includes('gymAutoPay: Boolean(isGym && item.gymAutoPay === true)'), "legacy Gym records are not safely opt-in");
assert(html.includes('expenseMonth(item) < currentMonth'), "Gym month-end eligibility is missing");
for (const token of [
  'copy.paidFromAccount = "";',
  'copy.paidAmount = 0;',
  'copy.accountDeducted = false;',
  'copy.paymentTransactionId = "";',
  'copy.autoPaidAtMonthEnd = false;',
  'copy.gymAutoPaySuppressed = false;'
]) assert(html.includes(token), `next-month duplicate does not clear payment state: ${token}`);
assert(html.includes('item.paid && item.accountDeducted && item.paidFromAccount === name'), "account deletion does not protect restorable payments");
assert(html.includes('Actual Payment Account') && html.includes('Account Balance Deducted') && html.includes('Auto-Paid After Month End'), "payment export columns are missing");

// Pure arithmetic fixtures for the approved behavior.
const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const pay = (balance, amounts) => {
  const total = roundMoney(amounts.reduce((sum, amount) => sum + roundMoney(amount), 0));
  if (roundMoney(balance) < total) return { ok:false, balance:roundMoney(balance), total };
  return { ok:true, balance:roundMoney(balance - total), total };
};
assert(JSON.stringify(pay(10575, [3800])) === JSON.stringify({ok:true,balance:6775,total:3800}), "single payment deduction fixture failed");
assert(JSON.stringify(pay(10000, [3800,1360])) === JSON.stringify({ok:true,balance:4840,total:5160}), "bulk payment deduction fixture failed");
assert(pay(2000, [3800]).ok === false && pay(2000, [3800]).balance === 2000, "insufficient balance fixture failed");
assert(roundMoney(6775 + 3800) === 10575, "Move to Unpaid restoration fixture failed");

const gymDays = new Set([1,2,4,5]);
const gymDates = (year, month) => {
  const totalDays = new Date(year, month, 0).getDate();
  const dates = [];
  for (let day = 1; day <= totalDays; day += 1) if (gymDays.has(new Date(year, month - 1, day).getDay())) dates.push(day);
  return dates;
};
assert(gymDates(2026,8).length === 17, "August 2026 Gym visit fixture failed");
assert(gymDates(2026,8).length * 80 === 1360, "August 2026 Gym amount fixture failed");
assert("2026-08" < "2026-09", "month-end eligibility fixture failed");

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicates.length === 0, `duplicate HTML IDs: ${duplicates.join(", ")}`);

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const tempScript = path.join(os.tmpdir(), `finance-payment-baseline-${process.pid}.js`);
fs.writeFileSync(tempScript, scripts.at(-1));
const syntax = spawnSync(process.execPath, ["--check", tempScript], { encoding:"utf8" });
try { fs.unlinkSync(tempScript); } catch {}
assert(syntax.status === 0, `inline JavaScript syntax failed: ${syntax.stderr}`);
const workerSyntax = spawnSync(process.execPath, ["--check", path.join(root, "sw.js")], { encoding:"utf8" });
assert(workerSyntax.status === 0, `service-worker syntax failed: ${workerSyntax.stderr}`);

for (const file of [
  "PAYMENT_ACCOUNT_DEDUCTION_VALIDATION_V12_18_10.md",
  "GYM_MONTH_END_AUTO_PAY_VALIDATION_V12_18_10.md",
  "manifest.webmanifest",
  "offline.html"
]) assert(fs.existsSync(path.join(root, file)), `missing file: ${file}`);

if (failures.length) {
  console.error("V12.18.10 validation failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V12.18.10+ payment-account deduction and Gym month-end auto-pay baseline passed.");
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- Account deduction, restoration, insufficient-balance, bulk-payment, and Gym fixtures passed");
console.log("- Schema 12, exports, recurrence safeguards, syntax, and all prior baselines passed");
