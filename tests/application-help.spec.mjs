import { test, expect } from "@playwright/test";

test("Application Help external runtime preserves dialog and focus return", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    setupApplicationHelp();
    const trigger = document.getElementById("menuButton");
    trigger?.focus();
    openContextHelp("dashboard-overview", trigger);
  });
  const dialog = page.locator("#sectionHelpDialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#sectionHelpDialogTitle")).toHaveText("Monthly overview");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#menuButton")).toBeFocused();
});
