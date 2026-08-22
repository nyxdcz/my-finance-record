import { test, expect } from "@playwright/test";

const states = [
  ["synced", "sync-synced.png", "rgb(67, 207, 120)"],
  ["syncing", "sync-syncing.png", "rgb(245, 166, 35)"],
  ["needs-sync", "sync-needs-sync.png", "rgb(255, 120, 110)"],
  ["sync-issue", "sync-issue-offline.png", "rgb(255, 120, 110)"],
  ["offline", "sync-issue-offline.png", "rgb(255, 120, 110)"]
];

test("Cloud Sync uses supplied state icons and matching colors", async ({ page }) => {
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

test("Talaan V2.0.1 release metadata is visible", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  await expect(page).toHaveTitle(/Talaan · V2\.0\.1/);
  await expect(page.locator("#buildBadge")).toContainText("V2.0.1");
});
