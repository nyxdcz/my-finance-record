import fs from "node:fs";
import path from "node:path";

const OLD_VERSION = "15.2.2";
const NEW_VERSION = "15.2.3";
const OLD_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
const OLD_SW_CACHE = "finance-v15-20260817-phone-finance-r37";
const NEW_CACHE = "finance-v15-20260817-sync-status-r38";

function update(file, transforms) {
  let source = fs.readFileSync(file, "utf8");
  const before = source;
  for (const [from, to] of transforms) source = source.split(from).join(to);
  if (source !== before) fs.writeFileSync(file, source);
}

update("index.html", [
  [`const APP_VERSION = "${OLD_VERSION}";`, `const APP_VERSION = "${NEW_VERSION}";`],
  [`const APP_CACHE_VERSION = "${OLD_INDEX_CACHE}";`, `const APP_CACHE_VERSION = "${NEW_CACHE}";`],
  [`const APP_CACHE_VERSION = "${OLD_SW_CACHE}";`, `const APP_CACHE_VERSION = "${NEW_CACHE}";`]
]);

for (const name of fs.readdirSync("tests")) {
  if (!name.endsWith(".mjs")) continue;
  const file = path.join("tests", name);
  update(file, [
    [`const expectedVersion = "${OLD_VERSION}";`, `const expectedVersion = "${NEW_VERSION}";`],
    [OLD_INDEX_CACHE, NEW_CACHE],
    [OLD_SW_CACHE, NEW_CACHE]
  ]);
}

console.log("Aligned V15.2.3 index and validation metadata.");
