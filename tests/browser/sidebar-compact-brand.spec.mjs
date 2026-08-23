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
          <div class="brand"><strong>Talaan</strong></div>
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
  await page.addStyleTag({ url:"http://127.0.0.1:3000/sidebar-compact-brand.css?v=2.0.1-talaan5" });
}

test("desktop sidebar collapses to 64px and expands compactly to 190px with Talaan branding", async ({ page }) => {
  await page.setViewportSize({ width:1280, height:800 });
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await installSidebarFixture(page);

  const sidebar = page.locator("#sidebar");
  const main = page.locator(".main");
  const brand = page.locator(".brand");
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
  expect(await active.evaluate(node => getComputedStyle(node, "::after").content)).toBe('"Finance"');

  await page.evaluate(() => document.getElementById("sidebar").classList.add("desktop-open"));
  await expect(sidebar).toHaveCSS("width", "190px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(brand).toBeVisible();
  await expect(brand.locator("strong")).toHaveText("Talaan");
  await expect(firstLabel).toHaveCSS("opacity", "1");
  await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(activeIcon).toHaveCSS("background-color", "rgb(53, 111, 209)");
  expect(await active.evaluate(node => getComputedStyle(node, "::after").content)).toBe("none");

  const brandMark = await brand.evaluate(node => {
    const style = getComputedStyle(node, "::before");
    return { width:style.width, height:style.height, image:style.backgroundImage };
  });
  expect(brandMark.width).toBe("15px");
  expect(brandMark.height).toBe("15px");
  expect(brandMark.image).toContain("talaan-brand-logo.png");

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

test("mobile brand keeps Talaan text with the uploaded logo at a smaller 15px size", async ({ page, request }) => {
  await page.setViewportSize({ width:390, height:844 });
  const logoResponse = await request.get("http://127.0.0.1:3000/icons/talaan-brand-logo.png");
  expect(logoResponse.ok()).toBeTruthy();
  expect(logoResponse.headers()["content-type"] || "").toContain("image/png");

  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await installSidebarFixture(page, "open");

  const brand = page.locator(".brand");
  await expect(brand).toBeVisible();
  await expect(brand.locator("strong")).toHaveText("Talaan");

  const mark = await brand.evaluate(node => {
    const style = getComputedStyle(node, "::before");
    return { width:style.width, height:style.height, image:style.backgroundImage };
  });
  expect(mark.width).toBe("15px");
  expect(mark.height).toBe("15px");
  expect(mark.image).toContain("talaan-brand-logo.png");
});

test("runtime preparation owns the compact sidebar stylesheet and refreshes cached copies without changing release identity", () => {
  const prepare = fs.readFileSync("scripts/prepare-runtime.mjs", "utf8");
  const updater = fs.readFileSync("assets/js/pwa-update.js", "utf8");
  expect(prepare).toContain('"sidebar-compact-brand.css"');
  expect(prepare).toContain('const sidebarCssTag = `<link rel="stylesheet" href="./sidebar-compact-brand.css?v=${RELEASE.assetQuery}">`;');
  expect(updater).not.toContain("document");
  expect(updater).toContain('const CURRENT_CACHE_VERSION = "finance-v2-20260822-talaan-r5"');
  expect(updater).toContain('const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v2-0-1-talaan4"');
  expect(updater).toContain('pathname.endsWith("/sidebar-compact-brand.css")');
});
