import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const app = read("app.css");
const reports = read("reports-insights.css");
const budget = read("budget-planning.css");
const calendar = read("projects-calendar-v13.0.20.css");
const security = read("security-profiles.css");
const liquid = read("liquid-glass-v15.css");
const dashboard = read("dashboard-interactions.css");
const sync = read("sync-config.js");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));

assert.equal(version.version, "15.1.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260815-desktop-ui-r25");
assert.match(app, /--workspace-card-radius:\s*9px/);
assert.match(app, /--workspace-control-height:\s*38px/);
assert.match(app, /--workspace-compact-control-height:\s*35px/);
assert.match(app, /\.dashboard-view \.topbar \{ min-height: 72px;/);
assert.match(app, /\.dashboard-view \.content \{ padding: 18px 22px 34px; \}/);
assert.doesNotMatch(app, /\.dashboard-view \.topbar \{ min-height: 64px/);
assert.match(app, /#projects \.project-summary-strip > \* \{ min-height:70px/);
assert.match(app, /#payments \.kpi-card \{ min-height:70px/);
assert.match(app, /#reports \.report-section-nav button \{ min-height:35px/);
assert.match(app, /\.sidebar-close-button \{[^}]*width:44px; height:44px;/s);
assert.match(app, /\.record-header \{[^}]*background: var\(--surface-soft\)/s);
assert.match(app, /\.input, \.select, \.textarea \{[^}]*background: var\(--surface\)/s);
assert.match(reports, /report-insights-filters \.input,.report-insights-filters \.select \{ min-height:35px; height:35px/);
assert.match(budget, /\.budget-plan-kpi \{ padding:8px 9px; border-radius:8px; min-height:70px; \}/);
assert.match(calendar, /\.pc-event-card \{[^}]*border-radius:8px/s);
assert.match(calendar, /\.pc-event-actions \.button \{ min-height:32px;/);
assert.match(security, /\.v13-chip\{[^}]*min-height:23px/);
assert.match(security, /profile-status-grid>div\{[^}]*border-radius:8px/);
assert.doesNotMatch(liquid, /\.workspace-switcher,\n\.workspace-switcher button,/);
assert.match(liquid, /prefers-reduced-transparency:reduce[\s\S]*html\[data-theme="light"\][\s\S]*rgba\(4,8,14,.97\)/);
assert.match(dashboard, /V15\.1\.0 · desktop Dashboard\/workspace geometry owned by static CSS/);
assert.doesNotMatch(sync, /@media\(min-width:701px\)\{#dashboard\.page\.active/);
for (const pin of [
  "app.css?v=15.1.0-desktop2",
  "dashboard-interactions.css?v=15.1.0-desktop2",
  "security-profiles.css?v=15.1.0-desktop2",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop2",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop2",
  "sync-config.js?v=15.1.0-desktop1"
]) assert.ok(index.includes(pin), `index missing ${pin}`);
assert.ok(sw.includes("finance-v15-20260815-desktop-ui-r25"));
for (const pin of [
  "app.css?v=15.1.0-desktop2",
  "dashboard-interactions.css?v=15.1.0-desktop2",
  "security-profiles.css?v=15.1.0-desktop2",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop2",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop2",
  "sync-config.js?v=15.1.0-desktop1",
  "liquid-glass-v15.css?v=15.1.0-monthnav1"
]) assert.ok(sw.includes(pin), `service worker missing ${pin}`);
console.log("V15.1.0 desktop UI consistency validation passed.");
