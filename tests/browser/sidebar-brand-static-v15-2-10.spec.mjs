import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

async function openWithoutPwaUpdater(page, width) {
  await page.setViewportSize({ width, height:900 });
  let blockedUpdaterRequests = 0;
  await page.route("**/pwa-update-v15-0-5.js**", route => {
    blockedUpdaterRequests += 1;
    return route.abort();
  });
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"domcontentloaded" });
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
  return () => blockedUpdaterRequests;
}

test("desktop sidebar brand is static without the PWA updater", async ({ page }) => {
  const updaterRequests = await openWithoutPwaUpdater(page, 1440);
  expect(updaterRequests()).toBeGreaterThan(0);
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");

  await page.evaluate(() => {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.remove("open", "mobile-open");
    sidebar?.classList.add("collapsed");
  });
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");

  await page.evaluate(() => {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.remove("collapsed");
  });
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});

test("phone drawer keeps the static sidebar brand without the PWA updater", async ({ page }) => {
  const updaterRequests = await openWithoutPwaUpdater(page, 390);
  expect(updaterRequests()).toBeGreaterThan(0);

  await page.evaluate(() => {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.add("open", "mobile-open");
    sidebar?.setAttribute("aria-hidden", "false");
  });
  await expect(page.locator(".sidebar .brand strong")).toHaveText("My Finance Records");
});

test("PWA updater source has no document-driven sidebar brand mutation", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/pwa-update-v15-0-5.js?v=15.2.10-release6");
  expect(response.ok()).toBe(true);
  const source = await response.text();
  expect(source).not.toContain("installSidebarBrand");
  expect(source).not.toContain(".sidebar .brand strong");
  expect(source).not.toContain("My Finance Records");
  expect(source).not.toContain("root.document");
  expect(source).toContain("root.FinancePwaUpdate = api");
});
