import { test, expect } from "@playwright/test";

const states = [
  ["synced", "sync-synced-v15-2-3.png", "rgb(67, 207, 120)"],
  ["syncing", "sync-syncing-v15-2-3.png", "rgb(245, 166, 35)"],
  ["needs-sync", "sync-needs-sync-v15-2-3.png", "rgb(255, 120, 110)"],
  ["sync-issue", "sync-issue-offline-v15-2-3.png", "rgb(255, 120, 110)"],
  ["offline", "sync-issue-offline-v15-2-3.png", "rgb(255, 120, 110)"]
];

test("V15.2.9 Cloud Sync uses supplied state icons and matching colors", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  const button = page.locator("#cloudSyncStatusButton");
  await expect(button).toHaveCount(1);
  for (const [state, icon, color] of states) {
    await button.evaluate((element, value) => element.dataset.syncState = value, state);
    await expect.poll(async () => button.locator(".toolbar-icon").getAttribute("data-uploaded-sync-icon")).toBe(state === "sync-issue" ? "offline" : state);
    const styles = await button.evaluate(element => ({
      buttonColor:getComputedStyle(element).color,
      labelColor:getComputedStyle(element.querySelector(".cloud-sync-label")).color,
      background:getComputedStyle(element.querySelector(".toolbar-icon")).backgroundImage
    }));
    expect(styles.buttonColor).toBe(color);
    expect(styles.labelColor).toBe(color);
    expect(styles.background).toContain(icon);
  }
});

test("V15.2.14 release metadata is visible", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  await expect(page).toHaveTitle(/V15\.2\.14/);
  await expect(page.locator("#buildBadge")).toContainText("V15.2.14");
});
