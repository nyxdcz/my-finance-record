import fs from "node:fs";

const generatorFile = "scripts/agent-v15-2-10-sidebar-icons.mjs";
let generator = fs.readFileSync(generatorFile, "utf8");
const from = 'page.goto(\\`${base}/?page=\\${route}\\`';
const to = 'page.goto(\\`\\${base}/?page=\\${route}\\`';
if (!generator.includes(from) && !generator.includes(to)) throw new Error("Missing generated Playwright URL template");
generator = generator.replace(from, to);

const broadEscapedVersionRewrite = '        value = value.replaceAll(`15\\\\.2\\\\.9`, `15\\\\.2\\\\.10`);\n';
if (!generator.includes(broadEscapedVersionRewrite)) throw new Error("Missing broad escaped-version rewrite");
generator = generator.replace(broadEscapedVersionRewrite, "");

const brokenSidebarRouteRemoval = '  value = mustReplace(value, ` || url.pathname.includes("/icons/sidebar-")`, "", "sidebar network-first route");';
const fixedSidebarRouteRemoval = '  const sidebarNetworkRoute = ` || url.pathname.includes("/icons/sidebar-")`;\n  if (!value.includes(sidebarNetworkRoute)) throw new Error("Missing sidebar network-first route");\n  value = value.replace(sidebarNetworkRoute, "");';
if (!generator.includes(brokenSidebarRouteRemoval) && !generator.includes(fixedSidebarRouteRemoval)) throw new Error("Missing sidebar network-route removal transform");
generator = generator.replace(brokenSidebarRouteRemoval, fixedSidebarRouteRemoval);
fs.writeFileSync(generatorFile, generator);

const inspectorFile = "tests/helpers/inspect-project.mjs";
let inspector = fs.readFileSync(inspectorFile, "utf8");
inspector = inspector.replaceAll("V15.2.9", "V15.2.10");
inspector = inspector.replaceAll("15.2.9 · 2026-08-20", "15.2.10 · 2026-08-20");
fs.writeFileSync(inspectorFile, inspector);

const consistencyFile = "tests/regression/validate-desktop-ui-consistency-v15-1-0.mjs";
let consistency = fs.readFileSync(consistencyFile, "utf8");
const oldIndexAssertion = 'assert.match(index, /data-page="reports"[^>]*data-nav-label="Insights"[\\s\\S]*?<span class="nav-icon"><img class="nav-icon-image" src="\\.\\/icons\\/sidebar-insights-v14-0-24\\.png\\?v=15\\.2\\.9-icon1"/);';
const oldCssAssertion = 'assert.match(dashboard, /data-page="reports"\\] \\.nav-icon-image\\{content:url\\("\\.\\/icons\\/sidebar-insights-v14-0-24\\.png"\\)\\}/);';
if (!consistency.includes(oldIndexAssertion)) throw new Error("Missing legacy Insights URL assertion");
if (!consistency.includes(oldCssAssertion)) throw new Error("Missing legacy Insights CSS content assertion");
consistency = consistency.replace(oldIndexAssertion, 'assert.equal((index.match(/<img class="nav-icon-image" src="data:image\\/png;base64,[^\"]+" alt="">/g) || []).length, 5);');
consistency = consistency.replace(oldCssAssertion, 'assert.doesNotMatch(dashboard, /nav-icon-image\\{content:url/);');
consistency = consistency.replaceAll("sync-config.js?v=15.2.9-release1", "sync-config.js?v=15.2.10-release1");
fs.writeFileSync(consistencyFile, consistency);

const pwaTestFile = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let pwaTest = fs.readFileSync(pwaTestFile, "utf8");
const oldWorkerVersion = 'assert.match(worker, /const APP_VERSION = "15\\.2\\.9";/);';
const newWorkerVersion = 'assert.match(worker, /const APP_VERSION = "15\\.2\\.10";/);';
if (!pwaTest.includes(oldWorkerVersion) && !pwaTest.includes(newWorkerVersion)) throw new Error("Missing PWA worker version assertion");
pwaTest = pwaTest.replace(oldWorkerVersion, newWorkerVersion);
pwaTest = pwaTest.replaceAll("V15.2.9 PWA updater regression passed", "V15.2.10 PWA updater regression passed");
fs.writeFileSync(pwaTestFile, pwaTest);

const desktopUxTestFile = "tests/regression/validate-v15-2-0-desktop-ux.mjs";
let desktopUxTest = fs.readFileSync(desktopUxTestFile, "utf8");
desktopUxTest = desktopUxTest.replaceAll('version.version === "15.2.9"', 'version.version === "15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('pkg.version === "15.2.9"', 'pkg.version === "15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('"version.json is V15.2.9"', '"version.json is V15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('"package.json is V15.2.9"', '"package.json is V15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('finance-v15-20260820-ui-asset-delivery-r45', 'finance-v15-20260820-sidebar-icons-r46');
desktopUxTest = desktopUxTest.replaceAll('V15.2.9 Application Help cache is declared', 'V15.2.10 sidebar icon cache is declared');
desktopUxTest = desktopUxTest.replaceAll('My Finance Records · V15.2.9', 'My Finance Records · V15.2.10');
desktopUxTest = desktopUxTest.replaceAll('page title is V15.2.9', 'page title is V15.2.10');
desktopUxTest = desktopUxTest.replaceAll('## 15.2.9 · 2026-08-20', '## 15.2.10 · 2026-08-20');
desktopUxTest = desktopUxTest.replaceAll('CHANGELOG begins with V15.2.9', 'CHANGELOG begins with V15.2.10');
desktopUxTest = desktopUxTest.replaceAll('const APP_VERSION = "15.2.9"', 'const APP_VERSION = "15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('const VERSION = "15.2.9"', 'const VERSION = "15.2.10"');
desktopUxTest = desktopUxTest.replaceAll('const RELEASE_NAME = "UI Asset Delivery Hotfix"', 'const RELEASE_NAME = "Embedded Sidebar Icon Hotfix"');
desktopUxTest = desktopUxTest.replaceAll('release override matches V15.2.9', 'release override matches V15.2.10');
desktopUxTest = desktopUxTest.replaceAll('sync-config.js?v=15.2.9-release1', 'sync-config.js?v=15.2.10-release1');
desktopUxTest = desktopUxTest.replaceAll('V15.2.9 release preserves the desktop UX source contract', 'V15.2.10 release preserves the desktop UX source contract');
fs.writeFileSync(desktopUxTestFile, desktopUxTest);

const mobileUiTestFile = "tests/regression/validate-v15-2-2-mobile-ui.mjs";
let mobileUiTest = fs.readFileSync(mobileUiTestFile, "utf8");
mobileUiTest = mobileUiTest.replaceAll("15.2.9", "15.2.10");
mobileUiTest = mobileUiTest.replaceAll("finance-v15-20260820-ui-asset-delivery-r45", "finance-v15-20260820-sidebar-icons-r46");
mobileUiTest = mobileUiTest.replaceAll("UI Asset Delivery Hotfix", "Embedded Sidebar Icon Hotfix");
fs.writeFileSync(mobileUiTestFile, mobileUiTest);

const formInputsTestFile = "tests/finance/validate-form-inputs-v15-2-6.mjs";
let formInputsTest = fs.readFileSync(formInputsTestFile, "utf8");
formInputsTest = formInputsTest.replaceAll('version.version === "15.2.9"', 'version.version === "15.2.10"');
formInputsTest = formInputsTest.replaceAll('current release is V15.2.9', 'current release is V15.2.10');
formInputsTest = formInputsTest.replaceAll('finance-v15-20260820-ui-asset-delivery-r45', 'finance-v15-20260820-sidebar-icons-r46');
formInputsTest = formInputsTest.replaceAll('V15.2.9 shell', 'V15.2.10 shell');
fs.writeFileSync(formInputsTestFile, formInputsTest);

const applicationHelpTestFile = "tests/regression/validate-application-help-v15-2-7.mjs";
let applicationHelpTest = fs.readFileSync(applicationHelpTestFile, "utf8");
applicationHelpTest = applicationHelpTest.replace('assert.equal(version.version, "15.2.9");', 'assert.equal(version.version, "15.2.10");');
applicationHelpTest = applicationHelpTest.replace('assert.equal(version.cacheVersion, "finance-v15-20260820-ui-asset-delivery-r45");', 'assert.equal(version.cacheVersion, "finance-v15-20260820-sidebar-icons-r46");');
fs.writeFileSync(applicationHelpTestFile, applicationHelpTest);

const syncConfigTestFile = "tests/regression/validate-sync-config-separation.mjs";
let syncConfigTest = fs.readFileSync(syncConfigTestFile, "utf8");
syncConfigTest = syncConfigTest.replaceAll("15.2.9", "15.2.10");
syncConfigTest = syncConfigTest.replaceAll("finance-v15-20260820-ui-asset-delivery-r45", "finance-v15-20260820-sidebar-icons-r46");
fs.writeFileSync(syncConfigTestFile, syncConfigTest);
