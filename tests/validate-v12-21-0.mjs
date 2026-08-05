#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-20-0.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.20.0 account-ledger baseline failed");

const html = read("index.html");
const cloud = read("cloud-sync.js");
const sql = read("supabase/cloud-sync-v2.sql");
const rlsV2 = read("supabase/rls-smoke-tests-v2.sql");
const worker = read("sw.js");
const workflow = read(".github/workflows/quality-pages.yml");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const setup = read("CLOUD_SYNC_SETUP.md");
const security = read("SECURITY.md");
const version = JSON.parse(read("version.json"));
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));

assert(version.version === "12.21.0", "version.json is not V12.21.0");
assert(version.schemaVersion === 12, "core finance schema changed from 12");
assert(version.cloudSchemaVersion === 2, "Cloud Schema V2 metadata missing");
assert(version.ledgerVersion === 1, "Ledger Version 1 changed unexpectedly");
assert(html.includes('<title>My Finance Records · V12.21.0</title>'), "HTML title version mismatch");
assert(html.includes('const APP_VERSION = "12.21.0";'), "HTML APP_VERSION mismatch");
assert(html.includes('{"version": "V12.21.0", "title": "Record-level Cloud Sync 2.0"'), "in-app V12.21.0 history entry missing");
assert(worker.includes('const APP_VERSION = "12.21.0";'), "service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "service-worker cache mismatch");
assert(packageJson.version === "12.21.0" && packageLock.version === "12.21.0", "package version mismatch");
assert(packageJson.scripts?.quality === "node tests/validate-v12-21-0.mjs", "quality script mismatch");
assert(readme.startsWith("# My Finance Records · V12.21.0 PWA"), "README heading mismatch");
assert(readme.includes("## V12.21.0 · Record-level Cloud Sync 2.0"), "README V12.21.0 notes missing");
assert(changelog.includes("## 12.21.0 · 2026-08-06"), "CHANGELOG V12.21.0 entry missing");
assert(setup.includes("supabase/cloud-sync-v2.sql"), "Cloud Sync V2 setup migration missing");
assert(security.includes("Cloud Schema V2 controls"), "security documentation lacks V2 controls");

for (const token of [
  'const CLOUD_SCHEMA_VERSION = 2;',
  'const META_KEY = "simple-finance-cloud-sync-v2";',
  'const BASE_KEY = "simple-finance-cloud-record-base-v2";',
  'const QUEUE_KEY = "simple-finance-cloud-record-queue-v2";',
  'const AUDIT_TABLE = "finance_sync_audit";',
  '"accountLedger", "accountReconciliations"',
  'function toRecordMap',
  'function fromRecordStore',
  'function queueDiff',
  'function changesBetween',
  'function threeWayMerge',
  'function retryDelay',
  'finance_sync_snapshot',
  'finance_sync_pull',
  'finance_sync_commit_batch',
  'finance_sync_commit_financial_operations',
  'finance_sync_register_device',
  'finance_sync_revoke_device',
  'postgres_changes',
  'table:AUDIT_TABLE',
  'cloudSyncHealthCard',
  'cloudPendingList',
  'cloudAuditList',
  'data-sync-retry',
  'data-sync-discard',
  'data-sync-keep',
  'keyToken(item.key)',
  'keyFromToken',
  'Update required:',
  'Record-level Cloud Sync 2.0'
]) assert(cloud.includes(token), `Cloud Sync V2 client safeguard missing: ${token}`);

for (const token of [
  'create table if not exists public.finance_sync_profiles',
  'create table if not exists public.finance_sync_records',
  'create table if not exists public.finance_sync_batches',
  'create table if not exists public.finance_sync_audit',
  'create or replace function public.finance_sync_register_device',
  'create or replace function public.finance_sync_revoke_device',
  'create or replace function public.finance_sync_snapshot',
  'create or replace function public.finance_sync_pull',
  'create or replace function public.finance_sync_commit_batch',
  'create or replace function public.finance_sync_commit_financial_operations',
  'create or replace function public.finance_sync_commit_financial_operation',
  'for update;',
  "status='conflict'",
  "status='committed'",
  'force row level security',
  'revoke all on public.finance_sync_records from anon',
  'revoke all on public.finance_sync_records from authenticated',
  'grant select on public.finance_sync_records to authenticated',
  'revoke insert,update,delete on public.finance_cloud_devices from authenticated',
  'finance sync records select own',
  'finance_sync_audit_once unique',
  'alter publication supabase_realtime add table public.finance_sync_audit',
  "'record_requires_newer_app'",
  "'upgrade_required'",
  "on conflict(user_id,batch_id) do nothing",
  'get diagnostics v_claimed = row_count',
  'on conflict(user_id,operation_id,expense_id,operation_type) do nothing'
]) assert(sql.toLowerCase().includes(token.toLowerCase()), `Cloud Sync V2 SQL safeguard missing: ${token}`);

assert(!sql.includes("grant insert on public.finance_sync_records to authenticated"), "direct authenticated V2 record insert was granted");
assert(!sql.includes("grant update on public.finance_sync_records to authenticated"), "direct authenticated V2 record update was granted");
assert(rlsV2.includes("forcerowsecurity") && rlsV2.includes("role_table_grants") && rlsV2.includes("role_routine_grants"), "V2 RLS review helper is incomplete");
for (const token of ["actions/checkout@v7","actions/setup-node@v7","actions/configure-pages@v6","actions/upload-pages-artifact@v5","actions/deploy-pages@v5"]) assert(workflow.includes(token), `GitHub workflow version regressed: ${token}`);

for (const file of ["cloud-sync.js","account-ledger.js","sw.js","tests/validate-v12-20-0.mjs","tests/validate-v12-21-0.mjs"]) {
  const syntax = spawnSync(process.execPath, ["--check", path.join(root,file)], { encoding:"utf8" });
  assert(syntax.status === 0, `${file} syntax failed: ${syntax.stderr}`);
}

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(code => code.trim());
inlineScripts.forEach((code,index) => {
  const temp = path.join(root, `.v12210-inline-${index}.js`);
  fs.writeFileSync(temp,code);
  const syntax = spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
  fs.unlinkSync(temp);
  assert(syntax.status === 0, `inline script ${index+1} syntax failed: ${syntax.stderr}`);
});

const staticIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const dynamicIds = [...cloud.matchAll(/\.id\s*=\s*"([^"]+)"/g)].map(match => match[1]);
const templateIds = [...cloud.matchAll(/id="([A-Za-z][A-Za-z0-9_-]+)"/g)].map(match => match[1]);
const injectedIds = [...new Set([...dynamicIds,...templateIds])].filter(id => !staticIds.includes(id));
const allIds = [...staticIds,...injectedIds];
const duplicateIds = [...new Set(allIds.filter((id,index) => allIds.indexOf(id) !== index))];
assert(duplicateIds.length === 0, `duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

const memory = new Map();
const sampleData = {
  expenses:[{id:"expense-1",description:"Rent",amount:1000,paid:false}],
  projects:[{id:"project-1",name:"Sample"}],
  incomeRecords:[{id:"income-1",name:"Fee",amount:500}],
  savingsGoals:[{id:"goal-1",name:"Reserve"}],
  accountLedger:[{id:"ledger-1",transactionId:"txn-1",operationId:"op-1",type:"expense-payment",expenseId:"expense-1",account:"Cash",amount:-1000}],
  accountReconciliations:[{id:"rec-1",account:"Cash",difference:0}],
  accounts:{Cash:2500,Bank:3000}, accountTypes:{Cash:"Cash",Bank:"Bank"}, accountOrder:["Cash","Bank"], accountIcons:{},
  monthlyReports:{"2026-08":{income:500}}, monthlyChecklists:{"2026-08":{reviewed:true}}, iconLibrary:{},
  expenseRecurrenceSkips:[{seriesId:"series-1",month:"2026-08"}],
  savingsSettings:{enabled:true}, projectCalendarSettings:{}, salaryWorkSettings:{}, ledgerSettings:{version:1},
  customFutureField:{enabled:true,nested:{value:7}}
};
const sandbox = {
  console, structuredClone, crypto:crypto.webcrypto,
  localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)},
  navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},
  document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},
  location:{reload(){}}, matchMedia(){return{matches:false}},
  data:structuredClone(sampleData), APP_VERSION:"12.21.0",
  window:null, globalThis:null
};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
vm.createContext(sandbox);
try { vm.runInContext(cloud,sandbox,{filename:"cloud-sync.js"}); }
catch (error) { failures.push(`cloud-sync VM bootstrap failed: ${error.stack || error}`); }
const internals = sandbox.FinanceCloudSyncInternals;
assert(Boolean(internals), "Cloud Sync internals were not exposed for validation");
if (internals) {
  const map = internals.toRecordMap(sampleData);
  assert(Object.keys(map).length >= 13, "record map omitted expected collections");
  const rows = Object.fromEntries(Object.entries(map).map(([key,row]) => [key,{...row,revision:1,deletedAt:"",updatedAt:"2026-08-06T00:00:00Z",appVersion:"12.21.0",appVersionCode:120210,minWriterVersionCode:120210}]));
  const roundTrip = internals.fromRecordStore(rows,sampleData);
  assert(roundTrip.expenses?.[0]?.id === "expense-1", "expense did not round-trip through record store");
  assert(roundTrip.accounts?.Cash === 2500 && roundTrip.accountOrder?.[0] === "Cash", "accounts did not round-trip through record store");
  assert(roundTrip.accountLedger?.[0]?.id === "ledger-1", "ledger did not round-trip through record store");
  assert(roundTrip.customFutureField?.nested?.value === 7, "unknown future root field was not preserved");
  const changed = structuredClone(sampleData); changed.expenses[0].amount=1200;
  const changes = internals.changesBetween(rows,internals.toRecordMap(changed));
  assert(changes.length === 1 && changes[0].collection === "expenses", "one-record edit did not create one record change");
  const overlap=[]; const merged=internals.threeWayMerge({a:1,b:1},{a:2,b:1},{a:1,b:2},"",overlap);
  assert(merged.a===2 && merged.b===2 && overlap.length===0, "non-overlapping field merge failed");
  const overlap2=[]; internals.threeWayMerge({a:1},{a:2},{a:3},"",overlap2);
  assert(overlap2.includes("a"), "overlapping field conflict was not detected");
  assert(internals.retryDelay(1)>=2000 && internals.retryDelay(4)>=8000 && internals.retryDelay(99)<=300000, "retry delay is not increasing and capped");
  const key=internals.recordKey("expenses","expense-1");
  assert(internals.keyFromToken(internals.keyToken(key))===key && !internals.keyToken(key).includes("\u001f"), "record key attribute encoding failed");
  const ops=internals.detectFinancialOperations([{collection:"accountLedger",deleted:false,payload:sampleData.accountLedger[0]}]);
  assert(ops.length===1 && ops[0].operationType==="expense_payment", "financial operation detection failed");
}

const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
const protectedHashes = {
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":"96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png":"a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png":"c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"
};
for (const [file,expected] of Object.entries(protectedHashes)) assert(sha256(file)===expected, `${file} changed unexpectedly`);
for (const [file,text] of [["index.html",html],["cloud-sync.js",cloud],["sw.js",worker],["supabase/cloud-sync-v2.sql",sql]]) {
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text), `Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text), `service-role credential detected in ${file}`);
}

if (failures.length) {
  console.error("V12.21.0 Record-level Cloud Sync 2.0 validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V12.21.0 Record-level Cloud Sync 2.0 validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected Cloud Sync V2 IDs checked with no duplicates`);
console.log("- Record round-trip, one-record diff, merge/conflict, retry, key encoding, and financial-operation fixtures passed");
console.log("- Cloud Schema V2 tables, RPC-only writes, forced RLS, atomic batches, audit history, Realtime, revocation, and version safeguards passed");
console.log("- Core finance schema 12, Ledger Version 1, manifest, offline page, and icons remain protected");
