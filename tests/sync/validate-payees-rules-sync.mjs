import assert from "node:assert/strict";
import fs from "node:fs";

const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const profiles = fs.readFileSync("assets/js/security-profiles.js", "utf8");
const rules = fs.readFileSync("assets/js/payees-rules.js", "utf8");

assert.match(rules, /ledgerSettings\.financeTools/);
assert.match(cloud, /ledgerSettings:sanitizeRecordPayload/);
assert.match(cloud, /output\.ledgerSettings = clone\(settings\.ledgerSettings/);
assert.match(privacy, /ledgerSettings/);
assert.match(profiles, /data:clone\(typeof data/);
assert.match(profiles, /normalizeData\(payload\.data\)/);
assert.doesNotMatch(rules, /simple-finance-cloud-config/);
assert.doesNotMatch(rules, /supabase/i);

console.log("Payees and rules remain inside the encrypted, backup-safe ledger settings boundary.");
