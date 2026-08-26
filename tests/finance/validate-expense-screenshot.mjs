import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
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
const runtimeCompat = fs.readFileSync(path.join(root, "assets/js/ui/sync-runtime-compat.js"), "utf8");
assert.match(runtimeCompat, /expenseScreenshotHeaderActions/, "Add Expense should expose screenshot actions in the modal header");
assert.match(runtimeCompat, /expenseScreenshotLauncherButton/, "Add Expense should expose an initial Upload launcher in the modal header");
assert.match(runtimeCompat, /expenseScreenshotMenuButton/, "loaded screenshot tools should keep the Upload menu trigger in the modal header");
assert.match(runtimeCompat, /button\.textContent = "Upload"/, "screenshot launcher should use the compact Upload label");
assert.match(runtimeCompat, /"Analyzing…" : "AI"/, "optional AI screenshot action should use the compact AI label");
assert.match(runtimeCompat, /header\.insertBefore\(shell, close\)/, "screenshot actions should be positioned immediately before the expense dialog Close button");
assert.match(runtimeCompat, /expense-screenshot-parser\.js\?v=2\.2\.0-talaan1/, "screenshot parser should use the current Talaan runtime query");
assert.match(runtimeCompat, /expense-screenshot-detect\.js\?v=2\.2\.0-talaan1/, "local screenshot detector should use the current Talaan runtime query");
assert.match(runtimeCompat, /expense-screenshot-ai\.js\?v=2\.2\.0-talaan1/, "optional AI screenshot detector should use the current Talaan runtime query");
assert.doesNotMatch(syncConfig, /OPENAI_API_KEY/, "browser sync config must not contain an OpenAI API key");

const aiClient = fs.readFileSync(path.join(root, "expense-screenshot-ai.js"), "utf8");
assert.match(aiClient, /Detect with AI/, "AI detector should expose a Detect with AI action");
assert.match(aiClient, /Improve with AI/, "AI detector should reuse the latest local screenshot for optional improvement");
assert.match(aiClient, /screenshotApi\(\)\?\.showResult/, "AI results should reuse the existing review and apply flow");
assert.match(aiClient, /\/functions\/v1\/detect-payment/, "AI detector should use the authenticated Supabase Edge Function");
assert.match(aiClient, /getSession\(\)/, "AI detector should require the existing signed-in Supabase session");
assert.doesNotMatch(aiClient, /OPENAI_API_KEY/, "OpenAI API key must never be present in browser code");

const edgeFunction = fs.readFileSync(path.join(root, "supabase/functions/detect-payment/index.ts"), "utf8");
assert.match(edgeFunction, /Deno\.env\.get\("OPENAI_API_KEY"\)/, "Edge Function should read the OpenAI key only from server secrets");
assert.match(edgeFunction, /gpt-5\.6-terra/, "Edge Function should default to GPT-5.6 Terra");
assert.match(edgeFunction, /https:\/\/api\.openai\.com\/v1\/responses/, "Edge Function should use the OpenAI Responses API");
assert.match(edgeFunction, /type:"input_image"/, "Edge Function should send the screenshot as image input");
assert.match(edgeFunction, /type:"json_schema"/, "Edge Function should request a structured detector result");
assert.match(edgeFunction, /store:false/, "AI screenshot response should disable response storage");

const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
assert.equal(version.version, "2.2.0");
assert.equal(version.cacheVersion, "finance-v2-20260826-import-center-r8");
assert.ok(worker.includes(version.cacheVersion), "service worker cache generation must match Talaan V2.2.0 while preserving screenshot detection");
assert.match(worker, /expense-screenshot-parser\.js\?v=2\.2\.0-talaan1/, "service worker should precache the screenshot parser on the current query");
assert.match(worker, /expense-screenshot-detect\.js\?v=2\.2\.0-talaan1/, "service worker should precache the local screenshot detector on the current query");
assert.match(worker, /expense-screenshot-ai\.js\?v=2\.2\.0-talaan1/, "service worker should precache the optional AI client on the current query");

console.log("Expense screenshot local and optional AI detector validation passed under Talaan V2.2.0.");
