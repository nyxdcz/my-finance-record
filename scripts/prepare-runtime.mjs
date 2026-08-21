import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const RELEASE = Object.freeze({
  version:"2.0.0",
  displayVersion:"V2.0.0",
  name:"Organized Complete",
  date:"August 22, 2026",
  dateIso:"2026-08-22",
  cache:"finance-v2-20260822-organized-complete-r1",
  cssQuery:"2.0.0-organized1",
  pwaQuery:"2.0.0-release1",
  phoneQuery:"2.0.0-organized1"
});

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

patchTextFile("index.html", source => {
  let next = source
    .replace(/<title>My Finance Records · V\d+\.\d+\.\d+<\/title>/, `<title>My Finance Records · ${RELEASE.displayVersion}</title>`)
    .replace(/const APP_VERSION = "\d+\.\d+\.\d+";/, `const APP_VERSION = "${RELEASE.version}";`)
    .replace(/const APP_RELEASE_NAME = "[^"]+";/, `const APP_RELEASE_NAME = "${RELEASE.name}";`)
    .replace(/const APP_RELEASE_DATE = "[^"]+";/, `const APP_RELEASE_DATE = "${RELEASE.date}";`)
    .replace(/const APP_CACHE_VERSION = "finance-v[^"]+";/, `const APP_CACHE_VERSION = "${RELEASE.cache}";`)
    .replace(/production-ui-audit-v15-2-13\.css\?v=[^"]+/, `production-ui-audit-v15-2-13.css?v=${RELEASE.cssQuery}`)
    .replace(/pwa-update-v15-0-5\.js\?v=[^"]+/, `pwa-update-v15-0-5.js?v=${RELEASE.pwaQuery}`)
    .replace(/phone-finance-compat\.js\?v=[^"]+/, `phone-finance-compat.js?v=${RELEASE.phoneQuery}`);

  if (!next.includes(`"version":"${RELEASE.displayVersion}"`)) {
    const historyEntry = `    VERSION_HISTORY.unshift({"version":"${RELEASE.displayVersion}","title":"${RELEASE.name}","changes":["Resets the public product version history into the organized V1.0.0-to-V2.0.0 roadmap while retaining the original V12-V15 changelog for audit history.","Combines the complete local-first Finance, account ledger, budgets, reports, projects, productivity, reminders, encrypted Cloud Schema V3 sync, responsive UI, and PWA delivery into one production release.","Preserves Finance Schema 12, Cloud Schema V3, saved records, calculations, balances, recurrence, payments, storage, encryption, and sync semantics while rotating to the V2 application cache."]});\n`;
    next = next.replace(/(\n\s*function normalizeSettingsPanelKey\()/, `\n${historyEntry}$1`);
  }
  return next;
});

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
  const heading = `## ${RELEASE.version} · ${RELEASE.dateIso}`;
  if (!changelog.startsWith(heading)) {
    const entry = `${heading}\n\n### Organized complete release\n\n- Adopts the reorganized product version roadmap from V1.0.0 (Created) through V2.0.0 (Organized Complete); see \`version.md\` for the combined milestone history.\n- Treats the complete local-first Finance, ledger, budgeting, reporting, projects, productivity, reminders, encrypted multi-profile Cloud Schema V3 synchronization, responsive interface, PWA delivery, and final Budget & Expenses polish as one organized production baseline.\n- Keeps the historical V12.19.0 through V15.2.24 entries below for auditability rather than rewriting or deleting the original development history.\n- Preserves Finance Schema 12, Cloud Schema V3, finance data, calculations, balances, recurrence, payments, encryption, storage, backups, and synchronization semantics while rotating the shell to \`${RELEASE.cache}\`.\n\n`;
    writeIfChanged(changelogPath, `${entry}${changelog}`);
  }
}

console.log(`Runtime compatibility files ready for ${RELEASE.displayVersion}${changed ? ` · refreshed ${changed}` : ""}.`);
