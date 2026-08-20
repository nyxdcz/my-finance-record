#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const errors = [];
const warnings = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const rel = file => path.relative(root, file).replaceAll(path.sep, "/");
const fail = message => errors.push(message);
const warn = message => warnings.push(message);

const runtimeCssFiles = [
  "account-ledger.css", "app.css", "black-canvas-v15-1-0.css", "budget-planning.css", "dashboard-interactions-core-v14-0-23.css", "dashboard-interactions.css", "desktop-ui-phase1-v15-1-0.css", "desktop-ux-v15-2-0.css", "liquid-glass-v15.css", "mobile-v14-0-23.css", "productivity-tools.css", "projects-calendar-v13.0.20.css", "reminders-alerts.css", "reports-insights.css", "security-profiles.css", "ui-icon-alignment-v15-0-5.css"
];
const runtimeJsFiles = [
  "account-ledger.js", "budget-planning.js", "cloud-conflict-resolution.js", "cloud-conflict-review.js", "cloud-sync-lifecycle.js", "cloud-sync.js", "expense-screenshot-ai.js", "expense-screenshot-detect.js", "expense-screenshot-parser.js", "form-inputs.js", "cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js", "interaction-patterns.js", "privacy-lock.js", "productivity-tools.js", "projects-calendar-v13.0.20.js", "pwa-update-v15-0-5.js", "reminders-alerts.js", "reports-insights.js", "security-profiles.js"
];
const runtimeCssSet = new Set(runtimeCssFiles);
const runtimeJsSet = new Set(runtimeJsFiles);
const sourcePathForRuntime = value => {
  const normalized = String(value || "").replace(/^\.\//, "");
  if (runtimeCssSet.has(normalized)) return `assets/css/${normalized}`;
  if (normalized === "cash-flow-summary.js") return `assets/js/features/${normalized}`;
  if (["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(normalized)) return `assets/js/ui/${normalized}`;
  if (runtimeJsSet.has(normalized)) return `assets/js/${normalized}`;
  return normalized;
};

const requiredFiles = [
  "index.html", "offline.html", "manifest.webmanifest", "version.json", "sw.js",
  ...runtimeCssFiles.map(file => `assets/css/${file}`),
  ...runtimeJsFiles.map(sourcePathForRuntime),
  "package.json", "package-lock.json", "README.md", "CHANGELOG.md", ".gitignore",
  ".github/workflows/quality-pages.yml", "vendor/supabase.min.js",
  "sync-config.js", "sync-config.example.js",
  "supabase/functions/detect-payment/index.ts", "docs/setup/AI_SCREENSHOT_DETECTOR_SETUP.md",
  "docs/setup/CLOUD_SYNC_SETUP.md", "docs/setup/GITHUB_SECURITY_SETUP.md", "docs/setup/MACBOOK_IPHONE_INSTALLATION.md",
  "docs/migration/CLOUD_SYNC_V2_MIGRATION.md", "docs/migration/V13_MIGRATION_GUIDE.md", "docs/release/RELEASE_CHECKLIST.md",
  "scripts/Install_V15_2_0.command", "scripts/run_audit.sh", "scripts/prepare-runtime.mjs", "eslint.config.js", "playwright.config.mjs",
  "tests/regression/validate-v15-2-0-desktop-ux.mjs", "tests/regression/validate-pwa-updater-v15-0-5.mjs", "tests/finance/validate-record-spending-v15-0-4.mjs", "tests/sync/validate-safe-multidevice-sync.mjs", "tests/finance/validate-expense-screenshot.mjs", "tests/finance/expense-screenshot.spec.mjs", "tests/security/privacy-and-inputs.spec.mjs", "tests/browser/application-help.spec.mjs", "tests/regression/validate-application-help-v15-2-7.mjs", "tests/helpers/check-maintainability.mjs"
];
for (const file of requiredFiles) if (!exists(file)) fail(`Missing required file: ${file}`);

const html = read("index.html");
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:https?:|data:|#|javascript:|\$\{)/.test(value)) continue;
  const local = value.split(/[?#]/, 1)[0];
  if (!local) continue;
  const sourceLocal = sourcePathForRuntime(local);
  const target = path.resolve(root, sourceLocal);
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) fail(`HTML path escapes project: ${value}`);
  else if (!fs.existsSync(target)) fail(`Broken HTML local path: ${value} (source: ${sourceLocal})`);
}

let manifest;
try { manifest = JSON.parse(read("manifest.webmanifest")); }
catch (error) { fail(`manifest.webmanifest is invalid JSON: ${error.message}`); manifest = {}; }
for (const icon of manifest.icons || []) if (!exists(icon.src || "")) fail(`Missing manifest icon: ${icon.src || "(empty)"}`);
for (const shortcut of manifest.shortcuts || []) {
  for (const icon of shortcut.icons || []) if (!exists(icon.src || "")) fail(`Missing shortcut icon: ${icon.src || "(empty)"}`);
}

const worker = read("sw.js");
for (const match of worker.matchAll(/asset\("([^"]+)"\)/g)) {
  const value = match[1];
  if (/^https?:/.test(value)) continue;
  const local = value.split("?", 1)[0];
  const sourceLocal = sourcePathForRuntime(local);
  if (!exists(sourceLocal)) fail(`Missing service-worker asset: ${value} (source: ${sourceLocal})`);
}

const workflow = read(".github/workflows/quality-pages.yml");
for (const line of workflow.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("cp ") || !trimmed.includes(" _site")) continue;
  const sources = trimmed.slice(3).split(" _site", 1)[0].trim().split(/\s+/);
  for (const source of sources) {
    if (source.includes("*")) continue;
    if (!exists(source)) fail(`GitHub Pages deploy source is missing: ${source}`);
  }
}

const deploySources = new Set();
const deployPrefixes = [];
for (const line of workflow.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("cp ") || !trimmed.includes(" _site")) continue;
  const sources = trimmed.slice(3).split(" _site", 1)[0].trim().split(/\s+/);
  for (const source of sources) {
    const normalized = source.replace(/^\.\//, "");
    if (normalized === "assets/css/*.css") runtimeCssFiles.forEach(file => deploySources.add(file));
    else if (normalized === "assets/js/*.js") runtimeJsFiles.filter(file => !["cash-flow-summary.js", "application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].includes(file)).forEach(file => deploySources.add(file));
    else if (normalized === "assets/js/ui/*.js") ["application-help.js", "header-tools-compat.js", "sync-runtime-compat.js"].forEach(file => deploySources.add(file));
    else if (normalized === "assets/js/features/*.js") ["cash-flow-summary.js"].forEach(file => deploySources.add(file));
    else if (normalized.includes("*")) deployPrefixes.push(normalized.slice(0, normalized.indexOf("*")));
    else deploySources.add(normalized);
  }
}
const deployedByPages = assetPath => deploySources.has(assetPath) || deployPrefixes.some(prefix => assetPath.startsWith(prefix));
const productionAssets = new Set();
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:https?:|data:|#|javascript:|\$\{)/.test(value)) continue;
  const local = value.split(/[?#]/, 1)[0].replace(/^\.\//, "");
  if (local) productionAssets.add(local);
}
for (const match of worker.matchAll(/asset\("([^"]+)"\)/g)) {
  const local = match[1].split(/[?#]/, 1)[0].replace(/^\.\//, "");
  if (local) productionAssets.add(local);
}
for (const assetPath of productionAssets) {
  if (!deployedByPages(assetPath)) fail(`GitHub Pages deploy omits production asset: ${assetPath}`);
}
if (!deploySources.has("ui-icon-alignment-v15-0-5.css")) fail("GitHub Pages must package ui-icon-alignment-v15-0-5.css");
if (!deploySources.has("black-canvas-v15-1-0.css")) fail("GitHub Pages must package black-canvas-v15-1-0.css");
if (!deploySources.has("desktop-ui-phase1-v15-1-0.css")) fail("GitHub Pages must package desktop-ui-phase1-v15-1-0.css");
if (!deploySources.has("desktop-ux-v15-2-0.css")) fail("GitHub Pages must package desktop-ux-v15-2-0.css");

let pkg = {}, lock = {}, version = {};
try { pkg = JSON.parse(read("package.json")); } catch (error) { fail(`package.json is invalid JSON: ${error.message}`); }
try { lock = JSON.parse(read("package-lock.json")); } catch (error) { fail(`package-lock.json is invalid JSON: ${error.message}`); }
try { version = JSON.parse(read("version.json")); } catch (error) { fail(`version.json is invalid JSON: ${error.message}`); }
if (pkg.version !== lock.version) fail(`package.json (${pkg.version}) and package-lock.json (${lock.version}) versions differ`);
if (pkg.version !== lock.packages?.[""]?.version) fail(`package-lock root package version (${lock.packages?.[""]?.version}) differs from package.json (${pkg.version})`);
if (pkg.version !== version.version) fail(`package.json (${pkg.version}) and version.json (${version.version}) versions differ`);
for (const script of ["prepare:runtime", "inspect", "lint", "maintainability", "test", "test:browser", "quality", "quality:ci"]) {
  if (!pkg.scripts?.[script]) fail(`Required package script is missing: ${script}`);
}
const testTargets = [...String(pkg.scripts?.test || "").matchAll(/\bnode\s+(\S+)/g)].map(match => match[1]);
if (!testTargets.length) fail(`Test script target is missing: ${pkg.scripts?.test || "(not configured)"}`);
for (const target of testTargets) if (!exists(target)) fail(`Test script target is missing: ${target}`);
if (!String(pkg.engines?.node || "").includes("22")) warn(`Node engine is ${pkg.engines?.node || "not set"}; project validation expects Node 22+`);
if (pkg.version !== "15.2.10") fail(`Expected current package version 15.2.9, found ${pkg.version || "(missing)"}`);
if (!read("README.md").startsWith("# My Finance Records · V15.2.10")) fail("README release heading is not V15.2.10");
if (!read("CHANGELOG.md").startsWith("## 15.2.10 · 2026-08-20")) fail("CHANGELOG latest entry is not V15.2.10");

const syncConfig = read("sync-config.js");
const syncConfigCode = syncConfig.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
if (/sb_secret_/i.test(syncConfigCode) || /service_role/i.test(syncConfigCode)) fail("sync-config.js contains a secret/service-role key pattern");
if (!/sb_publishable_|anon/i.test(syncConfigCode)) warn("sync-config.js does not appear to contain a publishable/anon key; cloud sync may require device setup");
if (/OPENAI_API_KEY\s*[:=]\s*["'][^"']+/i.test(syncConfigCode)) fail("sync-config.js must never contain an OpenAI API key");

if (process.platform !== "win32") {
  for (const file of ["scripts/Install_V15_2_0.command", "scripts/run_audit.sh"]) {
    if ((fs.statSync(path.join(root, file)).mode & 0o100) === 0) fail(`Executable entry point lost its user-executable bit: ${file}`);
  }
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".git", "node_modules", "_site"].includes(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        const mode = fs.statSync(full).mode;
        if ((mode & 0o004) === 0) fail(`File is not world-readable: ${rel(full)}`);
        if (mode & 0o002) warn(`World-writable file: ${rel(full)}`);
        if (mode & 0o6000) warn(`Unexpected special permission bits: ${rel(full)}`);
      }
    }
  };
  visit(root);
}

console.log(`Repository inspection: ${errors.length} error(s), ${warnings.length} warning(s)`);
for (const message of errors) console.error(`ERROR: ${message}`);
for (const message of warnings) console.warn(`WARN: ${message}`);
if (errors.length) process.exit(1);
console.log("Repository inspection passed: V15.2.10 release sources, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");
