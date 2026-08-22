import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

const cssPath = "assets/css/production-ui-audit.css";
const cssMarker = "/* Talaan · desktop More tools viewport containment */";
let css = read(cssPath);
if (!css.includes(cssMarker)) {
  css = `${css.trimEnd()}\n\n${cssMarker}\n@media (min-width: 851px) {\n  html body .topbar {\n    padding-inline-end: max(26px, env(safe-area-inset-right)) !important;\n  }\n\n  html body .topbar-actions {\n    min-width: 0 !important;\n    max-width: 100% !important;\n  }\n\n  html body .topbar-actions .topbar-tools-menu {\n    position: relative !important;\n    flex: 0 0 34px !important;\n    width: 34px !important;\n    min-width: 34px !important;\n    max-width: 34px !important;\n    margin: 0 !important;\n  }\n\n  html body .topbar-actions #topbarToolsTrigger {\n    box-sizing: border-box !important;\n    width: 34px !important;\n    min-width: 34px !important;\n    max-width: 34px !important;\n    height: 34px !important;\n    min-height: 34px !important;\n    max-height: 34px !important;\n    display: grid !important;\n    place-items: center !important;\n    flex: 0 0 34px !important;\n    margin: 0 !important;\n    padding: 0 !important;\n    border: 1px solid var(--line) !important;\n    border-radius: 7px !important;\n    background: var(--surface) !important;\n    color: var(--text) !important;\n    line-height: 1 !important;\n  }\n\n  html body .topbar-actions #topbarToolsTrigger:hover,\n  html body .topbar-actions #topbarToolsTrigger:focus-visible,\n  html body .topbar-actions #topbarToolsTrigger[aria-expanded=\"true\"] {\n    border-color: var(--primary) !important;\n    color: var(--primary) !important;\n    background: color-mix(in srgb, var(--primary) 8%, var(--surface)) !important;\n  }\n\n  html body .topbar-actions #topbarToolsTrigger .toolbar-icon,\n  html body .topbar-actions #topbarToolsTrigger .toolbar-icon > svg {\n    width: 18px !important;\n    height: 18px !important;\n    margin: 0 !important;\n  }\n\n  html body .topbar-actions .topbar-tools-panel {\n    right: 0 !important;\n    width: min(248px, calc(100vw - 24px)) !important;\n    max-width: calc(100vw - 24px) !important;\n  }\n}\n`;
  write(cssPath, css);
}

const testPath = "tests/browser/header-tools-ownership.spec.mjs";
let testSource = read(testPath);
const desktopUnlock = '  await unlock(page, "header-tools-desktop@example.invalid");\n';
const desktopGeometry = `  const triggerGeometry = await page.locator("#topbarToolsTrigger").evaluate(node => {\n    const rect = node.getBoundingClientRect();\n    return { left:rect.left, right:rect.right, width:rect.width, height:rect.height, viewport:innerWidth };\n  });\n  expect(triggerGeometry.width).toBeCloseTo(34, 0);\n  expect(triggerGeometry.height).toBeCloseTo(34, 0);\n  expect(triggerGeometry.left).toBeGreaterThanOrEqual(0);\n  expect(triggerGeometry.right).toBeLessThanOrEqual(triggerGeometry.viewport - 12);\n\n`;
if (!testSource.includes("const triggerGeometry =")) {
  if (!testSource.includes(desktopUnlock)) throw new Error("Desktop Header Tools unlock anchor not found");
  testSource = testSource.replace(desktopUnlock, desktopUnlock + "\n" + desktopGeometry);
}

const directButtonsAnchor = '  const directButtons = await page.locator("#topbarToolsPanel > button").evaluateAll(nodes => nodes.map(node => node.id));\n  expect(directButtons).toEqual(expectedOrder);\n';
const panelGeometry = `\n  const panelGeometry = await page.locator("#topbarToolsPanel").evaluate(node => {\n    const rect = node.getBoundingClientRect();\n    return { left:rect.left, right:rect.right, viewport:innerWidth };\n  });\n  expect(panelGeometry.left).toBeGreaterThanOrEqual(12);\n  expect(panelGeometry.right).toBeLessThanOrEqual(panelGeometry.viewport - 12);\n`;
if (!testSource.includes("const panelGeometry =")) {
  if (!testSource.includes(directButtonsAnchor)) throw new Error("Header Tools panel anchor not found");
  testSource = testSource.replace(directButtonsAnchor, directButtonsAnchor + panelGeometry);
}
write(testPath, testSource);

const preparePath = "scripts/prepare-runtime.mjs";
let prepare = read(preparePath);
if (prepare.includes('cache:"finance-v2-20260822-talaan-r3"')) {
  prepare = prepare.replace('cache:"finance-v2-20260822-talaan-r3"', 'cache:"finance-v2-20260822-talaan-r4"');
}
if (prepare.includes('assetQuery:"2.0.1-talaan3"')) {
  prepare = prepare.replace('assetQuery:"2.0.1-talaan3"', 'assetQuery:"2.0.1-talaan4"');
}
const queryListAnchor = '    "phone-finance-compat.js",\n    "sync-runtime-compat.js"';
const expandedQueryList = '    "phone-finance-compat.js",\n    "sync-config.js",\n    "sync-runtime-compat.js",\n    "mascot-red.png",\n    "mascot-green.png",\n    "mascot-blue.png",\n    "mascot-orange.png"';
if (!prepare.includes('"sync-config.js"')) {
  if (!prepare.includes(queryListAnchor)) throw new Error("Runtime query-file anchor not found");
  prepare = prepare.replace(queryListAnchor, expandedQueryList);
}
if (!prepare.includes('cache:"finance-v2-20260822-talaan-r4"') || !prepare.includes('assetQuery:"2.0.1-talaan4"')) {
  throw new Error("Unable to establish r4/talaan4 runtime generation");
}
write(preparePath, prepare);

const versionJsonPath = "version.json";
const versionJson = JSON.parse(read(versionJsonPath));
versionJson.cacheVersion = "finance-v2-20260822-talaan-r4";
write(versionJsonPath, `${JSON.stringify(versionJson, null, 2)}\n`);

const versionMdPath = "version.md";
let versionMd = read(versionMdPath);
versionMd = versionMd.replaceAll("finance-v2-20260822-talaan-r3", "finance-v2-20260822-talaan-r4");
if (!versionMd.includes("finance-v2-20260822-talaan-r4")) throw new Error("version.md cache metadata did not advance to r4");
write(versionMdPath, versionMd);

const testTextExtensions = new Set([".js", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml", ".html", ".css"]);
const refreshTestPins = directory => {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes:true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      refreshTestPins(relative);
      continue;
    }
    if (!entry.isFile() || !testTextExtensions.has(path.extname(entry.name))) continue;
    const before = read(relative);
    const after = before
      .replaceAll("2.0.1-talaan3", "2.0.1-talaan4")
      .replaceAll("2\\.0\\.1-talaan3", "2\\.0\\.1-talaan4")
      .replaceAll("finance-v2-20260822-talaan-r3", "finance-v2-20260822-talaan-r4");
    if (after !== before) write(relative, after);
  }
};
refreshTestPins("tests");

console.log("Header More tools containment source, regression coverage, and complete r4/talaan4 runtime pins are staged.");
