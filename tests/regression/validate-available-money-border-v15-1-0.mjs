#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
// Keep the deployed Black Canvas asset pin aligned with the current desktop shell.
const css = fs.readFileSync("black-canvas-v15-1-0.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
assert.match(css, /#availableMoneySection \.account-card \{[\s\S]*border-color:rgba\(207,231,213,\.24\) !important;/);
assert.doesNotMatch(css, /#availableMoneySection \{[\s\S]{0,160}border-color:rgba\(207,231,213,\.24\)/);
assert.match(index, /black-canvas-v15-1-0\.css\?v=15\.1\.0-light1/);
assert.match(sw, /black-canvas-v15-1-0\.css\?v=15\.1\.0-light1/);
assert.equal(version.version, "15.2.11");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260820-shell-ui-r47");
console.log("V15.2.9 Available money account-border regression passed.");
