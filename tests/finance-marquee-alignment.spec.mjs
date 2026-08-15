import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/";
const FINANCE_PAGES = ["money", "income", "paid-expenses"];

async function activatePage(page, pageId) {
  await page.evaluate(id => {
    document.body.classList.remove("finance-signed-out", "finance-auth-pending");
    document.body.classList.add("finance-signed-in");
    document.querySelectorAll(".page.active").forEach(node => node.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  }, pageId);
}

test("all Finance pages place the workspace tabs before the weekly marquee in one shared row", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinanceInteractionPatterns));

  for (const pageId of FINANCE_PAGES) {
    const row = page.locator(`#${pageId} > .finance-workspace-marquee-row`);
    await expect(row).toHaveCount(1);
    const childClasses = await row.evaluate(node => [...node.children].map(child => child.className));
    expect(childClasses[0]).toContain("money-workspace-switcher");
    expect(childClasses[1]).toContain("finance-week-marquee");

    await activatePage(page, pageId);
    const switcher = row.locator(":scope > .money-workspace-switcher");
    const marquee = row.locator(":scope > .finance-week-marquee");
    const switcherBox = await switcher.boundingBox();
    const marqueeBox = await marquee.boundingBox();

    expect(switcherBox).not.toBeNull();
    expect(marqueeBox).not.toBeNull();
    expect(Math.abs(switcherBox.y - marqueeBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(switcherBox.height - 43)).toBeLessThanOrEqual(1);
    expect(Math.abs(marqueeBox.height - 43)).toBeLessThanOrEqual(1);
    expect(switcherBox.x).toBeLessThan(marqueeBox.x);
  }
});

test("Finance weekly marquees remain hidden on phone while workspace tabs stay available", async ({ page }) => {
  await page.setViewportSize({ width:393, height:852 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinanceInteractionPatterns));

  for (const pageId of FINANCE_PAGES) {
    await activatePage(page, pageId);
    const row = page.locator(`#${pageId} > .finance-workspace-marquee-row`);
    await expect(row.locator(":scope > .finance-week-marquee")).toBeHidden();
    await expect(row.locator(":scope > .money-workspace-switcher")).toBeVisible();
  }
});
