import { test, expect } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/index.html?page=money";
const APP_CACHE = "finance-v15-20260821-horizontal-kanban-r54";

async function openFinance(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(APP_URL, { waitUntil:"networkidle" });
  await expect.poll(async () => {
    try { return await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || ""); }
    catch { return ""; }
  }, { timeout:15000 }).toContain(`cache=${APP_CACHE}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(350);
  await expect.poll(async () => {
    try {
      return await page.evaluate(() => {
        if (!window.FinancePrivacyLock || typeof window.goToPage !== "function") return null;
        window.FinancePrivacyLock.setAuthenticated(true);
        window.goToPage("money", { historyMode:"none", smooth:false });
        const visible = selector => [...document.querySelectorAll(selector)].filter(node => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        });
        return {
          auth:document.body.classList.contains("finance-signed-in"),
          page:document.querySelector("#money")?.classList.contains("active") || false,
          summaries:visible("#money .legend-item, #money .summary-item").length,
          periods:visible("#money .period-card").length
        };
      });
    } catch { return null; }
  }, { timeout:15000 }).toEqual({ auth:true, page:true, summaries:8, periods:3 });
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
    expect(metrics.toolbarGap).toBe(4);
    expect(metrics.requiredToolbarHeights.monthNavigator).toBeCloseTo(34, 0);
    expect(metrics.requiredToolbarHeights.moreTools).toBeCloseTo(34, 0);
    metrics.visibleToolbarHeights.forEach(height => expect(height).toBeCloseTo(34, 0));
    expect(metrics.summaryHeights).toHaveLength(8);
    metrics.summaryHeights.forEach(height => expect(height).toBeLessThanOrEqual(58));
    expect(metrics.disclosureSizes.length).toBeGreaterThanOrEqual(4);
    metrics.disclosureSizes.forEach(([widthValue, heightValue]) => {
      expect(widthValue).toBeCloseTo(40, 0);
      expect(heightValue).toBeCloseTo(40, 0);
    });
  });
}

test("desktop Budget periods use three expense card-list columns with monthly repeat beside Mark paid", async ({ page }) => {
  await openFinance(page, { width:1440, height:1100 });
  const metrics = await page.evaluate(() => {
    const stack = document.querySelector("#money .section-stack");
    const periods = [...document.querySelectorAll("#money .section-stack > .period-card")];
    const firstList = document.querySelector("#money #lateExpenses") || document.querySelector("#money #earlyExpenses") || document.querySelector("#money #otherExpenses");
    const rows = firstList ? [...firstList.querySelectorAll(":scope > .record-row[data-expense-row]")] : [];
    const firstRow = rows[0] || document.querySelector("#money .record-row[data-expense-row]");
    const actions = firstRow ? [...firstRow.querySelectorAll(":scope > .desktop-record-actions > button")] : [];
    const saved = firstRow?.querySelector(".desktop-record-actions [data-toggle-saved]");
    const paid = firstRow?.querySelector(".desktop-record-actions [data-mark-paid]");
    const edit = firstRow?.querySelector(".desktop-record-actions [data-edit-expense]");
    const savedText = saved?.querySelector(".saved-button-text");
    const rowStyle = firstRow ? getComputedStyle(firstRow) : null;
    const stackStyle = stack ? getComputedStyle(stack) : null;
    const periodStyle = periods[0] ? getComputedStyle(periods[0]) : null;
    const spacing = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom : 5;
    return {
      stackDisplay:stackStyle?.display || "",
      stackColumns:stackStyle?.gridTemplateColumns || "",
      periodCount:periods.length,
      periodTopBorder:periodStyle?.borderTopWidth || "",
      rowRadius:rowStyle?.borderRadius || "",
      rowShadow:rowStyle?.boxShadow || "",
      rowGap:spacing,
      actionCount:actions.length,
      savedIndex:actions.indexOf(saved),
      paidIndex:actions.indexOf(paid),
      editIndex:actions.indexOf(edit),
      savedLabel:saved?.classList.contains("active") ? getComputedStyle(savedText, "::after").content : getComputedStyle(savedText, "::after").content,
      mobileActionsDisplay:firstRow ? getComputedStyle(firstRow.querySelector(":scope > .mobile-record-actions")).display : ""
    };
  });
  expect(metrics.stackDisplay).toBe("grid");
  expect(metrics.periodCount).toBe(3);
  expect(metrics.stackColumns.split(" ").filter(Boolean)).toHaveLength(3);
  expect(metrics.periodTopBorder).toBe("3px");
  expect(metrics.rowRadius).toBe("8px");
  expect(metrics.rowShadow).not.toBe("none");
  expect(metrics.rowGap).toBeCloseTo(5, 0);
  expect(metrics.actionCount).toBeGreaterThanOrEqual(3);
  expect(metrics.savedIndex).toBeGreaterThanOrEqual(0);
  expect(metrics.paidIndex).toBe(metrics.savedIndex + 1);
  expect(metrics.editIndex).toBe(metrics.paidIndex + 1);
  expect(metrics.savedLabel).toMatch(/Repeat(?:s)? monthly/);
  expect(metrics.mobileActionsDisplay).toBe("none");
});

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
