#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const css=fs.readFileSync("black-canvas-v15-1-0.css","utf8");
const index=fs.readFileSync("index.html","utf8");
const sw=fs.readFileSync("sw.js","utf8");
const version=JSON.parse(fs.readFileSync("version.json","utf8"));
assert.match(css,/html\[data-theme="light"\] #availableMoneySection \.account-spend-button\s*\{[\s\S]*color:var\(--text\) !important;/);
assert.match(css,/html\[data-theme="light"\] #availableMoneySection \.account-spend-button span\s*\{[\s\S]*color:var\(--text\) !important;/);
assert.match(css,/html\[data-theme="dark"\] #availableMoneySection \.account-spend-button span\s*\{[\s\S]*color:#ffffff !important;/);
assert.match(index,/black-canvas-v15-1-0\.css\?v=15\.1\.0-light1/);
assert.match(sw,/black-canvas-v15-1-0\.css\?v=15\.1\.0-light1/);
assert.equal(version.version,"15.2.2");
assert.equal(version.schemaVersion,12);
assert.equal(version.cloudSchemaVersion,3);
assert.equal(version.cacheVersion,"finance-v15-20260817-sync-status-r38");
console.log("V15.2.2 Spend theme contrast regression passed.");
