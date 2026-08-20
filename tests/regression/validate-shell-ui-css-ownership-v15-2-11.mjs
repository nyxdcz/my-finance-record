#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/css/shell-ui-v15-2-11.css", "utf8");
const legacy = fs.readFileSync("assets/css/app.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const runtime = fs.readFileSync("scripts/prepare-runtime.mjs", "utf8");

const ownershipContracts = [
  ".pwa-install-guide-dialog",
  ".finance-privacy-lock-view",
  "--nav-active-bg",
  ".settings-search-panel",
  "body.sidebar-layout-pinned .main",
];

for (const contract of ownershipContracts) {
  assert.ok(source.includes(contract), `dedicated shell stylesheet owns ${contract}`);
  assert.ok(!legacy.includes(contract), `legacy app.css no longer owns ${contract}`);
}

assert.ok(
  index.includes('<link rel="stylesheet" href="./shell-ui-v15-2-11.css?v=15.2.11-shell1">'),
  "index loads the extracted stylesheet with a release pin",
);
assert.ok(
  worker.includes('asset("./shell-ui-v15-2-11.css?v=15.2.11-shell1")'),
  "service worker precaches the extracted stylesheet",
);
assert.ok(
  runtime.includes('"shell-ui-v15-2-11.css"'),
  "runtime preparation publishes the extracted stylesheet",
);
assert.ok(legacy.split(/\r?\n/).length < 5400, "app.css has restored maintainability headroom");

console.log("V15.2.12 shell UI CSS ownership validation passed.");
