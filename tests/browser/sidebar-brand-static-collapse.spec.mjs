import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("static brand survives desktop collapsed and mobile drawer states", async ({ page }) => {
  await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"domcontentloaded" });
  const brand = page.locator(".sidebar .brand strong");
  await expect(brand).toHaveText("My Finance Records");

  await page.evaluate(() => document.getElementById("sidebar")?.classList.add("collapsed"));
  await expect(brand).toHaveText("My Finance Records");

  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(() => {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.remove("collapsed");
    sidebar?.classList.add("open", "mobile-open");
    sidebar?.setAttribute("aria-hidden", "false");
  });
  await expect(brand).toHaveText("My Finance Records");
});
