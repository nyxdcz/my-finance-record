import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const OLD_VERSION = "15.2.9";
const VERSION = "15.2.10";
const OLD_CACHE = "finance-v15-20260820-ui-asset-delivery-r45";
const CACHE = "finance-v15-20260820-sidebar-icons-r46";
const OLD_RELEASE = "UI Asset Delivery Hotfix";
const RELEASE = "Embedded Sidebar Icon Hotfix";
const RELEASE_DATE = "2026-08-20";
const RELEASE_DATE_LONG = "August 20, 2026";

const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);
const mustReplace = (value, from, to, label) => {
  if (value.includes(to)) return value;
  if (!value.includes(from)) throw new Error(`Missing ${label || from}`);
  return value.replace(from, to);
};
const replaceAllRequired = (value, from, to, label) => {
  if (!value.includes(from) && !value.includes(to)) throw new Error(`Missing ${label || from}`);
  return value.replaceAll(from, to);
};
const sidebarIcons = [
  ["dashboard", "overview", "icons/sidebar-overview.png"],
  ["money", "finance", "icons/sidebar-finance.png"],
  ["projects", "work", "icons/sidebar-work.png"],
  ["reports", "insights", "icons/sidebar-insights-v14-0-24.png"],
  ["settings", "settings", "icons/sidebar-settings.png"]
];
const dataUri = file => `data:image/png;base64,${fs.readFileSync(path.join(root, file)).toString("base64")}`;

// Canonical release metadata.
{
  const version = JSON.parse(read("version.json"));
  version.version = VERSION;
  version.cacheVersion = CACHE;
  version.released = RELEASE_DATE;
  version.name = RELEASE;
  version.notes = "V15.2.10 embeds the canonical sidebar PNG artwork directly in the application shell, removes obsolete CSS content:url overrides and sidebar-image network recovery, and keeps sidebar rendering independent of external PNG requests. Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, storage, authentication, sync/conflict behavior, and the five-minute sync cadence are unchanged.";
  write("version.json", `${JSON.stringify(version, null, 2)}\n`);
}
for (const file of ["package.json", "package-lock.json"]) {
  const value = JSON.parse(read(file));
  value.version = VERSION;
  if (value.packages?.[""]) value.packages[""].version = VERSION;
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

// README + changelog.
{
  let value = read("README.md");
  value = mustReplace(value, "# My Finance Records · V15.2.9", "# My Finance Records · V15.2.10", "README heading");
  value = mustReplace(value, "Current release: **V15.2.9 · UI Asset Delivery Hotfix**", "Current release: **V15.2.10 · Embedded Sidebar Icon Hotfix**", "README release");
  value = mustReplace(
    value,
    "V15.2.9 refreshes sidebar icon delivery so stale installed PWAs recover the supplied PNG navigation artwork, restores the native sliders glyph for Quick actions, and gives the collapsed Monthly budget plan disclosure its own aligned column without changing finance behavior, storage, sync/conflict handling, or schemas.",
    "V15.2.10 embeds the canonical sidebar PNG artwork directly in the app shell and removes obsolete CSS image overrides, so Overview, Finance, Work, Insights, and Settings no longer depend on separate sidebar-image requests. Finance behavior, storage, sync/conflict handling, and schemas remain unchanged.",
    "README summary"
  );
  write("README.md", value);
}
{
  let value = read("CHANGELOG.md");
  const heading = "## 15.2.10 · 2026-08-20";
  if (!value.startsWith(heading)) {
    value = `${heading}\n- Embedded the canonical Overview, Finance, Work, Insights, and Settings PNG artwork directly in the sidebar markup so those icons render without separate image requests.\n- Removed the obsolete V14.0.24 CSS content:url sidebar overrides that referenced missing Overview, Finance, Work, and Settings files and caused the browser broken-image placeholders seen on the live V15.2.9 app.\n- Removed the now-unneeded runtime sidebar image retry logic and sidebar-image service-worker precache/network-first route.\n- Rotated the PWA shell to \`${CACHE}\` while keeping Finance Schema 12, Cloud Schema V3, finance calculations, balances, records, storage, authentication, sync/conflict behavior, and five-minute Cloud Sync unchanged.\n\n${value}`;
  }
  write("CHANGELOG.md", value);
}

// App shell: release metadata, cache-sensitive runtime URLs, and inline canonical sidebar images.
{
  let value = read("index.html");
  value = mustReplace(value, `<title>My Finance Records · V${OLD_VERSION}</title>`, `<title>My Finance Records · V${VERSION}</title>`, "page title");
  value = mustReplace(value, `id="buildBadge" title="V${OLD_VERSION} · ${OLD_RELEASE} · ${RELEASE_DATE_LONG}">V${OLD_VERSION}</small>`, `id="buildBadge" title="V${VERSION} · ${RELEASE} · ${RELEASE_DATE_LONG}">V${VERSION}</small>`, "build badge");
  value = mustReplace(value, `const APP_VERSION = "${OLD_VERSION}";`, `const APP_VERSION = "${VERSION}";`, "APP_VERSION");
  value = mustReplace(value, `const APP_RELEASE_NAME = "${OLD_RELEASE}";`, `const APP_RELEASE_NAME = "${RELEASE}";`, "APP_RELEASE_NAME");
  value = mustReplace(value, `const APP_CACHE_VERSION = "${OLD_CACHE}";`, `const APP_CACHE_VERSION = "${CACHE}";`, "APP_CACHE_VERSION");
  value = mustReplace(value, `./dashboard-interactions.css?v=15.1.0-desktop3`, `./dashboard-interactions.css?v=${VERSION}-icons1`, "dashboard interactions URL");
  value = mustReplace(value, `./pwa-update-v15-0-5.js?v=${OLD_VERSION}-release1`, `./pwa-update-v15-0-5.js?v=${VERSION}-release1`, "PWA updater URL");
  value = mustReplace(value, `./sync-config.js?v=${OLD_VERSION}-release1`, `./sync-config.js?v=${VERSION}-release1`, "sync config URL");
  value = mustReplace(value, `./sync-runtime-compat.js?v=${OLD_VERSION}-priority4a1`, `./sync-runtime-compat.js?v=${VERSION}-priority4a1`, "sync runtime URL");

  for (const [, name, file] of sidebarIcons) {
    const re = new RegExp(`(<img class="nav-icon-image" src=")\\.\\/icons\\/sidebar-${name === "insights" ? "insights-v14-0-24" : name}\\.png(?:\\?v=${OLD_VERSION.replaceAll(".", "\\.")}-icon1)?(" alt="">)`);
    if (!re.test(value)) throw new Error(`Missing sidebar ${name} img source`);
    value = value.replace(re, `$1${dataUri(file)}$2`);
  }

  if (!value.includes('"version":"V15.2.10"')) {
    const marker = `VERSION_HISTORY.unshift({"version":"V15.2.9"`;
    if (!value.includes(marker)) throw new Error("Missing V15.2.9 VERSION_HISTORY insertion point");
    const entry = `VERSION_HISTORY.unshift({"version":"V15.2.10","title":"${RELEASE}","changes":["Embeds the canonical sidebar PNG artwork directly in the app shell so navigation icons no longer depend on separate image requests.","Removes obsolete V14.0.24 CSS content:url overrides and the no-longer-needed runtime/service-worker sidebar image recovery path.","Preserves Finance Schema 12, Cloud Schema V3, finance records, calculations, balances, storage, authentication, sync/conflict behavior, and five-minute Cloud Sync cadence."]},`;
    value = value.replace("VERSION_HISTORY.unshift(", entry);
  }
  write("index.html", value);
}

// Remove the actual root cause: CSS content:url overrides pointing at missing V14.0.24 files.
{
  let value = read("assets/css/dashboard-interactions.css");
  const before = value;
  value = value.replace(/\.sidebar \.nav-button\[data-page="dashboard"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-overview-v14-0-24\.png"\)\}\n/, "");
  value = value.replace(/\.sidebar \.nav-button\[data-page="money"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-finance-v14-0-24\.png"\)\}\n/, "");
  value = value.replace(/\.sidebar \.nav-button\[data-page="projects"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-work-v14-0-24\.png"\)\}\n/, "");
  value = value.replace(/\.sidebar \.nav-button\[data-page="reports"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-insights-v14-0-24\.png"\)\}\n/, "");
  value = value.replace(/\.sidebar \.settings-nav-button \.nav-icon-image\{content:url\("\.\/icons\/sidebar-settings-v14-0-24\.png"\)\}\n/, "");
  if (value === before) throw new Error("Missing obsolete sidebar content:url overrides");
  value = value.replace("/* V14.0.24 · supplied sidebar navigation icons · cache-safe rendering */", "/* V15.2.10 · canonical sidebar PNGs are embedded in markup; CSS only controls geometry. */");
  write("assets/css/dashboard-interactions.css", value);
}

// Remove runtime image retry: data URIs cannot fail because of the Pages/CDN path.
{
  let value = read("assets/js/pwa-update-v15-0-5.js");
  value = mustReplace(value, OLD_CACHE, CACHE, "PWA updater cache");
  const re = /\n  function installSidebarIconRecovery\(\) \{[\s\S]*?\n  \}\n  installSidebarIconRecovery\(\);\n/;
  if (!re.test(value)) throw new Error("Missing installSidebarIconRecovery block");
  value = value.replace(re, "\n");
  write("assets/js/pwa-update-v15-0-5.js", value);
}

// Current release display source.
{
  let value = read("assets/js/ui/sync-runtime-compat.js");
  value = mustReplace(value, `const VERSION = "${OLD_VERSION}";`, `const VERSION = "${VERSION}";`, "runtime version");
  value = mustReplace(value, `const RELEASE_NAME = "${OLD_RELEASE}";`, `const RELEASE_NAME = "${RELEASE}";`, "runtime release name");
  write("assets/js/ui/sync-runtime-compat.js", value);
}

// Service worker no longer owns sidebar PNG requests; the physical files remain in /icons as canonical source art.
{
  let value = read("sw.js");
  value = mustReplace(value, `const APP_VERSION = "${OLD_VERSION}";`, `const APP_VERSION = "${VERSION}";`, "worker version");
  value = mustReplace(value, OLD_CACHE, CACHE, "worker cache");
  value = mustReplace(value, `./dashboard-interactions.css?v=15.1.0-desktop3`, `./dashboard-interactions.css?v=${VERSION}-icons1`, "worker dashboard CSS URL");
  value = mustReplace(value, `./pwa-update-v15-0-5.js?v=${OLD_VERSION}-release1`, `./pwa-update-v15-0-5.js?v=${VERSION}-release1`, "worker PWA URL");
  value = mustReplace(value, `./sync-config.js?v=${OLD_VERSION}-release1`, `./sync-config.js?v=${VERSION}-release1`, "worker sync config URL");
  value = mustReplace(value, `./sync-runtime-compat.js?v=${OLD_VERSION}-priority4a1`, `./sync-runtime-compat.js?v=${VERSION}-priority4a1`, "worker sync runtime URL");
  for (const [, name] of sidebarIcons) {
    const assetName = name === "insights" ? "sidebar-insights-v14-0-24.png" : `sidebar-${name}.png`;
    const re = new RegExp(`\\s*asset\\("\\.\\/icons\\/${assetName.replaceAll(".", "\\.")}\\?v=${OLD_VERSION.replaceAll(".", "\\.")}-icon1"\\),\\n`);
    if (!re.test(value)) throw new Error(`Missing worker ${assetName} precache entry`);
    value = value.replace(re, "\n");
  }
  const sidebarNetworkRoute = ` || url.pathname.includes("/icons/sidebar-")`;
  if (!value.includes(sidebarNetworkRoute)) throw new Error("Missing sidebar network-first route");
  value = value.replace(sidebarNetworkRoute, "");
  write("sw.js", value);
}

// Update current-release test pins mechanically, then replace the V15.2.9 sidebar regression with the stronger V15.2.10 contract.
{
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
        let value = fs.readFileSync(full, "utf8");
        value = value.replaceAll(OLD_CACHE, CACHE);
        value = value.replaceAll(`"${OLD_VERSION}"`, `"${VERSION}"`);
        value = value.replaceAll(OLD_RELEASE, RELEASE);
        value = value.replaceAll(`dashboard-interactions\\.css\\?v=15\\.1\\.0-desktop3`, `dashboard-interactions\\.css\\?v=15\\.2\\.10-icons1`);
        value = value.replaceAll(`dashboard-interactions.css?v=15.1.0-desktop3`, `dashboard-interactions.css?v=15.2.10-icons1`);
        value = value.replaceAll(`pwa-update-v15-0-5\\.js\\?v=15\\.2\\.9-release1`, `pwa-update-v15-0-5\\.js\\?v=15\\.2\\.10-release1`);
        value = value.replaceAll(`pwa-update-v15-0-5.js?v=15.2.9-release1`, `pwa-update-v15-0-5.js?v=15.2.10-release1`);
        fs.writeFileSync(full, value);
      }
    }
  };
  visit(path.join(root, "tests"));

  const oldFile = path.join(root, "tests/browser/ui-asset-delivery-v15-2-9.spec.mjs");
  const newFile = path.join(root, "tests/browser/ui-asset-delivery-v15-2-10.spec.mjs");
  const browser = `import { expect, test } from "@playwright/test";\n\nconst base = "http://127.0.0.1:3000";\n\ntest.describe.configure({ mode:"serial" });\n\nasync function unlock(page, route = "dashboard") {\n  await page.goto(\`\${base}/?page=\${route}\`, { waitUntil:"networkidle" });\n  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));\n  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));\n}\n\nasync function assertEmbeddedSidebar(page) {\n  const images = page.locator("#sidebar .nav-icon-image");\n  await expect(images).toHaveCount(5);\n  await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0))).toBe(true);\n  const sources = await images.evaluateAll(nodes => nodes.map(img => img.getAttribute("src") || ""));\n  expect(sources.every(src => src.startsWith("data:image/png;base64,"))).toBe(true);\n  await expect.poll(() => images.evaluateAll(nodes => nodes.every(img => getComputedStyle(img).content === "normal" || getComputedStyle(img).content === "none"))).toBe(true);\n}\n\ntest("V15.2.10 sidebar icons render with every external sidebar PNG request blocked", async ({ page }) => {\n  const sidebarRequests = [];\n  await page.route("**/icons/sidebar-*.png*", route => { sidebarRequests.push(route.request().url()); return route.abort(); });\n  await page.setViewportSize({ width:1440, height:900 });\n  await unlock(page);\n  await page.locator("#sidebar").evaluate(sidebar => {\n    sidebar.classList.add("sidebar-pinned");\n    sidebar.classList.remove("desktop-open");\n    sidebar.setAttribute("aria-hidden", "false");\n  });\n  await assertEmbeddedSidebar(page);\n  expect(sidebarRequests).toEqual([]);\n});\n\ntest("V15.2.10 embedded sidebar icons survive collapsed rail and phone drawer", async ({ page }) => {\n  const sidebarRequests = [];\n  await page.route("**/icons/sidebar-*.png*", route => { sidebarRequests.push(route.request().url()); return route.abort(); });\n  await page.setViewportSize({ width:1280, height:820 });\n  await unlock(page);\n  await page.locator("#sidebar").evaluate(sidebar => {\n    sidebar.classList.remove("sidebar-pinned", "desktop-open");\n    sidebar.setAttribute("aria-hidden", "false");\n  });\n  await assertEmbeddedSidebar(page);\n  await page.setViewportSize({ width:390, height:844 });\n  const menu = page.locator("#menuButton");\n  if (await menu.isVisible()) await menu.click();\n  await expect(page.locator("#sidebar")).toBeVisible();\n  await assertEmbeddedSidebar(page);\n  expect(sidebarRequests).toEqual([]);\n});\n\ntest("V15.2.9 Quick actions uses the native sliders SVG", async ({ page }) => {\n  await page.setViewportSize({ width:1440, height:900 });\n  await unlock(page);\n  await page.locator("#topbarToolsTrigger").click();\n  const button = page.locator("#productivityCenterButton");\n  await expect(button).toBeVisible();\n  const icon = await button.locator(".toolbar-icon").evaluate(node => ({ background:getComputedStyle(node).backgroundImage, svgOpacity:getComputedStyle(node.querySelector("svg")).opacity, paths:node.querySelectorAll("svg path").length }));\n  expect(icon.background).toBe("none");\n  expect(icon.svgOpacity).toBe("1");\n  expect(icon.paths).toBeGreaterThan(0);\n});\n\nfor (const width of [1200,1280,1440]) {\n  test(\`V15.2.9 Monthly budget plan disclosure does not overlap Forecast at \${width}px\`, async ({ page }) => {\n    await page.setViewportSize({ width, height:900 });\n    await unlock(page, "money");\n    const card = page.locator("#monthlyBudgetPlannerCard");\n    const toggle = page.locator("#monthlyBudgetPlannerToggle");\n    await expect(card).toBeVisible();\n    if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();\n    await expect(card).toHaveClass(/is-planner-collapsed/);\n    const metrics = await page.evaluate(() => {\n      const toggle = document.getElementById("monthlyBudgetPlannerToggle").getBoundingClientRect();\n      const visible = [...document.querySelectorAll("#monthlyBudgetPlannerCard .budget-plan-kpi")].filter(node => getComputedStyle(node).display !== "none");\n      const forecast = visible.at(-1).getBoundingClientRect();\n      const card = document.getElementById("monthlyBudgetPlannerCard").getBoundingClientRect();\n      return { toggle:{ left:toggle.left, right:toggle.right, width:toggle.width }, forecast:{ left:forecast.left, right:forecast.right }, card:{ left:card.left, right:card.right }, visible:visible.length };\n    });\n    expect(metrics.visible).toBe(3);\n    expect(metrics.toggle.width).toBe(40);\n    expect(metrics.forecast.right).toBeLessThanOrEqual(metrics.toggle.left - 4);\n    expect(metrics.toggle.right).toBeLessThanOrEqual(metrics.card.right);\n  });\n}\n`;
  write("tests/browser/ui-asset-delivery-v15-2-10.spec.mjs", browser);
  if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
}

// Source-level regression proving the live failure path is gone.
write("tests/regression/validate-sidebar-embedded-v15-2-10.mjs", `#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst index = fs.readFileSync("index.html", "utf8");\nconst dashboardCss = fs.readFileSync("dashboard-interactions.css", "utf8");\nconst updater = fs.readFileSync("pwa-update-v15-0-5.js", "utf8");\nconst worker = fs.readFileSync("sw.js", "utf8");\nconst embedded = index.match(/<img class="nav-icon-image" src="data:image\\/png;base64,[^"]+" alt="">/g) || [];\nassert.equal(embedded.length, 5, "all five sidebar icons must be embedded PNG data URIs");\nassert.doesNotMatch(dashboardCss, /sidebar-(?:overview|finance|work|settings)-v14-0-24\\.png/);\nassert.doesNotMatch(dashboardCss, /nav-icon-image\\{content:url/);\nassert.doesNotMatch(updater, /installSidebarIconRecovery|sidebarIconRecoveryBound|sidebarIconRetried/);\nassert.doesNotMatch(worker, /asset\\("\\.\\/icons\\/sidebar-/);\nassert.doesNotMatch(worker, /url\\.pathname\\.includes\\("\\/icons\\/sidebar-"\\)/);\nfor (const file of ["icons/sidebar-overview.png","icons/sidebar-finance.png","icons/sidebar-work.png","icons/sidebar-insights-v14-0-24.png","icons/sidebar-settings.png"]) assert.equal(fs.existsSync(file), true, \`canonical source icon missing: \${file}\`);\nconsole.log("V15.2.10 embedded sidebar icon regression passed.");\n`);

console.log(`Applied V${VERSION} embedded sidebar icon hotfix.`);
