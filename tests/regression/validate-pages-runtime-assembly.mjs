import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/quality-pages.yml", "utf8");
const canonicalAssets = workflow.indexOf("cp assets/js/*.js _site/");
const generatedUpdater = workflow.indexOf("cp pwa-update.js _site/pwa-update.js");
const upload = workflow.indexOf("uses: actions/upload-pages-artifact@v5");

assert.ok(canonicalAssets >= 0, "Pages assembly must include canonical JS assets");
assert.ok(generatedUpdater > canonicalAssets, "Generated pwa-update.js must overwrite the canonical placeholder after assets/js are copied");
assert.ok(upload > generatedUpdater, "Generated account updater must be installed before the Pages artifact is uploaded");
assert.match(workflow, /content-derived[\s\S]*account integrity revision/, "Pages workflow should document why generated pwa-update.js wins");

console.log("GitHub Pages preserves the generated content-derived account updater runtime.");
