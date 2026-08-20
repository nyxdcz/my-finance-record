import fs from "node:fs";
import path from "node:path";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, value) => fs.writeFileSync(file, value);
const replaceExact = (file, from, to) => {
  const before = read(file);
  if (!before.includes(from)) return false;
  write(file, before.split(from).join(to));
  return true;
};

const oldUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release4";
const newUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release5";
const phoneAsset = "phone-finance-compat.js?v=15.2.10-phone1";

let index = read("index.html");
index = index.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!index.includes(phoneAsset)) {
  const needle = `<script src="./${newUpdaterAsset}"></script>`;
  if (!index.includes(needle)) throw new Error("Could not locate PWA updater in index.html");
  index = index.replace(needle, `${needle}\n  <script src="./${phoneAsset}"></script>`);
}
write("index.html", index);

let worker = read("sw.js");
worker = worker.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!worker.includes(phoneAsset)) {
  const needle = `  asset("./${newUpdaterAsset}"),`;
  if (!worker.includes(needle)) throw new Error("Could not locate PWA updater in sw.js");
  worker = worker.replace(needle, `${needle}\n  asset("./${phoneAsset}"),`);
}
write("sw.js", worker);

const preparePath = "scripts/prepare-runtime.mjs";
let prepare = read(preparePath);
if (!prepare.includes('"phone-finance-compat.js"')) {
  prepare = prepare.replace(
    '    "header-tools-compat.js",\n    "sync-runtime-compat.js"',
    '    "header-tools-compat.js",\n    "phone-finance-compat.js",\n    "sync-runtime-compat.js"'
  );
}
write(preparePath, prepare);

const inspectorPath = "tests/helpers/inspect-project.mjs";
let inspector = read(inspectorPath);
inspector = inspector.replace(
  '"application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"',
  '"application-help.js", "header-tools-compat.js", "phone-finance-compat.js", "sync-runtime-compat.js"'
);
inspector = inspector.replace(
  '["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(normalized)',
  '["application-help.js", "header-tools-compat.js", "phone-finance-compat.js", "sync-runtime-compat.js"].includes(normalized)'
);
inspector = inspector.replace(
  '!["cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(file)',
  '!["cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "phone-finance-compat.js", "sync-runtime-compat.js"].includes(file)'
);
inspector = inspector.replace(
  '["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].forEach(file => deploySources.add(file));',
  '["application-help.js", "header-tools-compat.js", "phone-finance-compat.js", "sync-runtime-compat.js"].forEach(file => deploySources.add(file));'
);
write(inspectorPath, inspector);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
const escapedOldUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release4`;
const escapedNewUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release5`;
for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
  replaceExact(file, escapedOldUpdater, escapedNewUpdater);
}

const pwaRegressionPath = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let pwaRegression = read(pwaRegressionPath);
if (!pwaRegression.includes('const phoneFinance = fs.readFileSync("assets/js/ui/phone-finance-compat.js", "utf8");')) {
  pwaRegression = pwaRegression.replace(
    'const headerTools = fs.readFileSync("assets/js/ui/header-tools-compat.js", "utf8");',
    'const headerTools = fs.readFileSync("assets/js/ui/header-tools-compat.js", "utf8");\nconst phoneFinance = fs.readFileSync("assets/js/ui/phone-finance-compat.js", "utf8");'
  );
}
if (!pwaRegression.includes("Phone Finance compatibility must not remain in the PWA updater")) {
  pwaRegression = pwaRegression.replace(
    'assert.doesNotMatch(updater, /installQuickEntryToolsMenuRelocation|installHeaderToolsRelocation/, "Header/More Tools relocation must not remain in the PWA updater");',
    'assert.doesNotMatch(updater, /installQuickEntryToolsMenuRelocation|installHeaderToolsRelocation/, "Header/More Tools relocation must not remain in the PWA updater");\nassert.doesNotMatch(updater, /bindPhoneIconOnlyButton|enhancePhoneCompactButtons|installPhoneFinanceCompactUi|phone-icon-only-action|data-pc-add/, "Phone Finance compatibility must not remain in the PWA updater");\nassert.match(phoneFinance, /function bindPhoneIconOnlyButton\\(button, label, iconMarkup\\)/, "Phone Finance module must own icon-only binding");\nassert.match(phoneFinance, /function enhancePhoneCompactButtons\\(\\)/, "Phone Finance module must own compact button enhancement");\nassert.match(phoneFinance, /function installPhoneFinanceCompactUi\\(\\)/, "Phone Finance module must own dynamic observation");\nassert.match(index, /phone-finance-compat\\.js\\?v=15\\.2\\.10-phone1/, "Index must load the Phone Finance module");\nassert.match(worker, /phone-finance-compat\\.js\\?v=15\\.2\\.10-phone1/, "Service worker must precache the Phone Finance module");'
  );
}
pwaRegression = pwaRegression.replace(
  'console.log("V15.2.10 PWA updater regression passed with Cash Flow JS ownership extraction.");',
  'console.log("V15.2.10 PWA updater regression passed with Phone Finance JS ownership extraction.");'
);
write(pwaRegressionPath, pwaRegression);

const mobileRegressionPath = "tests/regression/validate-v15-2-2-mobile-ui.mjs";
let mobileRegression = read(mobileRegressionPath);
if (!mobileRegression.includes('const phoneFinance = read("assets/js/ui/phone-finance-compat.js");')) {
  mobileRegression = mobileRegression.replace(
    'const updater = read("pwa-update-v15-0-5.js");',
    'const updater = read("pwa-update-v15-0-5.js");\nconst phoneFinance = read("assets/js/ui/phone-finance-compat.js");'
  );
}
mobileRegression = mobileRegression.replace('assert.match(updater, /phone-icon-only-action/);', 'assert.doesNotMatch(updater, /phone-icon-only-action|bindPhoneIconOnlyButton|installPhoneFinanceCompactUi/);\nassert.match(phoneFinance, /phone-icon-only-action/);');
mobileRegression = mobileRegression.replace('assert.match(updater, /data-pc-add/);', 'assert.match(phoneFinance, /data-pc-add/);\nassert.match(phoneFinance, /phoneCompactIconBound/);');
mobileRegression = mobileRegression.replace(
  'console.log("V15.2.10 preserves V15.2.2 mobile UI/UX with static Phone Finance compact CSS ownership.");',
  'console.log("V15.2.10 preserves V15.2.2 mobile UI/UX with static CSS and dedicated Phone Finance JS ownership.");'
);
write(mobileRegressionPath, mobileRegression);

const updater = read("assets/js/pwa-update-v15-0-5.js");
const phoneFinance = read("assets/js/ui/phone-finance-compat.js");
if (/bindPhoneIconOnlyButton|enhancePhoneCompactButtons|installPhoneFinanceCompactUi|phone-icon-only-action|data-pc-add/.test(updater)) throw new Error("Phone Finance behavior remains in PWA updater");
for (const required of ["bindPhoneIconOnlyButton", "enhancePhoneCompactButtons", "installPhoneFinanceCompactUi", "phoneCompactIconBound", "data-pc-add"]) {
  if (!phoneFinance.includes(required)) throw new Error(`Phone Finance module missing ${required}`);
}
if (!read("index.html").includes(newUpdaterAsset) || !read("index.html").includes(phoneAsset)) throw new Error("Index Phone Finance delivery is incomplete");
if (!read("sw.js").includes(newUpdaterAsset) || !read("sw.js").includes(phoneAsset)) throw new Error("Service-worker Phone Finance delivery is incomplete");
if (!read(preparePath).includes('"phone-finance-compat.js"')) throw new Error("Runtime preparation missing Phone Finance module");
if (!read(inspectorPath).includes('"phone-finance-compat.js"')) throw new Error("Repository inspector missing Phone Finance module");

console.log("Applied PR7 Phone Finance JS ownership extraction.");
