import { test, expect } from "@playwright/test";

test("production V15.1.0 UI alignment uses the delivered final stylesheet", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href") || ""));
  const dashboardCss = styles.findIndex(href => href.includes("dashboard-interactions.css?v=15.1.0-desktop3"));
  const uiCss = styles.findIndex(href => href.includes("ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3"));
  expect(dashboardCss).toBeGreaterThanOrEqual(0);
  expect(uiCss).toBeGreaterThan(dashboardCss);
  expect(styles.some(href => href.includes("ui-icon-alignment-v15-0-4.css?v=15.0.4-ui1"))).toBe(false);

  const badge = await page.locator("#buildBadge").evaluate(element => {
    const before = getComputedStyle(element, "::before");
    return { content:before.content, display:before.display, width:before.width, marginRight:before.marginRight };
  });
  expect(badge.content).toBe("none");
  expect(badge.display).toBe("none");
  expect(badge.width).toBe("0px");
  expect(badge.marginRight).toBe("0px");

  const addExpenseGap = await page.locator("#quickAddExpense").evaluate(element => getComputedStyle(element).gap);
  expect(addExpenseGap).toBe("4px");

  await context.close();
});


test("V15.1.0 header omits duplicate sign-in shortcut and optically centers Dashboard utility glyph", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });

  await expect(page.locator("#privacySignInButton")).toHaveCount(0);
  await expect(page.locator("#cloudSignIn")).toHaveCount(1);

  const customize = page.locator("#customizeDashboardButton");
  await expect(customize).toHaveAttribute("data-dashboard-toolbar-action", "true");
  const geometry = await customize.evaluate(element => {
    const button = getComputedStyle(element);
    const glyph = getComputedStyle(element, "::before");
    return {
      width:button.width,
      height:button.height,
      display:button.display,
      justifyItems:button.justifyItems,
      alignItems:button.alignItems,
      glyphWidth:glyph.width,
      glyphHeight:glyph.height,
      glyphTransform:glyph.transform,
      glyphMargin:glyph.margin
    };
  });
  expect(geometry.width).toBe("38px");
  expect(geometry.height).toBe("38px");
  expect(geometry.display).toBe("grid");
  expect(geometry.justifyItems).toBe("center");
  expect(geometry.alignItems).toBe("center");
  expect(geometry.glyphWidth).toBe("20px");
  expect(geometry.glyphHeight).toBe("20px");
  expect(geometry.glyphTransform).toBe("matrix(1, 0, 0, 1, 0, 1)");
  expect(geometry.glyphMargin).toBe("0px");
});


test("V15.1.0 desktop topbar controls match the Synced 38px height", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"networkidle" });

  await page.evaluate(() => {
    window.FinancePrivacyLock?.unlock?.({ email:"toolbar-height-test@example.invalid" });
    const add = document.getElementById("quickAddExpense");
    if (add) add.hidden = false;
  });

  await expect(page.locator("#cloudSyncStatusButton")).toBeVisible();
  const heightOf = selector => page.locator(selector).first().evaluate(element => element.getBoundingClientRect().height);
  const reference = await heightOf("#cloudSyncStatusButton");
  expect(reference).toBe(38);

  for (const selector of [
    "#customizeDashboardButton",
    ".month-navigator",
    "#undoMoneyButton",
    "#redoMoneyButton",
    "#quickAddExpense",
    "#topbarToolsTrigger"
  ]) {
    expect(await heightOf(selector), `${selector} should match Synced height`).toBe(reference);
  }
});


test("V15.1.0 desktop month navigation removes its surrounding line", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  await page.evaluate(() => window.FinancePrivacyLock?.unlock?.({ email:"month-nav-border-test@example.invalid" }));

  const shell = page.locator(".topbar-actions .month-navigator");
  await expect(shell).toBeVisible();
  const shellStyle = await shell.evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      height:rect.height,
      borderColor:style.borderTopColor,
      background:style.backgroundColor,
      shadow:style.boxShadow
    };
  });
  expect(shellStyle.height).toBe(38);
  expect(shellStyle.borderColor).toBe("rgba(0, 0, 0, 0)");
  expect(shellStyle.background).toBe("rgba(0, 0, 0, 0)");
  expect(shellStyle.shadow).toBe("none");

  for (const selector of ["#previousMonthButton", "#monthControl", "#nextMonthButton"]) {
    const borderWidth = await page.locator(selector).evaluate(element => getComputedStyle(element).borderTopWidth);
    expect(borderWidth, `${selector} should not show a surrounding border`).toBe("0px");
  }

  const current = page.locator("#currentMonthButton:not([hidden]), #monthStatusChip:not([hidden])").first();
  await expect(current).toBeVisible();
  const currentBorderWidth = await current.evaluate(element => getComputedStyle(element).borderTopWidth);
  expect(currentBorderWidth).toBe("0px");
});
