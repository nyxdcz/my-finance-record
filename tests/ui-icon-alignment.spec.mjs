import { test, expect } from "@playwright/test";

test("production V15.1.0 UI alignment uses the delivered final stylesheet", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href") || ""));
  const dashboardCss = styles.findIndex(href => href.includes("dashboard-interactions.css?v=14.0.23"));
  const uiCss = styles.findIndex(href => href.includes("ui-icon-alignment-v15-0-5.css?v=15.1.0-ui2"));
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
