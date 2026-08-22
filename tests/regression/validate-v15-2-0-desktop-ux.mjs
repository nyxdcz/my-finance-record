import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prod = read("productivity-tools.js");
const desktopUx = read("desktop-ux-v15-2-0.css");
const uiIcons = read("ui-icon-alignment-v15-0-5.css");
const runtimeCompat = read("sync-runtime-compat.js");
const changelog = read("CHANGELOG.md");
const readme = read("README.md");
const contributing = read("CONTRIBUTING.md");
const security = read("SECURITY.md");
const versionDoc = read("version.md");
const versionHistoryMatch = index.match(/const VERSION_HISTORY = (\[[^\n]+\]);/);
const versionHistory = versionHistoryMatch ? JSON.parse(versionHistoryMatch[1]) : [];
const cloudFile = fs.readdirSync(".").find(name => name.endsWith(".js") && read(name).includes("financeCloudSyncV3Bootstrap"));
if (!cloudFile) throw new Error("Cloud Sync V3 file missing");
const cloud = read(cloudFile);
const currentDocs = { "CHANGELOG.md": changelog, "README.md": readme, "CONTRIBUTING.md": contributing, "SECURITY.md": security, "version.md": versionDoc };
const previousProductVersionPrefixes = ["V1."];
const staleVersionReference = Object.entries(currentDocs)
  .flatMap(([name, text]) => previousProductVersionPrefixes.filter(prefix => text.includes(prefix)).map(prefix => `${name}:${prefix}`))[0] || "";
const required = [
  [version.version === "2.0.0", "version.json is V2.0.0"],
  [pkg.version === "2.0.0", "package.json is V2.0.0"],
  [version.schemaVersion === 12 && version.cloudSchemaVersion === 3, "schemas remain 12/3"],
  [version.cacheVersion === "finance-v2-20260822-organized-complete-r1", "V2 organized cache is declared"],
  [index.includes("My Finance Records · V2.0.0"), "page title is V2.0.0"],
  [versionHistory.length === 1 && versionHistory[0]?.version === "V2.0.0" && versionHistory[0]?.title === "Organized Complete", "website Version history contains only the current V2.0.0 release"],
  [index.includes("<h3>Version history</h3><p>Latest release details</p>"), "website Version history is labeled as latest release details"],
  [changelog.includes("## V2.0.0 · Organized Complete"), "CHANGELOG focuses on the V2.0.0 current release"],
  [versionDoc.startsWith("# V2.0.0 — Organized Complete"), "version.md focuses on the V2.0.0 current release"],
  [!staleVersionReference, `current-facing docs do not mention previous product versions${staleVersionReference ? ` (${staleVersionReference})` : ""}`],
  [readme.includes("# My Finance Records · V2.0.0") && contributing.includes("V2.0.0 — Organized Complete") && security.includes("# Security Policy · V2.0.0"), "current-facing docs identify V2.0.0 consistently"],
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
  [sw.includes('const APP_VERSION = "2.0.0"') && sw.includes(version.cacheVersion), "service worker delivery matches release"],
  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.5-disclosure1"), "legacy desktop disclosure CSS pin is precached"],
  [runtimeCompat.includes('const VERSION = "2.0.0"') && runtimeCompat.includes('const RELEASE_NAME = "Organized Complete"'), "release override matches V2.0.0"],
  [index.includes("sync-runtime-compat.js?v=2.0.0-release2") && sw.includes("sync-runtime-compat.js?v=2.0.0-release2"), "V2 release layer is cache-busted consistently"],
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
console.log("V2.0.0 release preserves the desktop UX source contract and current-facing docs mention only V2.0.0");
