import { test, expect } from "@playwright/test";

test("production V15.0.4 UI alignment uses the final ui2 stylesheet", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });

  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href") || ""));
  const dashboardCss = styles.findIndex(href => href.includes("dashboard-interactions.css?v=14.0.23"));
  const ui2Css = styles.findIndex(href => href.includes("ui-icon-alignment-v15-0-4.css?v=15.0.4-ui3"));
  expect(dashboardCss).toBeGreaterThanOrEqual(0);
  expect(ui2Css).toBeGreaterThan(dashboardCss);
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
