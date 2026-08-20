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

let index = read("index.html");
if (!index.includes("<strong>My Finance Records</strong>")) {
  if (!index.includes("<strong>Records</strong>")) throw new Error("Static sidebar brand source not found");
  index = index.replace("<strong>Records</strong>", "<strong>My Finance Records</strong>");
}
index = index.split(oldUpdaterAsset).join(newUpdaterAsset);
write("index.html", index);

let updater = read("assets/js/pwa-update-v15-0-5.js");
const start = updater.indexOf("\n  function installSidebarBrand() {");
if (start >= 0) {
  const endMarker = "\n  installSidebarBrand();";
  const end = updater.indexOf(endMarker, start);
  if (end < 0) throw new Error("Could not isolate installSidebarBrand()");
  updater = `${updater.slice(0, start)}${updater.slice(end + endMarker.length)}`;
  write("assets/js/pwa-update-v15-0-5.js", updater);
}

replaceExact("sw.js", oldUpdaterAsset, newUpdaterAsset);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}
for (const file of walk("tests").filter(file => /\.(?:mjs|js)$/.test(file))) {
  replaceExact(file, oldUpdaterAsset, newUpdaterAsset);
  replaceExact(file, String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release5`, String.raw`pwa-update-v15-0-5\.js\?v=15\.2\.10-release6`);
}

const regressionPath = "tests/regression/validate-pwa-updater-v15-0-5.mjs";
let regression = read(regressionPath);
const anchor = 'assert.match(updater, /async clearFinanceCaches\\(\\)/);';
const ownershipAssertions = [
  'assert.match(index, /<strong>My Finance Records<\\/strong>/, "Static HTML must own the sidebar brand");',
  'assert.doesNotMatch(index, /<strong>Records<\\/strong>/, "Legacy sidebar brand placeholder must be removed");',
  'assert.doesNotMatch(updater, /installSidebarBrand|\\.sidebar \\.brand strong|My Finance Records|root\\.document|querySelector/, "PWA updater must not own sidebar UI mutation");'
].join("\n");
if (!regression.includes("Static HTML must own the sidebar brand")) {
  if (!regression.includes(anchor)) throw new Error("PWA regression insertion anchor missing");
  regression = regression.replace(anchor, `${anchor}\n${ownershipAssertions}`);
}
regression = regression.replace(
  'console.log("V15.2.10 PWA updater regression passed with Phone Finance JS ownership extraction.");',
  'console.log("V15.2.10 PWA updater regression passed with pure PWA ownership and static sidebar branding.");'
);
write(regressionPath, regression);

const runnerPath = "tests/run.mjs";
let runner = read(runnerPath);
const sidebarRegressionEntry = '  { suite: "regression", file: "tests/regression/validate-sidebar-brand-static-v15-2-10.mjs" },';
if (!runner.includes(sidebarRegressionEntry)) {
  const runnerAnchor = '  { suite: "regression", file: "tests/regression/validate-sidebar-embedded-v15-2-10.mjs" },';
  if (!runner.includes(runnerAnchor)) throw new Error("Source regression runner anchor missing");
  runner = runner.replace(runnerAnchor, `${runnerAnchor}\n${sidebarRegressionEntry}`);
  write(runnerPath, runner);
}

const finalIndex = read("index.html");
const finalUpdater = read("assets/js/pwa-update-v15-0-5.js");
const finalWorker = read("sw.js");
if (!finalIndex.includes("<strong>My Finance Records</strong>")) throw new Error("Static sidebar brand was not applied");
if (finalIndex.includes("<strong>Records</strong>")) throw new Error("Legacy sidebar brand placeholder remains");
if (!finalIndex.includes(newUpdaterAsset) || !finalWorker.includes(newUpdaterAsset)) throw new Error("Updater release6 delivery pin missing");
if (/installSidebarBrand|\.sidebar \.brand strong|My Finance Records|root\.document|querySelector/.test(finalUpdater)) throw new Error("PWA updater still contains sidebar UI ownership");
if (!finalUpdater.includes("root.FinancePwaUpdate = api")) throw new Error("PWA updater API was damaged");
if (!read(runnerPath).includes(sidebarRegressionEntry)) throw new Error("Static Sidebar Brand regression is not registered");

console.log("Applied PR8 static Sidebar Brand ownership cleanup.");
