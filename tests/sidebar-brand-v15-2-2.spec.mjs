import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("expanded sidebar uses My Finance Records and a compact stable pin", async ({ page }) => {
  expect(source("pwa-update-v15-0-5.js")).toContain('brand.textContent = "My Finance Records"');
  expect(source("ui-icon-alignment-v15-0-5.css")).toContain("width:28px !important");
  expect(source("ui-icon-alignment-v15-0-5.css")).toContain("white-space:nowrap !important");

  await page.setViewportSize({ width:1280, height:800 });
  await page.goto("http://127.0.0.1:3000/?page=dashboard", { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => document.querySelector(".sidebar .brand strong")?.textContent === "My Finance Records");

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

test("sidebar brand shell cache is synchronized", () => {
  const expected = "finance-v15-20260818-ui-refinement-r39";
  expect(source("version.json")).toContain(`"cacheVersion": "${expected}"`);
  expect(source("sw.js")).toContain(`const CACHE_VERSION = "${expected}"`);
  expect(source("pwa-update-v15-0-5.js")).toContain(`const CURRENT_CACHE_VERSION = "${expected}"`);
});
