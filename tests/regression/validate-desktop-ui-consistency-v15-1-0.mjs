import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const app = read("app.css");
const shell = read("assets/css/shell-ui-v15-2-11.css");
const reports = read("reports-insights.css");
const budget = read("budget-planning.css");
const calendar = read("projects-calendar-v13.0.20.css");
const security = read("security-profiles.css");
const liquid = read("liquid-glass-v15.css");
const dashboard = read("dashboard-interactions.css");
const blackCanvas = read("black-canvas-v15-1-0.css");
const sync = read("sync-config.js");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));

assert.equal(version.version, "15.2.23");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260821-monthly-repeat-icon-r59");
assert.match(app, /--desktop-header-height:\s*64px/);
assert.match(app, /--desktop-page-gutter:\s*24px/);
assert.match(app, /--workspace-card-radius:\s*9px/);
assert.match(app, /--workspace-card-padding:\s*13px/);
assert.match(app, /--workspace-control-height:\s*38px/);
assert.match(app, /--workspace-compact-control-height:\s*35px/);
assert.match(app, /\.dashboard-view \.topbar \{ min-height: var\(--desktop-header-height\);/);
assert.match(app, /\.dashboard-view \.content \{ padding: 18px var\(--desktop-page-gutter\) 34px; \}/);
assert.match(app, /\.content \{ padding:18px var\(--desktop-page-gutter\) 34px; \}/);
assert.doesNotMatch(app, /top:71px|top:74px/);
assert.match(app, /#projects \.project-summary-strip > \* \{ min-height:70px/);
assert.match(app, /#payments \.kpi-card \{ min-height:70px/);
assert.match(app, /#reports \.report-section-nav button \{ min-height:35px/);
assert.match(shell, /\.sidebar-close-button \{[^}]*width:44px; height:44px;/s);
assert.match(app, /\.record-header \{[^}]*background: var\(--surface-soft\)/s);
assert.match(app, /\.input, \.select, \.textarea \{[^}]*background: var\(--surface\)/s);
assert.match(reports, /report-insights-filters \.input,.report-insights-filters \.select \{ min-height:35px; height:35px/);
assert.match(budget, /\.budget-plan-kpi \{ padding:8px 9px; border-radius:8px; min-height:70px; \}/);
assert.match(calendar, /\.pc-event-card \{[^}]*border-radius:8px/s);
assert.match(calendar, /\.pc-event-actions \.button \{ min-height:32px;/);
assert.match(security, /\.v13-chip\{[^}]*min-height:23px/);
assert.match(security, /profile-status-grid>div\{[^}]*border-radius:8px/);
assert.match(blackCanvas,/html\[data-theme="light"\][\s\S]*--bg:#efefef/);
assert.match(blackCanvas,/html\[data-theme="dark"\][\s\S]*--bg:#000000/);
assert.doesNotMatch(liquid, /\.workspace-switcher,\n\.workspace-switcher button,/);
assert.match(liquid, /--liquid-glass-radius:7px/);
assert.match(dashboard, /\.finance-workspace-marquee-row\{[^}]*top:var\(--desktop-header-height,72px\)/);
assert.equal((index.match(/<img class="nav-icon-image" src="data:image\/png;base64,[^"]+" alt="">/g) || []).length, 5);
assert.doesNotMatch(dashboard, /nav-icon-image\{content:url/);
assert.doesNotMatch(dashboard, /insights-nav-button\{padding-inline-start:46px/);
assert.doesNotMatch(dashboard, /\.sidebar \.insights-nav-button::before\{/);
assert.match(dashboard, /#customizeDashboardButton\[data-dashboard-toolbar-action\]\{[\s\S]*width:38px!important;[\s\S]*height:38px!important;/);
assert.doesNotMatch(sync, /@media\(min-width:701px\)\{#dashboard\.page\.active/);
for (const pin of [
  "app.css?v=15.1.0-desktop3",
  "shell-ui-v15-2-11.css?v=15.2.11-shell1",
  "dashboard-interactions.css?v=15.2.10-icons1",
  "security-profiles.css?v=15.1.0-desktop2",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.2.9-ui1",
  "projects-calendar-v13.0.20.css?v=15.2.18-kanban1",
  "black-canvas-v15-1-0.css?v=15.1.0-light1",
  "sync-config.js?v=15.2.10-release1"
]) assert.ok(index.includes(pin), `index missing ${pin}`);
assert.ok(index.includes('const APP_CACHE_VERSION = "finance-v15-20260821-monthly-repeat-icon-r59";'));
assert.ok(sw.includes("finance-v15-20260821-monthly-repeat-icon-r59"));
for (const pin of [
  "app.css?v=15.1.0-desktop3",
  "shell-ui-v15-2-11.css?v=15.2.11-shell1",
  "dashboard-interactions.css?v=15.2.10-icons1",
  "security-profiles.css?v=15.1.0-desktop2",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.2.9-ui1",
  "projects-calendar-v13.0.20.css?v=15.2.18-kanban1",
  "black-canvas-v15-1-0.css?v=15.1.0-light1",
  "sync-config.js?v=15.2.10-release1",
  "liquid-glass-v15.css?v=15.2.2-light1"
]) assert.ok(sw.includes(pin), `service worker missing ${pin}`);
console.log("V15.2.23 desktop UI consistency validation passed.");
