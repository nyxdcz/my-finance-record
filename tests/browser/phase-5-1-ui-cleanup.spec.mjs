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
