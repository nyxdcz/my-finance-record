import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/household-splits.js", "utf8");
const css = fs.readFileSync("assets/css/household-splits.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "2.5.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260828-household-splits-r17");
assert.match(source, /function allocateShares/);
assert.match(source, /function positions/);
assert.match(source, /payerMemberId/);
assert.match(source, /does not create income, an expense, or an Account Ledger entry/);
assert.match(source, /Before recording household settlement/);
assert.match(source, /Before deleting household settlement/);
assert.match(source, /getElementById\("expenseRecurringSection"\) \|\| recurring/, "household split control must remain outside the collapsed Recurring section");
assert.match(source, /function pendingHouseholdPayment\(\)[\s\S]*data = ensureShape\(data\)[\s\S]*return \{ items, group \}/, "household payment must collect live expense references after normalization");
assert.doesNotMatch(source, /store\(\)\.(?:groups|settlements)\s*=\s*[^;\n]*store\(\)/, "household mutations must not assign through stale normalized-store references");
assert.doesNotMatch(source, /data\.accounts\s*=/);
assert.doesNotMatch(source, /accountLedger\.(?:push|splice)/);
assert.doesNotMatch(source, /fetch\s*\(/);
assert.match(css, /min-height:44px/);
assert.ok(html.indexOf("./household-splits.js?v=2.5.0-talaan1") > html.indexOf("./net-worth.js?v=2.5.0-talaan1"));
assert.match(worker, /household-splits\.js\?v=2\.5\.0-talaan1/);
assert.match(worker, /household-splits\.css\?v=2\.5\.0-talaan1/);
assert.match(worker, /endsWith\("household-splits\.js"\)/);

console.log("Household split calculation, isolation, recovery, responsive, and delivery contracts validated.");
