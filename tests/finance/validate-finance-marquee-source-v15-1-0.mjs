import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const interaction = fs.readFileSync("interaction-patterns.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));

const expectedVersion = "15.2.23";
const expectedIndexCache = "finance-v15-20260821-monthly-repeat-icon-r59";
const expectedCache = "finance-v15-20260821-monthly-repeat-icon-r59";
const interactionQuery = "15.2.18-kanban1";

for (const [pageId, marqueeId] of [["income", "incomeFinanceWeekMarquee"], ["money", "financeWeekMarquee"], ["paid-expenses", "paidFinanceWeekMarquee"]]) {
  const start = index.indexOf(`id="${pageId}"`);
  assert.notEqual(start, -1, `${pageId} page must exist`);
  const next = index.indexOf('<section class="page', start + 1);
  const segment = index.slice(start, next === -1 ? index.length : next);
  const row = segment.indexOf('class="finance-workspace-marquee-row no-print"');
  assert.notEqual(row, -1, `${pageId} must use the shared Finance row in source HTML`);
  const switcher = segment.indexOf('class="workspace-switcher money-workspace-switcher"', row);
  const marquee = segment.indexOf(`id="${marqueeId}"`, row);
  assert.notEqual(switcher, -1, `${pageId} switcher must be inside the shared row`);
  assert.notEqual(marquee, -1, `${pageId} marquee must be inside the shared row`);
  assert.ok(switcher < marquee, `${pageId} tabs must precede the marquee`);
}

assert.equal(interaction.includes("alignFinanceWorkspaceMarquees"), false, "runtime DOM rearrangement workaround must be removed");
assert.ok(index.includes(`const APP_VERSION = "${expectedVersion}";`));
assert.ok(index.includes(`const APP_CACHE_VERSION = "${expectedIndexCache}";`));
assert.ok(index.includes(`./interaction-patterns.js?v=${interactionQuery}`));
assert.ok(sw.includes(`const APP_VERSION = "${expectedVersion}";`));
assert.ok(sw.includes(`const CACHE_VERSION = "${expectedCache}";`));
assert.ok(sw.includes(`./interaction-patterns.js?v=${interactionQuery}`));
assert.equal(version.version, expectedVersion);
assert.equal(version.cacheVersion, expectedCache);
assert.equal(pkg.version, expectedVersion);
assert.equal(lock.version, expectedVersion);
assert.equal(lock.packages[""].version, expectedVersion);

console.log("Finance marquee source layout and V15.2.23 PWA cache metadata validated.");
