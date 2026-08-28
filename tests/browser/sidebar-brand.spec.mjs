import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");

async function unlockApp(page, width, pageName = "dashboard") {
  await page.setViewportSize({ width, height:width <= 430 ? 852 : 800 });
  await page.goto(`http://127.0.0.1:3000/?page=${pageName}`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => document.querySelector(".sidebar .brand strong")?.textContent === "Talaan");
}

test("expanded and collapsed desktop sidebar use the static Talaan brand", async ({ page }) => {
  expect(source("index.html")).toContain("<strong>Talaan</strong>");
  expect(source("pwa-update.js")).not.toContain("installSidebarBrand");
  expect(source("pwa-update.js")).not.toContain("document");
  expect(source("ui-icon-alignment.css")).toContain("width:28px !important");
  expect(source("ui-icon-alignment.css")).toContain("white-space:nowrap !important");

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
      brandFontSize:brand.fontSize,
      brandWhiteSpace:brand.whiteSpace,
      brandText:document.querySelector(".sidebar .brand strong")?.textContent,
      navFontSizes:[...document.querySelectorAll(".sidebar .nav-label")].map(label => getComputedStyle(label).fontSize)
    };
  });

  expect(await readMetrics()).toEqual({
    buttonWidth:"28px",
    buttonHeight:"28px",
    buttonTop:"15px",
    brandFontSize:"20px",
    brandWhiteSpace:"nowrap",
    brandText:"Talaan",
    navFontSizes:["10px","10px","10px","10px","10px"]
  });

  await page.locator("#sidebar").evaluate(sidebar => {
    sidebar.classList.remove("desktop-open");
    sidebar.classList.add("sidebar-pinned");
  });

  expect(await readMetrics()).toEqual({
    buttonWidth:"28px",
    buttonHeight:"28px",
    buttonTop:"15px",
    brandFontSize:"20px",
    brandWhiteSpace:"nowrap",
    brandText:"Talaan",
    navFontSizes:["10px","10px","10px","10px","10px"]
  });
});

test("mobile drawer keeps the static Talaan brand", async ({ page }) => {
  await unlockApp(page, 390, "money");
  const menuButton = page.locator("#menuButton");
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(page.locator("#sidebar")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".sidebar .brand strong")).toHaveText("Talaan");
  await expect(page.locator(".sidebar .brand strong")).toHaveCSS("font-size", "20px");
  for (const label of await page.locator(".sidebar .nav-label").all()) {
    await expect(label).toHaveCSS("font-size", "10px");
  }
});

test("sidebar brand shell cache is synchronized", () => {
  const expected = "finance-v2-20260828-household-splits-r15";
  expect(source("version.json")).toContain(`"cacheVersion": "${expected}"`);
  expect(source("sw.js")).toContain(`const CACHE_VERSION = "${expected}"`);
  expect(source("pwa-update.js")).toContain(`const CURRENT_CACHE_VERSION = "${expected}"`);
});
