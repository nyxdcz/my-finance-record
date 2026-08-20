#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const updater = fs.readFileSync("assets/js/pwa-update-v15-0-5.js", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");

assert.match(index, /<div class="brand">\s*<strong>My Finance Records<\/strong>\s*<\/div>/, "Sidebar brand must be authored statically in index.html");
assert.doesNotMatch(index, /<div class="brand">\s*<strong>Records<\/strong>/, "Legacy Records placeholder must not remain");
assert.doesNotMatch(updater, /installSidebarBrand|\.sidebar \.brand strong|My Finance Records|root\.document|querySelector/, "PWA updater must not mutate sidebar branding or access document UI");
assert.match(updater, /root\.FinancePwaUpdate = api;/, "PWA updater must still expose its cache/update API");
assert.match(index, /pwa-update-v15-0-5\.js\?v=15\.2\.10-release6/, "Index must request release6 of the pure PWA updater");
assert.match(worker, /pwa-update-v15-0-5\.js\?v=15\.2\.10-release6/, "Service worker must precache release6 of the pure PWA updater");

console.log("V15.2.10 static Sidebar Brand ownership regression passed.");
