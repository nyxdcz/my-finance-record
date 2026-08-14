import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "expense-screenshot-parser.js"), "utf8");
const sandbox = { window:{} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename:"expense-screenshot-parser.js" });
const parser = sandbox.window.FinanceExpenseScreenshotParser;
assert.ok(parser, "parser should initialize");

const gcash = parser.parsePaymentScreenshot(`
GCash
Payment Successful
You paid
ABC STORE
Amount
₱599.00
Reference No. 123456789012
Available Balance ₱8,422.31
`, ["Cash", "GCash", "Maya"]);
assert.equal(gcash.name, "ABC STORE");
assert.equal(gcash.amount, 599);
assert.equal(gcash.account, "GCash");

const unionBank = parser.parsePaymentScreenshot(`
UnionBank
Transfer successful
To: JOHN DOE
Amount PHP 280.00
From PlayEveryday Debit •7923
Reference No 912340001
`, ["Cash", "UnionBank", "GCash"]);
assert.equal(unionBank.name, "JOHN DOE");
assert.equal(unionBank.amount, 280);
assert.equal(unionBank.account, "UnionBank");

const goTyme = parser.parsePaymentScreenshot(`
GoTyme Bank
Payment successful
Merchant
Grab - QRPH
Total PHP 442.00
Available balance PHP 20,000.00
`, ["GoTyme Bank", "GCash", "Cash"]);
assert.equal(goTyme.name, "Grab - QRPH");
assert.equal(goTyme.amount, 442);
assert.equal(goTyme.account, "GoTyme Bank");

const maya = parser.parsePaymentScreenshot(`
Maya
Payment successful
Merchant: Maya Credit Cards
Amount ₱16,425.06
Wallet Balance ₱500.00
`, ["Maya", "GCash", "Cash"]);
assert.equal(maya.name, "Maya Credit Cards");
assert.equal(maya.amount, 16425.06);
assert.equal(maya.account, "Maya");

const payMayaAlias = parser.detectAccount("PayMaya\nPayment complete\nAmount PHP 250.00", ["Maya", "GCash"]);
assert.equal(payMayaAlias.value, "Maya");

const amount = parser.detectAmount("Total ₱1,250.50\nAvailable Balance ₱33,000.00\nService Fee ₱15.00");
assert.equal(amount.value, 1250.5);

const noAmount = parser.detectAmount("Payment successful\nReference number 1234567890\nAug 14, 2026");
assert.equal(noAmount, null);

assert.equal(
  JSON.stringify(parser.applicationPlan({ name:"", amount:"", account:"Cash" }, { name:"Store", amount:120, account:"GCash" }, { editing:false, accountTouched:false })),
  JSON.stringify({ name:true, amount:true, account:true })
);
assert.equal(
  JSON.stringify(parser.applicationPlan({ name:"Rent", amount:"1000", account:"Cash" }, { name:"Store", amount:120, account:"GCash" }, { editing:true, accountTouched:true })),
  JSON.stringify({ name:false, amount:false, account:false })
);

const syncConfig = fs.readFileSync(path.join(root, "sync-config.js"), "utf8");
assert.match(syncConfig, /expenseScreenshotLauncherButton/, "Add Expense should expose a visible screenshot launcher");
assert.match(syncConfig, /📷<\/span> Upload Screenshot|📷<\/span> Preparing scanner/, "launcher should be clearly labeled Upload Screenshot");
assert.match(syncConfig, /expenseFormModeNote/, "launcher should be positioned after the expense mode note");
assert.match(syncConfig, /expense-screenshot-parser\.js\?v=14\.0\.23/, "screenshot parser should load from the app shell");
assert.match(syncConfig, /expense-screenshot-detect\.js\?v=14\.0\.23/, "screenshot detector should load from the app shell");

const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert.match(worker, /v1423-expense-upload-r1/, "service worker cache should be refreshed for the upload-button release");
assert.match(worker, /expense-screenshot-parser\.js\?v=14\.0\.23/, "service worker should precache the screenshot parser");
assert.match(worker, /expense-screenshot-detect\.js\?v=14\.0\.23/, "service worker should precache the screenshot detector");

console.log("Expense screenshot parser and upload-button validation passed.");
