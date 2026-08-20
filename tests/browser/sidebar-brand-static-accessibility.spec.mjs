import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("static brand does not change sidebar navigation semantics", async ({ page }) => {
  await page.route("**/pwa-update-v15-0-5.js**", route => route.abort());
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });
  await expect(page.locator("aside#sidebar")).toHaveAttribute("aria-label", "Main navigation");
  await expect(page.locator("nav.sidebar-navigation")).toHaveAttribute("aria-label", "Finance sections");
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});
