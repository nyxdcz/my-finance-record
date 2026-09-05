import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const app = read("assets/css/app.css");
const canvas = read("assets/css/black-canvas.css");
const sidebar = read("assets/css/sidebar-compact-brand.css");
const scoped = `${app}\n${canvas}\n${sidebar}`;

for (const [token, value] of [
  ["--bg", "#efefef"],
  ["--surface", "#ffffff"],
  ["--surface-soft", "#f9fafb"],
  ["--text", "#182230"],
  ["--muted", "#667085"],
  ["--line", "#e4e7ec"],
  ["--primary", "#356fd1"],
  ["--primary-dark", "#2457ad"],
  ["--green", "#2f8f46"],
  ["--orange", "#e68a1f"],
  ["--danger", "#b42318"]
]) {
  assert.match(app, new RegExp(`${token}:\\s*${value}`, "i"), `app.css must define ${token} as ${value}`);
}

assert.match(app, /--green-text:\s*#28723b/i);
assert.match(app, /--orange-text:\s*#a75a00/i);
assert.match(app, /\.button-primary:hover\s*\{\s*background:\s*var\(--primary-dark\)/);
assert.match(app, /\.button-paid\s*\{[\s\S]*background:\s*var\(--primary\)/);
assert.match(app, /\.toast\.toast-success\s*\{\s*background:\s*var\(--green-text\)/);
assert.match(app, /\.toast\.toast-warning\s*\{\s*background:\s*var\(--orange-text\)/);
assert.match(app, /\.toast\.toast-error\s*\{\s*background:\s*var\(--danger\)/);
assert.doesNotMatch(app, /var\(--success\)/, "scoped app CSS must not reference the undefined success token");

assert.match(canvas, /--nav:#080B10/i);
assert.match(canvas, /--primary-dark:#2457AD/i);
assert.match(canvas, /--focus-ring:#7DAAFF/i);
assert.match(canvas, /--green:#2F8F46/i);
assert.match(canvas, /--orange:#E68A1F/i);
assert.match(canvas, /--danger:#FF8A7F/i);
assert.match(canvas, /html\[data-theme="dark"\] #availableMoneySection \.account-card \{\s*border-color:var\(--line\)/);

assert.match(sidebar, /html body #sidebar\.sidebar \{\s*background:var\(--nav\)/);
assert.match(sidebar, /html\[data-theme="light"\] body #sidebar\.sidebar \{\s*background:#FFFFFF/i);
assert.match(sidebar, /html\[data-theme="dark"\] body #sidebar\.sidebar \{\s*background:#080B10/i);
assert.match(sidebar, /background:var\(--primary\) !important;/);

for (const legacy of [
  "#172b28", "#d9e5e2", "#b9cbc7", "#102f28", "#55c59b", "#73d4ae",
  "#6fce82", "#8a4b00", "#9f1c12", "#cfe7d5", "#cdebd4", "#fff4d8",
  "#efcf8b", "#c79518", "#2563eb", "#f2f4f7"
]) {
  assert.doesNotMatch(scoped, new RegExp(legacy, "i"), `legacy color ${legacy} must not remain in scoped stylesheets`);
}

console.log("Scoped color tokens, semantic states, dark canvas, and sidebar palette validated.");
