import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("mobile sidebar keeps authored brand text", async ({ page }) => {
  await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
  await page.setViewportSize({ width:390, height:844 });
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});
