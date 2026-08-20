import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("expanded desktop sidebar shows the authored brand", async ({ page }) => {
  await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });
  const brand = page.locator(".sidebar .brand strong");
  await expect(brand).toHaveText("My Finance Records");
});
