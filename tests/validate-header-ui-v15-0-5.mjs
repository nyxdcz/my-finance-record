#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const privacy = fs.readFileSync("privacy-lock.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("ui-icon-alignment-v15-0-5.css", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
assert.doesNotMatch(privacy, /ensureTopbarSignIn/);
assert.doesNotMatch(privacy, /createElement\("button"\)[\s\S]*privacySignInButton/);
assert.match(privacy, /removeTopbarSignIn/);
assert.match(index, /id="cloudSignIn"/);
assert.match(css, /customizeDashboardButton\[data-dashboard-toolbar-action\]::before[\s\S]*translateY\(1px\)/);
assert.match(index, /privacy-lock\.js\?v=15\.0\.5-ui1/);
assert.match(index, /ui-icon-alignment-v15-0-5\.css\?v=15\.0\.5-ui2/);
assert.equal(version.cacheVersion, "finance-v15-20260815-header-ui-r14");
assert.match(sw, /finance-v15-20260815-header-ui-r14/);
console.log("V15.0.5 header UI regression passed.");
