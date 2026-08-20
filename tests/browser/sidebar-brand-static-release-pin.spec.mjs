import { test, expect } from "@playwright/test";

test("shell and service worker request the pure updater release6 pin", async ({ request }) => {
  const [indexResponse, workerResponse] = await Promise.all([
    request.get("http://127.0.0.1:3000/index.html"),
    request.get("http://127.0.0.1:3000/sw.js")
  ]);
  expect(indexResponse.ok()).toBe(true);
  expect(workerResponse.ok()).toBe(true);
  expect(await indexResponse.text()).toContain("pwa-update-v15-0-5.js?v=15.2.10-release6");
  expect(await workerResponse.text()).toContain("pwa-update-v15-0-5.js?v=15.2.10-release6");
});
