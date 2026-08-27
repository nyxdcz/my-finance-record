import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/js/payees-rules.js", "utf8");
const ledgerSource = fs.readFileSync("assets/js/account-ledger.js", "utf8");
const css = fs.readFileSync("assets/css/payees-rules.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");

assert.match(source, /ledgerSettings\.financeTools/);
assert.match(source, /normalize\("NFKC"\)/);
assert.match(source, /new RegExp\(String\(value \|\| ""\), "iu"\)/);
assert.match(source, /a\.priority - b\.priority/);
assert.match(source, /String\(a\.createdAt\)\.localeCompare/);
assert.match(source, /a\.id\.localeCompare/);
assert.match(source, /Account suggestion/);
assert.doesNotMatch(source, /actions\.paid/);
assert.doesNotMatch(source, /actions\.account\s*=/);
assert.match(source, /recoveryStorage\?\.save/);
assert.match(source, /pushUndo/);
assert.match(source, /JSON\.stringify\(data\.accounts/);
assert.match(ledgerSource, /normalized\.ledgerSettings = \{\s*\.\.\.settingsSource,/);
assert.match(index, /data-settings-tab="finance-tools"/);
assert.match(index, /payees-rules\.js\?v=2\.3\.0-talaan1/);
assert.match(css, /min-height:44px/);
assert.match(css, /@media\(max-width:620px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /forced-colors/);
assert.match(worker, /payees-rules\.js\?v=2\.3\.0-talaan1/);
assert.match(worker, /payees-rules\.css\?v=2\.3\.0-talaan1/);

console.log("Payees and transaction rules source contract passed.");
