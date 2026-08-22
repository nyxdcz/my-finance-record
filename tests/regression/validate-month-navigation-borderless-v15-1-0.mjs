import assert from "node:assert/strict";
import fs from "node:fs";

const liquid = fs.readFileSync("liquid-glass-v15.css", "utf8");
const runtime = fs.readFileSync("sync-runtime-compat.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.equal(version.version, "2.0.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260822-organized-complete-r1");
assert.match(liquid, /\.topbar \.month-navigator \{[\s\S]*?border-color:transparent!important;[\s\S]*?background:transparent!important;[\s\S]*?box-shadow:none!important;/);
assert.doesNotMatch(liquid, /\.topbar :is\(\.month-navigator,\.topbar-history-actions\),\s*\.topbar :is\(\.cloud-sync-toolbar-button/);
assert.match(runtime, /liquid-glass-v15\.css\?v=15\.2\.2-light1/);
assert.match(runtime, /const VERSION = "2\.0\.0";/);
assert.match(sw, new RegExp(version.cacheVersion));
assert.match(index, new RegExp(version.cacheVersion));
assert.match(index, /sync-runtime-compat\.js\?v=2\.0\.0-release2/);
console.log("V2.0.0 borderless month-navigation regression passed while retaining the legacy Liquid Glass asset filename.");