import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const BRAND = "Talaan";
const PREVIOUS_BRAND = ["My", "Finance", "Records"].join(" ");

const RELEASE = Object.freeze({
  version:"2.0.1",
  displayVersion:"V2.0.1",
  name:"Talaan",
  date:"August 22, 2026",
  dateIso:"2026-08-22",
  cache:"finance-v2-20260822-talaan-r1",
  cssQuery:"2.0.1-talaan1",
  pwaQuery:"2.0.1-talaan1",
  phoneQuery:"2.0.1-talaan1"
});

const CURRENT_VERSION_HISTORY = Object.freeze([{
  version:RELEASE.displayVersion,
  title:RELEASE.name,
  changes:[
    "Current production release under the Talaan product name.",
    "Updates the website shell, installed-app metadata, offline experience, installation messages, calendar export branding, and current documentation to Talaan.",
    "Includes the complete local-first Finance workspace, Account Ledger, budgeting, reports, projects, productivity tools, reminders, and responsive desktop and phone layouts.",
    "Includes encrypted multi-profile Cloud Schema V3 synchronization, offline PWA support, recovery safeguards, and five-minute routine sync.",
    "Preserves Finance Schema 12, Cloud Schema V3, saved records, balances, recurrence, payments, backups, encryption, storage identifiers, and synchronization behavior."
  ]
}]);

const runtimeGroups = {
  "assets/css": [
    "account-ledger.css",
    "app.css",
    "shell-ui-v15-2-11.css",
    "black-canvas-v15-1-0.css",
    "budget-planning.css",
    "dashboard-interactions-core-v14-0-23.css",
    "dashboard-interactions.css",
    "desktop-ui-phase1-v15-1-0.css",
    "desktop-ux-v15-2-0.css",
    "liquid-glass-v15.css",
    "mobile-v14-0-23.css",
    "productivity-tools.css",
    "production-ui-audit-v15-2-13.css",
    "projects-calendar-v13.0.20.css",
    "reminders-alerts.css",
    "reports-insights.css",
    "security-profiles.css",
    "ui-icon-alignment-v15-0-5.css"
  ],
  "assets/js": [
    "account-ledger.js",
    "brand-icons-v15-2-18.js",
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
  "assets/js/features": [
    "cash-flow-summary.js"
  ],
  "assets/js/ui": [
    "application-help.js",
    "header-tools-compat.js",
    "phone-finance-compat.js",
    "sync-runtime-compat.js"
  ]
};

let changed = 0;
const writeIfChanged = (target, content) => {
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (fs.existsSync(target) && Buffer.compare(next, fs.readFileSync(target)) === 0) return false;
  fs.writeFileSync(target, next);
  changed += 1;
  return true;
};

for (const [sourceDirectory, files] of Object.entries(runtimeGroups)) {
  for (const file of files) {
    const source = path.join(root, sourceDirectory, file);
    const target = path.join(root, file);
    if (!fs.existsSync(source)) throw new Error(`Missing runtime source: ${path.relative(root, source)}`);
    writeIfChanged(target, fs.readFileSync(source));
  }
}

function appendRuntimeOverlay(targetFile, overlayFile, marker) {
  const target = path.join(root, targetFile);
  const overlay = path.join(root, overlayFile);
  if (!fs.existsSync(target)) throw new Error(`Missing runtime target: ${targetFile}`);
  if (!fs.existsSync(overlay)) throw new Error(`Missing runtime overlay: ${overlayFile}`);
  const base = fs.readFileSync(target, "utf8").replace(new RegExp(`\\n?${marker}[\\s\\S]*$`), "").trimEnd();
  const overlayText = fs.readFileSync(overlay, "utf8").trim();
  writeIfChanged(target, `${base}\n\n${marker}\n${overlayText}\n`);
}

appendRuntimeOverlay(
  "production-ui-audit-v15-2-13.css",
  "assets/css/expense-compact-v15-2-24.css",
  "/* V15.2.24 RUNTIME OVERLAY */"
);
appendRuntimeOverlay(
  "phone-finance-compat.js",
  "assets/js/ui/expense-compact-v15-2-24.js",
  "/* V15.2.24 RUNTIME OVERLAY */"
);

function patchTextFile(file, transform) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) throw new Error(`Missing release file: ${file}`);
  const current = fs.readFileSync(target, "utf8");
  writeIfChanged(target, transform(current));
}

const runtimeJsTargets = [...new Set(Object.values(runtimeGroups).flat().filter(file => file.endsWith(".js")))];
for (const file of runtimeJsTargets) {
  patchTextFile(file, source => source
    .replaceAll(PREVIOUS_BRAND, BRAND)
    .replaceAll("Finance Records installed", `${BRAND} installed`));
}

patchTextFile("index.html", source => {
  let next = source
    .replaceAll(PREVIOUS_BRAND, BRAND)
    .replaceAll("Finance Records installed", `${BRAND} installed`)
    .replaceAll("My_Finance_Records_Calendar_Test.ics", "Talaan_Calendar_Test.ics")
    .replace(/<meta name="application-name" content="[^"]+">/, `<meta name="application-name" content="${BRAND}">`)
    .replace(/<meta name="apple-mobile-web-app-title" content="[^"]+">/, `<meta name="apple-mobile-web-app-title" content="${BRAND}">`)
    .replace(/<title>[^<]+ · V\d+\.\d+\.\d+<\/title>/, `<title>${BRAND} · ${RELEASE.displayVersion}</title>`)
    .replace(/const APP_VERSION = "\d+\.\d+\.\d+";/, `const APP_VERSION = "${RELEASE.version}";`)
    .replace(/const APP_RELEASE_NAME = "[^"]+";/, `const APP_RELEASE_NAME = "${RELEASE.name}";`)
    .replace(/const APP_RELEASE_DATE = "[^"]+";/, `const APP_RELEASE_DATE = "${RELEASE.date}";`)
    .replace(/const APP_CACHE_VERSION = "finance-v[^"]+";/, `const APP_CACHE_VERSION = "${RELEASE.cache}";`)
    .replace(/production-ui-audit-v15-2-13\.css\?v=[^"]+/, `production-ui-audit-v15-2-13.css?v=${RELEASE.cssQuery}`)
    .replace(/pwa-update-v15-0-5\.js\?v=[^"]+/, `pwa-update-v15-0-5.js?v=${RELEASE.pwaQuery}`)
    .replace(/phone-finance-compat\.js\?v=[^"]+/, `phone-finance-compat.js?v=${RELEASE.phoneQuery}`);

  const historySource = `    const VERSION_HISTORY = ${JSON.stringify(CURRENT_VERSION_HISTORY)};`;
  next = next.replace(
    /    const VERSION_HISTORY = \[[\s\S]*?\n\n    function normalizeSettingsPanelKey\(/,
    `${historySource}\n\n    function normalizeSettingsPanelKey(`
  );
  next = next.replace(
    /<h3>Version history<\/h3><p>[^<]*<\/p>/,
    "<h3>Version history</h3><p>Latest release details</p>"
  );
  if (next.includes(PREVIOUS_BRAND)) throw new Error("Prepared index still contains the superseded display brand.");
  return next;
});

patchTextFile("manifest.webmanifest", source => {
  const manifest = JSON.parse(source);
  manifest.name = BRAND;
  manifest.short_name = BRAND;
  manifest.description = "Talaan is a local-first personal and household finance PWA for income, expenses, budgets, projects, payments, calendar planning, savings, and financial reports.";
  return `${JSON.stringify(manifest, null, 2)}\n`;
});

patchTextFile("offline.html", source => source
  .replaceAll(PREVIOUS_BRAND, BRAND)
  .replaceAll("Finance Records", BRAND)
  .replace(/<title>[^<]+ · Offline<\/title>/, `<title>${BRAND} · Offline</title>`)
  .replace(/Open [^<]+<\/button>/, `Open ${BRAND}</button>`));

patchTextFile("sw.js", source => source
  .replace(/const APP_VERSION = "\d+\.\d+\.\d+";/, `const APP_VERSION = "${RELEASE.version}";`)
  .replace(/const CACHE_VERSION = "finance-v[^"]+";/, `const CACHE_VERSION = "${RELEASE.cache}";`)
  .replace(/production-ui-audit-v15-2-13\.css\?v=[^"]+/, `production-ui-audit-v15-2-13.css?v=${RELEASE.cssQuery}`)
  .replace(/pwa-update-v15-0-5\.js\?v=[^"]+/, `pwa-update-v15-0-5.js?v=${RELEASE.pwaQuery}`)
  .replace(/phone-finance-compat\.js\?v=[^"]+/, `phone-finance-compat.js?v=${RELEASE.phoneQuery}`));

const lockPath = path.join(root, "package-lock.json");
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = RELEASE.version;
  if (lock.packages?.[""]) lock.packages[""].version = RELEASE.version;
  writeIfChanged(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

const changelogPath = path.join(root, "CHANGELOG.md");
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, "utf8");
  const heading = `## ${RELEASE.displayVersion} · ${RELEASE.name}`;
  if (!changelog.includes(heading)) {
    throw new Error(`CHANGELOG.md must describe the current ${RELEASE.displayVersion} release.`);
  }
}

console.log(`Talaan runtime ready for ${RELEASE.displayVersion}${changed ? ` · refreshed ${changed}` : ""}.`);
