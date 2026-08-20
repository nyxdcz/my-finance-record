import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");

async function unlockApp(page, width, pageName = "dashboard") {
  await page.setViewportSize({ width, height:width <= 430 ? 852 : 800 });
  await page.goto(`http://127.0.0.1:3000/?page=${pageName}`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => document.querySelector(".sidebar .brand strong")?.textContent === "My Finance Records");
}

test("expanded and collapsed desktop sidebar use the static My Finance Records brand", async ({ page }) => {
  expect(source("index.html")).toContain("<strong>My Finance Records</strong>");
  expect(source("pwa-update-v15-0-5.js")).not.toContain("installSidebarBrand");
  expect(source("pwa-update-v15-0-5.js")).not.toContain("document");
  expect(source("ui-icon-alignment-v15-0-5.css")).toContain("width:28px !important");
  expect(source("ui-icon-alignment-v15-0-5.css")).toContain("white-space:nowrap !important");

  await unlockApp(page, 1280);

  await page.locator("#sidebar").evaluate(sidebar => {
    sidebar.classList.add("desktop-open");
    sidebar.classList.remove("sidebar-pinned");
    sidebar.setAttribute("aria-hidden", "false");
  });

  const readMetrics = () => page.evaluate(() => {
    const button = getComputedStyle(document.getElementById("sidebarCloseButton"));
    const brand = getComputedStyle(document.querySelector(".sidebar .brand strong"));
    return {
      buttonWidth:button.width,
      buttonHeight:button.height,
      buttonTop:button.top,
      brandWhiteSpace:brand.whiteSpace,
      brandText:document.querySelector(".sidebar .brand strong")?.textContent
    };
  });

  expect(await readMetrics()).toEqual({
    buttonWidth:"28px",
    buttonHeight:"28px",
    buttonTop:"15px",
    brandWhiteSpace:"nowrap",
    brandText:"My Finance Records"
  });

  await page.locator("#sidebar").evaluate(sidebar => {
    sidebar.classList.remove("desktop-open");
    sidebar.classList.add("sidebar-pinned");
  });

  expect(await readMetrics()).toEqual({
    buttonWidth:"28px",
    buttonHeight:"28px",
    buttonTop:"15px",
    brandWhiteSpace:"nowrap",
    brandText:"My Finance Records"
  });
});

test("mobile drawer keeps the static My Finance Records brand", async ({ page }) => {
  await unlockApp(page, 390, "money");
  const menuButton = page.locator("#menuButton");
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(page.locator("#sidebar")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});

test("sidebar brand shell cache is synchronized", () => {
  const expected = "finance-v15-20260820-production-ui-audit-r49";
  expect(source("version.json")).toContain(`"cacheVersion": "${expected}"`);
  expect(source("sw.js")).toContain(`const CACHE_VERSION = "${expected}"`);
  expect(source("pwa-update-v15-0-5.js")).toContain(`const CURRENT_CACHE_VERSION = "${expected}"`);
});
