#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const cloud = read("cloud-sync.js");
const worker = read("sw.js");
const resolution = read("cloud-conflict-resolution.js");
const review = read("cloud-conflict-review.js");

for (const file of ["cloud-sync.js","cloud-conflict-resolution.js","cloud-conflict-review.js","sw.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(result.status === 0, `${file} syntax check failed: ${result.stderr || result.stdout}`);
}

assert(cloud.includes("function reconcilePendingWithRemote"), "multi-device reconciliation helper is missing");
assert(cloud.includes("threeWayMerge(basePayload, local.payload, row.payload"), "non-overlapping device/cloud changes are not three-way merged");
assert(cloud.includes('local.status = "conflict"'), "overlapping changes are not preserved as explicit conflicts");
assert(cloud.includes("Safely merged non-overlapping changes from another device."), "safe merge state is not recorded");
assert(!cloud.includes("function adoptExistingCloudConflicts()"), "old auto-discard conflict recovery is still present");
assert(cloud.includes("function recoverStoredConflicts()"), "stored conflicts are not preserved across upgrade");
assert(cloud.includes('function keepLocal(key) { return resolveConflict(key,"device"); }'), "Use this device does not select the device version");
assert(cloud.includes("onUseDevice:token=>keepLocal(keyFromToken(token))"), "conflict review still routes Use this device to cloud");
assert(!cloud.includes("onUseDevice:token=>discardLocal"), "legacy Use this device discard path remains");
assert(resolution.includes("choice === \"device\""), "resolution helper cannot rebase a chosen device record");
assert(review.includes('data-conflict-review-action="device"'), "conflict review has no Use this device action");
assert(cloud.includes("function replaceCloudWithThisDevice()"), "protected device-to-cloud recovery action is missing");
assert(cloud.includes('recoveryPoint("Before replacing cloud from this device")'), "device-to-cloud recovery does not create a recovery point first");
assert(cloud.includes("Make this device the current cloud copy"), "device-to-cloud recovery control is missing");
assert(cloud.includes("Reading current cloud revisions first"), "sync does not communicate pull-before-push ordering");
const syncStart = cloud.indexOf("async function syncNow");
const firstPull = cloud.indexOf("await pullChanges();", syncStart);
const pushLoop = cloud.indexOf("while (Object.values(pending)", syncStart);
assert(syncStart >= 0 && firstPull > syncStart && pushLoop > firstPull, "sync must pull current cloud revisions before queued device uploads");
assert(cloud.includes("5*60*1000"), "five-minute routine sync cadence changed");
assert(worker.includes('finance-v15-20260821-runtime-stable-audit-r53'), "PWA cache was not rotated for the V15.2.17 production UI audit");
assert(worker.includes('asset("./cloud-sync.js?v=15.2.12-sync2")'), "PWA shell does not pin the stabilized cloud sync client");
assert(worker.includes('new Request(url, { cache:"reload" })'), "PWA precache no longer bypasses stale HTTP cache");

if (failures.length) {
  console.error(`Safe multi-device sync validation failed (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log("Safe multi-device sync validation passed under the V15.2.17 release shell.");
