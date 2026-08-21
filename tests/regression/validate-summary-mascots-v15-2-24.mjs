import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prepare = read("scripts/prepare-summary-mascots-v15-2-24.mjs");
const css = read("assets/css/summary-mascots-v15-2-25.css");
const js = read("assets/js/ui/summary-mascots-v15-2-25.js");
const workflow = read(".github/workflows/quality-pages.yml");

assert.equal(version.version, "2.0.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260822-organized-complete-r1");
assert.match(pkg.scripts["prepare:runtime"], /prepare-summary-mascots-v15-2-24\.mjs/);

for (const file of ["mascot-red.png", "mascot-green.png", "mascot-blue.png", "mascot-orange.png"]) {
  assert.ok(fs.existsSync(`assets/mascots/${file}`), `Missing supplied mascot asset: ${file}`);
  assert.match(workflow, new RegExp(file.replace(".", "\\.")), `Pages packaging must validate ${file}`);
}

/* Legacy mascot asset/query identifiers remain intentionally stable under V2.0.0. */
assert.match(prepare, /const QUERY = "15\.2\.24-mascot8"/);
assert.match(prepare, /summary-mascots-v15-2-25\.css\?v=\$\{QUERY\}/);
assert.match(prepare, /summary-mascots-v15-2-25\.js\?v=\$\{QUERY\}/);
assert.match(prepare, /mascot-\$\{color\}\.png\?v=\$\{QUERY\}/);
assert.match(prepare, /mascot-\$\{color\}\.svg/);
assert.match(prepare, /mascot-\$\{color\}\\\.png\(\?:\\\?v=/);

assert.match(css, /img\[data-first-half-complete-icon\][\s\S]*display:\s*none !important/);
assert.match(css, /img\[data-other-expenses-complete-icon\][\s\S]*display:\s*none !important/);
assert.match(css, /\.summary-mascot-slot::after[\s\S]*width:\s*30px;[\s\S]*height:\s*30px;/);
assert.match(css, /data-summary-mascot="red"[\s\S]*mascot-red\.png\?v=15\.2\.24-mascot7/);
assert.match(css, /data-summary-mascot="green"[\s\S]*mascot-green\.png\?v=15\.2\.24-mascot7/);
assert.match(css, /data-summary-mascot="blue"[\s\S]*mascot-blue\.png\?v=15\.2\.24-mascot7/);
assert.match(css, /data-summary-mascot="orange"[\s\S]*mascot-orange\.png\?v=15\.2\.24-mascot7/);
assert.match(css, /#money \.legend-total\.summary-mascot-slot,[\s\S]*19px from the positioning edge[\s\S]*right:\s*19px !important;/);
assert.doesNotMatch(css, /#financeLegend/);
assert.match(css, /\.collapse-actions\.has-period-mascot[\s\S]*gap:\s*10px !important;[\s\S]*align-items:\s*center !important;/);
assert.match(css, /\.period-total\.summary-mascot-slot[\s\S]*align-self:\s*center !important;[\s\S]*transform:\s*translateY\(-16px\) !important;/);
assert.match(css, /\.period-header[\s\S]*padding-right:\s*10px !important;/);

assert.match(js, /mascot-red\.png\?v=15\.2\.24-mascot7/);
assert.match(js, /mascot-green\.png\?v=15\.2\.24-mascot7/);
assert.match(js, /mascot-blue\.png\?v=15\.2\.24-mascot7/);
assert.match(js, /mascot-orange\.png\?v=15\.2\.24-mascot7/);
assert.match(js, /storedAmountText/);
assert.match(js, /firstHalfOriginalText/);
assert.match(js, /otherExpensesOriginalText/);
assert.match(js, /zeroTotal\("legendEarlyTotal", "red"/);
assert.match(js, /zeroTotal\("legendLateTotal", "orange"/);
assert.match(js, /zeroTotal\("legendOtherTotal", "blue"/);
assert.match(js, /zeroTotal\("earlyTotal", "red"/);
assert.match(js, /zeroTotal\("lateTotal", "orange"/);
assert.match(js, /zeroTotal\("otherTotal", "blue"/);
assert.match(js, /label !== "First-half difference" && label !== "Second-half difference"/);
assert.match(js, /isRed \? "red" : "green"/);
assert.match(js, /aria-label/);
assert.match(js, /DESKTOP_QUERY/);
assert.match(js, /FinanceSummaryMascots = Object\.freeze\(\{ refresh:schedule, apply/);
assert.doesNotMatch(js, /replaceChildren\(mascot/);

console.log("V2.0.0 preserves the V15.2.24 Budget & Expenses PNG mascot contract, mascot8 delivery, the 16px lower optical lift, and unchanged schema/sync behavior.");
