import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/";
const FINANCE_PAGES = ["money", "income", "paid-expenses"];

async function prepareFinanceApp(page) {
  await page.waitForFunction(() => Boolean(window.FinanceInteractionPatterns && window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.unlock({ email:"test@example.com" }));
  await page.waitForFunction(() => document.body.classList.contains("finance-signed-in"));
}

async function activatePage(page, pageId) {
  await page.evaluate(id => {
    if (typeof window.goToPage === "function") window.goToPage(id, { historyMode:"none", smooth:false });
  }, pageId);
  await expect(page.locator(`#${pageId}`)).toHaveClass(/active/);
  await page.locator(`#${pageId}`).evaluate(async node => {
    await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {})));
  });
}

test("all Finance pages place the workspace tabs before the weekly marquee in one shared row", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await prepareFinanceApp(page);

  for (const pageId of FINANCE_PAGES) {
    const row = page.locator(`#${pageId} > .finance-workspace-marquee-row`);
    await expect(row).toHaveCount(1);
    const childClasses = await row.evaluate(node => [...node.children].map(child => child.className));
    expect(childClasses[0]).toContain("money-workspace-switcher");
    expect(childClasses[1]).toContain("finance-week-marquee");

    await activatePage(page, pageId);
    const switcher = row.locator(":scope > .money-workspace-switcher");
    const marquee = row.locator(":scope > .finance-week-marquee");
    const rowBox = await row.boundingBox();
    const switcherBox = await switcher.boundingBox();
    const marqueeBox = await marquee.boundingBox();

    expect(rowBox).not.toBeNull();
    expect(switcherBox).not.toBeNull();
    expect(marqueeBox).not.toBeNull();
    expect(Math.abs(rowBox.height - 43)).toBeLessThanOrEqual(1);
    expect(Math.abs(switcherBox.height - 43)).toBeLessThanOrEqual(1);
    expect(Math.abs(marqueeBox.height - 43)).toBeLessThanOrEqual(1);
    expect(switcherBox.x).toBeLessThan(marqueeBox.x);
    const verticalOverlap = Math.min(switcherBox.y + switcherBox.height, marqueeBox.y + marqueeBox.height) - Math.max(switcherBox.y, marqueeBox.y);
    expect(verticalOverlap).toBeGreaterThan(40);
  }
});

test("Finance weekly marquees remain hidden on phone while workspace tabs stay available", async ({ page }) => {
  await page.setViewportSize({ width:393, height:852 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await prepareFinanceApp(page);

  for (const pageId of FINANCE_PAGES) {
    await activatePage(page, pageId);
    const row = page.locator(`#${pageId} > .finance-workspace-marquee-row`);
    await expect(row.locator(":scope > .finance-week-marquee")).toBeHidden();
    await expect(row.locator(":scope > .money-workspace-switcher")).toBeVisible();
  }
});
