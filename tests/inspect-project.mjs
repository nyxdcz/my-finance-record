#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const errors = [];
const warnings = [];
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const rel = file => path.relative(root, file).replaceAll(path.sep, "/");
const fail = message => errors.push(message);
const warn = message => warnings.push(message);

const requiredFiles = [
  "index.html", "app.css", "offline.html", "manifest.webmanifest", "version.json", "sw.js",
  "package.json", "package-lock.json", "README.md", ".gitignore",
  ".github/workflows/quality-pages.yml", "vendor/supabase.min.js",
  "sync-config.js", "sync-config.example.js", "privacy-lock.js", "cloud-conflict-review.js", "cloud-conflict-resolution.js", "projects-calendar-v13.0.20.js", "projects-calendar-v13.0.20.css",
  "Install_V14_0_13.command", "run_audit.sh", "eslint.config.js", "playwright.config.mjs",
  "tests/validate-v14-0-13.mjs", "tests/privacy-and-inputs.spec.mjs", "tests/check-maintainability.mjs"
];
for (const file of requiredFiles) if (!exists(file)) fail(`Missing required file: ${file}`);

const html = read("index.html");
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:https?:|data:|#|javascript:|\$\{)/.test(value)) continue;
  const local = value.split(/[?#]/, 1)[0];
  if (!local) continue;
  const target = path.resolve(root, local);
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) fail(`HTML path escapes project: ${value}`);
  else if (!fs.existsSync(target)) fail(`Broken HTML local path: ${value}`);
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
  if (!exists(value.split("?", 1)[0])) fail(`Missing service-worker asset: ${value}`);
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

let pkg = {}, lock = {}, version = {};
try { pkg = JSON.parse(read("package.json")); } catch (error) { fail(`package.json is invalid JSON: ${error.message}`); }
try { lock = JSON.parse(read("package-lock.json")); } catch (error) { fail(`package-lock.json is invalid JSON: ${error.message}`); }
try { version = JSON.parse(read("version.json")); } catch (error) { fail(`version.json is invalid JSON: ${error.message}`); }
if (pkg.version !== lock.version) fail(`package.json (${pkg.version}) and package-lock.json (${lock.version}) versions differ`);
if (pkg.version !== version.version) fail(`package.json (${pkg.version}) and version.json (${version.version}) versions differ`);
for (const script of ["inspect", "lint", "maintainability", "test", "test:browser", "quality", "quality:ci"]) {
  if (!pkg.scripts?.[script]) fail(`Required package script is missing: ${script}`);
}
const testTarget = String(pkg.scripts?.test || "").match(/^node\s+(\S+)/)?.[1];
if (!testTarget || !exists(testTarget)) fail(`Test script target is missing: ${pkg.scripts?.test || "(not configured)"}`);
if (!String(pkg.engines?.node || "").includes("22")) warn(`Node engine is ${pkg.engines?.node || "not set"}; project validation expects Node 22+`);
if (pkg.version !== "14.0.13") fail(`Expected current package version 14.0.13, found ${pkg.version || "(missing)"}`);
if (!read("README.md").startsWith("# My Finance Records · V14.0.13")) fail("README release heading is not V14.0.13");

const syncConfig = read("sync-config.js");
const syncConfigCode = syncConfig.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
if (/sb_secret_/i.test(syncConfigCode) || /service_role/i.test(syncConfigCode)) fail("sync-config.js contains a secret/service-role key pattern");
if (!/sb_publishable_|anon/i.test(syncConfigCode)) warn("sync-config.js does not appear to contain a publishable/anon key; cloud sync may require device setup");

if (process.platform !== "win32") {
  for (const file of ["Install_V14_0_13.command", "run_audit.sh"]) {
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
console.log("Repository inspection passed: required files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");
