import assert from "node:assert/strict";
import fs from "node:fs";

const views=fs.readFileSync("assets/js/transaction-views.js","utf8");
const privacy=fs.readFileSync("assets/js/privacy-display.js","utf8");
const cloud=fs.readFileSync("assets/js/cloud-sync.js","utf8");
for(const key of ["simple-finance-transaction-views-v1","simple-finance-privacy-display-v1"]){
  assert.equal(cloud.includes(key),false,`${key} must stay outside encrypted Cloud Schema V3 payloads`);
}
assert.match(views,/localStorage\.setItem\(storageKey\(\)/);
assert.match(privacy,/localStorage\.setItem\(storageKey\(\)/);
assert.doesNotMatch(views,/data\.[a-zA-Z]+\s*=/);
assert.doesNotMatch(privacy,/data\.[a-zA-Z]+\s*=/);
console.log("Profile preference sync boundary passed.");
