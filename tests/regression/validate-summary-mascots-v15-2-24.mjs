import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prepare = read("scripts/prepare-summary-mascots-v15-2-24.mjs");
const css = read("assets/css/summary-mascots-v15-2-25.css");
const js = read("assets/js/ui/summary-mascots-v15-2-25.js");
const workflow = read(".github/workflows/quality-pages.yml");

assert.equal(version.version, "15.2.24");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260822-compact-expense-collapse-r60");
assert.match(pkg.scripts["prepare:runtime"], /prepare-summary-mascots-v15-2-24\.mjs/);

for (const file of ["mascot-red.svg", "mascot-green.svg", "mascot-blue.svg", "mascot-orange.svg"]) {
  assert.ok(fs.existsSync(`assets/mascots/${file}`), `Missing supplied mascot asset: ${file}`);
  assert.match(workflow, new RegExp(file.replace(".", "\\.")), `Pages packaging must validate ${file}`);
}

assert.match(prepare, /summary-mascots-v15-2-25\.css\?v=\$\{QUERY\}/);
assert.match(prepare, /summary-mascots-v15-2-25\.js\?v=\$\{QUERY\}/);
assert.match(prepare, /assets\/mascots\/mascot-red\.svg/);
assert.match(prepare, /assets\/mascots\/mascot-orange\.svg/);

assert.match(css, /\.summary-mascot-image[\s\S]*width:\s*25px;[\s\S]*height:\s*25px;/);
assert.match(css, /#financeLegend \.legend-total\.summary-mascot-slot,[\s\S]*right:\s*20px !important;/);
assert.match(css, /\.collapse-actions\.has-period-mascot[\s\S]*gap:\s*10px !important;/);
assert.match(css, /\.period-header[\s\S]*padding-right:\s*10px !important;/);

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

console.log("V15.2.24 Budget & Expenses mascot source contract passed without schema or sync changes.");
