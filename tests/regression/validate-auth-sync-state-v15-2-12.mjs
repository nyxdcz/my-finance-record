#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.match(source, /let clientPromise = null;/, "Cloud client creation must have an in-flight guard");
assert.match(source, /if \(clientPromise\) return clientPromise;/, "Concurrent client callers must share one promise");
assert.match(source, /const nextClient = createClient[\s\S]*nextClient\.auth\.onAuthStateChange/, "One created client must own one auth listener");
assert.match(source, /if \(cloudUser\) ensureSignedInReady\(\)/, "Auth events must use guarded signed-in initialization");
assert.match(source, /if \(cloudUser\) await ensureSignedInReady\(\); else onSignedOut\(\);/, "Session restoration must share guarded initialization");
assert.match(source, /signedInReadyUserId === userId/, "Completed startup must be deduplicated for the active user");

const existingProfileBranch = source.indexOf("if (profiles.length > 0)");
const profileCreation = source.indexOf("await arch.createCloudProfile", existingProfileBranch);
assert.ok(existingProfileBranch >= 0 && profileCreation > existingProfileBranch, "Existing-profile handling must run before profile creation");
const existingProfileCode = source.slice(existingProfileBranch, profileCreation);
assert.match(existingProfileCode, /profileSetupState = "profile-locked";[\s\S]*return false;/, "A failed existing-profile unlock must stop automatic creation");
assert.doesNotMatch(source, /Auto connect profile failed|Auto creation of cloud profile failed/, "Expected profile recovery must not flood the console");

for (const marker of ["Unlock profile", "Set up profile", "Profile issue", "Connecting…"]) {
  assert.ok(source.includes(marker), `Authoritative readiness state is missing: ${marker}`);
}
assert.match(source, /syncButton\.disabled=syncing \|\| !navigator\.onLine \|\| !readiness\.ready/, "Toolbar sync must require cloud readiness");
assert.match(source, /overviewSync\.disabled = syncing \|\| !navigator\.onLine \|\| !ready/, "Settings sync must require cloud readiness");
assert.match(source, /activateSettingsPanel\(cloudReadiness\(\)\.ready \? "sync" : "profiles"/, "Recovery actions must open Profile & Security when setup is incomplete");
assert.match(index, /id="cloudConnectionChip">Connected<\/span>/, "The connected chip must be runtime-owned");

assert.equal(version.version, "15.2.20");
assert.equal(version.cacheVersion, "finance-v15-20260821-compact-expense-stability-r56");
assert.match(worker, /cloud-sync\.js\?v=15\.2\.12-sync2/);

console.log("V15.2.12 auth and sync readiness regression passed under V15.2.18.");
