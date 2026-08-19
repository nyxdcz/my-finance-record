import { test, expect } from "@playwright/test";

test("Application Help external runtime preserves dialog and focus return", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/?page=dashboard", { waitUntil:"networkidle" });

  const trigger = page.locator('#dashboard-title [data-help-key="dashboard-overview"]').first();
  await expect(trigger).toBeVisible({ timeout:15000 });
  await trigger.click();

  const dialog = page.locator("#sectionHelpDialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#sectionHelpDialogTitle")).toHaveText("Monthly overview");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
