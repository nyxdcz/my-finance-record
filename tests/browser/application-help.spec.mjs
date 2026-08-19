import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("Application Help external runtime preserves dialog and focus return", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/?page=dashboard", { waitUntil:"networkidle" });
  await page.waitForFunction(() => typeof window.openContextHelp === "function" && Boolean(document.documentElement.dataset.helpTopicCount));

  await page.evaluate(() => {
    const trigger = document.createElement("button");
    trigger.id = "applicationHelpFocusReturnProbe";
    trigger.type = "button";
    trigger.textContent = "Help test trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    window.openContextHelp("dashboard-overview", trigger);
  });

  const trigger = page.locator("#applicationHelpFocusReturnProbe");
  const dialog = page.locator("#sectionHelpDialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#sectionHelpDialogTitle")).toHaveText("Monthly overview");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
