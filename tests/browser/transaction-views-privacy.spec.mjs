import { expect, test } from "@playwright/test";
/* global data */

const base="http://127.0.0.1:3000";
async function unlock(page,route="money"){
  await page.goto(`${base}/?page=${route}`,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>Boolean(window.FinancePrivacyLock&&window.FinanceTransactionViews&&window.FinancePrivacyDisplay));
  await page.evaluate(()=>window.FinancePrivacyLock.setAuthenticated(true));
}

test("transaction preferences are profile-scoped presentation only",async({page})=>{
  await page.setViewportSize({width:1366,height:900}); await unlock(page);
  const before=await page.evaluate(()=>JSON.stringify(data));
  await page.locator("#transactionToolbar-expense [data-open-transaction-columns]").click();
  const account=page.locator('#transactionColumnsDialog [data-column-id="account"] input');
  await account.uncheck();
  await expect(page.locator('#money [data-transaction-column="account"]').first()).toHaveClass(/transaction-column-hidden/);
  await expect(page.locator('#money [data-transaction-column="amount"]').first()).not.toHaveClass(/transaction-column-hidden/);
  await expect(page.locator('#money [data-transaction-column="actions"]').first()).not.toHaveClass(/transaction-column-hidden/);
  await page.locator('#transactionColumnsDialog button[value="default"]').click();
  await page.locator('#transactionToolbar-expense [data-transaction-mode="calendar"]').click();
  await expect(page.locator("#transactionCalendar-expense")).toBeVisible();
  await expect(page.locator("#transactionTotals-expense")).toContainText("visible");
  const result=await page.evaluate(beforeValue=>({same:JSON.stringify(data)===beforeValue,key:window.FinanceTransactionViews.storageKey,state:window.FinanceTransactionViews.getState().expense}),before);
  expect(result.same).toBe(true); expect(result.key).toMatch(/^simple-finance-transaction-views-v1:/); expect(result.state.mode).toBe("calendar");
  await page.reload({waitUntil:"networkidle"}); await page.evaluate(()=>window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("#transactionCalendar-expense")).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#transactionToolbar-expense [data-transaction-mode="list"]').click();
  await expect(page.locator('#money .record-row [data-transaction-column="account"]').first()).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1); expect(overflow).toBe(false);
});

test("Hide values masks visual and accessible money without changing balances",async({page})=>{
  await page.setViewportSize({width:1440,height:900}); await unlock(page,"dashboard");
  const balances=await page.evaluate(()=>JSON.stringify(data.accounts));
  const revealTarget=await page.evaluate(()=>{
    const currency=/(?:₱|PHP\s*)[-+]?\s*\d[\d,]*(?:\.\d{1,2})?/iu;
    const element=[...document.querySelectorAll("[id]")].find(candidate=>{
      if(candidate.closest("select,option,svg")||!currency.test(candidate.textContent||""))return false;
      const rect=candidate.getBoundingClientRect();
      const style=getComputedStyle(candidate);
      return rect.width>0&&rect.height>0&&style.display!=="none"&&style.visibility!=="hidden"&&[...candidate.children].every(child=>!currency.test(child.textContent||""));
    });
    if(!element)throw new Error("No visible monetary value is available for the privacy reveal test.");
    return {id:element.id,value:(element.textContent||"").match(currency)?.[0]||""};
  });
  await page.locator("#topbarToolsTrigger").click(); await page.locator("#privacyDisplayToggle").click();
  await expect(page.locator("html")).toHaveClass(/finance-values-hidden/);
  expect(await page.locator("body").innerText()).not.toMatch(/₱\s*[-+]?\d/);
  const leakedLabel=await page.evaluate(()=>[...document.querySelectorAll("[aria-label],[title],[aria-valuetext]")].map(node=>`${node.getAttribute("aria-label")||""} ${node.getAttribute("title")||""} ${node.getAttribute("aria-valuetext")||""}`).find(value=>/₱\s*[-+]?\d/.test(value))||"");
  expect(leakedLabel).toBe("");
  expect(await page.evaluate(()=>JSON.stringify(data.accounts))).toBe(balances);
  const hiddenValue=page.locator(`[id=${JSON.stringify(revealTarget.id)}] .privacy-value-mask`).first();
  await expect(hiddenValue).toBeVisible();
  await expect(hiddenValue).toHaveText("₱•••••");
  await hiddenValue.hover();
  await expect(hiddenValue).toHaveText(revealTarget.value);
  await page.mouse.move(0,0);
  await expect(hiddenValue).toHaveText("₱•••••");
  await hiddenValue.focus();
  await expect(hiddenValue).toHaveText(revealTarget.value);
  await page.evaluate(()=>document.activeElement?.blur());
  await expect(hiddenValue).toHaveText("₱•••••");
  await page.locator("#topbarToolsTrigger").click();
  await page.locator("#privacyDisplayToggle").click();
  await expect(page.locator("html")).not.toHaveClass(/finance-values-hidden/);
  expect(await page.locator("body").innerText()).toMatch(/₱\s*[-+]?\d/);
});
