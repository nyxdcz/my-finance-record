import { test, expect } from "@playwright/test";

const phone = { width:390, height:844 };

test("phone Finance installs compact record layout and icon-only Add account", async ({ page }) => {
  await page.setViewportSize(phone);
  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });

  await expect(page.locator("#phoneFinanceCompactV1522")).toHaveCount(1);
  const addAccount = page.locator("#addAccountButton");
  await expect(addAccount).toHaveClass(/phone-icon-only-action/);
  await expect(addAccount).toHaveAttribute("aria-label", "Add account");
  await expect(addAccount.locator(".phone-only-action-icon")).toHaveCount(1);
  await expect(addAccount.locator(".phone-only-action-label")).toHaveCount(1);

  const mobileState = await addAccount.evaluate(button => ({
    width:getComputedStyle(button).width,
    height:getComputedStyle(button).height,
    labelDisplay:getComputedStyle(button.querySelector(".phone-only-action-label")).display,
    iconDisplay:getComputedStyle(button.querySelector(".phone-only-action-icon")).display
  }));
  expect(mobileState.width).toBe("44px");
  expect(mobileState.height).toBe("44px");
  expect(mobileState.labelDisplay).toBe("none");
  expect(mobileState.iconDisplay).toBe("grid");

  const styleText = await page.locator("#phoneFinanceCompactV1522").textContent();
  expect(styleText).toContain('grid-template-areas:"title amount" "due account" "actions actions"');
  expect(styleText).toContain("grid-template-columns:minmax(0,1fr) 44px");
  expect(styleText).toContain('content:"Due ·"');
  expect(styleText).toContain('content:"Account ·"');
});

test("Schedule event becomes icon-only only at phone width and keeps an accessible name", async ({ page }) => {
  await page.setViewportSize(phone);
  await page.goto("http://127.0.0.1:3000/index.html?page=projects", { waitUntil:"domcontentloaded" });

  const schedule = page.locator("[data-pc-add]").first();
  await expect(schedule).toHaveCount(1, { timeout:10000 });
  await expect(schedule).toHaveClass(/phone-icon-only-action/);
  await expect(schedule).toHaveAttribute("aria-label", "Schedule event");
  const phonePresentation = await schedule.evaluate(button => ({
    width:getComputedStyle(button).width,
    labelDisplay:getComputedStyle(button.querySelector(".phone-only-action-label")).display,
    iconDisplay:getComputedStyle(button.querySelector(".phone-only-action-icon")).display
  }));
  expect(phonePresentation.width).toBe("44px");
  expect(phonePresentation.labelDisplay).toBe("none");
  expect(phonePresentation.iconDisplay).toBe("grid");

  await page.setViewportSize({ width:1024, height:800 });
  const desktopPresentation = await schedule.evaluate(button => ({
    labelDisplay:getComputedStyle(button.querySelector(".phone-only-action-label")).display,
    iconDisplay:getComputedStyle(button.querySelector(".phone-only-action-icon")).display,
    text:button.querySelector(".phone-only-action-label")?.textContent || ""
  }));
  expect(desktopPresentation.labelDisplay).not.toBe("none");
  expect(desktopPresentation.iconDisplay).toBe("none");
  expect(desktopPresentation.text).toContain("Schedule event");
});