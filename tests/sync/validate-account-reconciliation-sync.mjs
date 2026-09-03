#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync("cloud-sync.js", "utf8");
const profileId = "profile-personal";
const separator = "\u001f";
const account = "Checking";
const original = 466;
const target = 16598;
const difference = target - original;
const openingId = "ledger-opening-v1-Checking";
const reconciliationId = "reconciliation-account-balance-1";
const ledgerId = "ledger-reconciliation-account-balance-1";
const accountKey = `accounts${separator}${account}`;
const openingKey = `accountLedger${separator}${openingId}`;
const ledgerKey = `accountLedger${separator}${ledgerId}`;
const reconciliationKey = `accountReconciliations${separator}${reconciliationId}`;
const baseKey = `simple-finance-cloud-record-base-v3:${profileId}`;
const queueKey = `simple-finance-cloud-record-queue-v3:${profileId}`;
const stores = new Map();

const oldAccountPayload = { name:account, balance:original, type:"Bank", icon:null };
const newAccountPayload = { ...oldAccountPayload, balance:target };
const openingEntry = { id:openingId, operationId:openingId, transactionId:openingId, account, type:"opening-balance", amount:original, date:"2026-09-03", description:"Opening balance" };
const reconciliationEntry = { id:ledgerId, operationId:`reconciliation:${reconciliationId}`, transactionId:reconciliationId, account, type:"reconciliation-adjustment", amount:difference, date:"2026-09-03", description:`Reconciled ${account}`, reconciliationId };
const reconciliation = { id:reconciliationId, account, date:"2026-09-03", previousBalance:original, statementBalance:target, difference, ledgerEntryId:ledgerId };

stores.set(baseKey, JSON.stringify({
  [accountKey]:{ collection:"accounts", recordId:account, payload:oldAccountPayload, sortIndex:0, revision:1, deletedAt:"", updatedAt:"2026-09-03T00:00:00.000Z", updatedByDevice:"cloud-device" },
  [openingKey]:{ collection:"accountLedger", recordId:openingId, payload:openingEntry, sortIndex:0, revision:1, deletedAt:"", updatedAt:"2026-09-03T00:00:00.000Z", updatedByDevice:"cloud-device" }
}));
stores.set(queueKey, JSON.stringify({
  [accountKey]:{ key:accountKey, collection:"accounts", recordId:account, payload:newAccountPayload, sortIndex:0, deleted:false, baseRevision:1, basePayload:oldAccountPayload, baseSortIndex:0, status:"pending", attempts:0, nextAttemptAt:0 },
  [ledgerKey]:{ key:ledgerKey, collection:"accountLedger", recordId:ledgerId, payload:reconciliationEntry, sortIndex:1, deleted:false, baseRevision:0, basePayload:null, baseSortIndex:0, status:"pending", attempts:0, nextAttemptAt:0 },
  [reconciliationKey]:{ key:reconciliationKey, collection:"accountReconciliations", recordId:reconciliationId, payload:reconciliation, sortIndex:0, deleted:false, baseRevision:0, basePayload:null, baseSortIndex:0, status:"pending", attempts:0, nextAttemptAt:0 }
}));

const localStorage = {
  getItem:key => stores.has(key) ? stores.get(key) : null,
  setItem:(key, value) => { stores.set(key, String(value)); },
  removeItem:key => stores.delete(key)
};
const document = {
  readyState:"loading",
  hidden:false,
  addEventListener() {},
  removeEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; }
};
const context = {
  console,
  structuredClone,
  crypto:webcrypto,
  URL,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  navigator:{ onLine:false, userAgent:"Node", platform:"Node" },
  document,
  localStorage,
  sessionStorage:{ getItem(){ return null; }, setItem(){}, removeItem(){} },
  matchMedia:() => ({ matches:false, addEventListener(){}, removeEventListener(){} }),
  data:{ accounts:{ [account]:target }, accountTypes:{ [account]:"Bank" }, accountOrder:[account], accountIcons:{}, accountLedger:[openingEntry,reconciliationEntry], accountReconciliations:[reconciliation], ledgerSettings:{ version:1 } },
  normalizeData:value => structuredClone(value),
  STORAGE_KEY:"simple-finance-project-records-v2",
  APP_VERSION:"2.5.0",
  showToast() {},
  location:{ href:"http://127.0.0.1:3000/", origin:"http://127.0.0.1:3000" }
};
context.window = context;
context.globalThis = context;
context.FinanceProfileArchitecture = {
  activeProfileId:() => profileId,
  cloudProfileId:() => "",
  activeRole:() => "owner",
  canWrite:() => true,
  isCloudUnlocked:() => false
};
context.FinanceCloudSyncLifecycle = {
  create:() => ({
    clearForegroundPoll(){}, scheduleForegroundPoll(){}, clearRealtimeRetry(){}, scheduleRealtimeRecovery(){}, noteRealtimeSubscribed(){}
  })
};

vm.createContext(context);
vm.runInContext(source, context, { filename:"cloud-sync.js" });
const internals = context.FinanceCloudSyncInternals;
assert.ok(internals, "Cloud Sync internals were not exposed");

const mapped = internals.toRecordMap(context.data);
assert.equal(mapped[accountKey].payload.balance, target, "corrected account record was not mapped");
assert.equal(mapped[ledgerKey].payload.amount, difference, "reconciliation ledger entry was not mapped");
assert.equal(mapped[reconciliationKey].payload.statementBalance, target, "reconciliation audit record was not mapped");

const overlaps = [];
const merged = internals.threeWayMerge(oldAccountPayload, newAccountPayload, oldAccountPayload, "", overlaps);
assert.equal(merged.balance, target, "an unchanged older cloud account payload overwrote the device correction");
assert.deepEqual(overlaps, [], "unchanged cloud account data should not create an overlap conflict");

internals.applyRemoteEvent({
  collection:"accounts",
  record_id:account,
  payload:oldAccountPayload,
  sort_index:0,
  revision:2,
  deleted_at:"",
  updated_at:"2026-09-03T00:05:00.000Z",
  updated_by_device:"other-device"
});

const pending = JSON.parse(stores.get(queueKey));
assert.equal(pending[accountKey].payload.balance, target, "newer cloud revision discarded the pending corrected account balance");
assert.equal(pending[accountKey].baseRevision, 2, "pending account correction was not rebased onto the newer cloud revision");
assert.equal(pending[accountKey].status, "pending", "rebased account correction is no longer uploadable");
assert.ok(pending[ledgerKey], "reconciliation ledger entry disappeared while rebasing the account record");
assert.ok(pending[reconciliationKey], "reconciliation audit record disappeared while rebasing the account record");

const base = JSON.parse(stores.get(baseKey));
const effective = { ...base };
for (const [key, item] of Object.entries(pending)) {
  effective[key] = {
    collection:item.collection,
    recordId:item.recordId,
    payload:item.payload,
    sortIndex:item.sortIndex,
    revision:item.baseRevision,
    deletedAt:item.deleted ? item.updatedAt || "deleted" : ""
  };
}
const rebuilt = internals.fromRecordStore(effective, context.data);
const ledgerTotal = rebuilt.accountLedger.filter(entry => entry.account === account).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
assert.equal(rebuilt.accounts[account], target, "effective cloud/device record store reverted the corrected account payload");
assert.equal(ledgerTotal, target, "effective ledger no longer derives the corrected account balance");

console.log("Account reconciliation Cloud Sync regression passed.");
