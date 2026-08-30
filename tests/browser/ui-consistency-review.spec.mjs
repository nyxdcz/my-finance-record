import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";

test.use({ serviceWorkers:"block" });

async function openAuthenticatedPage(page, route, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${APP_URL}/?page=${route}`, { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.waitForFunction(() => !document.body.classList.contains("finance-auth-pending"));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("body")).toHaveClass(/finance-signed-in/);
  await expect(page.locator(`#${route}`)).toHaveClass(/active/);
}

test("desktop Paid Expenses keeps every primary filter action on one row", async ({ page }) => {
  await openAuthenticatedPage(page, "paid-expenses", { width:1440, height:1000 });

  const toolbar = page.locator("#paidExpensesSection .paid-toolbar-compact");
  const controls = toolbar.locator(":scope > .field, :scope > button");
  await expect(controls).toHaveCount(4);

  const geometry = await controls.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right };
  }));

  geometry.forEach(rect => expect(Math.abs(rect.top - geometry[0].top)).toBeLessThan(2));
  geometry.forEach(rect => expect(Math.abs(rect.bottom - geometry[0].bottom)).toBeLessThan(2));
  geometry.forEach((rect, index) => {
    if (index > 0) expect(rect.left).toBeGreaterThanOrEqual(geometry[index - 1].right);
  });
});

for (const viewport of [{ width:375, height:812 }, { width:768, height:1024 }]) {
  test(`responsive Settings uses the overview cards as its single category entry point at ${viewport.width}px`, async ({ page }) => {
    await openAuthenticatedPage(page, "settings", viewport);
    await page.evaluate(() => document.getElementById("settingsBackButton")?.click());

    await expect(page.locator("#settings")).not.toHaveClass(/settings-category-open/);
    await expect(page.locator("#settings > .settings-navigation")).toBeHidden();
    await expect(page.locator("#settings-panel-overview")).toBeVisible();
    await expect(page.locator("#settings-panel-overview .settings-status-card")).toHaveCount(6);

    await page.locator("#settings-panel-overview [data-settings-open='accounts']").click();
    await expect(page.locator("#settings")).toHaveClass(/settings-category-open/);
    await expect(page.locator("#settingsMobileBack")).toBeVisible();
    await expect(page.locator("#settings-panel-accounts")).toBeVisible();
  });
}

test("iPhone annual Income reads vertically without a horizontal table swipe", async ({ page }) => {
  await openAuthenticatedPage(page, "income", { width:393, height:852 });

  const tableWrap = page.locator(".annual-income-table-wrap");
  const totalRow = page.locator(".annual-income-table .income-total-row");
  await expect(totalRow.locator("td")).toHaveCount(14);

  const contract = await page.evaluate(() => {
    const wrap = document.querySelector(".annual-income-table-wrap");
    const table = document.getElementById("annualIncomeTable");
    const row = table?.querySelector(".income-total-row");
    const labels = [...(row?.querySelectorAll("td") || [])].map(cell => cell.dataset.label);
    return {
      pageOverflow:document.documentElement.scrollWidth > innerWidth + 1,
      tableOverflow:wrap.scrollWidth > wrap.clientWidth + 1,
      tableFits:table.getBoundingClientRect().width <= wrap.getBoundingClientRect().width + 1,
      rowDisplay:getComputedStyle(row).display,
      labels
    };
  });

  expect(contract.pageOverflow).toBe(false);
  expect(contract.tableOverflow).toBe(false);
  expect(contract.tableFits).toBe(true);
  expect(contract.rowDisplay).toBe("grid");
  expect(contract.labels).toEqual(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Total","Average"]);
  await expect(page.locator(".annual-income-scroll-hint")).not.toContainText("Scroll horizontally");
  await expect(tableWrap).toBeVisible();
});
