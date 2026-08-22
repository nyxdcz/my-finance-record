#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const updater = fs.readFileSync("assets/js/pwa-update-v15-0-5.js", "utf8");

assert.match(index, /<div class="brand">\s*<strong>Talaan<\/strong>\s*<\/div>/, "Sidebar shell must statically render Talaan");
assert.doesNotMatch(index, /<div class="brand">\s*<strong>Records<\/strong>/, "Short fallback brand must not remain");
assert.doesNotMatch(updater, /installSidebarBrand|querySelector|\bdocument\b|textContent\s*=\s*"Talaan"/, "PWA updater must not own sidebar branding or DOM mutation");
assert.match(updater, /root\.FinancePwaUpdate = api;/, "PWA updater must still expose the update API");
assert.match(updater, /async clearFinanceCaches\(\)/, "PWA updater must still own finance-cache clearing");

console.log("Static Talaan sidebar brand ownership regression passed.");
