import { test, expect } from "@playwright/test";

const styles = [
  "app.css?v=2.5.0-talaan1",
  "dashboard-interactions.css?v=2.5.0-talaan1",
  "summary-mascots.css?v=2.5.0-talaan1"
];

async function loadDashboardFixture(page, width = 1440) {
  await page.setViewportSize({ width, height:900 });
  const links = styles.map(href => `<link rel="stylesheet" href="http://127.0.0.1:3000/${href}">`).join("");
  await page.setContent(`<!doctype html><html data-theme="light"><head>${links}</head><body><div class="app"><main class="main"><div class="content"><section class="page active" id="dashboard"><div class="dashboard-card-grid" id="dashboardCardGrid"><article class="dashboard-detail-card" data-dashboard-card="calendar"><button type="button" class="dashboard-drag-handle">⠿</button><button type="button" class="dashboard-resize-handle">↔</button><p>Dashboard card</p></article></div></section></div></main></div><div id="overflowSentinel" style="width:calc(100vw + 120px);height:1px"></div></body></html>`, { waitUntil:"networkidle" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector(".dashboard-drag-handle")).display)).toBe("none");
}

async function loadFinanceRailFixture(page, width = 1024) {
  await page.setViewportSize({ width, height:900 });
  const links = [
    "app.css?v=2.5.0-talaan1",
    "production-ui-audit.css?v=2.5.0-talaan1",
    "summary-mascots.css?v=2.5.0-talaan1"
  ].map(href => `<link rel="stylesheet" href="http://127.0.0.1:3000/${href}">`).join("");
  await page.setContent(`<!doctype html><html data-theme="light"><head>${links}</head><body><div class="app"><main class="main"><div class="content"><section class="page active" id="money"><div class="section-stack"><article style="flex:0 0 520px;height:180px">First half</article><article style="flex:0 0 520px;height:180px">Second half</article><article style="flex:0 0 520px;height:180px">Other expenses</article></div><div class="transaction-totals-footer"><span>5 visible</span><strong>₱77,890.00</strong></div></section></div></main></div></body></html>`, { waitUntil:"networkidle" });
}

test("Dashboard drag and resize controls appear only while Customize is active", async ({ page }) => {
  await loadDashboardFixture(page, 1440);

  const normal = await page.evaluate(() => ({
    drag:getComputedStyle(document.querySelector(".dashboard-drag-handle")).display,
    resize:getComputedStyle(document.querySelector(".dashboard-resize-handle")).display
  }));
  expect(normal).toEqual({ drag:"none", resize:"none" });

  await page.evaluate(() => document.getElementById("dashboard").classList.add("dashboard-customizing"));
  const customizing = await page.evaluate(() => ({
    drag:getComputedStyle(document.querySelector(".dashboard-drag-handle")).display,
    resize:getComputedStyle(document.querySelector(".dashboard-resize-handle")).display
  }));
  expect(customizing).toEqual({ drag:"grid", resize:"flex" });

  await page.evaluate(() => document.getElementById("dashboard").classList.remove("dashboard-customizing"));
  await expect(page.locator(".dashboard-drag-handle")).toHaveCSS("display", "none");
  await expect(page.locator(".dashboard-resize-handle")).toHaveCSS("display", "none");
});

test("phone Customize keeps resize controls hidden", async ({ page }) => {
  await loadDashboardFixture(page, 390);
  await page.evaluate(() => document.getElementById("dashboard").classList.add("dashboard-customizing"));

  await expect(page.locator(".dashboard-drag-handle")).toHaveCSS("display", "grid");
  await expect(page.locator(".dashboard-resize-handle")).toHaveCSS("display", "none");
});

test("page shell clips accidental horizontal overflow instead of drawing a bottom scrollbar artifact", async ({ page }) => {
  await loadDashboardFixture(page, 1440);

  const state = await page.evaluate(() => {
    document.documentElement.scrollLeft = 80;
    document.body.scrollLeft = 80;
    return {
      htmlOverflow:getComputedStyle(document.documentElement).overflowX,
      bodyOverflow:getComputedStyle(document.body).overflowX,
      htmlScrollLeft:document.documentElement.scrollLeft,
      bodyScrollLeft:document.body.scrollLeft,
      mainMaxWidth:getComputedStyle(document.querySelector(".main")).maxWidth,
      contentMaxWidth:getComputedStyle(document.querySelector(".content")).maxWidth
    };
  });

  expect(state.htmlOverflow).toBe("clip");
  expect(state.bodyOverflow).toBe("clip");
  expect(state.htmlScrollLeft).toBe(0);
  expect(state.bodyScrollLeft).toBe(0);
  expect(state.mainMaxWidth).toBe("100%");
  expect(state.contentMaxWidth).toBe("100%");
});

test("medium desktop Finance keeps horizontal card swipe without a visible bottom scrollbar gutter", async ({ page }) => {
  await loadFinanceRailFixture(page, 1024);

  const state = await page.evaluate(() => {
    const rail = document.querySelector("#money .section-stack");
    const app = document.querySelector(".app");
    const main = document.querySelector(".main");
    const content = document.querySelector(".content");
    const money = document.getElementById("money");
    rail.scrollLeft = 120;
    return {
      railOverflowX:getComputedStyle(rail).overflowX,
      railScrollbarGutter:getComputedStyle(rail).scrollbarGutter,
      railScrollbarWidth:getComputedStyle(rail).scrollbarWidth,
      railCanScroll:rail.scrollWidth > rail.clientWidth,
      railScrollLeft:rail.scrollLeft,
      appOverflowX:getComputedStyle(app).overflowX,
      mainOverflowX:getComputedStyle(main).overflowX,
      contentOverflowX:getComputedStyle(content).overflowX,
      pageOverflowX:getComputedStyle(money).overflowX
    };
  });

  expect(state.railOverflowX).toBe("auto");
  expect(state.railScrollbarGutter).toBe("auto");
  expect(state.railScrollbarWidth).toBe("none");
  expect(state.railCanScroll).toBe(true);
  expect(state.railScrollLeft).toBeGreaterThan(0);
  expect(state.appOverflowX).toBe("clip");
  expect(state.mainOverflowX).toBe("clip");
  expect(state.contentOverflowX).toBe("clip");
  expect(state.pageOverflowX).toBe("clip");
});
