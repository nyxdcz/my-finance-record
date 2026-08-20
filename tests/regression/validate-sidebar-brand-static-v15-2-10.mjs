#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const updater = fs.readFileSync("assets/js/pwa-update-v15-0-5.js", "utf8");

assert.match(index, /<div class="brand">\s*<strong>My Finance Records<\/strong>\s*<\/div>/, "Sidebar shell must statically render My Finance Records");
assert.doesNotMatch(index, /<div class="brand">\s*<strong>Records<\/strong>/, "Legacy short brand must not remain");
assert.doesNotMatch(updater, /installSidebarBrand|querySelector|\bdocument\b|textContent\s*=\s*"My Finance Records"/, "PWA updater must not own sidebar branding or DOM mutation");
assert.match(updater, /root\.FinancePwaUpdate = api;/, "PWA updater must still expose the update API");
assert.match(updater, /async clearFinanceCaches\(\)/, "PWA updater must still own finance-cache clearing");

console.log("V15.2.10 static sidebar brand ownership regression passed.");
