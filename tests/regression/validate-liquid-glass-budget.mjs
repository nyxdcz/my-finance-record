import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/css/liquid-glass.css", "utf8");
const budget = source.slice(source.lastIndexOf("/* Anti-Slop material budget"));

assert.match(budget, /\.sidebar,[\s\S]*\.dashboard-week-marquee,[\s\S]*\.dashboard-week-day/);
assert.match(budget, /background:var\(--surface\)!important/);
assert.match(budget, /-webkit-backdrop-filter:none!important/);
assert.match(budget, /backdrop-filter:none!important/);
assert.match(budget, /\.cloud-sync-toolbar-popover\s*\{[\s\S]*blur\(22px\) saturate\(145%\)/);
assert.doesNotMatch(budget, /\.cloud-sync-toolbar-popover,[\s\S]*backdrop-filter:none!important/);

console.log("Liquid Glass is limited to the cloud-status popover; navigation and repeated content surfaces stay opaque.");
