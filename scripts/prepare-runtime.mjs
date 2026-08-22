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
  assetQuery:"2.0.1-talaan1"
});

const CURRENT_VERSION_HISTORY = Object.freeze([{
  version:RELEASE.displayVersion,
  title:RELEASE.name,
  changes:[
    "Current production release under the Talaan product name.",
    "Uses responsibility-based runtime filenames instead of old V13-V15 product-era filenames.",
    "Includes the complete local-first Finance workspace, Account Ledger, budgeting, reports, projects, productivity tools, reminders, and responsive desktop and phone layouts.",
    "Includes encrypted multi-profile Cloud Schema V3 synchronization, offline PWA support, recovery safeguards, and five-minute routine sync.",
    "Preserves Finance Schema 12, Cloud Schema V3, saved records, balances, recurrence, payments, backups, encryption, persistent storage identifiers, and synchronization behavior."
  ]
}]);

const runtimeGroups = {
  "assets/css": [
    "account-ledger.css",
    "app.css",
    "shell-ui.css",
    "black-canvas.css",
    "budget-planning.css",
    "dashboard-interactions-core.css",
    "dashboard-interactions.css",
    "desktop-ui-phase1.css",
    "desktop-ux.css",
    "liquid-glass.css",
    "mobile.css",
    "productivity-tools.css",
    "production-ui-audit.css",
    "projects-calendar.css",
    "reminders-alerts.css",
    "reports-insights.css",
    "security-profiles.css",
    "summary-mascots.css",
    "ui-icon-alignment.css"
  ],
  "assets/js": [
    "account-ledger.js",
    "brand-icons.js",
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
    "projects-calendar.js",
    "pwa-update.js",
    "reminders-alerts.js",
    "reports-insights.js",
    "security-profiles.js"
  ],
  "assets/js/features": ["cash-flow-summary.js"],
  "assets/js/ui": [
    "application-help.js",
    "header-tools-compat.js",
    "phone-finance-compat.js",
    "summary-mascots.js",
    "sync-runtime-compat.js"
  ]
};

const LEGACY_RUNTIME_RENAMES = new Map([
  ["shell-ui-v15-2-11.css", "shell-ui.css"],
  ["black-canvas-v15-1-0.css", "black-canvas.css"],
  ["dashboard-interactions-core-v14-0-23.css", "dashboard-interactions-core.css"],
  ["desktop-ui-phase1-v15-1-0.css", "desktop-ui-phase1.css"],
  ["desktop-ux-v15-2-0.css", "desktop-ux.css"],
  ["liquid-glass-v15.css", "liquid-glass.css"],
  ["mobile-v14-0-23.css", "mobile.css"],
  ["production-ui-audit-v15-2-13.css", "production-ui-audit.css"],
  ["projects-calendar-v13.0.20.css", "projects-calendar.css"],
  ["projects-calendar-v13.0.20.js", "projects-calendar.js"],
  ["ui-icon-alignment-v15-0-5.css", "ui-icon-alignment.css"],
  ["brand-icons-v15-2-18.js", "brand-icons.js"],
  ["pwa-update-v15-0-5.js", "pwa-update.js"],
  ["summary-mascots-v15-2-25.css", "summary-mascots.css"],
  ["summary-mascots-v15-2-25.js", "summary-mascots.js"]
]);

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
  "production-ui-audit.css",
  "assets/css/expense-compact.css",
  "/* TALAAN RUNTIME OVERLAY */"
);
appendRuntimeOverlay(
  "phone-finance-compat.js",
  "assets/js/ui/expense-compact.js",
  "/* TALAAN RUNTIME OVERLAY */"
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

patchTextFile("sync-runtime-compat.js", source => source
  .replace(/const VERSION = "\d+\.\d+\.\d+";/, `const VERSION = "${RELEASE.version}";`)
  .replace(/const RELEASE_NAME = "[^"]+";/, `const RELEASE_NAME = "${RELEASE.name}";`)
  .replace(/const RELEASE_DATE = "[^"]+";/, `const RELEASE_DATE = "${RELEASE.date}";`)
  .replace(/released:"\d{4}-\d{2}-\d{2}"/, `released:"${RELEASE.dateIso}"`)
  .replace(/link\.href\s*=\s*(?:`|\")[^`\"]*liquid-glass[^`\"]*(?:`|\");/g, `link.href = "./liquid-glass.css?v=${RELEASE.assetQuery}";`));

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeRuntimeReferences = source => {
  let next = source;
  for (const [legacy, current] of LEGACY_RUNTIME_RENAMES) next = next.replaceAll(legacy, current);
  const queryFiles = new Set([
    ...Object.values(runtimeGroups).flat(),
    "phone-finance-compat.js",
    "sync-runtime-compat.js"
  ]);
  for (const file of queryFiles) {
    next = next.replace(new RegExp(`${escapeRegExp(file)}\\?v=[^\"'\\s<>)]+`, "g"), `${file}?v=${RELEASE.assetQuery}`);
  }
  return next;
};

patchTextFile("index.html", source => {
  let next = normalizeRuntimeReferences(source)
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
    .replace(/Version 15\.\d+\.\d+/g, RELEASE.displayVersion);

  const cssTag = `<link rel="stylesheet" href="./summary-mascots.css?v=${RELEASE.assetQuery}">`;
  if (!next.includes("summary-mascots.css")) {
    next = next.replace(
      /(<link rel="stylesheet" href="\.\/production-ui-audit\.css\?v=[^"]+">)/,
      `$1\n  ${cssTag}`
    );
  }
  const jsTag = `<script src="./summary-mascots.js?v=${RELEASE.assetQuery}"></script>`;
  if (!next.includes("summary-mascots.js")) {
    next = next.replace(
      /(<script src="\.\/phone-finance-compat\.js\?v=[^"]+"><\/script>)/,
      `$1\n  ${jsTag}`
    );
  }

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

patchTextFile("sw.js", source => normalizeRuntimeReferences(source)
  .replace(/const APP_VERSION = "\d+\.\d+\.\d+";/, `const APP_VERSION = "${RELEASE.version}";`)
  .replace(/const CACHE_VERSION = "finance-v[^"]+";/, `const CACHE_VERSION = "${RELEASE.cache}";`)
  .replaceAll("Open My Finance Records", `Open ${BRAND}`));

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
  if (!changelog.includes(heading)) throw new Error(`CHANGELOG.md must describe the current ${RELEASE.displayVersion} release.`);
}

console.log(`Talaan runtime ready for ${RELEASE.displayVersion}${changed ? ` · refreshed ${changed}` : ""}.`);
