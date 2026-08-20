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

const oldUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release5";
const newUpdaterAsset = "pwa-update-v15-0-5.js?v=15.2.10-release6";
const oldUpdaterRegex = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release5`;
const newUpdaterRegex = String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release6`;

let index = read("index.html");
const oldBrand = "<strong>Records</strong>";
const newBrand = "<strong>My Finance Records</strong>";
if (index.includes(oldBrand)) index = index.replace(oldBrand, newBrand);
index = index.split(oldUpdaterAsset).join(newUpdaterAsset);
write("index.html", index);

replaceExact("sw.js", oldUpdaterAsset, newUpdaterAsset);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
  replaceExact(file, oldUpdaterRegex, newUpdaterRegex);
}

const regressionPath = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let regression = read(regressionPath);
const ownershipAnchor = 'assert.match(updater, /async clearFinanceCaches\\(\\)/);';
const ownershipAssertions = [
  ownershipAnchor,
  'assert.match(index, /<strong>My Finance Records<\\/strong>/, "Static HTML must own the sidebar brand");',
  'assert.doesNotMatch(index, /<strong>Records<\\/strong>/, "Legacy short sidebar brand must not remain in the shell");',
  'assert.doesNotMatch(updater, /installSidebarBrand|querySelector|\\bdocument\\b|sidebar \\.brand/, "PWA updater must not mutate sidebar branding or own DOM UI behavior");'
].join("\n");
if (!regression.includes("Static HTML must own the sidebar brand")) {
  if (!regression.includes(ownershipAnchor)) throw new Error("PWA ownership anchor not found");
  regression = regression.replace(ownershipAnchor, ownershipAssertions);
}
regression = regression.replace(
  'console.log("V15.2.10 PWA updater regression passed with Phone Finance JS ownership extraction.");',
  'console.log("V15.2.10 PWA updater regression passed with pure PWA/cache ownership and static sidebar branding.");'
);
write(regressionPath, regression);

const finalIndex = read("index.html");
const finalUpdater = read("assets/js/pwa-update-v15-0-5.js");
const finalWorker = read("sw.js");
if (!finalIndex.includes(newBrand)) throw new Error("Static My Finance Records brand was not applied");
if (finalIndex.includes(oldBrand)) throw new Error("Legacy Records brand remains in index.html");
if (!finalIndex.includes(newUpdaterAsset)) throw new Error("Index updater pin was not rotated");
if (!finalWorker.includes(newUpdaterAsset)) throw new Error("Service-worker updater pin was not rotated");
if (/installSidebarBrand|querySelector|\bdocument\b/.test(finalUpdater)) throw new Error("PWA updater still owns sidebar/DOM UI behavior");
if (!/FinancePwaUpdate/.test(finalUpdater) || !/clearFinanceCaches/.test(finalUpdater)) throw new Error("PWA updater API was unexpectedly removed");

console.log("Applied PR8 static sidebar brand cleanup.");
