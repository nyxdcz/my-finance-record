import fs from "node:fs";
import path from "node:path";

const CACHE = "finance-v15-20260817-sync-status-r38";
const LEGACY = "finance-v15-20260816-mobile-ui-ux-r32";
const SYNC_PIN = "15.2.3-sync1";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content);
function update(file, transforms) {
  let source = read(file);
  const before = source;
  for (const [from, to] of transforms) source = source.split(from).join(to);
  if (source !== before) write(file, source);
}

update("pwa-update-v15-0-5.js", [
  ['const CURRENT_CACHE_VERSION = "finance-v15-20260817-phone-finance-r37";', `const CURRENT_CACHE_VERSION = "${CACHE}";`]
]);

for (const file of ["index.html", "sw.js"]) {
  update(file, [
    ["sync-config.js?v=15.2.2-mobile1", `sync-config.js?v=${SYNC_PIN}`],
    ["cloud-sync.js?v=15.2.1-ux1", `cloud-sync.js?v=${SYNC_PIN}`]
  ]);
}

for (const name of fs.readdirSync("tests")) {
  if (!name.endsWith(".mjs")) continue;
  const file = path.join("tests", name);
  update(file, [
    ['assert.equal(version.version, "15.2.2");', 'assert.equal(version.version, "15.2.3");'],
    ['assert.equal(version.version,"15.2.2");', 'assert.equal(version.version,"15.2.3");'],
    ['assert.strictEqual(version.version, "15.2.2");', 'assert.strictEqual(version.version, "15.2.3");'],
    ['expect(version.version).toBe("15.2.2")', 'expect(version.version).toBe("15.2.3")'],
    ['const APP_VERSION = "15\\.2\\.2"', 'const APP_VERSION = "15\\.2\\.3"'],
    ['const APP_VERSION = "15.2.2"', 'const APP_VERSION = "15.2.3"'],
    ['sync-config.js?v=15.2.2-mobile1', `sync-config.js?v=${SYNC_PIN}`],
    ['cloud-sync.js?v=15.2.1-ux1', `cloud-sync.js?v=${SYNC_PIN}`]
  ]);
}

let pwaTest = read("tests/validate-pwa-updater-v15-0-5.mjs");
pwaTest = pwaTest.replace(
  `assert.match(updater, /const LEGACY_INDEX_CACHE = "${CACHE}";/);`,
  `assert.match(updater, /const LEGACY_INDEX_CACHE = "${LEGACY}";/);`
);
pwaTest = pwaTest.replace(/assert\.match\(worker, \/const APP_VERSION = "15\\\.2\\\.2";\/\);/, 'assert.match(worker, /const APP_VERSION = "15\\.2\\.3";/);');
pwaTest = pwaTest.replace('console.log("V15.2.2 PWA updater regression passed with phone-Finance/cloud-profile cache refresh.");', 'console.log("V15.2.3 PWA updater regression passed with sync-status cache refresh.");');
write("tests/validate-pwa-updater-v15-0-5.mjs", pwaTest);

const leftovers = [];
for (const name of fs.readdirSync("tests")) {
  if (!name.endsWith(".mjs")) continue;
  const source = read(path.join("tests", name));
  source.split(/\r?\n/).forEach((line, index) => {
    if (/version\.version.*15\.2\.2|APP_VERSION.*15\\?\.2\\?\.2/.test(line)) leftovers.push(`${name}:${index + 1}: ${line.trim()}`);
  });
}
if (leftovers.length) {
  console.error("Remaining current-version assertions still reference V15.2.2:\n" + leftovers.join("\n"));
  process.exit(1);
}
console.log("Finalized V15.2.3 validation metadata and sync asset pins.");
