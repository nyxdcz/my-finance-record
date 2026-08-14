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
assert.equal(version.cacheVersion, "finance-v15-20260815-liquid-glass-r1");

assert.match(index, /<title>My Finance Records · V15\.0\.0<\/title>/, "browser title must be V15.0.0 before boot");
assert.match(index, /id="buildBadge"[^>]*V15\.0\.0 · Liquid Glass Interface · August 15, 2026[^>]*>V15\.0\.0<\/small>/, "build badge must be V15.0.0");
assert.match(index, /const APP_VERSION = "15\.0\.0";/, "index APP_VERSION must be V15.0.0");
assert.match(index, /const APP_RELEASE_NAME = "Liquid Glass Interface";/);
assert.match(index, /const APP_RELEASE_DATE = "August 15, 2026";/);
assert.match(index, /"version":"V15\.0\.0","title":"Liquid Glass Interface"/, "Version History must begin with a V15 release entry");
assert.match(index, /id="settingsOverviewAppStatus">Version 15\.0\.0</, "Settings overview must identify V15");

assert.match(worker, /const APP_VERSION = "15\.0\.0";/, "service worker APP_VERSION must be V15");
assert.match(worker, /const CACHE_VERSION = "finance-v15-20260815-liquid-glass-r1";/, "service-worker cache must rotate to V15");
assert.match(worker, /asset\("\.\/liquid-glass-v15\.css\?v=15\.0\.0"\)/, "Liquid Glass CSS must be precached");
assert.match(worker, /expense-screenshot-parser\.js\?v=15\.0\.0/, "changed screenshot loader URLs must use V15 cache pins");
assert.match(worker, /\^finance-v\(\?:12\|13\|14\|15\)-/, "cache cleanup must include V15 generations");

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

assert.match(glass, /\.dashboard-week-marquee,[\s\S]*\.expense-screenshot-panel\s*\{[\s\S]*backdrop-filter:none;/, "finance/content surfaces must explicitly remain non-glass");
assert.match(glass, /\.dashboard-week-marquee,[\s\S]*\.work-week-marquee\s*\{\s*background:var\(--surface\)!important;/, "weekly marquee content must remain opaque");
assert.match(glass, /:focus-visible/, "glass controls must keep explicit keyboard focus visibility");

assert.match(workflow, /dashboard-interactions-core-v14-0-23\.css liquid-glass-v15\.css mobile-v14-0-23\.css/, "Pages bundle must include Liquid Glass CSS");
assert.match(workflow, /test -f _site\/liquid-glass-v15\.css/, "Pages preparation must verify the V15 stylesheet");
assert.ok(readme.startsWith("# My Finance Records · V15.0.0"));
assert.ok(changelog.startsWith("## 15.0.0 · 2026-08-15"));
assert.match(installer, /My Finance Records · V15\.0\.0 macOS Installer & Inspector/);
assert.match(installer, /Executing full V15\.0\.0 quality validation/);

console.log("V15.0.0 validation passed: release metadata, Liquid Glass scope, fallbacks, PWA cache, Cloud Sync compatibility, opaque content surfaces, and deployment packaging are consistent.");
