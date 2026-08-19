import fs from "node:fs";
import path from "node:path";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, value) => fs.writeFileSync(file, value);

const updaterPath = "assets/js/pwa-update-v15-0-5.js";
const mobilePath = "assets/css/mobile-v14-0-23.css";
const sourceRegressionPath = "tests/regression/validate-v15-2-2-mobile-ui.mjs";
const ownershipMarker = "V15.2.10 · static Phone Finance compact CSS ownership";

let updater = read(updaterPath);
let mobile = read(mobilePath);

if (updater.includes("function installPhoneFinanceCompactStyles()")) {
  const start = updater.indexOf("  function installPhoneFinanceCompactStyles() {");
  const next = updater.indexOf("  function bindPhoneIconOnlyButton", start);
  if (start < 0 || next < 0) throw new Error("Could not isolate installPhoneFinanceCompactStyles()");
  const block = updater.slice(start, next);
  const styleMatch = block.match(/style\.textContent = `\n([\s\S]*?)\n    `;/);
  if (!styleMatch) throw new Error("Could not extract phoneFinanceCompactV1522 CSS template");
  const extracted = styleMatch[1]
    .split("\n")
    .map(line => line.replace(/^      /, ""))
    .join("\n")
    .trimEnd();

  if (!mobile.includes(ownershipMarker)) {
    mobile = `${mobile.trimEnd()}\n\n/* ${ownershipMarker} · moved unchanged from pwa-update-v15-0-5.js. */\n${extracted}\n`;
  }

  updater = `${updater.slice(0, start)}${updater.slice(next)}`;
  updater = updater.replace("    installPhoneFinanceCompactStyles();\n", "");
  write(updaterPath, updater);
  write(mobilePath, mobile);
} else {
  if (!mobile.includes(ownershipMarker)) throw new Error("Runtime style installer is absent but static ownership marker is missing");
  if (updater.includes("installPhoneFinanceCompactStyles();")) throw new Error("Runtime style installer call still exists");
}

function replaceExact(file, from, to) {
  const before = read(file);
  if (!before.includes(from)) return false;
  write(file, before.split(from).join(to));
  return true;
}

const oldMobileAsset = "mobile-v14-0-23.css?v=15.2.2-mobile1";
const newMobileAsset = "mobile-v14-0-23.css?v=15.2.10-mobile2";
const oldUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release1";
const newUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release2";

for (const file of ["index.html", "sw.js"]) {
  replaceExact(file, oldMobileAsset, newMobileAsset);
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldMobileAsset, newMobileAsset);
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
}

let sourceRegression = read(sourceRegressionPath);
const oldIdAssertion = 'assert.match(updater, /id = "phoneFinanceCompactV1522"/);';
const newIdAssertions = [
  'assert.doesNotMatch(updater, /phoneFinanceCompactV1522|installPhoneFinanceCompactStyles/);',
  'assert.match(mobile, /V15\\.2\\.10 · static Phone Finance compact CSS ownership/);',
  'assert.match(mobile, /\\.phone-icon-only-action/);',
  'assert.match(mobile, /#availableMoneySection \\.collapse-actions/);'
].join("\n");
if (sourceRegression.includes(oldIdAssertion)) sourceRegression = sourceRegression.replace(oldIdAssertion, newIdAssertions);

const oldGridAssertion = 'assert.match(updater, /grid-template-areas:"title amount" "due account" "actions actions"/);';
const newGridAssertions = [
  'assert.match(mobile, /grid-template-areas:"title amount" "due account" "actions actions"/);',
  'assert.match(mobile, /#income \\.income-record-row/);',
  'assert.match(mobile, /#paid-expenses \\[data-paid-expense-row\\]/);'
].join("\n");
if (sourceRegression.includes(oldGridAssertion)) sourceRegression = sourceRegression.replace(oldGridAssertion, newGridAssertions);
sourceRegression = sourceRegression.replace(
  'console.log("V15.2.10 release preserves V15.2.2 mobile UI/UX and compact Finance source regression.");',
  'console.log("V15.2.10 preserves V15.2.2 mobile UI/UX with static Phone Finance compact CSS ownership.");'
);
write(sourceRegressionPath, sourceRegression);

const finalUpdater = read(updaterPath);
const finalMobile = read(mobilePath);
if (/phoneFinanceCompactV1522|installPhoneFinanceCompactStyles/.test(finalUpdater)) throw new Error("Runtime Phone Finance style ownership remains in pwa-update-v15-0-5.js");
if (!finalMobile.includes(ownershipMarker)) throw new Error("Static Phone Finance ownership marker missing");
if (!finalMobile.includes('grid-template-areas:"title amount" "due account" "actions actions"')) throw new Error("Budget & Expenses compact grid was not migrated");
if (!finalMobile.includes("#income .income-record-row")) throw new Error("Income compact grid was not migrated");
if (!finalMobile.includes("#paid-expenses [data-paid-expense-row]")) throw new Error("Paid Expenses compact grid was not migrated");
if (!read("index.html").includes(newMobileAsset) || !read("index.html").includes(newUpdaterAsset)) throw new Error("Index delivery URLs were not rotated");
if (!read("sw.js").includes(newMobileAsset) || !read("sw.js").includes(newUpdaterAsset)) throw new Error("Service-worker delivery URLs were not rotated");

console.log("Applied PR4 Phone Finance compact CSS ownership cleanup.");
