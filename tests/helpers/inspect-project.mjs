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
const CURRENT_VERSION = "2.0.1";
const DISPLAY_VERSION = "V2.0.1";
const BRAND = "Talaan";
const PREVIOUS_BRAND = ["My", "Finance", "Records"].join(" ");

const runtimeCssFiles = [
  "account-ledger.css", "app.css", "shell-ui.css", "black-canvas.css", "budget-planning.css",
  "dashboard-interactions-core.css", "dashboard-interactions.css", "desktop-ui-phase1.css", "desktop-ux.css",
  "liquid-glass.css", "mobile.css", "productivity-tools.css", "production-ui-audit.css", "projects-calendar.css",
  "reminders-alerts.css", "reports-insights.css", "security-profiles.css", "summary-mascots.css", "ui-icon-alignment.css"
];
const runtimeJsFiles = [
  "account-ledger.js", "brand-icons.js", "budget-planning.js", "cloud-conflict-resolution.js", "cloud-conflict-review.js",
  "cloud-sync-lifecycle.js", "cloud-sync.js", "expense-screenshot-ai.js", "expense-screenshot-detect.js",
  "expense-screenshot-parser.js", "form-inputs.js", "cash-flow-summary.js", "application-help.js", "header-tools-compat.js",
  "phone-finance-compat.js", "summary-mascots.js", "sync-runtime-compat.js", "interaction-patterns.js", "privacy-lock.js",
  "productivity-tools.js", "projects-calendar.js", "pwa-update.js", "reminders-alerts.js", "reports-insights.js", "security-profiles.js"
];
const runtimeCssSet = new Set(runtimeCssFiles);
const runtimeJsSet = new Set(runtimeJsFiles);
const uiModules = new Set(["application-help.js", "header-tools-compat.js", "phone-finance-compat.js", "summary-mascots.js", "sync-runtime-compat.js"]);
const sourcePathForRuntime = value => {
  const normalized = String(value || "").replace(/^\.\//, "");
  if (runtimeCssSet.has(normalized)) return `assets/css/${normalized}`;
  if (normalized === "cash-flow-summary.js") return `assets/js/features/${normalized}`;
  if (uiModules.has(normalized)) return `assets/js/ui/${normalized}`;
  if (runtimeJsSet.has(normalized)) return `assets/js/${normalized}`;
  return normalized;
};

const requiredFiles = [
  "index.html", "offline.html", "manifest.webmanifest", "version.json", "version.md", "sw.js",
  ...runtimeCssFiles.map(file => `assets/css/${file}`),
  ...runtimeJsFiles.map(sourcePathForRuntime),
  "assets/css/expense-compact.css", "assets/js/ui/expense-compact.js",
  "package.json", "package-lock.json", "README.md", "CHANGELOG.md", "PRIVACY.md", "SECURITY.md", ".gitignore",
  ".github/workflows/quality-pages.yml", "vendor/supabase.min.js", "sync-config.js", "sync-config.example.js",
  "supabase/functions/detect-payment/index.ts", "docs/setup/AI_SCREENSHOT_DETECTOR_SETUP.md",
  "docs/setup/CLOUD_SYNC_SETUP.md", "docs/setup/GITHUB_SECURITY_SETUP.md", "docs/setup/MACBOOK_IPHONE_INSTALLATION.md",
  "docs/migration/CLOUD_SYNC_V2_MIGRATION.md", "docs/release/RELEASE_CHECKLIST.md",
  "scripts/run_audit.sh", "scripts/prepare-runtime.mjs", "eslint.config.js", "playwright.config.mjs",
  "tests/run.mjs", "tests/security/privacy-and-inputs.spec.mjs", "tests/helpers/check-maintainability.mjs"
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

let manifest = {};
try { manifest = JSON.parse(read("manifest.webmanifest")); }
catch (error) { fail(`manifest.webmanifest is invalid JSON: ${error.message}`); }
for (const icon of manifest.icons || []) if (!exists(icon.src || "")) fail(`Missing manifest icon: ${icon.src || "(empty)"}`);
for (const shortcut of manifest.shortcuts || []) for (const icon of shortcut.icons || []) if (!exists(icon.src || "")) fail(`Missing shortcut icon: ${icon.src || "(empty)"}`);
if (manifest.name !== BRAND || manifest.short_name !== BRAND) fail(`PWA manifest brand must be ${BRAND}`);

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
  for (const source of sources) if (!source.includes("*") && !exists(source)) fail(`GitHub Pages deploy source is missing: ${source}`);
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
    else if (normalized === "assets/js/*.js") runtimeJsFiles.filter(file => !uiModules.has(file) && file !== "cash-flow-summary.js").forEach(file => deploySources.add(file));
    else if (normalized === "assets/js/ui/*.js") uiModules.forEach(file => deploySources.add(file));
    else if (normalized === "assets/js/features/*.js") deploySources.add("cash-flow-summary.js");
    else if (normalized.includes("*")) deployPrefixes.push(normalized.slice(0, normalized.indexOf("*")));
    else deploySources.add(normalized);
  }
}
const deployedByPages = assetPath => deploySources.has(assetPath) || deployPrefixes.some(prefix => assetPath.startsWith(prefix));
const productionAssets = new Set();
for (const source of [html, worker]) {
  for (const match of source.matchAll(/(?:src|href|asset\()=?\"([^\"]+)\"/g)) {
    const value = match[1];
    if (/^(?:https?:|data:|#|javascript:|\$\{)/.test(value)) continue;
    const local = value.split(/[?#]/, 1)[0].replace(/^\.\//, "");
    if (local) productionAssets.add(local);
  }
}
for (const assetPath of productionAssets) if (!deployedByPages(assetPath)) fail(`GitHub Pages deploy omits production asset: ${assetPath}`);
for (const file of ["ui-icon-alignment.css", "black-canvas.css", "desktop-ui-phase1.css", "desktop-ux.css", "shell-ui.css", "production-ui-audit.css", "summary-mascots.css", "pwa-update.js"]) {
  if (!deploySources.has(file)) fail(`GitHub Pages must package ${file}`);
}

let pkg = {}, lock = {}, version = {};
try { pkg = JSON.parse(read("package.json")); } catch (error) { fail(`package.json is invalid JSON: ${error.message}`); }
try { lock = JSON.parse(read("package-lock.json")); } catch (error) { fail(`package-lock.json is invalid JSON: ${error.message}`); }
try { version = JSON.parse(read("version.json")); } catch (error) { fail(`version.json is invalid JSON: ${error.message}`); }
if (pkg.version !== lock.version) fail(`package.json (${pkg.version}) and package-lock.json (${lock.version}) versions differ`);
if (pkg.version !== lock.packages?.[""]?.version) fail(`package-lock root package version differs from package.json (${pkg.version})`);
if (pkg.version !== version.version) fail(`package.json (${pkg.version}) and version.json (${version.version}) versions differ`);
if (pkg.version !== CURRENT_VERSION) fail(`Expected current package version ${CURRENT_VERSION}, found ${pkg.version || "(missing)"}`);
for (const script of ["prepare:runtime", "inspect", "lint", "maintainability", "test", "test:browser", "quality", "quality:ci"]) if (!pkg.scripts?.[script]) fail(`Required package script is missing: ${script}`);
if (pkg.scripts?.["prepare:runtime"] !== "node scripts/prepare-runtime.mjs") fail("prepare:runtime must use the neutral Talaan runtime preparer only");

if (!read("README.md").startsWith(`# ${BRAND} · ${DISPLAY_VERSION}`)) fail(`README release heading is not ${BRAND} ${DISPLAY_VERSION}`);
if (!read("CHANGELOG.md").startsWith(`# Changelog\n\n## ${DISPLAY_VERSION} · ${BRAND}`)) fail(`CHANGELOG current release heading is not ${DISPLAY_VERSION}`);
if (!read("version.md").startsWith(`# ${BRAND} ${DISPLAY_VERSION}`)) fail(`version.md current release heading is not ${BRAND} ${DISPLAY_VERSION}`);
for (const file of ["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "PRIVACY.md", "version.md"]) {
  const text = read(file);
  if (text.includes("V1.") || text.includes("V2.0.0")) fail(`${file} contains a previous product version reference`);
  if (text.includes(PREVIOUS_BRAND)) fail(`${file} contains the superseded display brand`);
}
if (!html.includes(`const APP_VERSION = "${CURRENT_VERSION}";`)) fail(`Prepared index runtime is not ${DISPLAY_VERSION}`);
if (!html.includes(`<title>${BRAND} · ${DISPLAY_VERSION}</title>`)) fail(`Prepared page title is not ${BRAND} ${DISPLAY_VERSION}`);
if (!html.includes(`content="${BRAND}"`) || html.includes(PREVIOUS_BRAND)) fail(`Prepared website brand is not ${BRAND}`);
if (!read("offline.html").includes(`<title>${BRAND} · Offline</title>`)) fail(`Offline page brand is not ${BRAND}`);
if (!worker.includes(`const APP_VERSION = "${CURRENT_VERSION}"`)) fail(`Prepared service worker is not ${DISPLAY_VERSION}`);
if (!worker.includes(`const CACHE_VERSION = "${version.cacheVersion}"`)) fail("Prepared service worker cache does not match version.json");

const activeLegacyRuntimePattern = /(?:shell-ui-v15|black-canvas-v15|dashboard-interactions-core-v14|desktop-ui-phase1-v15|desktop-ux-v15|liquid-glass-v15|mobile-v14|production-ui-audit-v15|projects-calendar-v13|ui-icon-alignment-v15|brand-icons-v15|pwa-update-v15|summary-mascots-v15|expense-compact-v15)/i;
for (const [file, text] of [["index.html", html], ["sw.js", worker], ["scripts/prepare-runtime.mjs", read("scripts/prepare-runtime.mjs")]]) {
  if (activeLegacyRuntimePattern.test(text)) fail(`${file} still contains an active V13-V15 runtime filename`);
}

const syncConfig = read("sync-config.js");
const syncConfigCode = syncConfig.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
if (/sb_secret_/i.test(syncConfigCode) || /service_role/i.test(syncConfigCode)) fail("sync-config.js contains a secret/service-role key pattern");
if (!/sb_publishable_|anon/i.test(syncConfigCode)) warn("sync-config.js does not appear to contain a publishable/anon key; cloud sync may require device setup");
if (/OPENAI_API_KEY\s*[:=]\s*["'][^"']+/i.test(syncConfigCode)) fail("sync-config.js must never contain an OpenAI API key");

if (process.platform !== "win32") {
  for (const file of ["scripts/run_audit.sh"]) if ((fs.statSync(path.join(root, file)).mode & 0o100) === 0) fail(`Executable entry point lost its user-executable bit: ${file}`);
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
console.log(`Repository inspection passed: ${BRAND} ${DISPLAY_VERSION} uses neutral active runtime filenames while preserving explicit data/cache compatibility identifiers.`);
