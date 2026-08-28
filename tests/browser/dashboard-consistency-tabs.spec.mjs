import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";

async function openDashboard(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${APP_URL}/?page=dashboard`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("#dashboard .dashboard-view-tabs")).toBeVisible();
}

test("Dashboard defaults to Calendar and exposes the approved view order", async ({ page }) => {
  await openDashboard(page, { width:1440, height:1000 });

  const tabs = page.locator("#dashboard [data-dashboard-view-tab]");
  await expect(tabs).toHaveText(["Calendar", "Cash Flow", "Overview"]);
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(0)).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#dashboardViewPanel")).toHaveAttribute("aria-labelledby", "dashboardViewTabCalendar");
  await expect(page.locator('[data-dashboard-card="calendar"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="cash-flow"]')).toBeHidden();
  await expect(page.locator('#dashboard > .dashboard-view-panel > [data-dashboard-view="overview"].kpi-grid')).toBeHidden();
});

test("Dashboard tabs filter existing cards without duplicating finance content", async ({ page }) => {
  await openDashboard(page, { width:1440, height:1000 });

  await page.locator('[data-dashboard-view-tab="cash-flow"]').click();
  await expect(page.locator('[data-dashboard-view-tab="cash-flow"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[data-dashboard-card="calendar"]')).toBeHidden();
  await expect(page.locator('[data-dashboard-card="cash-flow"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="savings-trend"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="savings-goals"]')).toBeVisible();

  await page.locator('[data-dashboard-view-tab="overview"]').click();
  await expect(page.locator('#dashboard > .dashboard-view-panel > [data-dashboard-view="overview"].kpi-grid')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="due-soon"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="accounts"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="activity"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="cash-flow"]')).toBeHidden();
});

test("Dashboard tabs support roving keyboard focus and customization preview", async ({ page }) => {
  await openDashboard(page, { width:1280, height:900 });

  const calendar = page.locator('[data-dashboard-view-tab="calendar"]');
  await calendar.focus();
  await calendar.press("ArrowRight");
  await expect(page.locator('[data-dashboard-view-tab="cash-flow"]')).toBeFocused();
  await expect(page.locator('[data-dashboard-view-tab="cash-flow"]')).toHaveAttribute("aria-selected", "true");
  await page.locator('[data-dashboard-view-tab="cash-flow"]').press("End");
  await expect(page.locator('[data-dashboard-view-tab="overview"]')).toBeFocused();

  await page.evaluate(() => window.setDashboardCustomizeMode(true));
  await expect(page.locator('[data-dashboard-card="calendar"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="cash-flow"]')).toBeVisible();
  await expect(page.locator('[data-dashboard-card="activity"]')).toBeVisible();
  await page.evaluate(() => window.setDashboardCustomizeMode(false));
  await expect(page.locator('[data-dashboard-card="calendar"]')).toBeHidden();
  await expect(page.locator('[data-dashboard-card="activity"]')).toBeVisible();
});

for (const viewport of [{ width:1440, height:1000 }, { width:393, height:852 }]) {
  test(`Dashboard keeps its 7px cards, 12px rhythm, and contained tabs at ${viewport.width}px`, async ({ page }) => {
    await openDashboard(page, viewport);

    const contract = await page.evaluate(() => {
      const tabs = document.querySelector("#dashboard .dashboard-view-tabs");
      const calendar = document.querySelector('[data-dashboard-card="calendar"]');
      const grid = document.getElementById("dashboardCardGrid");
      const tabRect = tabs.getBoundingClientRect();
      const cardRect = calendar.getBoundingClientRect();
      return {
        tabRadius:parseFloat(getComputedStyle(tabs).borderRadius),
        tabHeight:tabRect.height,
        cardRadius:parseFloat(getComputedStyle(calendar).borderRadius),
        gridGap:parseFloat(getComputedStyle(grid).gap),
        tabsContained:tabRect.left >= -1 && tabRect.right <= innerWidth + 1,
        cardContained:cardRect.left >= -1 && cardRect.right <= innerWidth + 1,
        pageOverflow:document.documentElement.scrollWidth > innerWidth + 1
      };
    });

    expect(contract.tabRadius).toBe(7);
    expect(contract.tabHeight).toBe(44);
    expect(contract.cardRadius).toBe(7);
    expect(contract.gridGap).toBe(12);
    expect(contract.tabsContained).toBe(true);
    expect(contract.cardContained).toBe(true);
    expect(contract.pageOverflow).toBe(false);
  });
}
