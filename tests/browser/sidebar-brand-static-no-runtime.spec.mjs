import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("brand is correct before PWA updater can execute", async ({ page }) => {
  let blocked = 0;
  await page.route("**/pwa-update-v15-0-5.js**", route => {
    blocked += 1;
    return route.abort();
  });
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });
  expect(blocked).toBeGreaterThan(0);
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});
