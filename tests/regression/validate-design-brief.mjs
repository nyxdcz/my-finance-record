import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("DESIGN.md", "utf8");
assert.match(source, /^# Talaan visual direction/m);
assert.match(source, /## Material budget/);
assert.match(source, /One purposeful floating surface may use Liquid Glass/);
assert.match(source, /## Shape hierarchy/);
assert.match(source, /## Type and color/);
assert.match(source, /## Responsive behavior/);
assert.match(source, /44px touch targets/);
assert.match(source, /theme-aware ring/);

console.log("Talaan visual direction, material budget, shape hierarchy, and responsive review contract are documented.");
