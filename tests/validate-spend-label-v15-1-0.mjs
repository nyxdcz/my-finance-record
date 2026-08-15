#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const css = fs.readFileSync("black-canvas-v15-1-0.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
assert.match(css, /#availableMoneySection \.account-spend-button span\s*\{[\s\S]*color:#ffffff !important;/);
assert.match(index, /black-canvas-v15-1-0\.css\?v=15\.1\.0-periodradius1/);
assert.match(sw, /black-canvas-v15-1-0\.css\?v=15\.1\.0-periodradius1/);
assert.equal(version.version, "15.1.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260815-month-nav-borderless-r23");
console.log("V15.1.0 Spend label regression passed.");
