import { test, expect } from "@playwright/test";

test("V15.0.4 icon alignment survives legacy stylesheet order", async ({ page }) => {
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <link rel="stylesheet" href="http://127.0.0.1:3000/ui-icon-alignment-v15-0-4.css?v=15.0.4-ui1">
        <link rel="stylesheet" href="http://127.0.0.1:3000/dashboard-interactions.css?v=14.0.23">
      </head>
      <body>
        <small id="buildBadge">V15.0.4</small>
        <button class="button" id="addAccountButton">Add account</button>
        <div class="topbar-actions">
          <button id="customizeDashboardButton" data-dashboard-toolbar-action="customize" type="button"></button>
        </div>
      </body>
    </html>`);

  await page.waitForFunction(() => Array.from(document.styleSheets).filter(sheet => sheet.href).length >= 2);

  const badge = await page.locator("#buildBadge").evaluate(element => {
    const before = getComputedStyle(element, "::before");
    return { content:before.content, display:before.display, width:before.width, marginRight:before.marginRight };
  });
  expect(badge.content).toBe("none");
  expect(badge.display).toBe("none");
  expect(badge.width).toBe("0px");
  expect(badge.marginRight).toBe("0px");

  const accountGap = await page.locator("#addAccountButton").evaluate(element => getComputedStyle(element).gap);
  expect(accountGap).toBe("4px");

  const customize = await page.locator("#customizeDashboardButton").evaluate(element => {
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, "::before");
    return {
      display:style.display,
      alignItems:style.alignItems,
      justifyItems:style.justifyItems,
      paddingLeft:style.paddingLeft,
      paddingRight:style.paddingRight,
      beforeMargin:before.margin
    };
  });
  expect(customize.display).toBe("inline-grid");
  expect(customize.alignItems).toBe("center");
  expect(customize.justifyItems).toBe("center");
  expect(customize.paddingLeft).toBe("0px");
  expect(customize.paddingRight).toBe("0px");
  expect(customize.beforeMargin).toBe("0px");
});
