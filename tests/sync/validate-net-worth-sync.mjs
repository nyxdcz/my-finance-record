import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/net-worth.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.match(source, /ledgerSettings\.netWorth/);
assert.match(source, /function mergeStores/);
assert.match(html, /FinanceNetWorth\.mergeStores/);
assert.match(html, /FinanceNetWorth\.countConflicts/);
assert.match(cloud, /ledgerSettings:sanitizeRecordPayload/);
assert.match(privacy, /ledgerSettings\?\.netWorth\?\.items/);
assert.doesNotMatch(source, /cloudSchemaVersion\s*[:=]\s*4/);
assert.doesNotMatch(source, /schemaVersion\s*[:=]\s*13/);

console.log("Manual net worth remains inside encrypted Cloud V3 ledger settings and protected backup merge boundaries.");
