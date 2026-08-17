import fs from "node:fs";
import path from "node:path";

const root = "tests";
const files = fs.readdirSync(root).filter(name => name.endsWith(".mjs"));
let changed = 0;

const replacements = [
  ['const expectedVersion = "15.2.3";', 'const expectedVersion = "15.2.4";'],
  ['version.version, "15.2.3"', 'version.version, "15.2.4"'],
  ['version.version,"15.2.3"', 'version.version,"15.2.4"'],
  ['version.version === "15.2.3"', 'version.version === "15.2.4"'],
  ['pkg.version, "15.2.3"', 'pkg.version, "15.2.4"'],
  ['pkg.version,"15.2.3"', 'pkg.version,"15.2.4"'],
  ['lock.version, "15.2.3"', 'lock.version, "15.2.4"'],
  ['lock.packages[""].version, "15.2.3"', 'lock.packages[""].version, "15.2.4"'],
  ['finance-v15-20260817-sync-status-r38', 'finance-v15-20260818-ui-refinement-r39'],
  ['V15.2.3', 'V15.2.4'],
  ['15\\.2\\.3', '15\\.2\\.4'],
  ['./sync-config.js?v=15.2.3-sync1', './sync-config.js?v=15.2.4-release1'],
  ['sync-config\\.js\\?v=15\\.2\\.3-sync1', 'sync-config\\.js\\?v=15\\.2\\.4-release1'],
  ['./ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3', './ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1'],
  ['ui-icon-alignment-v15-0-5\\.css\\?v=15\\.1\\.0-ui3', 'ui-icon-alignment-v15-0-5\\.css\\?v=15\\.2\\.4-ui1'],
  ['./desktop-ux-v15-2-0.css?v=15.2.1', './desktop-ux-v15-2-0.css?v=15.2.4-header1'],
  ['desktop-ux-v15-2-0\\.css\\?v=15\\.2\\.1', 'desktop-ux-v15-2-0\\.css\\?v=15\\.2\\.4-header1'],
  ['./pwa-update-v15-0-5.js?v=15.1.0', './pwa-update-v15-0-5.js?v=15.2.4-release1'],
  ['pwa-update-v15-0-5\\.js\\?v=15\\.1\\.0', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.4-release1']
];

for (const name of files) {
  const file = path.join(root, name);
  let source = fs.readFileSync(file, "utf8");
  const before = source;
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  if (source !== before) {
    fs.writeFileSync(file, source);
    changed += 1;
  }
}

console.log(`Aligned ${changed} test file(s) with the V15.2.4 release identity and asset pins.`);
