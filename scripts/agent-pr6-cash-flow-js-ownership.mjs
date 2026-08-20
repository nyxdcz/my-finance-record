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

const oldUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release3";
const newUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release4";
const cashFlowAsset = "cash-flow-summary.js?v=15.2.10-cashflow1";

let index = read("index.html");
index = index.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!index.includes(cashFlowAsset)) {
  const needle = `<script src="./${newUpdaterAsset}"></script>`;
  if (!index.includes(needle)) throw new Error("Could not locate PWA updater script in index.html");
  index = index.replace(needle, `${needle}\n  <script src="./${cashFlowAsset}"></script>`);
}
write("index.html", index);

let worker = read("sw.js");
worker = worker.split(oldUpdaterAsset).join(newUpdaterAsset);
if (!worker.includes(cashFlowAsset)) {
  const needle = `  asset("./${newUpdaterAsset}"),`;
  if (!worker.includes(needle)) throw new Error("Could not locate PWA updater asset in sw.js");
  worker = worker.replace(needle, `${needle}\n  asset("./${cashFlowAsset}"),`);
}
write("sw.js", worker);

const preparePath = "scripts/prepare-runtime.mjs";
let prepare = read(preparePath);
if (!prepare.includes('"assets/js/features"')) {
  const needle = '  "assets/js/ui": [';
  if (!prepare.includes(needle)) throw new Error("Could not locate UI runtime group");
  prepare = prepare.replace(needle, '  "assets/js/features": [\n    "cash-flow-summary.js"\n  ],\n  "assets/js/ui": [');
}
write(preparePath, prepare);

const inspectorPath = "tests/helpers/inspect-project.mjs";
let inspector = read(inspectorPath);
inspector = inspector.replace(
  '"form-inputs.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js", "interaction-patterns.js"',
  '"form-inputs.js", "cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js", "interaction-patterns.js"'
);
if (!inspector.includes('if (normalized === "cash-flow-summary.js") return `assets/js/features/${normalized}`;')) {
  const needle = '  if (runtimeCssSet.has(normalized)) return `assets/css/${normalized}`;\n';
  inspector = inspector.replace(needle, `${needle}  if (normalized === "cash-flow-summary.js") return \`assets/js/features/\${normalized}\`;\n`);
}
inspector = inspector.replace(
  'runtimeJsFiles.filter(file => !["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(file)).forEach(file => deploySources.add(file));',
  'runtimeJsFiles.filter(file => !["cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(file)).forEach(file => deploySources.add(file));'
);
if (!inspector.includes('normalized === "assets/js/features/*.js"')) {
  const needle = '    else if (normalized === "assets/js/ui/*.js") ["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].forEach(file => deploySources.add(file));\n';
  inspector = inspector.replace(needle, `${needle}    else if (normalized === "assets/js/features/*.js") ["cash-flow-summary.js"].forEach(file => deploySources.add(file));\n`);
}
write(inspectorPath, inspector);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
const escapedOldUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release3`;
const escapedNewUpdater = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release4`;
for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
  replaceExact(file, escapedOldUpdater, escapedNewUpdater);
}

const regressionPath = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let regression = read(regressionPath);
if (!regression.includes('const cashFlowSummary = fs.readFileSync("assets/js/features/cash-flow-summary.js", "utf8");')) {
  regression = regression.replace(
    'const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");',
    'const updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");\nconst cashFlowSummary = fs.readFileSync("assets/js/features/cash-flow-summary.js", "utf8");'
  );
}
regression = regression.replace(
  'assert.match(updater, /function upgradeCashFlowLayout\\(\\)/, "Cash Flow DOM summary upgrade behavior must remain in place");',
  'assert.doesNotMatch(updater, /parseMoneyText|readCashFlowRows|comparisonMarkup|upgradeCashFlowLayout|installCashFlowLayoutUpgrade/, "Cash Flow summary behavior must not remain in the PWA updater");\nassert.match(cashFlowSummary, /function upgradeCashFlowLayout\\(\\)/, "Cash Flow feature module must own the DOM summary upgrade");\nassert.match(cashFlowSummary, /function comparisonMarkup\\(current, previous\\)/, "Cash Flow feature module must own previous-month comparison behavior");\nassert.match(index, /cash-flow-summary\\.js\\?v=15\\.2\\.10-cashflow1/, "Index must load the Cash Flow feature module");\nassert.match(worker, /cash-flow-summary\\.js\\?v=15\\.2\\.10-cashflow1/, "Service worker must precache the Cash Flow feature module");'
);
regression = regression.replace(
  'console.log("V15.2.10 PWA updater regression passed with Header/More Tools ownership extraction.");',
  'console.log("V15.2.10 PWA updater regression passed with Cash Flow JS ownership extraction.");'
);
write(regressionPath, regression);

const updater = read("assets/js/pwa-update-v15-0-5.js");
const cashFlow = read("assets/js/features/cash-flow-summary.js");
if (/parseMoneyText|readCashFlowRows|comparisonMarkup|upgradeCashFlowLayout|installCashFlowLayoutUpgrade/.test(updater)) {
  throw new Error("Cash Flow behavior still exists in pwa-update-v15-0-5.js");
}
for (const required of ["parseMoneyText", "readCashFlowRows", "comparisonMarkup", "upgradeCashFlowLayout", "installCashFlowLayoutUpgrade"]) {
  if (!cashFlow.includes(required)) throw new Error(`Cash Flow feature module is missing ${required}`);
}
if (!read("index.html").includes(newUpdaterAsset) || !read("index.html").includes(cashFlowAsset)) throw new Error("Index Cash Flow delivery is incomplete");
if (!read("sw.js").includes(newUpdaterAsset) || !read("sw.js").includes(cashFlowAsset)) throw new Error("Service-worker Cash Flow delivery is incomplete");
if (!read(preparePath).includes('"assets/js/features"') || !read(preparePath).includes('"cash-flow-summary.js"')) throw new Error("Runtime preparation is missing Cash Flow feature registration");
if (!read(inspectorPath).includes('assets/js/features/${normalized}')) throw new Error("Repository inspector is missing Cash Flow feature source mapping");

console.log("Applied PR6 Cash Flow JS ownership extraction.");
