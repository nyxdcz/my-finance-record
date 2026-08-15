import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prod = read("productivity-tools.js");
const cloudFile = fs.readdirSync(".").find(name => name.endsWith(".js") && read(name).includes("financeCloudSyncV3Bootstrap"));
if (!cloudFile) throw new Error("Cloud Sync V3 file missing");
const cloud = read(cloudFile);
const required = [
  [version.version === "15.2.1", "version.json is V15.2.1"],
  [pkg.version === "15.2.1", "package.json is V15.2.1"],
  [version.schemaVersion === 12 && version.cloudSchemaVersion === 3, "schemas remain 12/3"],
  [version.cacheVersion === "finance-v15-20260816-desktop-ux-quick-wins-r31", "r30 cache is declared"],
  [index.includes("My Finance Records · V15.2.1"), "page title is V15.2.1"],
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
  [sw.includes('const APP_VERSION = "15.2.1"') && sw.includes(version.cacheVersion), "service worker delivery matches release"],
  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.1"), "desktop UX CSS is precached"],
  [read("sync-config.js").includes('const VERSION = "15.2.1"') && read("sync-config.js").includes('const RELEASE_NAME = "Desktop UX Quick Wins"'), "release override matches V15.2.1"],
  [index.includes("sync-config.js?v=15.2.1-ux1") && sw.includes("sync-config.js?v=15.2.1-ux1"), "release layer is cache-busted consistently"],
  [read("mobile-v14-0-23.css").length > 0, "mobile stylesheet remains present"]
];
for (const [ok, message] of required) { if (!ok) throw new Error(message); }
console.log("V15.2.1 desktop UX source contract passed");
