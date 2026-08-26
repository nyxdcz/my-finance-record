import assert from "node:assert/strict";
import fs from "node:fs";

const importSource = fs.readFileSync("assets/js/import-center.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");

assert.match(importSource, /ledgerSettings\.importCenter/);
assert.match(importSource, /normalizeImportCenter/);
assert.match(importSource, /profiles, batches/);
assert.match(cloud, /ledgerSettings:sanitizeRecordPayload/);
assert.match(cloud, /output\.ledgerSettings = clone\(settings\.ledgerSettings/);
assert.match(privacy, /recoveryStorage:/);
assert.doesNotMatch(importSource, /simple-finance-cloud-config/);
assert.doesNotMatch(importSource, /supabase/i);
assert.doesNotMatch(importSource, /localStorage\.setItem\([^)]*(?:file|csv)/i);

console.log("CSV mapping profiles and batch metadata remain inside encrypted ledger settings without a new cloud collection.");
