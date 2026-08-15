import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/";
const SIDEBAR_PINNED_KEY = "simple-finance-sidebar-pinned-v1";

test("desktop pin uses the production sidebar state and survives responsive changes", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.addInitScript(key => localStorage.setItem(key, "false"), SIDEBAR_PINNED_KEY);
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });

  const sidebar = page.locator("#sidebar");
  const main = page.locator(".main");
  const pinButton = page.locator("#sidebarCloseButton");

  await expect(sidebar).toHaveCSS("width", "64px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(pinButton).toBeHidden();

  await sidebar.locator('[data-page="dashboard"]').click();
  await expect(sidebar).toHaveClass(/desktop-open/);
  await expect(sidebar).toHaveCSS("width", "245px");
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect(pinButton).toBeVisible();
  await expect(pinButton).toHaveAttribute("aria-label", "Pin navigation open");

  await pinButton.click();
  await expect(sidebar).toHaveClass(/sidebar-pinned/);
  await expect(page.locator("body")).toHaveClass(/sidebar-layout-pinned/);
  await expect(main).toHaveCSS("margin-left", "245px");
  await expect(pinButton).toHaveAttribute("aria-label", "Unpin navigation");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SIDEBAR_PINNED_KEY)).toBe("true");

  await page.setViewportSize({ width:393, height:852 });
  await expect(page.locator("body")).not.toHaveClass(/sidebar-layout-pinned/);
  await expect(main).toHaveCSS("margin-left", "0px");

  await page.setViewportSize({ width:1440, height:900 });
  await expect(sidebar).toHaveClass(/sidebar-pinned/);
  await expect(page.locator("body")).toHaveClass(/sidebar-layout-pinned/);
  await expect(main).toHaveCSS("margin-left", "245px");

  await pinButton.click();
  await expect(sidebar).not.toHaveClass(/sidebar-pinned/);
  await expect(page.locator("body")).not.toHaveClass(/sidebar-layout-pinned/);
  await expect(main).toHaveCSS("margin-left", "64px");
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SIDEBAR_PINNED_KEY)).toBe("false");
});

test("signed-out Settings expose safe capabilities but hide finance backup access", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.lock());

  const capabilities = await page.evaluate(() => window.FinancePrivacyLock.capabilities);
  expect(capabilities.help).toEqual(expect.arrayContaining(["[data-help-key]", "[data-section-help]"]));
  expect(capabilities.appMaintenance).toEqual(expect.arrayContaining(["#installPwaButton", "#checkUpdateButton", "#repairPwaButton", "#requestPersistenceButton"]));
  const allowed = Object.values(capabilities).flat();
  for (const selector of ["#importBackup", "label[for='importBackup']", "#exportBackup", "#restoreV11BackupButton", "#downloadV11BackupButton"]) {
    expect(allowed).not.toContain(selector);
  }

  await page.evaluate(() => {
    if (typeof window.goToPage === "function") window.goToPage("settings", { historyMode:"none", smooth:false });
    if (typeof window.activateSettingsPanel === "function") window.activateSettingsPanel("sync", false);
  });

  const backupCard = page.locator("#importBackup").locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");
  const migrationCard = page.locator("#restoreV11BackupButton").locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' card ')][1]");
  for (const card of [backupCard, migrationCard]) {
    await expect(card).toHaveAttribute("data-finance-private-settings", "");
    await expect(card).toBeHidden();
  }
  await expect(page.locator(".finance-settings-privacy-note").first()).toContainText("backups");

  await page.evaluate(() => window.activateSettingsPanel?.("app", false));
  await expect(page.locator("#installPwaButton")).toBeVisible();
  await expect(page.locator("#requestPersistenceButton")).toBeVisible();
  await expect(page.locator("#settings [data-settings-panel='app'] [data-section-help], #settings [data-settings-panel='app'] [data-help-key]").first()).toBeVisible();
});
