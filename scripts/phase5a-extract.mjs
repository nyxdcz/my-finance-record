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
  if (!text.includes(from)) throw new Error(`Phase 5A marker missing: ${label}`);
  return text.replace(from, to);
};

const OLD_VERSION = "15.2.5";
const NEW_VERSION = "15.2.6";
const OLD_CACHE = "finance-v15-20260818-disclosure-alignment-r40";
const NEW_CACHE = "finance-v15-20260819-form-inputs-r41";
const RELEASE_NAME = "Form Input Module Extraction";
const RELEASE_DATE_TEXT = "August 19, 2026";
const RELEASE_DATE_ISO = "2026-08-19";

// 1) Extract the cohesive numeric/calculator input subsystem from index.html.
let html = read("index.html");
const startMarker = "    const CALCULATOR_MAX_LENGTH = 120;";
const endMarker = "    function formatDate(value) {";
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) throw new Error("Could not locate the calculator subsystem boundaries in index.html");
const extracted = html.slice(start, end).trimEnd();
for (const marker of ["function evaluateArithmeticExpression", "function validateMoneyInput", "function validateIntegerInput", "function setupNumericInputs"]) {
  if (!extracted.includes(marker)) throw new Error(`Calculator extraction is incomplete: ${marker}`);
}
let moduleBody = extracted.replace(/^    /gm, "").replace(/\bmoney\(/g, "root.money(");
const exportedNames = [
  "CALCULATOR_MAX_LENGTH", "CALCULATOR_MAX_RESULT", "calculatorError", "normalizeCalculatorExpression",
  "tokenizeCalculatorExpression", "evaluateArithmeticExpression", "roundCurrency", "parseMoneyValue", "moneyInputText",
  "calculatorPreviewElement", "setCalculatorPreview", "setFieldError", "expressionUsesOperators",
  "updateMoneyCalculatorPreview", "updateIntegerCalculatorPreview", "formatMoneyInput", "formatIntegerInput",
  "setMoneyInputValue", "moneyInputValue", "integerInputValue", "validateMoneyInput", "validateIntegerInput",
  "insertCalculatorOperator", "ensureCalculatorShell", "bindCalculatorInput", "setupNumericInputs"
];
const formInputsSource = `"use strict";\n/* V15.2.6 · Extracted numeric and calculator form-input subsystem. */\n(function exposeFinanceFormInputs(root) {\n${moduleBody.split("\n").map(line => `  ${line}`).join("\n")}\n\n  Object.assign(root, { ${exportedNames.join(", ")} });\n})(window);\n`;
write("assets/js/form-inputs.js", formInputsSource);
html = `${html.slice(0, start)}${html.slice(end)}`;
if (html.includes("const CALCULATOR_MAX_LENGTH") || html.includes("function evaluateArithmeticExpression")) throw new Error("Calculator implementation still remains inline after extraction");
if (html.includes("CALCULATOR_MAX_LENGTH") || html.includes("CALCULATOR_MAX_RESULT")) throw new Error("Calculator constants are referenced outside the extracted subsystem");

const oldPwaTag = '  <script src="./pwa-update-v15-0-5.js?v=15.2.5-release1"></script>';
const newPwaTags = '  <script src="./form-inputs.js?v=15.2.6-phase5a1"></script>\n  <script src="./pwa-update-v15-0-5.js?v=15.2.6-release1"></script>';
html = replaceRequired(html, oldPwaTag, newPwaTags, "PWA update script tag");
html = replaceRequired(html, "V15.2.5 · Finance Disclosure Alignment · August 18, 2026", `V${NEW_VERSION} · ${RELEASE_NAME} · ${RELEASE_DATE_TEXT}`, "build badge release title");
html = html.replaceAll('"15.2.5"', '"15.2.6"').replaceAll("'15.2.5'", "'15.2.6'");
html = html.replaceAll("V15.2.5", "V15.2.6");
html = html.replaceAll("15.2.5-release1", "15.2.6-release1");
html = html.replaceAll(OLD_CACHE, NEW_CACHE);
write("index.html", html);

// 2) Add the new runtime source to the Phase 4 compatibility layer.
let prepareRuntime = read("scripts/prepare-runtime.mjs");
prepareRuntime = replaceRequired(prepareRuntime, '    "expense-screenshot-parser.js",\n    "interaction-patterns.js",', '    "expense-screenshot-parser.js",\n    "form-inputs.js",\n    "interaction-patterns.js",', "prepare-runtime JS list");
write("scripts/prepare-runtime.mjs", prepareRuntime);

let inspector = read("tests/inspect-project.mjs");
inspector = replaceRequired(inspector, '"expense-screenshot-ai.js", "expense-screenshot-detect.js", "expense-screenshot-parser.js", "interaction-patterns.js"', '"expense-screenshot-ai.js", "expense-screenshot-detect.js", "expense-screenshot-parser.js", "form-inputs.js", "interaction-patterns.js"', "inspector runtime JS list");
write("tests/inspect-project.mjs", inspector);

let gitignore = read(".gitignore");
if (!gitignore.includes("/form-inputs.js\n")) {
  gitignore = replaceRequired(gitignore, "/expense-screenshot-parser.js\n/interaction-patterns.js", "/expense-screenshot-parser.js\n/form-inputs.js\n/interaction-patterns.js", "generated JS ignore list");
}
write(".gitignore", gitignore);

// 3) Rotate PWA release identity and precache the new module.
let worker = read("sw.js");
worker = replaceRequired(worker, 'const APP_VERSION = "15.2.5";', 'const APP_VERSION = "15.2.6";', "service worker app version");
worker = replaceRequired(worker, `const CACHE_VERSION = "${OLD_CACHE}";`, `const CACHE_VERSION = "${NEW_CACHE}";`, "service worker cache version");
worker = worker.replaceAll("15.2.5-release1", "15.2.6-release1");
worker = replaceRequired(worker, '  asset("./pwa-update-v15-0-5.js?v=15.2.6-release1"),', '  asset("./form-inputs.js?v=15.2.6-phase5a1"),\n  asset("./pwa-update-v15-0-5.js?v=15.2.6-release1"),', "service worker form-input precache");
worker = worker.replace('self.__FINANCE_APP_VERSION = APP_VERSION;\n', 'self.__FINANCE_APP_VERSION = APP_VERSION;\n// V15.2.6 extracts calculator/form-input behavior into a dedicated precached runtime module without changing Finance calculations or schemas.\n');
write("sw.js", worker);

let pwaUpdate = read("assets/js/pwa-update-v15-0-5.js");
pwaUpdate = replaceRequired(pwaUpdate, `const CURRENT_CACHE_VERSION = "${OLD_CACHE}";`, `const CURRENT_CACHE_VERSION = "${NEW_CACHE}";`, "PWA update current cache");
write("assets/js/pwa-update-v15-0-5.js", pwaUpdate);

let syncConfig = read("sync-config.js");
syncConfig = replaceRequired(syncConfig, 'const VERSION = "15.2.5";', 'const VERSION = "15.2.6";', "release layer version");
syncConfig = replaceRequired(syncConfig, 'const RELEASE_NAME = "Finance Disclosure Alignment";', `const RELEASE_NAME = "${RELEASE_NAME}";`, "release layer name");
syncConfig = replaceRequired(syncConfig, 'const RELEASE_DATE = "August 18, 2026";', `const RELEASE_DATE = "${RELEASE_DATE_TEXT}";`, "release layer date");
syncConfig = replaceRequired(syncConfig, 'released:"2026-08-18"', `released:"${RELEASE_DATE_ISO}"`, "release layer ISO date");
write("sync-config.js", syncConfig);

// 4) Version metadata.
const pkg = JSON.parse(read("package.json"));
if (pkg.version !== OLD_VERSION) throw new Error(`Unexpected package version ${pkg.version}`);
pkg.version = NEW_VERSION;
const validator = "node tests/validate-form-inputs-v15-2-6.mjs";
if (!String(pkg.scripts.test).includes(validator)) pkg.scripts.test = `${pkg.scripts.test} && ${validator}`;
write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(read("package-lock.json"));
if (lock.version !== OLD_VERSION || lock.packages?.[""]?.version !== OLD_VERSION) throw new Error("Unexpected package-lock release version");
lock.version = NEW_VERSION;
lock.packages[""].version = NEW_VERSION;
write("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`);

const version = JSON.parse(read("version.json"));
if (version.version !== OLD_VERSION) throw new Error(`Unexpected version.json version ${version.version}`);
version.version = NEW_VERSION;
version.cacheVersion = NEW_CACHE;
version.released = RELEASE_DATE_ISO;
version.name = RELEASE_NAME;
version.notes = "V15.2.6 extracts the existing numeric/calculator form-input subsystem from index.html into assets/js/form-inputs.js, preserves the same global form APIs and input behavior, adds focused source/browser regression coverage, and rotates PWA delivery to r41. Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, sync behavior, layouts, and the five-minute sync cadence are unchanged.";
write("version.json", `${JSON.stringify(version, null, 2)}\n`);

// 5) README and changelog history.
let readme = read("README.md");
readme = replaceRequired(readme, "# My Finance Records · V15.2.5", "# My Finance Records · V15.2.6", "README title");
const readmeMarker = "## V15.2.5 · Finance Disclosure Alignment";
const readmeSection = `## V15.2.6 · ${RELEASE_NAME}\n\nReleased **${RELEASE_DATE_TEXT}** with PWA cache \`${NEW_CACHE}\`.\n\n### New updates since V15.2.5\n\n- **Form-input module extraction** — Moves the existing calculator and numeric input subsystem out of the large inline application script into \`assets/js/form-inputs.js\` while preserving the same global APIs and user behavior.\n- **Repository maintainability** — Reduces \`index.html\` and keeps the extracted runtime source inside the organized Phase 4 \`assets/js/\` structure with generated root compatibility for local development.\n- **PWA delivery** — Precaches the new form-input module and rotates the shell cache to r41 so installed clients receive the extracted runtime safely.\n- **Regression coverage** — Adds source and browser checks for arithmetic parsing, money/integer validation, accessible field errors, formatting, and calculator controls.\n\n### Preserved in V15.2.6\n\nFinance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, layouts, conflict-resolution behavior, and the routine **five-minute sync cadence** are unchanged.\n\n`;
readme = replaceRequired(readme, readmeMarker, `${readmeSection}${readmeMarker}`, "README V15.2.5 history marker");
write("README.md", readme);

let changelog = read("CHANGELOG.md");
const changelogEntry = `## 15.2.6 · ${RELEASE_DATE_ISO}\n- Extracted the existing calculator/numeric form-input subsystem from \`index.html\` into \`assets/js/form-inputs.js\` while preserving the existing global function names and behavior used by Finance forms.\n- Added the new runtime module to the organized source/compatibility pipeline, GitHub Pages packaging, service-worker shell precache, and focused source/browser regression coverage.\n- Rotated the PWA shell to \`${NEW_CACHE}\` and updated V15.2.6 release metadata without changing Finance Schema 12, Cloud Schema V3, records, calculations, balances, layouts, or five-minute Cloud Sync behavior.\n\n`;
if (!changelog.startsWith("## 15.2.5 · 2026-08-18")) throw new Error("Unexpected CHANGELOG head");
write("CHANGELOG.md", `${changelogEntry}${changelog}`);

// 6) Current-release test metadata synchronization without changing older feature-specific asset pins.
const testDir = path.join(root, "tests");
for (const name of fs.readdirSync(testDir).filter(name => name.endsWith(".mjs"))) {
  const file = path.join(testDir, name);
  let text = fs.readFileSync(file, "utf8");
  const original = text;
  text = text.replaceAll(OLD_CACHE, NEW_CACHE);
  text = text.replaceAll('version.version === "15.2.5"', 'version.version === "15.2.6"');
  text = text.replaceAll('pkg.version === "15.2.5"', 'pkg.version === "15.2.6"');
  text = text.replaceAll('My Finance Records · V15.2.5', 'My Finance Records · V15.2.6');
  text = text.replaceAll('version.json is V15.2.5', 'version.json is V15.2.6');
  text = text.replaceAll('package.json is V15.2.5', 'package.json is V15.2.6');
  text = text.replaceAll('page title is V15.2.5', 'page title is V15.2.6');
  text = text.replaceAll('V15.2.5 disclosure cache is declared', 'V15.2.6 form-input cache is declared');
  text = text.replaceAll('CHANGELOG begins with V15.2.5', 'CHANGELOG begins with V15.2.6');
  text = text.replaceAll('## 15.2.5 · 2026-08-18', '## 15.2.6 · 2026-08-19');
  text = text.replaceAll('const APP_VERSION = "15.2.5"', 'const APP_VERSION = "15.2.6"');
  text = text.replaceAll('const VERSION = "15.2.5"', 'const VERSION = "15.2.6"');
  text = text.replaceAll('const RELEASE_NAME = "Finance Disclosure Alignment"', `const RELEASE_NAME = "${RELEASE_NAME}"`);
  text = text.replaceAll('release override matches V15.2.5', 'release override matches V15.2.6');
  text = text.replaceAll('sync-config.js?v=15.2.5-release1', 'sync-config.js?v=15.2.6-release1');
  text = text.replaceAll('.toContain("v=15.2.5")', '.toContain("v=15.2.6")');
  text = text.replaceAll('toContainText("V15.2.5")', 'toContainText("V15.2.6")');
  text = text.replaceAll('toContain("V15.2.5")', 'toContain("V15.2.6")');
  text = text.replaceAll('toHaveTitle(/V15\\.2\\.5/)', 'toHaveTitle(/V15\\.2\\.6/)');
  text = text.replaceAll('test("V15.2.5 ', 'test("V15.2.6 ');
  text = text.replaceAll('console.log("V15.2.5 release', 'console.log("V15.2.6 release');
  if (text !== original) fs.writeFileSync(file, text);
}

const sourceValidator = `import fs from "node:fs";\nconst read = file => fs.readFileSync(file, "utf8");\nconst index = read("index.html");\nconst formInputs = read("form-inputs.js");\nconst sw = read("sw.js");\nconst version = JSON.parse(read("version.json"));\nconst required = [\n  [version.version === "15.2.6", "release is V15.2.6"],\n  [version.cacheVersion === "${NEW_CACHE}", "r41 cache is active"],\n  [index.includes("./form-inputs.js?v=15.2.6-phase5a1"), "index loads extracted form-input module"],\n  [!index.includes("function evaluateArithmeticExpression"), "calculator implementation is no longer inline"],\n  [formInputs.includes("function evaluateArithmeticExpression") && formInputs.includes("function validateMoneyInput") && formInputs.includes("function setupNumericInputs"), "extracted calculator APIs are present"],\n  [formInputs.includes("Object.assign(root"), "extracted APIs remain globally compatible"],\n  [sw.includes("form-inputs.js?v=15.2.6-phase5a1"), "form-input module is precached"]\n];\nfor (const [ok, message] of required) if (!ok) throw new Error(message);\nconsole.log("V15.2.6 form-input extraction source contract passed");\n`;
write("tests/validate-form-inputs-v15-2-6.mjs", sourceValidator);

const browserSpec = `import { test, expect } from "@playwright/test";\n\ntest("V15.2.6 extracted form inputs preserve calculator and validation behavior", async ({ page }) => {\n  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });\n  await expect.poll(() => page.evaluate(() => typeof window.evaluateArithmeticExpression)).toBe("function");\n\n  const arithmetic = await page.evaluate(() => ({\n    add:window.evaluateArithmeticExpression("200 + 100"),\n    multiply:window.evaluateArithmeticExpression("12 × 3"),\n    parentheses:window.evaluateArithmeticExpression("(10 + 5) * 2"),\n    divideByZero:window.evaluateArithmeticExpression("10 / 0"),\n    invalidSequence:window.evaluateArithmeticExpression("10 ++ 2")\n  }));\n  expect(arithmetic.add).toMatchObject({ ok:true, value:300 });\n  expect(arithmetic.multiply).toMatchObject({ ok:true, value:36 });\n  expect(arithmetic.parentheses).toMatchObject({ ok:true, value:30 });\n  expect(arithmetic.divideByZero).toMatchObject({ ok:false, code:"division" });\n  expect(arithmetic.invalidSequence).toMatchObject({ ok:false, code:"sequence" });\n\n  const formState = await page.evaluate(() => {\n    const host = document.createElement("div");\n    host.innerHTML = '<div><input id="phase5Money" data-money-input data-min="0"></div><div><input id="phase5Integer" data-integer-input min="0" max="100"></div>';\n    document.body.appendChild(host);\n    window.setupNumericInputs(host);\n    const moneyInput = document.getElementById("phase5Money");\n    const integerInput = document.getElementById("phase5Integer");\n    moneyInput.value = "200 + 100";\n    moneyInput.dispatchEvent(new Event("input", { bubbles:true }));\n    const preview = document.getElementById("phase5Money-preview")?.textContent || "";\n    const operatorCount = moneyInput.closest(".calculator-input-shell")?.querySelectorAll(".calculator-operator-row button").length || 0;\n    const formatted = window.formatMoneyInput(moneyInput, true);\n    moneyInput.value = "-5";\n    const negativeAccepted = window.validateMoneyInput(moneyInput, { required:true, min:0 });\n    const moneyInvalid = moneyInput.getAttribute("aria-invalid");\n    const moneyError = document.getElementById("phase5Money-error")?.textContent || "";\n    integerInput.value = "10 / 4";\n    const integerAccepted = window.validateIntegerInput(integerInput, { required:true, min:0, max:100 });\n    const integerError = document.getElementById("phase5Integer-error")?.textContent || "";\n    return { preview, operatorCount, formatted, formattedValue:formatted ? "300.00" : moneyInput.value, negativeAccepted, moneyInvalid, moneyError, integerAccepted, integerError };\n  });\n  expect(formState.preview).toContain("₱300.00");\n  expect(formState.operatorCount).toBe(6);\n  expect(formState.formatted).toBe(true);\n  expect(formState.formattedValue).toBe("300.00");\n  expect(formState.negativeAccepted).toBe(false);\n  expect(formState.moneyInvalid).toBe("true");\n  expect(formState.moneyError).toContain("cannot contain a negative amount");\n  expect(formState.integerAccepted).toBe(false);\n  expect(formState.integerError).toContain("whole number");\n});\n`;
write("tests/form-inputs-v15-2-6.spec.mjs", browserSpec);

// Final consistency assertions before CI runs.
for (const file of ["index.html", "sw.js", "version.json", "package.json", "sync-config.js", "README.md", "CHANGELOG.md"]) {
  const text = read(file);
  if (text.includes(OLD_CACHE)) throw new Error(`${file} still contains the old r40 cache identity`);
}
if (!read("index.html").includes("form-inputs.js?v=15.2.6-phase5a1")) throw new Error("index.html does not load form-inputs.js");
console.log("Phase 5A extraction prepared successfully.");
