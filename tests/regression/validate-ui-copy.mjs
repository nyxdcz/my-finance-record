import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const sourceFiles = [
  "index.html",
  "assets/js/account-ledger.js",
  "assets/js/cloud-sync-lifecycle.js",
  "assets/js/cloud-sync.js",
  "assets/js/household-splits.js",
  "assets/js/import-center.js",
  "assets/js/reports-insights.js"
];

const runtimeEmDashLines = file => read(file)
  .split(/\r?\n/)
  .map((line, index) => ({ line, number:index + 1 }))
  .filter(({ line }) => line.includes("—"));

const findings = sourceFiles.flatMap(file => runtimeEmDashLines(file)
  .filter(({ line }) => !(file === "index.html" && line.includes("icsEscape")))
  .map(({ line, number }) => `${file}:${number}: ${line.trim()}`));

assert.deepEqual(findings, [], `User-facing runtime copy contains an em dash:\n${findings.join("\n")}`);
assert.match(read("index.html"), /Planning only\. This does not change Total Savings\./);
assert.match(read("assets/js/cloud-sync.js"), /Offline: sync paused\./);

console.log("User-facing runtime copy contains no em dash characters; non-UI export and input-normalization uses remain scoped.");
