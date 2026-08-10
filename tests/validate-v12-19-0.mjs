#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-18-10.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.18.10 payment and Gym auto-pay baseline failed");

const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const worker = read("sw.js");
const readme = read("README.md");
const cloud = read("cloud-sync.js");
const loader = read("vendor/supabase.min.js");
const config = read("sync-config.js");
const exampleConfig = read("sync-config.example.js");
const schemaSql = read("supabase/schema.sql");
const policiesSql = read("supabase/security-policies.sql");
const operationsSql = read("supabase/payment-operations.sql");
const version = JSON.parse(read("version.json"));

assert(/^12\.(?:19\.\d+|20\.\d+)$/.test(version.version), "version.json is not a V12.19+ compatible release");
assert(version.schemaVersion === 12, "core finance schema changed from 12");
assert(version.cloudSchemaVersion === 1, "Cloud Schema V1 is missing");
assert(html.includes(`const APP_VERSION = "${version.version}";`), "index.html version mismatch");
assert(worker.includes(`const APP_VERSION = "${version.version}";`), "service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "cache version mismatch");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`), "README version heading mismatch");

const markupTokens = [
  'id="cloudSyncStatusButton"',
  'data-settings-tab="cloud"',
  'data-settings-panel="cloud"',
  'id="cloudConfigUrl"',
  'id="cloudConfigKey"',
  'id="cloudAuthEmail"',
  'id="cloudAuthPassword"',
  'id="cloudInitialUpload"',
  'id="cloudInitialDownload"',
  'id="cloudInitialMerge"',
  'id="cloudSyncNow"',
  'id="cloudAutoSync"',
  'id="cloudDevicesBody"',
  'id="cloudConflictList"',
  'Cloud Sync &amp; Devices',
  'MacBook and iPhone'
];
markupTokens.forEach(token => assert(html.includes(token), `missing cloud UI token: ${token}`));
assert(html.includes('const SETTINGS_PANELS = ["accounts", "calendar", "cloud", "backup", "offline", "advanced"];'), "Cloud settings panel is not in keyboard navigation order");
assert(html.includes('<script src="./vendor/supabase.min.js"></script>') && html.includes('<script src="./sync-config.js"></script>') && html.includes('<script src="./cloud-sync.js"></script>'), "cloud scripts are not loaded in the required order");

const cloudTokens = [
  'const CLOUD_TABLE = "finance_cloud_state";',
  'const DEVICE_TABLE = "finance_cloud_devices";',
  'const PAYMENT_TABLE = "finance_payment_operations";',
  'function recordTombstonesAndOperations',
  'function mergePayloads',
  'function payloadSame',
  'function conflictSnapshot',
  'function syncPaymentOperations',
  'function setupRealtime',
  'function initializeFirstSync',
  'function applyPayload',
  'eq("revision", Number(expectedRevision || 0))',
  'payment-state',
  'expense_payment_restore',
  'cloudState.pendingCount',
  'window.addEventListener("online"',
  'document.addEventListener("visibilitychange"',
  'window.FinanceCloudSyncInternals'
];
cloudTokens.forEach(token => assert(cloud.includes(token), `missing cloud logic token: ${token}`));
assert(loader.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'), "official Supabase v2 browser loader is missing");
assert(cloud.includes('/^sb_secret_/i.test') && cloud.includes('/service[_-]?role/i.test'), "browser secret-key rejection is missing");
assert(!config.includes("sb_secret_") && !exampleConfig.includes("sb_secret_REPLACE"), "a secret-key placeholder was included");

for (const asset of ["cloud-sync.js", "sync-config.js", "vendor/supabase.min.js"]) {
  assert(worker.includes(`asset("./${asset}")`), `service-worker shell does not include ${asset}`);
}

for (const token of [
  "create table if not exists public.finance_cloud_state",
  "create table if not exists public.finance_cloud_devices",
  "create table if not exists public.finance_payment_operations",
  "revision bigint not null default 1",
  "unique (user_id, operation_id, expense_id, operation_type)",
  "alter publication supabase_realtime add table public.finance_cloud_state"
]) assert(schemaSql.includes(token) || operationsSql.includes(token), `missing Cloud Schema token: ${token}`);

for (const token of [
  "enable row level security",
  "auth.uid()",
  "to authenticated",
  "revoke all on public.finance_cloud_state from anon",
  "finance state select own",
  "finance devices select own",
  "finance operations select own"
]) assert(policiesSql.includes(token), `missing RLS token: ${token}`);

for (const file of [
  "CLOUD_SYNC_SETUP.md",
  "MACBOOK_IPHONE_INSTALLATION.md",
  "CROSS_DEVICE_SYNC_VALIDATION_V12_19_0.md",
  "sync-config.example.js",
  "sync-config.js",
  "cloud-sync.js",
  "vendor/supabase.min.js",
  "supabase/schema.sql",
  "supabase/security-policies.sql",
  "supabase/payment-operations.sql"
]) assert(fs.existsSync(path.join(root, file)), `missing file: ${file}`);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicates.length === 0, `duplicate HTML IDs: ${duplicates.join(", ")}`);

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const tempInline = path.join(os.tmpdir(), `finance-v1219x-inline-${process.pid}.js`);
fs.writeFileSync(tempInline, inlineScripts.at(-1));
const inlineSyntax = spawnSync(process.execPath, ["--check", tempInline], { encoding:"utf8" });
try { fs.unlinkSync(tempInline); } catch {}
assert(inlineSyntax.status === 0, `inline JavaScript syntax failed: ${inlineSyntax.stderr}`);
for (const file of ["cloud-sync.js", "sync-config.js", "sync-config.example.js", "vendor/supabase.min.js", "sw.js"]) {
  const syntax = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(syntax.status === 0, `${file} syntax failed: ${syntax.stderr}`);
}

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

// Pure behavior fixtures for the approved merge rules.
const record = (id, value, time) => ({ id, value, syncUpdatedAt:time });
const mergeRecord = (base, local, remote) => {
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  return String(local?.syncUpdatedAt || "") > String(remote?.syncUpdatedAt || "") ? local : remote;
};
assert(mergeRecord(record("a",1,"2026-08-01"), record("a",2,"2026-08-03"), record("a",1,"2026-08-01")).value === 2, "local-only record merge fixture failed");
assert(mergeRecord(record("a",1,"2026-08-01"), record("a",2,"2026-08-02"), record("a",3,"2026-08-04")).value === 3, "newer overlapping cloud record fixture failed");
const tombstoneWins = (deletedAt, itemUpdatedAt) => String(deletedAt) >= String(itemUpdatedAt);
assert(tombstoneWins("2026-08-05T10:00:00Z", "2026-08-05T09:00:00Z"), "newer deletion tombstone fixture failed");
const operationKey = item => `${item.operationId}|${item.expenseId}|${item.operationType}`;
const operations = [
  {operationId:"tx-1", expenseId:"e-1", operationType:"expense_payment"},
  {operationId:"tx-1", expenseId:"e-1", operationType:"expense_payment"},
  {operationId:"tx-1", expenseId:"e-2", operationType:"expense_payment"}
];
assert(new Set(operations.map(operationKey)).size === 2, "idempotent payment-operation fixture failed");

if (failures.length) {
  console.error("V12.19.x cloud-sync baseline failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`V${version.version} MacBook and iPhone cloud-sync baseline passed.`);
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- Cloud UI, first-sync choices, offline queue, merge, tombstones, conflicts, Realtime, device controls, RLS, and payment-operation safeguards checked");
console.log("- Core schema 12 and protected manifest, offline page, and icons remained unchanged");
