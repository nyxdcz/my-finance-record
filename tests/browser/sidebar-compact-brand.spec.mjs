import fs from "node:fs";
import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

async function installSidebarFixture(page, extraSidebarClass = "") {
  await page.evaluate(sidebarClass => {
    document.body.className = "";
    document.body.innerHTML = `
      <div class="app">
        <aside class="sidebar ${sidebarClass}" id="sidebar">
          <button class="sidebar-close-button" type="button" aria-label="Pin navigation open"></button>
          <div class="brand"><img class="talaan-brand-logo" src="./icons/talaan-brand-logo.png?v=2.0.1-talaan6" alt="" aria-hidden="true"><strong>Talaan</strong></div>
          <nav class="sidebar-navigation">
            <button class="nav-button" data-nav-label="Overview"><span class="nav-icon"><span class="nav-icon-image"></span></span><span class="nav-label">Overview</span></button>
            <button class="nav-button active" data-nav-label="Finance"><span class="nav-icon"><span class="nav-icon-image"></span></span><span class="nav-label">Finance</span></button>
            <button class="nav-button" data-nav-label="Work"><span class="nav-icon"><span class="nav-icon-image"></span></span><span class="nav-label">Work</span></button>
            <button class="nav-button insights-nav-button" data-nav-label="Insights"><span class="nav-icon"><span class="nav-icon-image"></span></span><span class="nav-label">Insights</span></button>
            <div class="sidebar-settings-bottom"><button class="nav-button settings-nav-button" data-nav-label="Settings"><span class="nav-icon"><span class="nav-icon-image"></span></span><span class="nav-label">Settings</span></button></div>
          </nav>
        </aside>
        <main class="main">Workspace</main>
      </div>`;
  }, extraSidebarClass);
  await page.addStyleTag({ url:"http://127.0.0.1:3000/app.css?v=2.0.1-talaan5" });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/shell-ui.css?v=2.0.1-talaan5" });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/sidebar-compact-brand.css?v=2.0.1-talaan6" });
}

test("desktop sidebar collapses to 64px and expands compactly to 190px with readable Talaan tooltips", async ({ page }) => {
  await page.setViewportSize({ width:1280, height:800 });
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await installSidebarFixture(page);

  const sidebar = page.locator("#sidebar");
  const main = page.locator(".main");
  const brand = page.locator(".brand");
  const brandLogo = brand.locator(".talaan-brand-logo");
  const active = page.locator(".nav-button.active");
  const activeIcon = active.locator(".nav-icon");
  const firstLabel = page.locator(".nav-label").first();

  await expect(sidebar).toHaveCSS("width", "64px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(brand).toBeHidden();
  await expect(firstLabel).toHaveCSS("max-width", "0px");
  await expect(firstLabel).toHaveCSS("opacity", "0");
  await expect(page.locator(".insights-nav-button")).toBeVisible();
  await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(activeIcon).toHaveCSS("background-color", "rgb(53, 111, 209)");

  const collapsedTooltip = await active.evaluate(node => {
    const style = getComputedStyle(node, "::after");
    return {
      content:style.content,
      fontSize:style.fontSize,
      fontWeight:style.fontWeight,
      backgroundColor:style.backgroundColor,
      color:style.color,
      paddingTop:style.paddingTop,
      paddingRight:style.paddingRight,
      borderRadius:style.borderRadius
    };
  });
  expect(collapsedTooltip).toEqual({
    content:'"Finance"',
    fontSize:"13px",
    fontWeight:"700",
    backgroundColor:"rgb(31, 41, 55)",
    color:"rgb(255, 255, 255)",
    paddingTop:"7px",
    paddingRight:"10px",
    borderRadius:"7px"
  });

  await active.hover();
  await expect.poll(() => active.evaluate(node => getComputedStyle(node, "::after").opacity)).toBe("1");
  await active.focus();
  await expect.poll(() => active.evaluate(node => getComputedStyle(node, "::after").opacity)).toBe("1");

  await page.evaluate(() => document.getElementById("sidebar").classList.add("desktop-open"));
  await expect(sidebar).toHaveCSS("width", "190px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(brand).toBeVisible();
  await expect(brand.locator("strong")).toHaveText("Talaan");
  await expect(brandLogo).toBeVisible();
  await expect(brandLogo).toHaveCSS("width", "16px");
  await expect(brandLogo).toHaveCSS("height", "16px");
  await expect.poll(() => brandLogo.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
  await expect(firstLabel).toHaveCSS("opacity", "1");
  await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(activeIcon).toHaveCSS("background-color", "rgb(53, 111, 209)");
  expect(await active.evaluate(node => getComputedStyle(node, "::after").content)).toBe("none");

  await page.evaluate(() => {
    const rail = document.getElementById("sidebar");
    rail.classList.add("sidebar-pinned");
    document.body.classList.add("sidebar-layout-pinned");
  });
  await expect(sidebar).toHaveCSS("width", "190px");
  await expect(main).toHaveCSS("margin-left", "190px");

  await page.evaluate(() => {
    const rail = document.getElementById("sidebar");
    rail.classList.remove("desktop-open", "sidebar-pinned");
    document.body.classList.remove("sidebar-layout-pinned");
  });
  await expect(sidebar).toHaveCSS("width", "64px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(brand).toBeHidden();
  await expect(firstLabel).toHaveCSS("opacity", "0");
});

test("mobile brand keeps Talaan text with the real uploaded logo at 16px", async ({ page, request }) => {
  await page.setViewportSize({ width:390, height:844 });
  const logoResponse = await request.get("http://127.0.0.1:3000/icons/talaan-brand-logo.png?v=2.0.1-talaan6");
  expect(logoResponse.ok()).toBeTruthy();
  expect(logoResponse.headers()["content-type"] || "").toContain("image/png");

  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await installSidebarFixture(page, "open");

  const brand = page.locator(".brand");
  const mark = brand.locator(".talaan-brand-logo");
  await expect(brand).toBeVisible();
  await expect(brand.locator("strong")).toHaveText("Talaan");
  await expect(mark).toBeVisible();
  await expect(mark).toHaveCSS("width", "16px");
  await expect(mark).toHaveCSS("height", "16px");
  await expect.poll(() => mark.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
});

test("runtime preparation renders fresh real brand assets without changing release identity", () => {
  const prepare = fs.readFileSync("scripts/prepare-runtime.mjs", "utf8");
  const updater = fs.readFileSync("assets/js/pwa-update.js", "utf8");
  expect(prepare).toContain('"sidebar-compact-brand.css"');
  expect(prepare).toContain('const SIDEBAR_BRAND_ASSET_QUERY = "2.0.1-talaan6";');
  expect(prepare).toContain('class="talaan-brand-logo"');
  expect(prepare).toContain('src="./icons/talaan-brand-logo.png?v=${SIDEBAR_BRAND_ASSET_QUERY}"');
  expect(prepare).toContain('sidebar-compact-brand.css?v=${SIDEBAR_BRAND_ASSET_QUERY}');
  expect(updater).not.toContain("document");
  expect(updater).toContain('const CURRENT_CACHE_VERSION = "finance-v2-20260822-talaan-r5"');
  expect(updater).toContain('const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v2-0-1-talaan6"');
  expect(updater).toContain('pathname.endsWith("/sidebar-compact-brand.css")');
  expect(updater).toContain('pathname.endsWith("/talaan-brand-logo.png")');
});
