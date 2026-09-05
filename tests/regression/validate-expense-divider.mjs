import assert from "node:assert/strict";
import fs from "node:fs";

const compactCss = fs.readFileSync("assets/css/expense-compact.css", "utf8");
const browserSpec = fs.readFileSync("tests/browser/production-ui-audit.spec.mjs", "utf8");
const selector = "html body #money .record-row[data-expense-row] > .desktop-record-actions";
const start = compactCss.indexOf(`${selector} {`);
assert.ok(start >= 0, "compact desktop expense action row rule is missing");
const end = compactCss.indexOf("\n  }", start);
assert.ok(end > start, "compact desktop expense action row rule is incomplete");
const actionsRule = compactCss.slice(start, end);

assert.match(actionsRule, /margin:\s*4px 0 0 !important/);
assert.match(actionsRule, /padding:\s*0 0 0 37px !important/);
assert.match(actionsRule, /border-top:\s*0 !important/);
assert.doesNotMatch(actionsRule, /margin:[^;]*-/);
assert.doesNotMatch(actionsRule, /border-top:\s*1px/);
assert.match(browserSpec, /desktop expense action rows stay inside their cards without a divider through the metadata/);
assert.match(browserSpec, /expect\(geometry\.actionBorderTop\)\.toBe\(0\)/);

console.log("Desktop expense action rows stay inside their cards without a divider through account and amount metadata.");
