#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const cloud = read("cloud-sync.js");
const worker = read("sw.js");

for (const file of ["cloud-sync.js", "sw.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(result.status === 0, `${file} syntax check failed: ${result.stderr || result.stdout}`);
}

assert(cloud.includes("Cloud records are the source of truth"), "cloud-first Settings wording is missing");
assert(cloud.includes('await initializeFirstSync(v3Exists ? "download" : "upload")'), "existing cloud data is not selected before first-device upload");
assert(cloud.includes('mode = cloudExists ? "download" : "upload"'), "first-sync mode does not force download when cloud records exist");
assert(cloud.includes("function adoptExistingCloudConflicts()"), "existing device conflicts are not recovered to cloud-confirmed records");
assert(cloud.includes("delete pending[item.key]"), "stale conflict recovery does not remove the pending device overlay");
assert(cloud.includes("if (Number(row.revision || 0) > Number(local.baseRevision || 0))"), "newer cloud revision guard is missing");
assert(cloud.includes("baseRecords[key] = row;\n      delete pending[key];\n      conflicts = conflicts.filter(item => item.key !== key);"), "newer cloud records do not replace the device pending record");
assert(!cloud.includes("Safely merged non-overlapping fields from another device."), "old local-preserving merge path still exists");
assert(!cloud.includes('local.status="conflict"'), "remote pull can still convert a stale device record into a manual conflict");
assert(cloud.includes("onUseDevice:token=>discardLocal(keyFromToken(token))"), "legacy Use this device conflict action can still overwrite cloud");
assert(cloud.includes("Reading current cloud records first"), "sync status does not communicate cloud-first ordering");

const syncStart = cloud.indexOf("async function syncNow");
const firstPull = cloud.indexOf("await pullChanges();", syncStart);
const pushLoop = cloud.indexOf("while (Object.values(pending)", syncStart);
assert(syncStart >= 0 && firstPull > syncStart && pushLoop > firstPull, "sync does not pull cloud before attempting queued device uploads");

assert(worker.includes('finance-v14-20260814-v1423-cloud-authority-r2'), "PWA cache was not refreshed for cloud-authoritative sync");
assert(worker.includes('asset("./cloud-sync.js?v=14.0.23")'), "cloud sync asset is missing from the offline shell");

if (failures.length) {
  console.error(`Cloud-authority validation failed (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log("Cloud-authoritative sync validation passed.");
