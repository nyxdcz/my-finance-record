import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("assets/css/app.css", "utf8");
const marker = "/* Anti-Slop keyboard focus";
const focusBlock = source.slice(source.lastIndexOf(marker));

assert.match(focusBlock, /\.expense-toolbar-single-line/);
assert.match(focusBlock, /\.expense-toolbar-compact/);
assert.match(focusBlock, /\.paid-toolbar-compact/);
assert.match(focusBlock, /\.project-toolbar-compact/);
assert.match(focusBlock, /\.income-toolbar/);
assert.match(focusBlock, /\.topbar \.month-display-button:focus-visible/);
assert.match(focusBlock, /\.record-icon-trigger:focus-visible/);
assert.match(focusBlock, /outline:2px solid var\(--focus-ring,var\(--primary\)\) !important/);
assert.match(focusBlock, /outline-offset:2px !important/);
assert.match(focusBlock, /box-shadow:0 0 0 1px var\(--focus-ring,var\(--primary\)\) !important/);
assert.match(focusBlock, /\.input\.input-error/);
assert.match(focusBlock, /box-shadow:0 0 0 1px var\(--danger\) !important/);

console.log("Compact toolbar, month, and icon controls expose a consistent keyboard focus ring with an error-state override.");
