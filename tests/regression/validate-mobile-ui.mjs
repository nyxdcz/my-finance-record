import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const mobile = read("assets/css/mobile.css");
const phoneFinance = read("assets/js/ui/phone-finance-compat.js");
const cloud = read("assets/js/cloud-sync.js");
const worker = read("sw.js");
const runtimeCompat = read("sync-runtime-compat.js");
const version = JSON.parse(read("version.json"));
const query = "2.0.1-talaan2";

assert.equal(version.version, "2.0.1");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.match(index, /Talaan · V2\.0\.1/);
assert.ok(index.includes(`./mobile.css?v=${query}`));
assert.ok(worker.includes(`./mobile.css?v=${query}`));
assert.match(runtimeCompat, /const VERSION = "2\.0\.1";/);
assert.match(runtimeCompat, /const RELEASE_NAME = "Talaan";/);
assert.match(runtimeCompat, /document\.title = `Talaan · V\$\{VERSION\}`/);
assert.match(mobile, /body \.workspace-switcher,\s*body \.finance-workspace-marquee-row[\s\S]*var\(--mobile-topbar-offset/);
assert.match(mobile, /\.toast \.toast-dismiss[\s\S]*min-width:\s*44px/);
assert.match(mobile, /\.sidebar \.sidebar-close-button[\s\S]*min-width:\s*44px/);
assert.match(mobile, /\.budget-planner-more-panel[\s\S]*max-width:\s*calc\(100vw - 28px\)/);
assert.match(mobile, /@media \(max-width: 340px\)[\s\S]*data-paid-expense-row/);
assert.match(mobile, /\.phone-icon-only-action/);
assert.match(mobile, /#availableMoneySection \.collapse-actions/);
assert.match(mobile, /grid-template-areas:"title amount" "due account" "actions actions"/);
assert.match(mobile, /#income \.income-record-row/);
assert.match(mobile, /#paid-expenses \[data-paid-expense-row\]/);
assert.match(phoneFinance, /phone-icon-only-action/);
assert.match(phoneFinance, /data-pc-add/);
assert.match(phoneFinance, /phoneCompactIconBound/);
assert.match(cloud, /5\*60\*1000/, "routine cloud sync must remain five minutes");

console.log("Responsive mobile layout, compact Phone Finance behavior, and five-minute cloud cadence validated.");
