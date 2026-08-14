#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const version = JSON.parse(read("version.json"));
const index = read("index.html");
const worker = read("sw.js");
const cloud = read("cloud-sync.js");
const syncConfig = read("sync-config.js");
const glass = read("liquid-glass-v15.css");
const appCss = read("app.css");
const dashboardInteractions = read("dashboard-interactions.css");
const workflow = read(".github/workflows/quality-pages.yml");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const installer = read("Install_V15_0_0.command");

assert.equal(version.version, "15.0.0", "version.json must identify V15.0.0");
assert.equal(pkg.version, "15.0.0", "package.json must identify V15.0.0");
assert.equal(lock.version, "15.0.0", "package-lock.json must identify V15.0.0");
assert.equal(lock.packages?.[""]?.version, "15.0.0", "package-lock root package must identify V15.0.0");
assert.equal(version.schemaVersion, 12, "V15 must preserve Finance Schema 12");
assert.equal(version.cloudSchemaVersion, 3, "V15 must preserve Cloud Schema V3");
assert.equal(version.name, "Liquid Glass Interface");
assert.equal(version.released, "2026-08-15");
assert.equal(version.cacheVersion, "finance-v15-20260815-liquid-glass-r4");

assert.match(index, /<title>My Finance Records · V15\.0\.0<\/title>/, "browser title must be V15.0.0 before boot");
assert.match(index, /id="buildBadge"[^>]*V15\.0\.0 · Liquid Glass Interface · August 15, 2026[^>]*>V15\.0\.0<\/small>/, "build badge must be V15.0.0");
assert.match(index, /const APP_VERSION = "15\.0\.0";/, "index APP_VERSION must be V15.0.0");
assert.match(index, /const APP_RELEASE_NAME = "Liquid Glass Interface";/);
assert.match(index, /const APP_RELEASE_DATE = "August 15, 2026";/);
assert.match(index, /"version":"V15\.0\.0","title":"Liquid Glass Interface"/, "Version History must begin with a V15 release entry");
assert.match(index, /id="settingsOverviewAppStatus">Version 15\.0\.0</, "Settings overview must identify V15");

assert.match(worker, /const APP_VERSION = "15\.0\.0";/, "service worker APP_VERSION must be V15");
assert.match(worker, /const CACHE_VERSION = "finance-v15-20260815-liquid-glass-r4";/, "service-worker cache must rotate to current V15 generation");
assert.match(worker, /new Request\(url, \{ cache:"reload" \}\)/, "V15 shell refresh must bypass stale browser HTTP cache");
assert.match(worker, /asset\("\.\/liquid-glass-v15\.css\?v=15\.0\.0"\)/, "Liquid Glass CSS must be precached");
assert.match(worker, /expense-screenshot-parser\.js\?v=15\.0\.0/, "changed screenshot loader URLs must use V15 cache pins");
assert.match(worker, /\^finance-v\(\?:12\|13\|14\|15\)-/, "cache cleanup must include V15 generations");
assert.match(worker, /dashboard\/chrome cleanup refresh/, "service worker must refresh installed PWAs for the dashboard cleanup");
assert.match(worker, /customize-dashboard-v15\.png/, "service worker must precache the supplied Customize Dashboard icon");
assert.match(worker, /collapsed sidebar Insights\/Pin state refresh/, "service worker must refresh installed PWAs for the sidebar state change");
assert.match(worker, /forced shell refresh/, "service worker must document the stale-shell refresh pass");

assert.match(cloud, /const APP_VERSION_FALLBACK = "15\.0\.0";/, "Cloud Sync fallback must be V15");
assert.match(cloud, /const APP_VERSION_CODE = 130000;/, "visual V15 release must not change the Cloud Schema writer code");
assert.match(cloud, /const CLOUD_SCHEMA_VERSION = 3;/);
assert.match(cloud, /const CORE_SCHEMA_VERSION = 12;/);
assert.match(cloud, /window\.FINANCE_APP_VERSION_OVERRIDE \|\| \(typeof APP_VERSION !== "undefined" \? APP_VERSION : APP_VERSION_FALLBACK\)/, "Cloud Sync must prefer the V15 runtime release override");

assert.match(syncConfig, /const VERSION = "15\.0\.0";/, "runtime release layer must identify V15");
assert.match(syncConfig, /Liquid Glass Interface/);
assert.match(syncConfig, /\.\/liquid-glass-v15\.css\?v=\$\{VERSION\}/, "runtime must load the Liquid Glass CSS after legacy styles");
assert.match(syncConfig, /expense-screenshot-parser\.js\?v=15\.0\.0/);
assert.match(syncConfig, /expense-screenshot-detect\.js\?v=15\.0\.0/);
assert.match(syncConfig, /expense-screenshot-ai\.js\?v=15\.0\.0/);

for (const token of [
  "backdrop-filter",
  "-webkit-backdrop-filter",
  ".topbar",
  ".sidebar",
  ".workspace-switcher",
  ".cloud-sync-toolbar-popover",
  ".month-picker-popover",
  ".topbar-tools-panel",
  ".expense-screenshot-action-menu",
  ".modal-header",
  ".modal-footer",
  ".toast",
  ".dashboard-week-marquee",
  "prefers-reduced-transparency",
  "prefers-reduced-motion",
  "forced-colors",
  "@supports not"
]) assert.ok(glass.includes(token), `Liquid Glass stylesheet is missing ${token}`);

assert.match(glass, /--liquid-glass-radius:7px;/, "rectangular Liquid Glass surfaces must use the shared 7px radius");
assert.match(glass, /\.card,[\s\S]*\.expense-screenshot-panel\s*\{[\s\S]*backdrop-filter:none;/, "finance/content surfaces must explicitly remain non-glass");
assert.match(glass, /\.dashboard-week-marquee,[\s\S]*\.work-week-marquee\s*\{[\s\S]*background:linear-gradient\(180deg,var\(--liquid-glass-surface-soft\),color-mix\(in srgb,var\(--liquid-glass-surface\) 84%,transparent\)\);[\s\S]*backdrop-filter:blur\(16px\) saturate\(135%\);/, "weekly marquees must use the shared V15 glass material");
assert.match(glass, /\.dashboard-week-marquee,[\s\S]*\.work-week-marquee\s*\{[\s\S]*min-height:43px;[\s\S]*height:43px;/, "weekly marquees must remain 43px high");
assert.match(glass, /:focus-visible/, "glass controls must keep explicit keyboard focus visibility");

assert.match(glass, /\/\* V15\.0\.0 · compact dashboard and chrome cleanup\. \*\/[\s\S]*\.topbar\s*\{[\s\S]*background:var\(--surface\)!important;[\s\S]*box-shadow:none!important;[\s\S]*backdrop-filter:none!important;/, "topbar shell must be flat while individual controls retain glass");
assert.match(glass, /#dashboard > \.grid\.kpi-grid,[\s\S]*#dashboard > \.month-insights-card\.month-comparison-only\s*\{[\s\S]*display:none!important;/, "redundant Dashboard KPI and monthly-comparison blocks must be hidden without deleting calculation nodes");
assert.match(glass, /#dashboard \.chart-data-details\s*\{[\s\S]*border-top:0!important;[\s\S]*padding-top:0!important;/, "exact cash-flow disclosure must not have the old divider");
assert.match(glass, /#dashboard #addSavingsGoalButton\s*\{[\s\S]*max-width:max-content!important;[\s\S]*white-space:nowrap!important;/, "Add goal must remain compact and contained");
assert.match(glass, /#expenseDialog #expenseFormModeNote\s*\{\s*display:none!important;\s*\}/, "expense mode explanation must be removed from the visible form without breaking type switching");
assert.match(glass, /\.toast\s*\{[\s\S]*width:max-content!important;[\s\S]*min-width:0!important;[\s\S]*padding:7px 9px!important;/, "status toast must use compact content-sized geometry");
assert.match(glass, /\.toast \.toast-message\s*\{[\s\S]*background:transparent!important;[\s\S]*box-shadow:none!important;/, "toast message text must not render a nested glass panel");
assert.match(glass, /customize-dashboard-v15\.png/, "Customize Dashboard must use the supplied icon asset");
assert.match(glass, /chart-data-table-wrap[\s\S]*max-height:68px!important;/, "expanded exact cash-flow values must stay contained inside the existing bento height");
assert.match(glass, /cash-flow-chart-panel \.chart-svg[\s\S]*height:104px!important;/, "wide cash-flow charts must compact vertically without changing the bento height");

assert.match(appCss, /\.nav-icon \{ flex:0 0 28px; width:28px; height:28px; \}/, "all sidebar navigation icons must share the same 28px alignment slot");
assert.ok(dashboardInteractions.includes(".sidebar:not(.desktop-open):not(.sidebar-pinned) .sidebar-close-button{\n    display:none!important;"), "collapsed desktop sidebar must hide the Pin control");
assert.ok(dashboardInteractions.includes(".sidebar:not(.desktop-open):not(.sidebar-pinned) .insights-nav-button{\n    display:flex!important;"), "collapsed desktop sidebar must keep the Insights icon visible");
assert.ok(dashboardInteractions.includes("width:48px!important;\n    min-width:48px!important;\n    max-width:48px!important;"), "collapsed Insights must use the same 48px rail button width as the other navigation items");
assert.ok(dashboardInteractions.includes("width:28px!important;\n    height:28px!important;\n    flex:0 0 28px!important;"), "Insights must use the same 28px icon slot as Overview, Finance, Work, and Settings");
assert.ok(dashboardInteractions.includes(".sidebar.desktop-open .sidebar-close-button,\n  .sidebar.sidebar-pinned .sidebar-close-button{\n    display:grid!important;"), "expanded desktop sidebar must restore the Pin/Unpin control");
assert.match(dashboardInteractions, /sidebar-insights-v14-0-24\.png/, "Insights must continue using the supplied sidebar icon asset");

assert.match(workflow, /dashboard-interactions-core-v14-0-23\.css liquid-glass-v15\.css mobile-v14-0-23\.css/, "Pages bundle must include Liquid Glass CSS");
assert.match(workflow, /test -f _site\/liquid-glass-v15\.css/, "Pages preparation must verify the V15 stylesheet");
assert.ok(readme.startsWith("# My Finance Records · V15.0.0"));
assert.ok(changelog.startsWith("## 15.0.0 · 2026-08-15"));
assert.match(installer, /My Finance Records · V15\.0\.0 macOS Installer & Inspector/);
assert.match(installer, /Executing full V15\.0\.0 quality validation/);

console.log("V15.0.0 validation passed: release metadata, 7px Liquid Glass controls, glass marquees, compact Dashboard chrome, supplied Customize icon, cash-flow bento fitting, aligned collapsed Insights rail, expanded-only Pin control, forced fresh PWA shell delivery, accessible compact toasts, Cloud Sync compatibility, opaque finance content, and deployment packaging are consistent.");