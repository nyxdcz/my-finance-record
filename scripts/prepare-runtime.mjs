import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const runtimeGroups = {
  "assets/css": [
    "account-ledger.css",
    "app.css",
    "black-canvas-v15-1-0.css",
    "budget-planning.css",
    "dashboard-interactions-core-v14-0-23.css",
    "dashboard-interactions.css",
    "desktop-ui-phase1-v15-1-0.css",
    "desktop-ux-v15-2-0.css",
    "liquid-glass-v15.css",
    "mobile-v14-0-23.css",
    "productivity-tools.css",
    "projects-calendar-v13.0.20.css",
    "reminders-alerts.css",
    "reports-insights.css",
    "security-profiles.css",
    "ui-icon-alignment-v15-0-5.css"
  ],
  "assets/js": [
    "account-ledger.js",
    "budget-planning.js",
    "cloud-conflict-resolution.js",
    "cloud-conflict-review.js",
    "cloud-sync-lifecycle.js",
    "cloud-sync.js",
    "expense-screenshot-ai.js",
    "expense-screenshot-detect.js",
    "expense-screenshot-parser.js",
    "form-inputs.js",
    "interaction-patterns.js",
    "privacy-lock.js",
    "productivity-tools.js",
    "projects-calendar-v13.0.20.js",
    "pwa-update-v15-0-5.js",
    "reminders-alerts.js",
    "reports-insights.js",
    "security-profiles.js"
  ],
  "assets/js/ui": [
    "application-help.js",
    "sync-runtime-compat.js"
  ]
};

let copied = 0;
for (const [sourceDirectory, files] of Object.entries(runtimeGroups)) {
  for (const file of files) {
    const source = path.join(root, sourceDirectory, file);
    const target = path.join(root, file);
    if (!fs.existsSync(source)) throw new Error(`Missing runtime source: ${path.relative(root, source)}`);
    const sourceBytes = fs.readFileSync(source);
    const targetMatches = fs.existsSync(target) && Buffer.compare(sourceBytes, fs.readFileSync(target)) === 0;
    if (targetMatches) continue;
    fs.writeFileSync(target, sourceBytes);
    copied += 1;
  }
}

console.log(`Runtime compatibility files ready${copied ? ` · refreshed ${copied}` : ""}.`);
