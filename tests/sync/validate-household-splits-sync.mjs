import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/household-splits.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.match(source, /ledgerSettings\.householdSplits/);
assert.match(source, /function mergeStores/);
assert.match(html, /FinanceHouseholdSplits\.mergeStores/);
assert.match(html, /FinanceHouseholdSplits\.countConflicts/);
assert.match(cloud, /ledgerSettings:sanitizeRecordPayload/);
assert.match(privacy, /ledgerSettings\?\.householdSplits\?\.groups/);
assert.doesNotMatch(source, /cloudSchemaVersion\s*[:=]\s*4/);
assert.doesNotMatch(source, /schemaVersion\s*[:=]\s*13/);

console.log("Household splits remain inside encrypted Cloud V3 settings and protected backup merge boundaries.");
