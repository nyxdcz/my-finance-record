import { expect, test } from "@playwright/test";
/* global data */

const app = "http://127.0.0.1:3000/index.html?page=settings&settings=finance-tools";

async function openTools(page, viewport = { width:1366, height:900 }) {
  await page.setViewportSize(viewport);
  await page.goto(app, { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePayeeRules && window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.evaluate(() => window.FinancePayeeRules.open());
  await expect(page.locator("#settings-panel-finance-tools")).toBeVisible();
}

test("Finance tools creates a payee and previews a recoverable rule apply", async ({ page }) => {
  await openTools(page);
  const balances = await page.evaluate(() => JSON.stringify(data.accounts));
  await page.locator("[data-add-payee]").click();
  await expect(page.locator("#payeeDialog")).toBeVisible();
  await page.locator("#payeeName").fill("Home Rent");
  await page.locator("#payeeAliases").fill("Rent, Landlord");
  await page.locator("#payeeDefaultCategory").fill("Housing");
  await page.locator("#payeeDefaultAccount").selectOption("Cash");
  await page.locator("#payeeForm button[type=submit]").click();
  await expect(page.locator("#financePayeeList")).toContainText("Home Rent");

  await page.locator("[data-add-rule]").click();
  await page.locator("#ruleName").fill("Normalize rent");
  await page.locator("[data-condition-value]").fill("Rent");
  await page.locator("#ruleActionPayee").selectOption({ label:"Home Rent" });
  await page.locator("#ruleForm button[type=submit]").click();
  await expect(page.locator("#financeRuleList")).toContainText("Normalize rent");

  await page.locator("[data-run-rule-preview]").click();
  await expect(page.locator("#rulePreviewStatus")).toContainText("1 proposed");
  await expect(page.locator(".finance-preview-item")).toContainText("Payee");
  await expect(page.locator(".finance-preview-item")).toContainText("Account suggestion");
  await page.locator("[data-apply-rule-preview]").click();
  await page.locator("#expenseActionConfirmAccept").click();
  await expect(page.locator("#financeRulePreviewList")).toContainText("Run Preview");
  expect(await page.evaluate(() => JSON.stringify(data.accounts))).toBe(balances);
  const rent = await page.evaluate(() => data.expenses.find(item => item.name === "Rent"));
  expect(rent.payeeId).toBeTruthy();
  expect(rent.category).toBe("Housing");
  expect(rent.suggestedAccount).toBe("Cash");
  expect(rent.paid).toBe(false);
  expect(rent.accountDeducted).toBe(false);
});

test("Finance tools remains touch-safe without phone overflow", async ({ page }) => {
  await openTools(page, { width:390, height:844 });
  const geometry = await page.evaluate(() => ({
    overflow:document.documentElement.scrollWidth - document.documentElement.clientWidth,
    short:[...document.querySelectorAll("#settings-panel-finance-tools button, #settings-panel-finance-tools .button")].filter(node => {
      const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    }).map(node => ({ text:node.textContent.trim(), width:node.getBoundingClientRect().width, height:node.getBoundingClientRect().height }))
  }));
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.short).toEqual([]);
  await page.locator("[data-add-rule]").focus();
  await expect(page.locator("[data-add-rule]")).toBeFocused();
});
