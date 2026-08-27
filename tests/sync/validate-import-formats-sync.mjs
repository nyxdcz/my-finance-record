import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync("assets/js/import-center.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const context = vm.createContext({ console, structuredClone, Intl, Date, Math, JSON, Number, String, Object, Array, Set, Map, RegExp, Error, crypto:webcrypto });
vm.runInContext(source, context);

const normalized = JSON.parse(JSON.stringify(context.FinanceImportCenter.normalizeImportCenter({
  version:1,
  profiles:[
    { id:"profile-ofx", name:"Bank OFX", format:"ofx", mapping:{ date:"0", amount:"3", description:"1" } },
    { id:"profile-qif", name:"Bank QIF", format:"qif", mapping:{ date:"0", amount:"3", description:"1" } }
  ],
  batches:[
    { id:"batch-ofx", format:"ofx", importedAt:"2026-08-26T00:00:00.000Z", rowCount:2 },
    { id:"batch-qif", format:"qif", importedAt:"2026-08-26T00:01:00.000Z", rowCount:3 }
  ]
})));

assert.deepEqual(normalized.profiles.map(item => item.format), ["ofx", "qif"]);
assert.deepEqual(normalized.batches.map(item => item.format), ["qif", "ofx"]);
assert.match(source, /ledgerSettings\.importCenter/);
assert.match(cloud, /ledgerSettings:sanitizeRecordPayload/);
assert.doesNotMatch(source, /cloudSchemaVersion\s*[:=]\s*4/);
assert.doesNotMatch(source, /schemaVersion\s*[:=]\s*13/);

console.log("OFX and QIF profile and batch metadata remain inside encrypted Cloud V3 ledger settings.");
