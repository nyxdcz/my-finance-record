import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";

async function openDashboard(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${APP_URL}/?page=dashboard`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("#dashboard .dashboard-view-tabs")).toBeVisible();
}

async function openFinance(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${APP_URL}/?page=money`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("#money .money-workspace-switcher")).toBeVisible();
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
  test(`Dashboard and Finance share the exact segmented-control styles at ${viewport.width}px`, async ({ page }) => {
    await openFinance(page, viewport);

    const comparison = await page.evaluate(() => {
      const finance = document.querySelector("#money .money-workspace-switcher");
      const dashboard = document.querySelector("#dashboard .dashboard-view-tabs");
      const financeActive = finance.querySelector('[aria-selected="true"]');
      const dashboardActive = dashboard.querySelector('[aria-selected="true"]');
      const financeInactive = finance.querySelector('[aria-selected="false"]');
      const dashboardInactive = dashboard.querySelector('[aria-selected="false"]');
      const outerStyle = node => {
        const css = getComputedStyle(node);
        return {
          display:css.display,
          position:css.position,
          top:css.top,
          height:css.height,
          minHeight:css.minHeight,
          maxHeight:css.maxHeight,
          margin:css.margin,
          padding:css.padding,
          gap:css.gap,
          border:css.border,
          borderRadius:css.borderRadius,
          backgroundColor:css.backgroundColor,
          boxShadow:css.boxShadow,
          overflow:css.overflow,
          backdropFilter:css.backdropFilter,
          webkitBackdropFilter:css.webkitBackdropFilter
        };
      };
      const buttonStyle = node => {
        const css = getComputedStyle(node);
        return {
          boxSizing:css.boxSizing,
          display:css.display,
          height:css.height,
          minHeight:css.minHeight,
          maxHeight:css.maxHeight,
          padding:css.padding,
          border:css.border,
          borderRadius:css.borderRadius,
          backgroundColor:css.backgroundColor,
          color:css.color,
          boxShadow:css.boxShadow,
          fontSize:css.fontSize,
          fontWeight:css.fontWeight,
          lineHeight:css.lineHeight,
          textAlign:css.textAlign,
          whiteSpace:css.whiteSpace
        };
      };
      return {
        financeOuter:outerStyle(finance),
        dashboardOuter:outerStyle(dashboard),
        financeActive:buttonStyle(financeActive),
        dashboardActive:buttonStyle(dashboardActive),
        financeInactive:buttonStyle(financeInactive),
        dashboardInactive:buttonStyle(dashboardInactive)
      };
    });

    expect(comparison.dashboardOuter).toEqual(comparison.financeOuter);
    expect(comparison.dashboardActive).toEqual(comparison.financeActive);
    expect(comparison.dashboardInactive).toEqual(comparison.financeInactive);
  });
}

for (const viewport of [{ width:1440, height:1000 }, { width:393, height:852 }]) {
  test(`Dashboard keeps its 7px cards, 12px rhythm, and contained tabs at ${viewport.width}px`, async ({ page }) => {
    await openDashboard(page, viewport);

    const contract = await page.evaluate(() => {
      const tabs = document.querySelector("#dashboard .dashboard-view-tabs");
      const calendar = document.querySelector('[data-dashboard-card="calendar"]');
      const calendarLayout = document.querySelector("#dashboard .dashboard-calendar-layout");
      const calendarGrid = document.getElementById("dashboardCalendarGrid");
      const calendarEvents = document.querySelector("#dashboard .dashboard-calendar-events");
      const calendarDays = [...document.querySelectorAll("#dashboard .calendar-day")];
      const grid = document.getElementById("dashboardCardGrid");
      const tabRect = tabs.getBoundingClientRect();
      const cardRect = calendar.getBoundingClientRect();
      const calendarGridRect = calendarGrid.getBoundingClientRect();
      const calendarEventsRect = calendarEvents.getBoundingClientRect();
      const tabButtons = [...tabs.querySelectorAll(".dashboard-view-tab")];
      return {
        tabRadius:parseFloat(getComputedStyle(tabs).borderRadius),
        tabHeight:tabRect.height,
        tabWidth:tabRect.width,
        tabPadding:parseFloat(getComputedStyle(tabs).paddingTop),
        tabGap:parseFloat(getComputedStyle(tabs).gap),
        tabButtonHeights:tabButtons.map(button => button.getBoundingClientRect().height),
        activeTabRadius:parseFloat(getComputedStyle(tabButtons[0]).borderRadius),
        cardRadius:parseFloat(getComputedStyle(calendar).borderRadius),
        gridGap:parseFloat(getComputedStyle(grid).gap),
        calendarLayoutColumns:getComputedStyle(calendarLayout).gridTemplateColumns.trim().split(/\s+/).length,
        calendarGridWidth:calendarGridRect.width,
        calendarEventsWidth:calendarEventsRect.width,
        calendarDayMinHeight:Math.min(...calendarDays.map(day => day.getBoundingClientRect().height)),
        tabsContained:tabRect.left >= -1 && tabRect.right <= innerWidth + 1,
        cardContained:cardRect.left >= -1 && cardRect.right <= innerWidth + 1,
        pageOverflow:document.documentElement.scrollWidth > innerWidth + 1
      };
    });

    expect(contract.tabRadius).toBe(7);
    expect(contract.cardRadius).toBe(7);
    expect(contract.gridGap).toBe(12);
    expect(contract.tabsContained).toBe(true);
    expect(contract.cardContained).toBe(true);
    expect(contract.pageOverflow).toBe(false);

    if (viewport.width === 1440) {
      expect(contract.tabHeight).toBe(43);
      expect(contract.tabPadding).toBe(3);
      expect(contract.tabGap).toBe(3);
      expect(contract.activeTabRadius).toBe(7);
      expect(contract.tabWidth).toBeLessThanOrEqual(480);
      expect(contract.calendarLayoutColumns).toBe(2);
      expect(contract.calendarGridWidth / contract.calendarEventsWidth).toBeGreaterThan(2.3);
      expect(contract.calendarDayMinHeight).toBeGreaterThanOrEqual(68);
    } else {
      expect(contract.tabHeight).toBe(44);
      expect(contract.tabPadding).toBe(0);
      expect(contract.tabGap).toBe(0);
      expect(contract.tabButtonHeights).toEqual([44, 44, 44]);
      expect(contract.activeTabRadius).toBe(7);
      expect(contract.calendarLayoutColumns).toBe(1);
      expect(contract.calendarDayMinHeight).toBeGreaterThanOrEqual(56);
    }
  });
}
