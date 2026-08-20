import { test, expect } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/index.html?page=money";

async function openFinance(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => {
    const money = document.querySelector("#money");
    return money?.classList.contains("active")
      && money.querySelectorAll(".legend-item, .summary-item").length === 8
      && money.querySelectorAll(".period-card").length >= 3;
  });
}

for (const width of [1024, 1280, 1366, 1440, 1920]) {
  test(`desktop toolbar and Budget summaries share compact geometry at ${width}px`, async ({ page }) => {
    await openFinance(page, { width, height:1000 });
    const metrics = await page.evaluate(() => {
      const visible = selector => [...document.querySelectorAll(selector)].filter(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
      const heights = selector => visible(selector).map(node => node.getBoundingClientRect().height);
      const height = selector => visible(selector)[0]?.getBoundingClientRect().height || 0;
      return {
        overflow:Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
        toolbarGap:parseFloat(getComputedStyle(document.querySelector(".topbar-actions")).gap),
        requiredToolbarHeights:{
          monthNavigator:height(".topbar-actions .month-navigator"),
          moreTools:height(".topbar-actions .topbar-tools-trigger")
        },
        visibleToolbarHeights:heights(".topbar-actions > .cloud-sync-toolbar-button, .topbar-actions .topbar-history-button, .topbar-actions .topbar-add-button, .topbar-actions .topbar-tools-trigger, .topbar-actions .month-navigator"),
        summaryHeights:heights("#money .legend-item, #money .summary-item"),
        disclosureSizes:visible("#money .period-card .collapse-toggle, #money #availableMoneySection [data-collapse-toggle='available-money'], #money #monthlyBudgetPlannerToggle").map(node => {
          const box = node.getBoundingClientRect();
          return [box.width, box.height];
        })
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.toolbarGap).toBe(6);
    expect(metrics.requiredToolbarHeights.monthNavigator).toBeCloseTo(38, 0);
    expect(metrics.requiredToolbarHeights.moreTools).toBeCloseTo(38, 0);
    metrics.visibleToolbarHeights.forEach(height => expect(height).toBeCloseTo(38, 0));
    expect(metrics.summaryHeights).toHaveLength(8);
    metrics.summaryHeights.forEach(height => expect(height).toBeLessThanOrEqual(58));
    expect(metrics.disclosureSizes.length).toBeGreaterThanOrEqual(4);
    metrics.disclosureSizes.forEach(([widthValue, heightValue]) => {
      expect(widthValue).toBeCloseTo(40, 0);
      expect(heightValue).toBeCloseTo(40, 0);
    });
  });
}

for (const width of [390, 430]) {
  test(`phone Budget periods stay compact and touch safe at ${width}px`, async ({ page }) => {
    await openFinance(page, { width, height:900 });
    await page.evaluate(() => {
      document.querySelectorAll("#money .period-card").forEach(card => card.classList.add("is-collapsed"));
    });
    const metrics = await page.evaluate(() => {
      const visible = selector => [...document.querySelectorAll(selector)].filter(node => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
      const periods = visible("#money .period-card");
      const toggles = visible("#money .period-card .collapse-toggle");
      const stack = document.querySelector("#money .section-stack");
      return {
        overflow:Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
        stackGap:parseFloat(getComputedStyle(stack).gap),
        periodHeights:periods.map(card => card.getBoundingClientRect().height),
        periodMargins:periods.map(card => parseFloat(getComputedStyle(card).marginTop)),
        toggleSizes:toggles.map(toggle => {
          const box = toggle.getBoundingClientRect();
          return [box.width, box.height];
        })
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.stackGap).toBeLessThanOrEqual(8);
    expect(metrics.periodHeights.length).toBeGreaterThanOrEqual(3);
    expect(metrics.toggleSizes).toHaveLength(metrics.periodHeights.length);
    metrics.periodHeights.forEach(height => expect(height).toBeLessThanOrEqual(72));
    metrics.periodMargins.forEach(margin => expect(margin).toBe(0));
    metrics.toggleSizes.forEach(([widthValue, heightValue]) => {
      expect(widthValue).toBeGreaterThanOrEqual(44);
      expect(heightValue).toBeGreaterThanOrEqual(44);
    });
  });
}

test("summary acknowledgement disables animation for reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 }, reducedMotion:"reduce" });
  const page = await context.newPage();
  await openFinance(page, { width:1440, height:900 });
  const item = page.locator("#money .legend-item").first();
  await item.evaluate(node => node.classList.add("legend-live-update"));
  await expect.poll(() => item.evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await context.close();
});
