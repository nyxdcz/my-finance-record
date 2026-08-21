import assert from "node:assert/strict";
import fs from "node:fs";

const liquid = fs.readFileSync("liquid-glass-v15.css", "utf8");
const runtime = fs.readFileSync("assets/js/ui/sync-runtime-compat.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "15.2.23");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260821-monthly-repeat-icon-r59");
assert.match(liquid, /\.topbar \.month-navigator \{[\s\S]*?border-color:transparent!important;[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important;/);
assert.doesNotMatch(liquid, /\.topbar :is\(\.month-navigator,\.topbar-history-actions\),\s*\.topbar :is\(\.cloud-sync-toolbar-button/);
assert.match(runtime, /liquid-glass-v15\.css\?v=\$\{VERSION\}-light1/);
assert.match(sw, /liquid-glass-v15\.css\?v=15\.2\.2-light1/);
assert.match(sw, /finance-v15-20260821-monthly-repeat-icon-r59/);
assert.match(index, /finance-v15-20260821-monthly-repeat-icon-r59/);
console.log("V15.2.23 borderless month-navigation regression passed.");
