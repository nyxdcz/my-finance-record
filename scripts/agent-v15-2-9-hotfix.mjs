import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const OLD_VERSION = "15.2.8";
const VERSION = "15.2.9";
const OLD_CACHE = "finance-v15-20260819-pwa-ui-ownership-r44";
const CACHE = "finance-v15-20260820-ui-asset-delivery-r45";
const RELEASE = "UI Asset Delivery Hotfix";
const RELEASE_DATE = "2026-08-20";
const RELEASE_DATE_LONG = "August 20, 2026";

const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);
const ensureReplace = (value, from, to, label) => {
  if (value.includes(to)) return value;
  if (!value.includes(from)) throw new Error(`Missing ${label || from}`);
  return value.replace(from, to);
};
const appendOnce = (file, marker, block) => {
  let value = read(file);
  if (value.includes(marker)) return;
  value = `${value.trimEnd()}\n\n${block.trim()}\n`;
  write(file, value);
};

// Canonical release metadata.
{
  const file = "version.json";
  const value = JSON.parse(read(file));
  value.version = VERSION;
  value.cacheVersion = CACHE;
  value.released = RELEASE_DATE;
  value.name = RELEASE;
  value.notes = "V15.2.9 refreshes sidebar PNG delivery with versioned, network-first recovery, restores the native Quick actions sliders glyph, and gives the collapsed Monthly budget plan disclosure its own non-overlapping grid column. Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, storage, authentication, sync/conflict behavior, and the five-minute sync cadence are unchanged.";
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}
for (const file of ["package.json", "package-lock.json"]) {
  const value = JSON.parse(read(file));
  value.version = VERSION;
  if (value.packages?.[""]) value.packages[""].version = VERSION;
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

// README and changelog retain prior release history while making V15.2.9 current.
{
  let value = read("README.md");
  value = ensureReplace(value, "# My Finance Records · V15.2.8", "# My Finance Records · V15.2.9", "README heading");
  value = ensureReplace(value, "Current release: **V15.2.8 · PWA UI Ownership Cleanup**", "Current release: **V15.2.9 · UI Asset Delivery Hotfix**", "README current release");
  value = ensureReplace(value, "Released: **August 19, 2026**", "Released: **August 20, 2026**", "README release date");
  value = ensureReplace(
    value,
    "V15.2.8 consolidates Cash Flow presentation ownership in `assets/css/desktop-ux-v15-2-0.css` and removes the duplicate runtime-injected Cash Flow stylesheet from the PWA update module while preserving the current rendered UI, finance behavior, storage, sync/conflict handling, and installed-PWA compatibility.",
    "V15.2.9 refreshes sidebar icon delivery so stale installed PWAs recover the supplied PNG navigation artwork, restores the native sliders glyph for Quick actions, and gives the collapsed Monthly budget plan disclosure its own aligned column without changing finance behavior, storage, sync/conflict handling, or schemas.",
    "README release summary"
  );
  write("README.md", value);
}
{
  let value = read("CHANGELOG.md");
  const heading = "## 15.2.9 · 2026-08-20";
  if (!value.startsWith(heading)) {
    value = `${heading}\n- Versioned the supplied sidebar PNG URLs, made sidebar icon requests network-first with cache fallback, and added a one-retry runtime recovery path that hides a failed image instead of leaving the browser broken-image placeholder.\n- Restored the existing native sliders SVG for More tools → Quick actions while leaving Theme, Quick add, Customize dashboard, and Search artwork unchanged.\n- Moved the collapsed Monthly budget plan disclosure into its own 40px desktop grid column, preserving 44px phone/touch sizing and preventing overlap with Forecast month-end.\n- Rotated the PWA shell to \`${CACHE}\` and kept Finance Schema 12, Cloud Schema V3, finance calculations, balances, records, storage, authentication, sync/conflict behavior, and five-minute Cloud Sync behavior unchanged.\n\n${value}`;
  }
  write("CHANGELOG.md", value);
}

// Application shell: current release metadata, cache-busted UI files, and versioned sidebar artwork.
{
  let value = read("index.html");
  value = value.replaceAll(OLD_VERSION, VERSION);
  value = ensureReplace(value, "Application Help Module Extraction", RELEASE, "index release name");
  value = ensureReplace(value, "August 19, 2026", RELEASE_DATE_LONG, "index release date");
  value = ensureReplace(value, OLD_CACHE, CACHE, "index cache version");
  value = ensureReplace(value, "./budget-planning.css?v=15.1.0-desktop3", "./budget-planning.css?v=15.2.9-ui1", "budget stylesheet URL");
  value = ensureReplace(value, "./ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1", "./ui-icon-alignment-v15-0-5.css?v=15.2.9-ui2", "UI alignment stylesheet URL");
  for (const name of ["overview", "finance", "work", "settings"]) {
    value = ensureReplace(value, `./icons/sidebar-${name}.png\"`, `./icons/sidebar-${name}.png?v=15.2.9-icon1\"`, `sidebar ${name} URL`);
  }
  value = ensureReplace(value, "./icons/sidebar-insights-v14-0-24.png\"", "./icons/sidebar-insights-v14-0-24.png?v=15.2.9-icon1\"", "sidebar insights URL");
  if (!value.includes('"version":"V15.2.9"')) {
    const marker = "    VERSION_HISTORY.unshift(";
    if (!value.includes(marker)) throw new Error("Missing VERSION_HISTORY insertion point");
    const entry = '{"version":"V15.2.9","title":"UI Asset Delivery Hotfix","changes":["Refreshes the supplied sidebar PNG artwork through versioned, network-first delivery with a retry-safe broken-image fallback.","Restores the native Quick actions sliders glyph and aligns the collapsed Monthly budget plan disclosure in its own column.","Preserves Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, storage, authentication, sync/conflict behavior, and five-minute Cloud Sync cadence."]},';
    value = value.replace(marker, `${marker}${entry}`);
  }
  write("index.html", value);
}

// Release compatibility display.
{
  let value = read("assets/js/ui/sync-runtime-compat.js");
  value = ensureReplace(value, 'const VERSION = "15.2.8";', 'const VERSION = "15.2.9";', "release-layer version");
  value = ensureReplace(value, 'const RELEASE_NAME = "PWA UI Ownership Cleanup";', `const RELEASE_NAME = "${RELEASE}";`, "release-layer name");
  value = ensureReplace(value, 'const RELEASE_DATE = "August 19, 2026";', `const RELEASE_DATE = "${RELEASE_DATE_LONG}";`, "release-layer date");
  value = ensureReplace(value, 'released:"2026-08-19"', `released:"${RELEASE_DATE}"`, "release-layer canonical date");
  write("assets/js/ui/sync-runtime-compat.js", value);
}

// PWA updater keeps its responsibilities but gains resilient sidebar icon recovery.
{
  let value = read("assets/js/pwa-update-v15-0-5.js");
  value = ensureReplace(value, OLD_CACHE, CACHE, "PWA updater cache");
  if (!value.includes("function installSidebarIconRecovery()")) {
    const marker = "  installSidebarBrand();\n\n  function parseMoneyText";
    if (!value.includes(marker)) throw new Error("Missing sidebar recovery insertion point");
    const block = `  installSidebarBrand();\n\n  function installSidebarIconRecovery() {\n    const doc = root.document;\n    if (!doc) return;\n    const bind = img => {\n      if (img.dataset.sidebarIconRecoveryBound === \"true\") return;\n      img.dataset.sidebarIconRecoveryBound = \"true\";\n      img.dataset.sidebarIconSource = img.getAttribute(\"src\") || \"\";\n      img.addEventListener(\"load\", () => {\n        img.hidden = false;\n        delete img.dataset.sidebarIconFailed;\n      });\n      img.addEventListener(\"error\", () => {\n        if (img.dataset.sidebarIconRetried !== \"true\") {\n          img.dataset.sidebarIconRetried = \"true\";\n          const url = new URL(img.dataset.sidebarIconSource || img.src, doc.baseURI);\n          url.searchParams.set(\"v\", \"15.2.9-icon1\");\n          url.searchParams.set(\"retry\", \"1\");\n          img.src = url.href;\n          return;\n        }\n        img.dataset.sidebarIconFailed = \"true\";\n        img.hidden = true;\n      });\n    };\n    const apply = () => doc.querySelectorAll(\".sidebar .nav-icon-image\").forEach(bind);\n    if (doc.readyState === \"loading\") {\n      const observer = new MutationObserver(apply);\n      observer.observe(doc.documentElement, { childList:true, subtree:true });\n      doc.addEventListener(\"DOMContentLoaded\", () => { apply(); observer.disconnect(); }, { once:true });\n    } else apply();\n  }\n  installSidebarIconRecovery();\n\n  function parseMoneyText`;
    value = value.replace(marker, block);
  }
  write("assets/js/pwa-update-v15-0-5.js", value);
}

// Quick actions returns to the existing sliders/control SVG instead of the command-like PNG.
appendOnce(
  "assets/css/ui-icon-alignment-v15-0-5.css",
  "V15.2.9 · Quick actions keeps the native sliders SVG",
  `/* V15.2.9 · Quick actions keeps the native sliders SVG. */\nhtml body #topbarToolsPanel #productivityCenterButton .toolbar-icon {\n  background-image:none !important;\n}\nhtml body #topbarToolsPanel #productivityCenterButton .toolbar-icon > svg {\n  opacity:1 !important;\n}`
);

// Monthly budget plan gets a dedicated disclosure column instead of an absolute overlay.
appendOnce(
  "assets/css/budget-planning.css",
  "V15.2.9 · collapsed Monthly budget plan uses a dedicated disclosure column",
  `/* V15.2.9 · collapsed Monthly budget plan uses a dedicated disclosure column. */\n@media (min-width:701px) {\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed {\n    grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 40px;\n    gap:10px;\n    padding:6px 8px 6px 12px;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-header {\n    grid-column:1;\n    grid-row:1;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-body {\n    grid-column:2;\n    grid-row:1;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-actions {\n    position:static;\n    grid-column:3;\n    grid-row:1;\n    top:auto;\n    right:auto;\n    margin:0;\n    transform:none;\n    align-self:center;\n    justify-content:center;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed #monthlyBudgetPlannerToggle {\n    box-sizing:border-box;\n    width:40px;\n    min-width:40px;\n    height:40px;\n    min-height:40px;\n    padding:0;\n  }\n}\n@media (min-width:701px) and (max-width:1024px) and (pointer:coarse),\n       (min-width:701px) and (max-width:1024px) and (hover:none) {\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed {\n    grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 44px;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed #monthlyBudgetPlannerToggle {\n    width:44px !important;\n    min-width:44px !important;\n    height:44px !important;\n    min-height:44px !important;\n  }\n}`
);

// Service worker: real release/cache bump, versioned icon precache, and network-first sidebar recovery.
{
  let value = read("sw.js");
  value = value.replaceAll(OLD_VERSION, VERSION);
  value = ensureReplace(value, OLD_CACHE, CACHE, "service-worker cache");
  value = ensureReplace(value, "// V15.2.9 consolidates Cash Flow presentation ownership in static CSS without changing Finance or sync behavior.", "// V15.2.9 refreshes sidebar icon delivery and disclosure/icon presentation without changing Finance or sync behavior.\n// V15.2.8 consolidates Cash Flow presentation ownership in static CSS without changing Finance or sync behavior.", "service-worker release comment");
  value = ensureReplace(value, "./budget-planning.css?v=15.1.0-desktop3", "./budget-planning.css?v=15.2.9-ui1", "service-worker budget stylesheet URL");
  value = ensureReplace(value, "./ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1", "./ui-icon-alignment-v15-0-5.css?v=15.2.9-ui2", "service-worker UI stylesheet URL");
  for (const name of ["overview", "finance", "work", "settings"]) {
    value = ensureReplace(value, `./icons/sidebar-${name}.png\")`, `./icons/sidebar-${name}.png?v=15.2.9-icon1\")`, `service-worker sidebar ${name}`);
  }
  value = ensureReplace(value, "./icons/sidebar-insights-v14-0-24.png\")", "./icons/sidebar-insights-v14-0-24.png?v=15.2.9-icon1\")", "service-worker sidebar insights");
  if (!value.includes('url.pathname.includes("/icons/sidebar-")')) {
    value = ensureReplace(
      value,
      'url.pathname.endsWith("black-canvas-v15-1-0.css")) {',
      'url.pathname.endsWith("black-canvas-v15-1-0.css") || url.pathname.includes("/icons/sidebar-")) {',
      "sidebar network-first route"
    );
  }
  write("sw.js", value);
}

// Current-release assertions: tests should follow the new app/cache generation and UI asset URLs.
{
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
        let value = fs.readFileSync(full, "utf8");
        value = value.replaceAll(OLD_CACHE, CACHE);
        value = value.replaceAll(OLD_VERSION, VERSION);
        value = value.replaceAll("PWA UI Ownership Cleanup", RELEASE);
        value = value.replaceAll("ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1", "ui-icon-alignment-v15-0-5.css?v=15.2.9-ui2");
        value = value.replaceAll("budget-planning.css?v=15.1.0-desktop3", "budget-planning.css?v=15.2.9-ui1");
        fs.writeFileSync(full, value);
      }
    }
  };
  visit(path.join(root, "tests"));
}

// Dedicated browser regression for the screenshots reported before PR 4.
{
  const file = path.join(root, "tests/browser/ui-asset-delivery-v15-2-9.spec.mjs");
  const source = `import { expect, test } from \"@playwright/test\";\n\nconst base = \"http://127.0.0.1:3000\";\n\nasync function unlock(page, route = \"dashboard\") {\n  await page.goto(\`\${base}/?page=\${route}\`, { waitUntil:\"networkidle\" });\n  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));\n  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));\n}\n\ntest(\"V15.2.9 sidebar PNGs load and broken-image recovery is bound\", async ({ page }) => {\n  await page.setViewportSize({ width:1440, height:900 });\n  await unlock(page);\n  await page.locator(\"#sidebar\").evaluate(sidebar => {\n    sidebar.classList.add(\"sidebar-pinned\");\n    sidebar.classList.remove(\"desktop-open\");\n    sidebar.setAttribute(\"aria-hidden\", \"false\");\n  });\n  const images = page.locator(\"#sidebar .nav-icon-image\");\n  await expect(images).toHaveCount(5);\n  await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0))).toBe(true);\n  const sources = await images.evaluateAll(nodes => nodes.map(img => img.getAttribute(\"src\")));\n  expect(sources.every(src => /v=15\\.2\\.9-icon1/.test(src || \"\"))).toBe(true);\n  await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.dataset.sidebarIconRecoveryBound === \"true\"))).toBe(true);\n\n  const first = images.first();\n  await first.evaluate(img => { img.dataset.sidebarIconRetried = \"true\"; img.src = \"./icons/definitely-missing-sidebar-icon.png\"; });\n  await expect.poll(() => first.evaluate(img => img.hidden && img.dataset.sidebarIconFailed === \"true\")).toBe(true);\n});\n\ntest(\"V15.2.9 Quick actions uses the native sliders SVG\", async ({ page }) => {\n  await page.setViewportSize({ width:1440, height:900 });\n  await unlock(page);\n  await page.locator(\"#topbarToolsTrigger\").click();\n  const button = page.locator(\"#productivityCenterButton\");\n  await expect(button).toBeVisible();\n  const icon = await button.locator(\".toolbar-icon\").evaluate(node => ({\n    background:getComputedStyle(node).backgroundImage,\n    svgOpacity:getComputedStyle(node.querySelector(\"svg\")).opacity,\n    paths:node.querySelectorAll(\"svg path\").length\n  }));\n  expect(icon.background).toBe(\"none\");\n  expect(icon.svgOpacity).toBe(\"1\");\n  expect(icon.paths).toBeGreaterThan(0);\n});\n\nfor (const width of [1200,1280,1440]) {\n  test(\`V15.2.9 Monthly budget plan disclosure does not overlap Forecast at \${width}px\`, async ({ page }) => {\n    await page.setViewportSize({ width, height:900 });\n    await unlock(page, \"money\");\n    const card = page.locator(\"#monthlyBudgetPlannerCard\");\n    const toggle = page.locator(\"#monthlyBudgetPlannerToggle\");\n    await expect(card).toBeVisible();\n    if (await toggle.getAttribute(\"aria-expanded\") === \"true\") await toggle.click();\n    await expect(card).toHaveClass(/is-planner-collapsed/);\n    const metrics = await page.evaluate(() => {\n      const toggle = document.getElementById(\"monthlyBudgetPlannerToggle\").getBoundingClientRect();\n      const visible = [...document.querySelectorAll(\"#monthlyBudgetPlannerCard .budget-plan-kpi\")].filter(node => getComputedStyle(node).display !== \"none\");\n      const forecast = visible.at(-1).getBoundingClientRect();\n      const card = document.getElementById(\"monthlyBudgetPlannerCard\").getBoundingClientRect();\n      return {\n        toggle:{ left:toggle.left, right:toggle.right, width:toggle.width },\n        forecast:{ left:forecast.left, right:forecast.right },\n        card:{ left:card.left, right:card.right },\n        visible:visible.length\n      };\n    });\n    expect(metrics.visible).toBe(3);\n    expect(metrics.toggle.width).toBe(40);\n    expect(metrics.forecast.right).toBeLessThanOrEqual(metrics.toggle.left - 4);\n    expect(metrics.toggle.right).toBeLessThanOrEqual(metrics.card.right);\n  });\n}\n`;
  fs.writeFileSync(file, source);
}

console.log(`Prepared V${VERSION} ${RELEASE} · ${CACHE}`);
