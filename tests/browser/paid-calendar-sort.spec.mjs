import { test, expect } from "@playwright/test";
/* global data */

const APP_URL = "http://127.0.0.1:3000/?page=paid-expenses";

async function openPaidCalendar(page) {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(APP_URL, { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock && window.FinanceTransactionViews && window.FinancePaidCalendarSort));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("#transactionToolbar-paid")).toBeVisible();
  await page.locator('#transactionToolbar-paid [data-transaction-mode="calendar"]').click();
  await expect(page.locator("#transactionCalendar-paid")).toBeVisible();
}

async function calendarDateOrder(page) {
  return page.evaluate(() => {
    const paidById = new Map((data.expenses || []).filter(item => item.paid).map(item => [String(item.id), item]));
    return [...document.querySelectorAll("#transactionCalendar-paid > .transaction-calendar-day")].map(day => {
      const id = day.querySelector("[data-transaction-open]")?.dataset.transactionOpen || "";
      const item = paidById.get(String(id));
      return String(item?.paidDate || item?.date || "");
    }).filter(Boolean);
  });
}

test("Paid Expenses calendar respects newest and oldest sort order", async ({ page }) => {
  await openPaidCalendar(page);

  const before = await page.evaluate(() => JSON.stringify(data));
  const baseline = await calendarDateOrder(page);
  expect(baseline.length).toBeGreaterThan(1);

  const ascending = [...baseline].sort((a, b) => a.localeCompare(b));
  const descending = [...ascending].reverse();
  const sort = page.locator("#transactionToolbar-paid [data-transaction-sort]");

  await sort.selectOption("newest");
  await expect.poll(() => calendarDateOrder(page)).toEqual(descending);

  await page.locator("#transactionToolbar-paid [data-transaction-sort]").selectOption("oldest");
  await expect.poll(() => calendarDateOrder(page)).toEqual(ascending);

  expect(await page.evaluate(() => JSON.stringify(data))).toBe(before);
});
