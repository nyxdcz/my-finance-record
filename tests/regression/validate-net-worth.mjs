import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/net-worth.js", "utf8");
const css = fs.readFileSync("assets/css/net-worth.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "2.5.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260828-household-splits-r12");
assert.match(source, /Manual net-worth ledger/);
assert.match(source, /Separate from Available Money, Savings, Cash Flow, and Account Ledger/);
assert.match(source, /source:"manual"/);
assert.match(source, /readOnly = Boolean\(item\)/);
assert.match(source, /Before net worth item deletion/);
assert.match(source, /Before net worth valuation deletion/);
assert.doesNotMatch(source, /data\.accounts\s*=/);
assert.doesNotMatch(source, /accountLedger\.(?:push|splice)/);
assert.doesNotMatch(source, /fetch\s*\(/);
assert.match(css, /min-height:44px/);
assert.ok(html.indexOf("./net-worth.js?v=2.5.0-talaan1") > html.indexOf("./reports-insights.js?v=2.5.0-talaan1"));
assert.match(worker, /net-worth\.js\?v=2\.5\.0-talaan1/);
assert.match(worker, /net-worth\.css\?v=2\.5\.0-talaan1/);
assert.match(worker, /endsWith\("net-worth\.js"\)/);

console.log("Manual net worth delivery, isolation, recovery, and protected schema contracts validated.");
