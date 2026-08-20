import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prod = read("productivity-tools.js");
const desktopUx = read("desktop-ux-v15-2-0.css");
const uiIcons = read("ui-icon-alignment-v15-0-5.css");
const runtimeCompat = read("assets/js/ui/sync-runtime-compat.js");
const changelog = read("CHANGELOG.md");
const cloudFile = fs.readdirSync(".").find(name => name.endsWith(".js") && read(name).includes("financeCloudSyncV3Bootstrap"));
if (!cloudFile) throw new Error("Cloud Sync V3 file missing");
const cloud = read(cloudFile);
const required = [
  [version.version === "15.2.12", "version.json is V15.2.12"],
  [pkg.version === "15.2.12", "package.json is V15.2.12"],
  [version.schemaVersion === 12 && version.cloudSchemaVersion === 3, "schemas remain 12/3"],
  [version.cacheVersion === "finance-v15-20260820-auth-sync-r48", "V15.2.12 shell UI cache is declared"],
  [index.includes("My Finance Records · V15.2.12"), "page title is V15.2.12"],
  [changelog.startsWith("## 15.2.12 · 2026-08-20"), "CHANGELOG begins with V15.2.12"],
  [changelog.includes("## 15.2.4 · 2026-08-18"), "CHANGELOG preserves the previous V15.2.4 history"],
  [index.includes("recurring items checked"), "month navigation explains recurring preparation"],
  [index.includes("cleared because filters changed"), "selection reset is announced"],
  [index.includes("Enter an account name."), "account name has inline validation"],
  [index.includes("Enter an income name."), "income has inline validation"],
  [index.includes("⌘/Ctrl K or /"), "Search shortcut is discoverable"],
  [index.includes("runButtonTask("), "Settings async actions use scoped busy state"],
  [prod.includes("requestProductivityText") && !prod.includes('prompt("Template name"'), "Productivity text prompts use app dialog"],
  [prod.includes("confirmProductivityAction"), "Productivity destructive actions use shared confirmation"],
  [prod.includes("synchronize through Cloud Sync") && !prod.includes("Cloud Sync V2"), "Cloud terminology is current"],
  [cloud.includes("Your local changes are safe"), "Cloud error copy is plain-language"],
  [index.includes("cloudToolbarTechnicalDetails") && cloud.includes("cloudToolbarTechnicalError"), "Cloud technical details are optional"],
  [sw.includes('const APP_VERSION = "15.2.12"') && sw.includes(version.cacheVersion), "service worker delivery matches release"],
  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.5-disclosure1"), "desktop disclosure CSS is precached"],
  [runtimeCompat.includes('const VERSION = "15.2.12"') && runtimeCompat.includes('const RELEASE_NAME = "Auth & Sync State Stabilization"'), "release override matches V15.2.12"],
  [index.includes("sync-config.js?v=15.2.10-release1") && sw.includes("sync-config.js?v=15.2.10-release1"), "release layer is cache-busted consistently"],
  [desktopUx.includes("--budget-disclosure-reference-size:var(--ui-disclosure-size,40px)"), "Budget disclosure buttons share the First-half control size"],
  [desktopUx.includes("--budget-disclosure-reference-inset:17px"), "Budget disclosure buttons use the First-half right inset"],
  [desktopUx.includes("#money .period-card .period-header") && desktopUx.includes("padding-right:var(--budget-disclosure-reference-inset) !important"), "First, second, and other period headers pin the reference disclosure edge"],
  [desktopUx.includes("padding-right:calc(var(--budget-disclosure-reference-inset) - var(--budget-available-card-inset)) !important"), "Available money header resolves to the First-half right edge"],
  [desktopUx.includes("#monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-actions") && desktopUx.includes("right:var(--budget-disclosure-reference-inset) !important"), "Collapsed Monthly budget plan disclosure aligns to the First-half column"],
  [!desktopUx.includes("margin-right:5px !important"), "Budget disclosure alignment no longer relies on hard-coded margin offsets"],
  [uiIcons.includes("V15.2.5-r3 · Available Money uses universal 35px scalloped account badges without cropping"), "Available Money universal badge layer is present"],
  [uiIcons.includes("#money #moneyAccounts .account-card-icon") && uiIcons.includes("width:35px !important") && uiIcons.includes("height:35px !important"), "Available Money account badges are 35px"],
  [uiIcons.includes("width:29px !important") && uiIcons.includes("object-fit:contain !important") && uiIcons.includes("object-position:center !important"), "Account logos use a centered no-crop safe area"],
  [uiIcons.includes('img[alt="Wallet icon" i]') && uiIcons.includes("--available-account-badge-fill:#ffffff"), "Wallet receives the universal badge treatment"],
  [uiIcons.includes('img[alt="UnionBank icon" i]') && uiIcons.includes('img[alt="RCBC icon" i]') && uiIcons.includes('img[alt="Maya icon" i]') && uiIcons.includes('img[alt="GCash icon" i]') && uiIcons.includes('img[alt="GoTyme icon" i]'), "Current Bank and E-wallet artwork keeps matching outer fills"],
  [read("mobile-v14-0-23.css").length > 0, "mobile stylesheet remains present"]
];
for (const [ok, message] of required) { if (!ok) throw new Error(message); }
console.log("V15.2.12 release preserves the desktop UX source contract");
