import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const production = fs.readFileSync("assets/css/production-ui-audit.css", "utf8");
const version = JSON.parse(fs.readFileSync("version.json", "utf8"));

assert.match(index, /data-dashboard-view-tab="calendar">Calendar<\/button>[\s\S]*data-dashboard-view-tab="cash-flow">Cash Flow<\/button>[\s\S]*data-dashboard-view-tab="overview">Overview<\/button>/);
assert.match(index, /let dashboardActiveView = "calendar";/);
assert.match(index, /const DASHBOARD_VIEWS = \["calendar", "cash-flow", "overview"\];/);
assert.match(index, /function setupDashboardViewTabs\(\)/);
assert.match(index, /section\.hidden = !customizing && section\.dataset\.dashboardView !== dashboardActiveView/);
assert.match(index, /data-dashboard-card="calendar" data-dashboard-view="calendar"/);
assert.match(index, /data-dashboard-card="cash-flow" data-dashboard-view="cash-flow"/);
assert.match(index, /data-dashboard-card="activity" data-dashboard-view="overview"/);
assert.match(production, /--dashboard-card-radius:\s*7px/);
assert.match(production, /--dashboard-card-gap:\s*12px/);
assert.match(production, /\.dashboard-view-tabs[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(production, /\.dashboard-view-tabs[\s\S]*width:\s*min\(100%, 480px\)[\s\S]*height:\s*52px[\s\S]*padding:\s*4px/);
assert.match(production, /\.dashboard-calendar-layout[\s\S]*grid-template-columns:\s*minmax\(0, 18fr\) minmax\(260px, 7fr\)/);
assert.match(production, /\.calendar-day[\s\S]*min-height:\s*clamp\(68px, 6vw, 88px\)/);
assert.match(production, /@media \(max-width: 700px\)[\s\S]*\.calendar-day[\s\S]*min-height:\s*56px/);
assert.match(production, /dashboard-default-layout \[data-dashboard-card="calendar"\][\s\S]*grid-column:\s*1 \/ -1/);
assert.equal(version.version, "2.5.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v2-20260828-household-splits-r15");

console.log("Dashboard Calendar, Cash Flow, and Overview view contracts validated.");
