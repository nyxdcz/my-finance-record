#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive:true });
  fs.writeFileSync(target, content);
};
const replaceRequired = (text, from, to, label = from) => {
  if (!text.includes(from)) throw new Error(`Phase 5B marker missing: ${label}`);
  return text.replace(from, to);
};

const OLD_VERSION = "15.2.6";
const NEW_VERSION = "15.2.7";
const OLD_CACHE = "finance-v15-20260819-form-inputs-r41";
const NEW_CACHE = "finance-v15-20260819-application-help-r42";
const RELEASE_NAME = "Application Help Module Extraction";
const RELEASE_DATE_TEXT = "August 19, 2026";
const RELEASE_DATE_ISO = "2026-08-19";
const MODULE_PATH = "assets/js/ui/application-help.js";
const RUNTIME_FILE = "application-help.js";

// 1) Extract only the cohesive Application Help UI subsystem. This block is
// intentionally bounded before account/expense logic so Finance behavior is untouched.
let html = read("index.html");
const startMarker = "    const HELP_CONTENT = ";
const endMarker = "    function clearAccountDropTargets() {";
const start = html.indexOf(startMarker);
const end = start >= 0 ? html.indexOf(endMarker, start) : -1;
if (start >= 0) {
  if (end < 0 || end <= start) throw new Error("Could not locate the Application Help subsystem end boundary in index.html");
  const extracted = html.slice(start, end).trimEnd();
  for (const marker of ["const HELP_CONTENT =", "function helpButtonFor", "function setupApplicationHelp", "function openContextHelp"]) {
    if (!extracted.includes(marker)) throw new Error(`Application Help extraction is incomplete: ${marker}`);
  }
  if (extracted.includes("function clearAccountDropTargets") || extracted.includes("function runV12Migration")) {
    throw new Error("Application Help extraction crossed an approved subsystem boundary");
  }
  const moduleBody = extracted.replace(/^    /gm, "");
  write(MODULE_PATH, `"use strict";\n/* V15.2.7 · Extracted Application Help UI subsystem. */\n${moduleBody}\n`);
  html = `${html.slice(0, start)}${html.slice(end)}`;
} else if (!fs.existsSync(path.join(root, MODULE_PATH))) {
  throw new Error("Application Help is neither inline nor already extracted");
}
if (html.includes("const HELP_CONTENT =") || html.includes("function setupApplicationHelp") || html.includes("function openContextHelp")) {
  throw new Error("Application Help implementation still remains inline after extraction");
}
if (!html.includes(endMarker)) throw new Error("Account/expense boundary function was altered during extraction");

const formInputsTag = '  <script src="./form-inputs.js?v=15.2.6-phase5a1"></script>';
const helpTag = '  <script src="./application-help.js?v=15.2.7-phase5b1"></script>';
if (!html.includes(helpTag)) html = replaceRequired(html, formInputsTag, `${formInputsTag}\n${helpTag}`, "form-input script tag");
html = replaceRequired(html, '<title>My Finance Records · V15.2.6</title>', '<title>My Finance Records · V15.2.7</title>', "document title");
html = replaceRequired(html, 'title="V15.2.6 · Form Input Module Extraction · August 19, 2026">V15.2.6</small>', 'title="V15.2.7 · Application Help Module Extraction · August 19, 2026">V15.2.7</small>', "build badge");
html = replaceRequired(html, 'const APP_VERSION = "15.2.6";', 'const APP_VERSION = "15.2.7";', "inline app version");
html = replaceRequired(html, 'const APP_RELEASE_NAME = "Finance Disclosure Alignment";', 'const APP_RELEASE_NAME = "Application Help Module Extraction";', "inline release name");
html = replaceRequired(html, 'const APP_RELEASE_DATE = "August 18, 2026";', 'const APP_RELEASE_DATE = "August 19, 2026";', "inline release date");
html = replaceRequired(html, `const APP_CACHE_VERSION = "${OLD_CACHE}";`, `const APP_CACHE_VERSION = "${NEW_CACHE}";`, "inline cache version");
html = html.replaceAll('pwa-update-v15-0-5.js?v=15.2.6-release1', 'pwa-update-v15-0-5.js?v=15.2.7-release1');
html = html.replaceAll('sync-config.js?v=15.2.6-release1', 'sync-config.js?v=15.2.7-release1');
write("index.html", html);

// 2) Teach the Phase 4 runtime compatibility layer one nested-source mapping.
let prepareRuntime = read("scripts/prepare-runtime.mjs");
if (!prepareRuntime.includes('"assets/js/ui"')) {
  prepareRuntime = replaceRequired(
    prepareRuntime,
    '    "security-profiles.js"\n  ]\n};',
    '    "security-profiles.js"\n  ],\n  "assets/js/ui": [\n    "application-help.js"\n  ]\n};',
    "prepare-runtime nested UI group"
  );
}
write("scripts/prepare-runtime.mjs", prepareRuntime);

let gitignore = read(".gitignore");
if (!gitignore.includes(`/${RUNTIME_FILE}\n`)) gitignore = replaceRequired(gitignore, "/form-inputs.js\n", `/form-inputs.js\n/${RUNTIME_FILE}\n`, "generated runtime ignore list");
write(".gitignore", gitignore);

// 3) Keep repository inspection and GitHub Pages aware of nested source -> flat runtime delivery.
let inspector = read("tests/inspect-project.mjs");
if (!inspector.includes('"application-help.js"')) {
  inspector = replaceRequired(inspector, '"expense-screenshot-parser.js", "form-inputs.js", "interaction-patterns.js"', '"expense-screenshot-parser.js", "form-inputs.js", "application-help.js", "interaction-patterns.js"', "runtime JS list");
}
if (!inspector.includes('normalized === "application-help.js"')) {
  inspector = replaceRequired(inspector, '  if (runtimeCssSet.has(normalized)) return `assets/css/${normalized}`;\n  if (runtimeJsSet.has(normalized)) return `assets/js/${normalized}`;', '  if (runtimeCssSet.has(normalized)) return `assets/css/${normalized}`;\n  if (normalized === "application-help.js") return "assets/js/ui/application-help.js";\n  if (runtimeJsSet.has(normalized)) return `assets/js/${normalized}`;', "nested source path mapping");
}
inspector = inspector.replace('...runtimeJsFiles.map(file => `assets/js/${file}`),', '...runtimeJsFiles.map(sourcePathForRuntime),');
if (!inspector.includes('normalized === "assets/js/ui/*.js"')) {
  inspector = replaceRequired(inspector, '    else if (normalized === "assets/js/*.js") runtimeJsFiles.forEach(file => deploySources.add(file));', '    else if (normalized === "assets/js/*.js") runtimeJsFiles.filter(file => file !== "application-help.js").forEach(file => deploySources.add(file));\n    else if (normalized === "assets/js/ui/*.js") deploySources.add("application-help.js");', "nested Pages source mapping");
}
if (!inspector.includes('tests/validate-application-help-v15-2-7.mjs')) {
  inspector = replaceRequired(inspector, '"tests/privacy-and-inputs.spec.mjs", "tests/check-maintainability.mjs"', '"tests/privacy-and-inputs.spec.mjs", "tests/application-help.spec.mjs", "tests/validate-application-help-v15-2-7.mjs", "tests/check-maintainability.mjs"', "Phase 5B required tests");
}
inspector = inspector.replace('if (pkg.version !== "15.2.6") fail(`Expected current package version 15.2.6, found ${pkg.version || "(missing)"}`);', 'if (pkg.version !== "15.2.7") fail(`Expected current package version 15.2.7, found ${pkg.version || "(missing)"}`);');
inspector = inspector.replace('if (!read("README.md").startsWith("# My Finance Records · V15.2.6")) fail("README release heading is not V15.2.6");', 'if (!read("README.md").startsWith("# My Finance Records · V15.2.7")) fail("README release heading is not V15.2.7");');
inspector = inspector.replace('if (!read("CHANGELOG.md").startsWith("## 15.2.6 · 2026-08-19")) fail("CHANGELOG latest entry is not V15.2.6");', 'if (!read("CHANGELOG.md").startsWith("## 15.2.7 · 2026-08-19")) fail("CHANGELOG latest entry is not V15.2.7");');
write("tests/inspect-project.mjs", inspector);

let workflow = read(".github/workflows/quality-pages.yml");
if (!workflow.includes("cp assets/js/ui/*.js _site/")) workflow = replaceRequired(workflow, "          cp assets/js/*.js _site/\n", "          cp assets/js/*.js _site/\n          cp assets/js/ui/*.js _site/\n", "Pages nested UI copy");
if (!workflow.includes("test -f _site/application-help.js")) workflow = replaceRequired(workflow, "          test -f _site/form-inputs.js\n", "          test -f _site/form-inputs.js\n          test -f _site/application-help.js\n", "Pages Application Help assertion");
write(".github/workflows/quality-pages.yml", workflow);

// 4) Rotate PWA release identity and precache only the new production module.
let worker = read("sw.js");
worker = replaceRequired(worker, 'const APP_VERSION = "15.2.6";', 'const APP_VERSION = "15.2.7";', "service worker app version");
worker = replaceRequired(worker, `const CACHE_VERSION = "${OLD_CACHE}";`, `const CACHE_VERSION = "${NEW_CACHE}";`, "service worker cache version");
if (!worker.includes("V15.2.7 extracts Application Help")) worker = worker.replace('self.__FINANCE_APP_VERSION = APP_VERSION;\n', 'self.__FINANCE_APP_VERSION = APP_VERSION;\n// V15.2.7 extracts Application Help UI into a dedicated precached runtime module without changing Finance or sync behavior.\n');
if (!worker.includes('asset("./application-help.js?v=15.2.7-phase5b1")')) worker = replaceRequired(worker, '  asset("./form-inputs.js?v=15.2.6-phase5a1"),', '  asset("./form-inputs.js?v=15.2.6-phase5a1"),\n  asset("./application-help.js?v=15.2.7-phase5b1"),', "Application Help shell asset");
worker = worker.replaceAll("pwa-update-v15-0-5.js?v=15.2.6-release1", "pwa-update-v15-0-5.js?v=15.2.7-release1");
worker = worker.replaceAll("sync-config.js?v=15.2.6-release1", "sync-config.js?v=15.2.7-release1");
write("sw.js", worker);

let pwaUpdate = read("assets/js/pwa-update-v15-0-5.js");
pwaUpdate = replaceRequired(pwaUpdate, `const CURRENT_CACHE_VERSION = "${OLD_CACHE}";`, `const CURRENT_CACHE_VERSION = "${NEW_CACHE}";`, "PWA updater current cache");
write("assets/js/pwa-update-v15-0-5.js", pwaUpdate);

let syncConfig = read("sync-config.js");
syncConfig = replaceRequired(syncConfig, 'const VERSION = "15.2.6";', 'const VERSION = "15.2.7";', "release layer version");
syncConfig = replaceRequired(syncConfig, 'const RELEASE_NAME = "Form Input Module Extraction";', `const RELEASE_NAME = "${RELEASE_NAME}";`, "release layer name");
write("sync-config.js", syncConfig);

// 5) Version/package metadata and focused regression coverage.
const pkg = JSON.parse(read("package.json"));
if (pkg.version !== OLD_VERSION && pkg.version !== NEW_VERSION) throw new Error(`Unexpected package version ${pkg.version}`);
pkg.version = NEW_VERSION;
const validator = "node tests/validate-application-help-v15-2-7.mjs";
if (!String(pkg.scripts.test).includes(validator)) pkg.scripts.test = `${pkg.scripts.test} && ${validator}`;
write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(read("package-lock.json"));
if (![OLD_VERSION, NEW_VERSION].includes(lock.version) || ![OLD_VERSION, NEW_VERSION].includes(lock.packages?.[""]?.version)) throw new Error("Unexpected package-lock release version");
lock.version = NEW_VERSION;
lock.packages[""].version = NEW_VERSION;
write("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

const version = JSON.parse(read("version.json"));
if (![OLD_VERSION, NEW_VERSION].includes(version.version)) throw new Error(`Unexpected version.json version ${version.version}`);
version.version = NEW_VERSION;
version.cacheVersion = NEW_CACHE;
version.released = RELEASE_DATE_ISO;
version.name = RELEASE_NAME;
version.notes = "V15.2.7 extracts the existing Application Help UI subsystem from index.html into assets/js/ui/application-help.js, preserves the same help topics, global functions, dialog behavior, focus return, and runtime URLs, adds nested-source compatibility plus focused source/browser regression coverage, and rotates PWA delivery to r42. Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, storage, sync behavior, sidebar behavior, layouts, and the five-minute sync cadence are unchanged.";
write("version.json", `${JSON.stringify(version, null, 2)}\n`);

const staticTest = `import fs from "node:fs";\nimport assert from "node:assert/strict";\n\nconst read = file => fs.readFileSync(new URL(\`../\${file}\`, import.meta.url), "utf8");\nconst html = read("index.html");\nconst help = read("assets/js/ui/application-help.js");\nconst prepare = read("scripts/prepare-runtime.mjs");\nconst worker = read("sw.js");\nconst workflow = read(".github/workflows/quality-pages.yml");\nconst version = JSON.parse(read("version.json"));\n\nfor (const marker of ["const HELP_CONTENT =", "function helpButtonFor", "function setupApplicationHelp", "function openContextHelp"]) assert.ok(help.includes(marker), \`Missing extracted Help marker: \${marker}\`);\nfor (const topic of ["dashboard-overview", "budget-page", "paid-page", "projects-page", "income-page", "settings-salary-work"]) assert.ok(help.includes(\`\\"\${topic}\\"\`) || help.includes(\`\${topic}:\`), \`Missing Help topic: \${topic}\`);\nfor (const forbidden of ["function clearAccountDropTargets", "function runV12Migration", "saveData(", "const SCHEMA_VERSION"]) assert.ok(!help.includes(forbidden), \`Phase 5B crossed boundary: \${forbidden}\`);\nassert.ok(!html.includes("const HELP_CONTENT ="), "Help content still exists inline");\nassert.ok(!html.includes("function setupApplicationHelp"), "Help setup still exists inline");\nassert.ok(html.includes('<script src="./application-help.js?v=15.2.7-phase5b1"></script>'), "Application Help runtime tag missing");\nassert.ok(html.includes("function clearAccountDropTargets()"), "Approved post-Help boundary changed");\nassert.ok(prepare.includes('"assets/js/ui"') && prepare.includes('"application-help.js"'), "Nested runtime mapping missing");\nassert.ok(worker.includes('asset("./application-help.js?v=15.2.7-phase5b1")'), "Service worker does not precache Application Help");\nassert.ok(workflow.includes("cp assets/js/ui/*.js _site/") && workflow.includes("test -f _site/application-help.js"), "Pages nested packaging missing");\nassert.equal(version.version, "15.2.7");\nassert.equal(version.cacheVersion, "finance-v15-20260819-application-help-r42");\nconsole.log("Application Help V15.2.7 extraction validation passed.");\n`;
write("tests/validate-application-help-v15-2-7.mjs", staticTest);

const browserTest = `import { test, expect } from "@playwright/test";\n\ntest("Application Help external runtime preserves dialog and focus return", async ({ page }) => {\n  await page.goto("/");\n  await page.evaluate(() => {\n    setupApplicationHelp();\n    const trigger = document.getElementById("menuButton");\n    trigger?.focus();\n    openContextHelp("dashboard-overview", trigger);\n  });\n  const dialog = page.locator("#sectionHelpDialog");\n  await expect(dialog).toBeVisible();\n  await expect(page.locator("#sectionHelpDialogTitle")).toHaveText("Monthly overview");\n  await page.keyboard.press("Escape");\n  await expect(dialog).not.toBeVisible();\n  await expect(page.locator("#menuButton")).toBeFocused();\n});\n`;
write("tests/application-help.spec.mjs", browserTest);

// 6) Release notes.
let readme = read("README.md");
readme = replaceRequired(readme, "# My Finance Records · V15.2.6", "# My Finance Records · V15.2.7", "README title");
if (!readme.includes("## V15.2.7 · Application Help Module Extraction")) {
  const section = `## V15.2.7 · ${RELEASE_NAME}\n\nReleased **${RELEASE_DATE_TEXT}** with PWA cache \`${NEW_CACHE}\`.\n\n### New updates since V15.2.6\n\n- **Application Help module extraction** — Moves the existing contextual Help topic registry and Help dialog wiring out of the large inline application script into \`assets/js/ui/application-help.js\` without changing user-facing Help behavior.\n- **Nested runtime source mapping** — Adds the first focused \`assets/js/ui/\` source mapping while preserving the existing flat production runtime URL through the Phase 4 compatibility layer.\n- **PWA delivery** — Precaches \`application-help.js\` and rotates the shell cache to r42 so installed clients receive the extracted runtime safely.\n- **Regression coverage** — Adds source and browser checks for Help topics, dialog opening, Escape close behavior, focus return, subsystem boundaries, and Pages packaging.\n\n### Preserved in V15.2.7\n\nFinance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, storage, sync/conflict behavior, sidebar behavior, desktop/mobile layouts, and the routine **five-minute sync cadence** are unchanged.\n\n`;
  readme = replaceRequired(readme, "## V15.2.6 · Form Input Module Extraction", `${section}## V15.2.6 · Form Input Module Extraction`, "README previous release marker");
}
write("README.md", readme);

let changelog = read("CHANGELOG.md");
if (!changelog.startsWith("## 15.2.7 · 2026-08-19")) {
  const entry = `## 15.2.7 · 2026-08-19\n- Extracted the existing Application Help topic registry and Help dialog wiring from \`index.html\` into \`assets/js/ui/application-help.js\` while preserving the same topic content, global Help APIs, dialog behavior, Escape handling, and focus return.\n- Added the first nested UI runtime source mapping to local compatibility staging and GitHub Pages flattening, plus focused source/browser regression coverage.\n- Rotated the PWA shell to \`${NEW_CACHE}\` and updated V15.2.7 release metadata without changing Finance Schema 12, Cloud Schema V3, records, calculations, balances, storage, sync/conflict behavior, sidebar behavior, layouts, or five-minute Cloud Sync behavior.\n\n`;
  changelog = `${entry}${changelog}`;
}
write("CHANGELOG.md", changelog);

console.log("Phase 5B Application Help extraction prepared successfully.");
