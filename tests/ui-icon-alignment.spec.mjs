import { test, expect } from "@playwright/test";

test("production V15.2.4 UI alignment uses the delivered final stylesheet", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href") || ""));
  const dashboardCss = styles.findIndex(href => href.includes("dashboard-interactions.css?v=15.1.0-desktop3"));
  const uiCss = styles.findIndex(href => href.includes("ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1"));
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


test("V15.2.2 header moves Dashboard customization into More tools", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });

  await expect(page.locator("#privacySignInButton")).toHaveCount(0);
  await expect(page.locator("#cloudSignIn")).toHaveCount(1);

  const standalone = page.locator("#customizeDashboardButton");
  await expect(standalone).toHaveAttribute("data-dashboard-toolbar-action", "true");
  await expect(standalone).toBeHidden();

  const menuItem = page.locator("#customizeDashboardMenuButton");
  await expect(menuItem).toHaveCount(1);
  await expect(menuItem).toHaveAttribute("role", "menuitem");
  await expect(menuItem).toHaveAttribute("aria-label", "Customize dashboard");
  await expect(menuItem.locator("strong")).toHaveText("Customize dashboard");
  const icon = menuItem.locator(".toolbar-icon svg");
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
  await expect(icon.locator("rect")).toHaveCount(3);
  await expect(icon.locator("path")).toHaveCount(1);
});


test("V15.2.2 desktop topbar keeps only persistent controls at the Synced 38px height", async ({ page }) => {
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
    ".month-navigator",
    "#quickAddExpense",
    "#topbarToolsTrigger"
  ]) {
    expect(await heightOf(selector), `${selector} should match Synced height`).toBe(reference);
  }

  await expect(page.locator(".topbar-history-actions")).toBeHidden();
  await expect(page.locator("#undoMoneyButton")).toBeHidden();
  await expect(page.locator("#redoMoneyButton")).toBeHidden();
  await expect(page.locator("#undoMoneyMenuButton")).toHaveCount(1);
  await expect(page.locator("#redoMoneyMenuButton")).toHaveCount(1);
});


test("V15.2.4 desktop month navigation uses flat segmented More tools chrome", async ({ page }) => {
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
      borderWidth:style.borderTopWidth,
      background:style.backgroundColor,
      shadow:style.boxShadow,
      backdrop:style.backdropFilter
    };
  });
  expect(shellStyle.height).toBe(38);
  expect(shellStyle.borderWidth).toBe("0px");
  expect(shellStyle.background).toBe("rgba(0, 0, 0, 0)");
  expect(shellStyle.shadow).toBe("none");
  expect(shellStyle.backdrop).toBe("none");

  for (const selector of ["#previousMonthButton", "#monthControl", "#nextMonthButton"]) {
    const style = await page.locator(selector).evaluate(element => {
      const computed = getComputedStyle(element);
      return { height:element.getBoundingClientRect().height, borderWidth:computed.borderTopWidth, backdrop:computed.backdropFilter };
    });
    expect(style.height, `${selector} should stay at the compact toolbar height`).toBe(38);
    expect(style.borderWidth, `${selector} should use the flat segmented outline`).toBe("1px");
    expect(style.backdrop, `${selector} should not use glass blur`).toBe("none");
  }

  const current = page.locator("#currentMonthButton:not([hidden]), #monthStatusChip:not([hidden])").first();
  await expect(current).toBeVisible();
  const currentStyle = await current.evaluate(element => {
    const style = getComputedStyle(element);
    return { height:element.getBoundingClientRect().height, marginLeft:style.marginLeft };
  });
  expect(currentStyle.height).toBe(38);
  expect(currentStyle.marginLeft).toBe("8px");
});
