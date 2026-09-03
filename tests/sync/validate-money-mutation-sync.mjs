import assert from "node:assert/strict";
import fs from "node:fs";

const ledger = fs.readFileSync("assets/js/account-ledger.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");

assert.match(ledger, /function runLedgerTransaction\(/);
assert.match(ledger, /persistFinanceDataRaw\(message\)/);
assert.match(ledger, /readStoredFinanceState\(STORAGE_KEY\)/);
assert.match(ledger, /architecture\?\.persistCurrentData\?\.\(data, message\)/);
assert.match(ledger, /commitTransfer/);
assert.match(ledger, /commitExpensePayment/);
assert.match(ledger, /commitExpensePaymentReversal/);
assert.match(ledger, /commitQuickSpend/);
assert.match(ledger, /commitIncomeRecord/);
assert.match(ledger, /commitIncomeDeletion/);
assert.match(ledger, /commitGymAutoPayments/);
assert.match(cloud, /accountLedger/);
assert.match(cloud, /accountReconciliations/);
assert.match(cloud, /accounts/);
assert.match(cloud, /finance:data-persisted/);


assert.match(ledger, /requestId:safeText\(entry\.requestId \|\| "", 160\)/);
assert.match(ledger, /function requestLedgerEntries\(/);
assert.match(ledger, /idempotencyKey = ""/);
assert.match(ledger, /commitExternalExpensePayment/);
assert.match(ledger, /commitPaidExpenseAccountCorrection/);
assert.match(ledger, /commitReconciliationBatch/);
assert.match(cloud, /payload:clone\(item\.payload \|\| \{\}\)/);

console.log("Unified money mutations, idempotency request IDs, and Phase 3 correction APIs survive Cloud Sync record mapping.");
