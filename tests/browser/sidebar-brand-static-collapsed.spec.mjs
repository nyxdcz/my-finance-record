import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("collapsed sidebar retains authored brand text", async ({ page }) => {
  await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });
  await page.evaluate(() => document.getElementById("sidebar")?.classList.add("collapsed"));
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});
