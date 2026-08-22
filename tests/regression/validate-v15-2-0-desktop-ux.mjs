import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("manifest.webmanifest"));
const prod = read("productivity-tools.js");
const desktopUx = read("desktop-ux-v15-2-0.css");
const uiIcons = read("ui-icon-alignment-v15-0-5.css");
const runtimeCompat = read("sync-runtime-compat.js");
const changelog = read("CHANGELOG.md");
const readme = read("README.md");
const contributing = read("CONTRIBUTING.md");
const security = read("SECURITY.md");
const privacy = read("PRIVACY.md");
const versionDoc = read("version.md");
const versionHistoryMatch = index.match(/const VERSION_HISTORY = (\[[^\n]+\]);/);
const versionHistory = versionHistoryMatch ? JSON.parse(versionHistoryMatch[1]) : [];
const cloudFile = fs.readdirSync(".").find(name => name.endsWith(".js") && read(name).includes("financeCloudSyncV3Bootstrap"));
if (!cloudFile) throw new Error("Cloud Sync V3 file missing");
const cloud = read(cloudFile);
const BRAND = "Talaan";
const CURRENT_VERSION = "2.0.1";
const DISPLAY_VERSION = "V2.0.1";
const PREVIOUS_BRAND = ["My", "Finance", "Records"].join(" ");
const currentDocs = { "CHANGELOG.md": changelog, "README.md": readme, "CONTRIBUTING.md": contributing, "SECURITY.md": security, "PRIVACY.md": privacy, "version.md": versionDoc };
const staleDocReference = Object.entries(currentDocs).find(([, text]) => text.includes(PREVIOUS_BRAND) || text.includes("V1.") || text.includes("V2.0.0"));
const required = [
  [version.version === CURRENT_VERSION, `version.json is ${DISPLAY_VERSION}`],
  [pkg.version === CURRENT_VERSION, `package.json is ${DISPLAY_VERSION}`],
  [version.name === BRAND, "release name is Talaan"],
  [version.schemaVersion === 12 && version.cloudSchemaVersion === 3, "schemas remain 12/3"],
  [version.cacheVersion === "finance-v2-20260822-talaan-r1", "Talaan cache is declared"],
  [index.includes(`${BRAND} · ${DISPLAY_VERSION}`), `page title is ${BRAND} ${DISPLAY_VERSION}`],
  [index.includes(`<meta name="application-name" content="${BRAND}">`) && index.includes(`<meta name="apple-mobile-web-app-title" content="${BRAND}">`), "browser app metadata uses Talaan"],
  [!index.includes(PREVIOUS_BRAND), "prepared website does not contain the superseded display brand"],
  [manifest.name === BRAND && manifest.short_name === BRAND, "PWA manifest uses Talaan"],
  [versionHistory.length === 1 && versionHistory[0]?.version === DISPLAY_VERSION && versionHistory[0]?.title === BRAND, "website Version history contains only the current Talaan release"],
  [index.includes("<h3>Version history</h3><p>Latest release details</p>"), "website Version history is labeled as latest release details"],
  [changelog.includes(`## ${DISPLAY_VERSION} · ${BRAND}`), "CHANGELOG focuses on the current Talaan release"],
  [versionDoc.startsWith(`# ${BRAND} ${DISPLAY_VERSION}`), "version.md focuses on the current Talaan release"],
  [!staleDocReference, `current-facing docs contain only the latest Talaan identity${staleDocReference ? ` (${staleDocReference[0]})` : ""}`],
  [readme.includes(`# ${BRAND} · ${DISPLAY_VERSION}`) && contributing.includes(`${BRAND} ${DISPLAY_VERSION}`) && security.includes(`# Security Policy · ${BRAND} ${DISPLAY_VERSION}`), "current-facing docs identify Talaan consistently"],
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
  [sw.includes(`const APP_VERSION = "${CURRENT_VERSION}"`) && sw.includes(version.cacheVersion), "service worker delivery matches release"],
  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.5-disclosure1"), "legacy desktop disclosure CSS pin is precached"],
  [runtimeCompat.includes(`const VERSION = "${CURRENT_VERSION}"`) && runtimeCompat.includes(`const RELEASE_NAME = "${BRAND}"`) && runtimeCompat.includes(`document.title = \`${BRAND} · V\${VERSION}\``), "release override matches Talaan V2.0.1"],
  [index.includes("sync-runtime-compat.js?v=2.0.1-talaan1") && sw.includes("sync-runtime-compat.js?v=2.0.1-talaan1"), "Talaan release layer is cache-busted consistently"],
  [desktopUx.includes("--budget-disclosure-reference-size:var(--ui-disclosure-size,40px)"), "Budget disclosure buttons share the First-half control size"],
  [desktopUx.includes("--budget-disclosure-reference-inset:17px"), "Budget disclosure buttons use the First-half right inset"],
  [desktopUx.includes("#money .period-card .period-header") && desktopUx.includes("padding-right:var(--budget-disclosure-reference-inset) !important"), "First, second, and other period headers pin the reference disclosure edge"],
  [desktopUx.includes("padding-right:calc(var(--budget-disclosure-reference-inset) - var(--budget-available-card-inset)) !important"), "Available money header resolves to the First-half right edge"],
  [desktopUx.includes("#monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-actions") && desktopUx.includes("right:var(--budget-disclosure-reference-inset) !important"), "Collapsed Monthly budget plan disclosure aligns to the First-half column"],
  [!desktopUx.includes("margin-right:5px !important"), "Budget disclosure alignment no longer relies on hard-coded margin offsets"],
  [uiIcons.includes("Available Money uses universal 35px scalloped account badges without cropping"), "Available Money universal badge layer is present"],
  [uiIcons.includes("#money #moneyAccounts .account-card-icon") && uiIcons.includes("width:35px !important") && uiIcons.includes("height:35px !important"), "Available Money account badges are 35px"],
  [uiIcons.includes("width:29px !important") && uiIcons.includes("object-fit:contain !important") && uiIcons.includes("object-position:center !important"), "Account logos use a centered no-crop safe area"],
  [uiIcons.includes('img[alt="Wallet icon" i]') && uiIcons.includes("--available-account-badge-fill:#ffffff"), "Wallet receives the universal badge treatment"],
  [uiIcons.includes('img[alt="UnionBank icon" i]') && uiIcons.includes('img[alt="RCBC icon" i]') && uiIcons.includes('img[alt="Maya icon" i]') && uiIcons.includes('img[alt="GCash icon" i]') && uiIcons.includes('img[alt="GoTyme icon" i]'), "Current Bank and E-wallet artwork keeps matching outer fills"],
  [read("mobile-v14-0-23.css").length > 0, "mobile stylesheet remains present"]
];
for (const [ok, message] of required) { if (!ok) throw new Error(message); }
console.log(`${BRAND} ${DISPLAY_VERSION} preserves the desktop UX source contract, compatibility identifiers, and current-facing brand identity.`);
