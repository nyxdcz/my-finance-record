#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const index = fs.readFileSync("index.html", "utf8");
const dashboardCss = fs.readFileSync("dashboard-interactions.css", "utf8");
const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const embedded = index.match(/<img class="nav-icon-image" src="data:image\/png;base64,[^"]+" alt="">/g) || [];
assert.equal(embedded.length, 5, "all five sidebar icons must be embedded PNG data URIs");
assert.doesNotMatch(dashboardCss, /sidebar-(?:overview|finance|work|settings)-v14-0-24\.png/);
assert.doesNotMatch(dashboardCss, /nav-icon-image\{content:url/);
assert.doesNotMatch(updater, /installSidebarIconRecovery|sidebarIconRecoveryBound|sidebarIconRetried/);
assert.doesNotMatch(worker, /asset\("\.\/icons\/sidebar-/);
assert.doesNotMatch(worker, /url\.pathname\.includes\("\/icons\/sidebar-"\)/);
for (const file of ["icons/sidebar-overview.png","icons/sidebar-finance.png","icons/sidebar-work.png","icons/sidebar-insights-v14-0-24.png","icons/sidebar-settings.png"]) assert.equal(fs.existsSync(file), true, `canonical source icon missing: ${file}`);
console.log("V15.2.10 embedded sidebar icon regression passed.");
