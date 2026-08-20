import { test, expect } from "@playwright/test";

test("pure PWA updater still exposes cache/update API", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/pwa-update-v15-0-5.js?v=15.2.10-release6");
  expect(response.ok()).toBe(true);
  const source = await response.text();
  expect(source).toContain("root.FinancePwaUpdate = api");
  expect(source).toContain("shellCacheName(cacheVersion)");
  expect(source).toContain("serviceWorkerUrl(version, cacheVersion)");
  expect(source).toContain("updateState(remote, version, cacheVersion)");
  expect(source).toContain("async clearFinanceCaches()");
  expect(source).not.toContain("document");
  expect(source).not.toContain("installSidebarBrand");
});
