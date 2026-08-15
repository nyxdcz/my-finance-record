import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/";
const DESKTOP_WIDTHS = [1024, 1280, 1366, 1440, 1920];

for (const width of DESKTOP_WIDTHS) {
  test(`desktop UI contract at ${width}px`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("simple-finance-theme-v1", "light"));
    await page.setViewportSize({ width, height: 900 });
    await page.goto(APP_URL, { waitUntil:"domcontentloaded" });

    const contract = await page.evaluate(() => {
      const content = getComputedStyle(document.querySelector(".content"));
      const topbar = getComputedStyle(document.querySelector(".topbar"));
      const card = getComputedStyle(document.querySelector(".card"));
      const row = getComputedStyle(document.querySelector(".finance-workspace-marquee-row"));
      const budgetToggle = getComputedStyle(document.querySelector(".budget-panel-collapse"));
      const insights = document.querySelector(".insights-nav-button");
      return {
        theme: document.documentElement.dataset.theme,
        background: getComputedStyle(document.body).backgroundColor,
        paddingLeft: content.paddingLeft,
        paddingRight: content.paddingRight,
        topbarMinHeight: topbar.minHeight,
        cardRadius: card.borderRadius,
        cardPadding: card.paddingTop,
        financeStickyTop: row.top,
        budgetToggleWidth: budgetToggle.width,
        insightsPseudoContent: getComputedStyle(insights, "::before").content,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
      };
    });

    expect(contract.theme).toBe("light");
    expect(contract.background).toBe("rgb(239, 239, 239)");
    expect(contract.paddingLeft).toBe("24px");
    expect(contract.paddingRight).toBe("24px");
    expect(contract.topbarMinHeight).toBe("72px");
    expect(contract.cardRadius).toBe("12px");
    expect(contract.cardPadding).toBe("16px");
    expect(contract.financeStickyTop).toBe("72px");
    expect(contract.budgetToggleWidth).toBe("32px");
    expect(contract.insightsPseudoContent).toBe("none");
    expect(contract.hasHorizontalOverflow).toBe(false);
  });
}

test("dark mode keeps the Black Canvas background", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("simple-finance-theme-v1", "dark"));
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");
});
