import assert from "node:assert/strict";
import fs from "node:fs";

const formats = fs.readFileSync("assets/js/import-formats.js", "utf8");
const center = fs.readFileSync("assets/js/import-center.js", "utf8");
const css = fs.readFileSync("assets/css/import-center.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "2.5.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260828-household-splits-r12");
assert.match(formats, /function parseOfx/);
assert.match(formats, /function parseQif/);
assert.match(formats, /OFX transaction is missing FITID/);
assert.match(formats, /Split QIF transactions are not supported yet/);
assert.match(formats, /Investment OFX statements are not supported yet/);
assert.match(center, /This OFX statement uses \$\{session\.metadata\.currency\}/);
assert.match(center, /confirmQifCurrency/);
assert.match(center, /duplicateReason/);
assert.match(center, /format:session\.format/);
assert.match(css, /import-currency-confirmation/);
assert.match(css, /min-height:44px/);
const formatsPosition = html.indexOf("./import-formats.js?v=2.5.0-talaan1");
const centerPosition = html.indexOf("./import-center.js?v=2.5.0-talaan1");
assert.ok(formatsPosition >= 0 && centerPosition > formatsPosition, "statement parsers must load before the import center");
assert.match(worker, /import-formats\.js\?v=2\.5\.0-talaan1/);
assert.match(worker, /endsWith\("import-formats\.js"\)/);

console.log("OFX and QIF import delivery, currency gates, and protected schema contracts validated.");
