import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

for (const width of [1440, 390]) {
  test(`sidebar brand renders statically at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height:900 });
    await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
    await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"domcontentloaded" });
    await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
  });
}
