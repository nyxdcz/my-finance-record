import { test, expect } from "@playwright/test";

test("V15.2.11 registers the cache-qualified worker and clears stale Finance caches", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await caches.open("finance-v15-20260815-ui-align-r11-shell");
    await caches.open("finance-v14-legacy-shell");
    await caches.open("unrelated-test-cache");
  });

  await expect.poll(async () => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || ""), { timeout:15000 }).toContain("v=15.2.11");
  const workerUrl = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || "");
  expect(workerUrl).toContain("cache=finance-v15-20260820-shell-ui-r47");

  await page.evaluate(async () => { await window.clearAppCaches(); });
  const names = await page.evaluate(async () => caches.keys());
  expect(names.filter(name => /^finance-v\d+-/.test(name))).toEqual([]);
  expect(names).toContain("unrelated-test-cache");
});
