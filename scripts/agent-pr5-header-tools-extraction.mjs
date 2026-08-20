import fs from "node:fs";
import path from "node:path";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, value) => fs.writeFileSync(file, value);

function replaceExact(file, from, to, { required = false } = {}) {
  const before = read(file);
  if (!before.includes(from)) {
    if (required) throw new Error(`Missing expected text in ${file}: ${from}`);
    return false;
  }
  write(file, before.split(from).join(to));
  return true;
}

const updaterPath = "assets/js/pwa-update-v15-0-5.js";
let updater = read(updaterPath);
if (updater.includes("function installQuickEntryToolsMenuRelocation()")) {
  const start = updater.indexOf("  function installQuickEntryToolsMenuRelocation() {");
  const end = updater.indexOf("  function bindPhoneIconOnlyButton", start);
  if (start < 0 || end < 0) throw new Error("Could not isolate Header/More Tools compatibility block");
  updater = `${updater.slice(0, start)}${updater.slice(end)}`;
  write(updaterPath, updater);
}
if (/installQuickEntryToolsMenuRelocation|installHeaderToolsRelocation/.test(read(updaterPath))) {
  throw new Error("Header/More Tools relocation still exists in pwa-update-v15-0-5.js");
}

const oldUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release2";
const newUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release3";
const headerAsset = "header-tools-compat.js?v=15.2.10-header1";

let index = read("index.html");
index = index.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!index.includes(headerAsset)) {
  const needle = `<script src="./${newUpdaterAsset}"></script>`;
  if (!index.includes(needle)) throw new Error("Could not find rotated PWA updater script in index.html");
  index = index.replace(needle, `${needle}\n  <script src="./${headerAsset}"></script>`);
}
write("index.html", index);

let worker = read("sw.js");
worker = worker.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!worker.includes(headerAsset)) {
  const needle = `  asset("./${newUpdaterAsset}"),`;
  if (!worker.includes(needle)) throw new Error("Could not find rotated PWA updater asset in sw.js");
  worker = worker.replace(needle, `${needle}\n  asset("./${headerAsset}"),`);
}
write("sw.js", worker);

const preparePath = "scripts/prepare-runtime.mjs";
replaceExact(
  preparePath,
  '    "application-help.js",\n    "sync-runtime-compat.js"',
  '    "application-help.js",\n    "header-tools-compat.js",\n    "sync-runtime-compat.js"'
);
if (!read(preparePath).includes('"header-tools-compat.js"')) throw new Error("prepare-runtime does not register header-tools-compat.js");

const inspectorPath = "tests/helpers/inspect-project.mjs";
let inspector = read(inspectorPath);
inspector = inspector.replace(
  '"form-inputs.js", "application-help.js", "sync-runtime-compat.js", "interaction-patterns.js"',
  '"form-inputs.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js", "interaction-patterns.js"'
);
inspector = inspector.split('["application-help.js", "sync-runtime-compat.js"]')
  .join('["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"]');
write(inspectorPath, inspector);
if (!read(inspectorPath).includes('"header-tools-compat.js"')) throw new Error("Repository inspector does not register header-tools-compat.js");

const workflowPath = ".github/workflows/quality-pages.yml";
let workflow = read(workflowPath);
if (!workflow.includes("test -f _site/header-tools-compat.js")) {
  const needle = "          test -f _site/application-help.js\n";
  if (!workflow.includes(needle)) throw new Error("Could not find Application Help deploy assertion");
  workflow = workflow.replace(needle, `${needle}          test -f _site/header-tools-compat.js\n`);
}
write(workflowPath, workflow);

const escapedOldUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release2`;
const escapedNewUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release3`;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
  replaceExact(file, escapedOldUpdater, escapedNewUpdater);
}

const regressionPath = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let regression = read(regressionPath);
if (!regression.includes('const headerTools = fs.readFileSync("assets/js/ui/header-tools-compat.js", "utf8");')) {
  regression = regression.replace(
    'const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");',
    'const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");\nconst headerTools = fs.readFileSync("assets/js/ui/header-tools-compat.js", "utf8");'
  );
}
const ownershipNeedle = 'assert.doesNotMatch(updater, /installCashFlowStyles|cashFlowLayoutV1522/, "Cash Flow presentation must not be injected by the PWA updater");';
if (!regression.includes("Header/More Tools relocation must not remain in the PWA updater")) {
  if (!regression.includes(ownershipNeedle)) throw new Error("Could not locate PWA ownership regression anchor");
  regression = regression.replace(
    ownershipNeedle,
    `${ownershipNeedle}\nassert.doesNotMatch(updater, /installQuickEntryToolsMenuRelocation|installHeaderToolsRelocation/, "Header/More Tools relocation must not remain in the PWA updater");\nassert.match(headerTools, /function installQuickEntryToolsMenuRelocation\\(\\)/, "Dedicated Header Tools module must own Quick Add relocation");\nassert.match(headerTools, /function installHeaderToolsRelocation\\(\\)/, "Dedicated Header Tools module must own Header/More Tools relocation");\nassert.match(index, /header-tools-compat\\.js\\?v=15\\.2\\.10-header1/, "Index must load the dedicated Header Tools module");\nassert.match(worker, /header-tools-compat\\.js\\?v=15\\.2\\.10-header1/, "Service worker must precache the dedicated Header Tools module");`
  );
}
regression = regression.replace(
  'console.log("V15.2.10 PWA updater regression passed with Application Help extraction cache refresh.");',
  'console.log("V15.2.10 PWA updater regression passed with Header/More Tools ownership extraction.");'
);
write(regressionPath, regression);

const phoneOwnershipPath = "tests/browser/phone-finance-css-ownership-v15-2-10.spec.mjs";
if (!read(phoneOwnershipPath).includes(newUpdaterAsset)) throw new Error("Phone Finance delivery test did not rotate the PWA updater URL");

const headerSource = read("assets/js/ui/header-tools-compat.js");
if (!headerSource.includes("installQuickEntryToolsMenuRelocation") || !headerSource.includes("installHeaderToolsRelocation")) {
  throw new Error("Dedicated Header Tools module is incomplete");
}
if (!read("index.html").includes(newUpdaterAsset) || !read("index.html").includes(headerAsset)) throw new Error("Index delivery is incomplete");
if (!read("sw.js").includes(newUpdaterAsset) || !read("sw.js").includes(headerAsset)) throw new Error("Service-worker delivery is incomplete");
if (!read(workflowPath).includes("test -f _site/header-tools-compat.js")) throw new Error("Pages deployment assertion is incomplete");

console.log("Applied PR5 Header/More Tools ownership extraction.");
