import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/* Legacy filename retained so existing automation paths remain stable. */
const RELEASE = Object.freeze({
  version:"2.0.1",
  name:"Talaan",
  date:"August 22, 2026",
  dateIso:"2026-08-22",
  syncQuery:"2.0.1-talaan1"
});

let changed = 0;
function patch(file, transform) {
  const target = path.join(root, file);
  const current = fs.readFileSync(target, "utf8");
  const next = transform(current);
  if (next === current) return;
  fs.writeFileSync(target, next);
  changed += 1;
}

patch("sync-runtime-compat.js", source => source
  .replace(/const VERSION = "\d+\.\d+\.\d+";/, `const VERSION = "${RELEASE.version}";`)
  .replace(/const RELEASE_NAME = "[^"]+";/, `const RELEASE_NAME = "${RELEASE.name}";`)
  .replace(/const RELEASE_DATE = "[^"]+";/, `const RELEASE_DATE = "${RELEASE.date}";`)
  .replace(/released:"\d{4}-\d{2}-\d{2}"/, `released:"${RELEASE.dateIso}"`)
  .replace('link.href = `./liquid-glass-v15.css?v=${VERSION}-light1`;', 'link.href = "./liquid-glass-v15.css?v=15.2.2-light1";'));

for (const file of ["index.html", "sw.js"]) {
  patch(file, source => source.replace(/sync-runtime-compat\.js\?v=[^"]+/, `sync-runtime-compat.js?v=${RELEASE.syncQuery}`));
}

console.log(`Talaan ${RELEASE.version} release override ready${changed ? ` · refreshed ${changed}` : ""}.`);
