import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/import-center.js", "utf8");
const css = fs.readFileSync("assets/css/import-center.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "2.2.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260826-import-center-r8");
assert.match(source, /function parseCsv/);
assert.match(source, /function analyzeRows/);
assert.match(source, /function existingFingerprintSet/);
assert.match(source, /function rollbackBatch/);
assert.match(source, /FinancePayeeRules\?\.previewRecord/);
assert.match(source, /const refreshed = analyzeRows\(session\.parsed, session\.options, data\)/);
assert.match(source, /These rule suggestions will be included if this row stays selected/);
assert.match(source, /data\.expenses = \(data\.expenses \|\| \[\]\)\.filter\(item => item\.importBatchId !== id\)/);
assert.doesNotMatch(source, /data\.accounts\s*\[/);
assert.doesNotMatch(source, /appendLedgerEntries|appendReconciliation|recordSpend/);
assert.match(css, /min-height:44px/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /forced-colors/);
assert.match(html, /Payees, rules, and import/);

console.log("CSV import source contract preserves schemas, balances, phone geometry, recovery, and rollback.");
