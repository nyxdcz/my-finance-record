import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const OLD_QUERY = "2.0.1-talaan5";
const NEW_QUERY = "2.0.1-talaan6";
const OLD_CACHE = "finance-v2-20260822-talaan-r5";
const NEW_CACHE = "finance-v2-20260822-talaan-r6";

const textExtensions = new Set([".js", ".mjs", ".css", ".html", ".json", ".md", ".yml", ".yaml", ".webmanifest", ".txt", ".sh"]);

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(target));
    else files.push(target);
  }
  return files;
}

function writeText(file, content) {
  fs.writeFileSync(path.join(root, file), content);
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

for (const file of walk(root)) {
  if (!textExtensions.has(path.extname(file))) continue;
  const current = fs.readFileSync(file, "utf8");
  const next = current.replaceAll(OLD_QUERY, NEW_QUERY).replaceAll(OLD_CACHE, NEW_CACHE);
  if (next !== current) fs.writeFileSync(file, next);
}

const icons = {
  "icons/repeat-monthly-off.png":"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABVElEQVR42u1ZQQ6EMAi0pP/x5Lt8i+/y5Ivc0ybGRG0VGJrOXLwYWoahBToMBEEQBEEQBAbTvO3I9aX3AEiE6CNVQAX0mvvhFIAiRHqOPs+AaAQglCE9yz9kCngTJD1Hn4egJwE10fdUClwB6zIm5PrJMyrrMqajnb/z07ztRyK01lJVgFak1mVMZ1vaKqixJyi5Wkm/1q60lrPae3vtzFOeahNltZ5Ysa15lVmSnaw3+FUJlrbV6oC7jXxRgrXzqoWQNgkezqtXglcbe7NhTVuupbBmkWNdMDXT+lo2R9mThNIINt8NWjhgRYpbO1yTv565HuZlqJuHkWne9vOj6PHb/FD0zoFS567+syAHPhNET4ozcnHtMVgzh6DHWMy1Ha6JYomjnsOWjJB76b8eaSEIuUcqiHKEiCPVIBb5bxG5CDdGmA4uJAEEQRAEQRAEQRAt4QcdJdYj43J95QAAAABJRU5ErkJggg==",
  "icons/repeat-monthly-on.png":"iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA+UlEQVR42u2ZQQ4EIQgEx47//7J72fOuThTaUHWeCDSNhszzAAAAAEAOY4yRGV/VGyCH7me6AAdUnX07B2QJosrd5w5wEyDDGapsf8sRiBZIlbvPJRgpwEr3I51S3gHt5vn9WVhrbasDZg+8qfjlEbhBhNUcdTqAc/GvL0FHEd7mpOiATsUvvQKOL8SOJsglkayYcksoOpZcE4uKIfcET5+tWxI9JSzrcPbqm/3U4gAEQIA7ZvXU2eUd0F22uFI/R9sXh/W6Rc/oTKH/ztkpVs+w++y3EWOhDLs7bZfdoeOZbtCJ+T+9DVr+pIlM6ra/VAAAAAAAAHZ8AAoGbHwyueiWAAAAAElFTkSuQmCC"
};
for (const [file, base64] of Object.entries(icons)) fs.writeFileSync(path.join(root, file), Buffer.from(base64, "base64"));

let index = readText("index.html");
const oldIcon = '<span class="saved-icon-container" aria-hidden="true"><span class="saved-icon">${item.recurring === "Monthly" ? "★" : "☆"}</span></span>';
const newIcon = '<span class="saved-icon-container" aria-hidden="true"><img class="saved-icon saved-icon-image" src="./icons/repeat-monthly-${item.recurring === "Monthly" ? "on" : "off"}.png?v=2.0.1-talaan6" alt=""></span>';
const occurrences = index.split(oldIcon).length - 1;
if (occurrences !== 2) throw new Error(`Expected exactly 2 monthly-repeat star controls, found ${occurrences}.`);
index = index.replaceAll(oldIcon, newIcon);
writeText("index.html", index);

let appCss = readText("assets/css/app.css");
const iconCssMarker = "/* Talaan · replaceable repeat-monthly PNG icons */";
if (!appCss.includes(iconCssMarker)) {
  appCss = `${appCss.trimEnd()}\n\n${iconCssMarker}\n.button-saved .saved-icon-image {\n  display:block !important;\n  width:18px !important;\n  min-width:18px !important;\n  max-width:18px !important;\n  height:18px !important;\n  min-height:18px !important;\n  max-height:18px !important;\n  object-fit:contain !important;\n  transform:none !important;\n  pointer-events:none !important;\n}\n`;
  writeText("assets/css/app.css", appCss);
}

let prepare = readText("scripts/prepare-runtime.mjs");
if (!prepare.includes('"repeat-monthly-off.png"')) {
  const anchor = '    "sync-runtime-compat.js"\n  ]);';
  if (!prepare.includes(anchor)) throw new Error("Could not locate runtime query file list.");
  prepare = prepare.replace(anchor, '    "sync-runtime-compat.js",\n    "repeat-monthly-off.png",\n    "repeat-monthly-on.png"\n  ]);');
  writeText("scripts/prepare-runtime.mjs", prepare);
}

let worker = readText("sw.js");
if (!worker.includes('./icons/repeat-monthly-off.png')) {
  const assetAnchor = '  asset("./icons/action-add-sparkle.png"),';
  if (!worker.includes(assetAnchor)) throw new Error("Could not locate service-worker icon precache anchor.");
  worker = worker.replace(assetAnchor, `${assetAnchor}\n  asset("./icons/repeat-monthly-off.png?v=2.0.1-talaan6"),\n  asset("./icons/repeat-monthly-on.png?v=2.0.1-talaan6"),`);
}
if (!worker.includes('url.pathname.endsWith("repeat-monthly-off.png")')) {
  const networkAnchor = 'url.pathname.endsWith("black-canvas.css")) {';
  if (!worker.includes(networkAnchor)) throw new Error("Could not locate service-worker network-first asset rule.");
  worker = worker.replace(networkAnchor, 'url.pathname.endsWith("black-canvas.css") || url.pathname.endsWith("repeat-monthly-off.png") || url.pathname.endsWith("repeat-monthly-on.png")) {');
}
writeText("sw.js", worker);

let changelog = readText("CHANGELOG.md");
const budgetBullet = '- Repeat monthly, Mark paid, Edit, and expense-selection controls.';
const pngBullet = '- Replaced the text-star monthly recurrence indicator with `icons/repeat-monthly-off.png` and `icons/repeat-monthly-on.png`, so the artwork can be replaced manually without changing recurrence behavior.';
if (!changelog.includes(pngBullet)) {
  if (!changelog.includes(budgetBullet)) throw new Error("Could not locate Budget & Expenses changelog anchor.");
  changelog = changelog.replace(budgetBullet, `${budgetBullet}\n${pngBullet}`);
}
changelog = changelog.replace(
  /- Rotated the PWA cache to `finance-v2-20260822-talaan-r6`[^\n]*/,
  '- Rotated the PWA cache to `finance-v2-20260822-talaan-r6` so installed clients receive the current workspace styling, header layout, and replaceable repeat-monthly PNG assets.'
);
writeText("CHANGELOG.md", changelog);

let financeTest = readText("tests/finance/validate-finance-ui-source.mjs");
if (!financeTest.includes("repeat monthly PNG controls")) {
  const anchor = 'assert.equal(lock.packages[""].version, version.version);';
  if (!financeTest.includes(anchor)) throw new Error("Could not locate finance source-test anchor.");
  const block = `\n\nfor (const icon of ["repeat-monthly-off.png", "repeat-monthly-on.png"]) {\n  assert.ok(fs.existsSync(\`icons/\${icon}\`), \`\${icon} must exist\`);\n  assert.ok(index.includes(\`./icons/\${icon}?v=\${query}\`), \`index must reference \${icon}\`);\n  assert.ok(worker.includes(\`./icons/\${icon}?v=\${query}\`), \`service worker must precache \${icon}\`);\n}\nassert.match(index, /repeat-monthly-\\$\\{item\\.recurring === "Monthly" \\? "on" : "off"\\}\\.png\\?v=2\\.0\\.1-talaan6/, "repeat monthly controls must use state-specific PNG artwork");\nassert.equal(index.includes('"★" : "☆"'), false, "repeat monthly controls must no longer render text stars");\n// repeat monthly PNG controls\n`;
  financeTest = financeTest.replace(anchor, `${anchor}${block}`);
  writeText("tests/finance/validate-finance-ui-source.mjs", financeTest);
}

let pwaTest = readText("tests/regression/validate-pwa-runtime.mjs");
if (!pwaTest.includes("repeat-monthly-off.png")) {
  const anchor = 'assert.match(worker, /url\\.pathname\\.endsWith\\("black-canvas\\.css"\\)/);';
  if (!pwaTest.includes(anchor)) throw new Error("Could not locate PWA source-test anchor.");
  pwaTest = pwaTest.replace(anchor, `${anchor}\nassert.match(worker, /url\\.pathname\\.endsWith\\("repeat-monthly-off\\.png"\\)/);\nassert.match(worker, /url\\.pathname\\.endsWith\\("repeat-monthly-on\\.png"\\)/);`);
  writeText("tests/regression/validate-pwa-runtime.mjs", pwaTest);
}

const browserTestPath = path.join(root, "tests/browser/repeat-monthly-icon-assets.spec.mjs");
if (!fs.existsSync(browserTestPath)) {
  fs.writeFileSync(browserTestPath, `import { test, expect } from "@playwright/test";\n\ntest.use({ serviceWorkers:"block" });\n\ntest("repeat monthly PNG assets load as replaceable artwork", async ({ page, request }) => {\n  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });\n  for (const name of ["off", "on"]) {\n    const url = \`http://127.0.0.1:3000/icons/repeat-monthly-\${name}.png?v=2.0.1-talaan6\`;\n    const response = await request.get(url);\n    expect(response.ok()).toBeTruthy();\n    expect(response.headers()["content-type"] || "").toContain("image/png");\n    expect((await response.body()).byteLength).toBeGreaterThan(100);\n    const size = await page.evaluate(src => new Promise((resolve, reject) => {\n      const image = new Image();\n      image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);\n      image.onerror = reject;\n      image.src = src;\n    }), url);\n    expect(size).toEqual([64, 64]);\n  }\n});\n`);
}

const version = JSON.parse(readText("version.json"));
if (version.version !== "2.0.1") throw new Error(`Unexpected app version ${version.version}.`);
if (version.cacheVersion !== NEW_CACHE) throw new Error(`Expected cache ${NEW_CACHE}, got ${version.cacheVersion}.`);

console.log("Repeat monthly PNG icon migration prepared successfully.");
