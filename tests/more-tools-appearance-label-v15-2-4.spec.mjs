import { test, expect } from "@playwright/test";

test("More tools appearance shows one compact Auto, Light, or Dark label", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });

  const button = page.locator("#themeToggleButton");
  const heading = button.locator(":scope > span:last-child > strong");
  const label = page.locator("#themeToggleText");

  await expect(heading).toBeHidden();

  await page.evaluate(() => {
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.dataset.theme = "light";
  });
  await expect(label).toHaveCSS("font-size", "0px");
  await expect(label).toHaveScreenshot("more-tools-auto-label.png");

  await page.evaluate(() => { document.documentElement.dataset.themePreference = "light"; });
  await expect(label).toHaveScreenshot("more-tools-light-label.png");

  await page.evaluate(() => { document.documentElement.dataset.themePreference = "dark"; });
  await expect(label).toHaveScreenshot("more-tools-dark-label.png");
});
