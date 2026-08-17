#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const privacy = read("privacy-lock.js");
const cloud = read("cloud-sync.js");
const worker = read("sw.js");

assert(privacy.includes("V15.2.2 mobile cloud-revert safety guard"), "mobile cloud-revert guard is missing");
assert(privacy.includes("simple-finance-cloud-record-base-v3:"), "guard does not inspect the Cloud Sync baseline");
assert(privacy.includes("simple-finance-profile-data-v1:"), "guard does not require established profile-local Finance data");
assert(privacy.includes("meta.initializedUserId=scope"), "guard does not preserve the initialized cloud scope before Cloud Sync boots");
assert(privacy.includes("basePayload:null"), "recovered records are not marked as having an unknown common base");
assert(privacy.includes("nextAttemptAt:HOLD_UNTIL"), "uncertain recovered records can auto-upload before cloud comparison");
assert(privacy.includes("Cloud sync baseline was missing on this device"), "protected recovery records are not explained to the user");
assert(privacy.includes("fast-${reason}"), "resume synchronization is not triggered through the fast recovery path");
assert(privacy.includes('window.addEventListener("focus",()=>request("focus"))'), "focus does not request a fast cloud reconciliation");
assert(privacy.includes('window.addEventListener("pageshow",()=>request("pageshow"))'), "pageshow does not request a fast cloud reconciliation");
assert(privacy.includes('window.addEventListener("online",()=>request("online"))'), "online recovery does not request a fast cloud reconciliation");
assert(worker.includes('url.pathname.endsWith("privacy-lock.js")'), "privacy-lock is no longer treated as a critical service-worker asset");
assert(worker.includes("networkFirstCriticalAsset(request)"), "critical privacy/sync guard delivery is not network-first");

const syncStart = cloud.indexOf("async function syncNow");
const firstPull = cloud.indexOf("await pullChanges();", syncStart);
const pushLoop = cloud.indexOf("while (Object.values(pending)", syncStart);
assert(syncStart >= 0 && firstPull > syncStart && pushLoop > firstPull, "Cloud Sync must still pull current revisions before any pending upload");
assert(cloud.includes("5*60*1000"), "normal five-minute periodic synchronization cadence changed");

if (failures.length) {
  console.error(`Mobile cloud-revert safety validation failed (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log("Mobile cloud-revert safety validation passed.");
