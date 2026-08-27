import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const BRAND = "Talaan";
const PREVIOUS_BRAND = ["My", "Finance", "Records"].join(" ");

const RELEASE = Object.freeze({
  version:"2.4.0",
  displayVersion:"V2.4.0",
  name:"Talaan",
  date:"August 27, 2026",
  dateIso:"2026-08-27",
  cache:"finance-v2-20260827-net-worth-r10",
  assetQuery:"2.4.0-talaan1"
});
const SIDEBAR_BRAND_ASSET_QUERY = "2.2.0-talaan2";

const CURRENT_VERSION_HISTORY = Object.freeze([{
  version:RELEASE.displayVersion,
  title:RELEASE.name,
  changes:[
    "Current production release under the Talaan product name.",
    "Adds a manual net worth ledger with assets, liabilities, dated valuation history, category composition, and value evolution.",
    "Keeps net worth separate from Available Money, Cash Flow, and Account Ledger balances, with explicit manual, stale, and converted-value labels.",
    "Supports archived items, manually entered PHP conversion rates, recovery snapshots, and Undo for destructive changes.",
    "Uses responsibility-based runtime filenames instead of legacy product-era filenames.",
    "Includes the complete local-first Finance workspace, Account Ledger, budgeting, reports, projects, productivity tools, reminders, and responsive desktop and phone layouts.",
    "Includes encrypted multi-profile Cloud Schema V3 synchronization, offline PWA support, recovery safeguards, and five-minute routine sync.",
    "Preserves Finance Schema 12, Cloud Schema V3, account balances, paid state, recurrence, project payments, backups, encryption, persistent storage identifiers, and synchronization behavior."
  ]
}]);

const runtimeGroups = {
  "assets/css": [
    "account-ledger.css",
    "app.css",
    "shell-ui.css",
    "sidebar-compact-brand.css",
    "black-canvas.css",
    "budget-planning.css",
    "dashboard-interactions-core.css",
    "dashboard-interactions.css",
    "desktop-ui-phase1.css",
    "desktop-ux.css",
    "liquid-glass.css",
    "mobile.css",
    "productivity-tools.css",
    "payees-rules.css",
    "import-center.css",
    "transaction-views.css",
    "privacy-display.css",
    "production-ui-audit.css",
    "projects-calendar.css",
    "reminders-alerts.css",
    "reports-insights.css",
    "net-worth.css",
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
    "payees-rules.js",
    "import-formats.js",
    "import-center.js",
    "transaction-views.js",
    "privacy-display.js",
    "projects-calendar.js",
    "pwa-update.js",
    "reminders-alerts.js",
    "reports-insights.js",
    "net-worth.js",
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

patchTextFile("pwa-update.js", source => source
  .replace(/const CURRENT_CACHE_VERSION = "finance-v[^"]+";/, `const CURRENT_CACHE_VERSION = "${RELEASE.cache}";`));

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeRuntimeReferences = source => {
  let next = source;
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
const normalizeReleaseAssetQuery = source => source.replace(
  /\?v=\d+\.\d+\.\d+-talaan\d+/g,
  `?v=${RELEASE.assetQuery}`
);

patchTextFile("index.html", source => {
  let next = normalizeReleaseAssetQuery(normalizeRuntimeReferences(source))
    .replaceAll(PREVIOUS_BRAND, BRAND)
    .replaceAll("Finance Records installed", `${BRAND} installed`)
    .replaceAll("My_Finance_Records_Calendar_Test.ics", "Talaan_Calendar_Test.ics")
    .replace(/<meta name="application-name" content="[^"]+">/, `<meta name="application-name" content="${BRAND}">`)
    .replace(/<meta name="apple-mobile-web-app-title" content="[^"]+">/, `<meta name="apple-mobile-web-app-title" content="${BRAND}">`)
    .replace(/<title>[^<]+ · V\d+\.\d+\.\d+<\/title>/, `<title>${BRAND} · ${RELEASE.displayVersion}</title>`)
    .replace(/<small id="buildBadge" title="[^"]+">V\d+\.\d+\.\d+<\/small>/, `<small id="buildBadge" title="${RELEASE.displayVersion} · ${RELEASE.name} · ${RELEASE.date}">${RELEASE.displayVersion}</small>`)
    .replace(/const APP_VERSION = "\d+\.\d+\.\d+";/, `const APP_VERSION = "${RELEASE.version}";`)
    .replace(/const APP_RELEASE_NAME = "[^"]+";/, `const APP_RELEASE_NAME = "${RELEASE.name}";`)
    .replace(/const APP_RELEASE_DATE = "[^"]+";/, `const APP_RELEASE_DATE = "${RELEASE.date}";`)
    .replace(/const APP_CACHE_VERSION = "finance-v[^"]+";/, `const APP_CACHE_VERSION = "${RELEASE.cache}";`);

  const brandMarkup = `<div class="brand">\n        <img class="talaan-brand-logo" src="./icons/talaan-brand-logo.png?v=${SIDEBAR_BRAND_ASSET_QUERY}" alt="" aria-hidden="true">\n        <strong>${BRAND}</strong>\n      </div>`;
  next = next.replace(
    /<div class="brand">\s*(?:<img[^>]*class="talaan-brand-logo"[^>]*>\s*)?<strong>Talaan<\/strong>\s*<\/div>/,
    brandMarkup
  );

  const sidebarCssTag = `<link rel="stylesheet" href="./sidebar-compact-brand.css?v=${SIDEBAR_BRAND_ASSET_QUERY}">`;
  if (!next.includes("sidebar-compact-brand.css")) {
    next = next.replace(
      /(<link rel="stylesheet" href="\.\/shell-ui\.css\?v=[^"]+">)/,
      `$1\n  ${sidebarCssTag}`
    );
  } else {
    next = next.replace(/sidebar-compact-brand\.css\?v=[^"']+/, `sidebar-compact-brand.css?v=${SIDEBAR_BRAND_ASSET_QUERY}`);
  }

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

patchTextFile("sw.js", source => normalizeReleaseAssetQuery(normalizeRuntimeReferences(source))
  .replace(/sidebar-compact-brand\.css\?v=[^"')]+/g, `sidebar-compact-brand.css?v=${SIDEBAR_BRAND_ASSET_QUERY}`)
  .replace(
    /(?:url\.pathname\.endsWith\("sidebar-compact-brand\.css"\) \|\| )*url\.pathname\.endsWith\("ui-icon-alignment\.css"\) \|\|/,
    'url.pathname.endsWith("sidebar-compact-brand.css") || url.pathname.endsWith("ui-icon-alignment.css") ||'
  )
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
