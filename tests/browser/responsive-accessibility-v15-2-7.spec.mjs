import { test, expect } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/?page=money";
const widths = [320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];

async function openApp(page, width) {
  const height = width <= 430 ? 852 : width <= 1024 ? 900 : 1000;
  await page.setViewportSize({ width, height });
  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => Boolean(document.querySelector("#money")));
}

for (const width of widths) {
  test(`real app has no viewport overflow at ${width}px`, async ({ page }) => {
    await openApp(page, width);
    const metrics = await page.evaluate(() => {
      const row = document.querySelector("#money > .finance-workspace-marquee-row");
      const switcher = row?.querySelector(":scope > .money-workspace-switcher");
      const topbar = document.querySelector(".topbar");
      const rect = element => element?.getBoundingClientRect();
      const inside = box => !box || (box.left >= -1 && box.right <= innerWidth + 1);
      return {
        overflow:Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
        topbarInside:inside(rect(topbar)),
        switcherInside:inside(rect(switcher)),
        switcherHeight:switcher ? rect(switcher).height : 0
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.topbarInside).toBe(true);
    expect(metrics.switcherInside).toBe(true);
    expect(metrics.switcherHeight).toBeGreaterThan(0);
  });
}

test("collapsed Monthly Budget Plan stays readable at narrow phone widths", async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await openApp(page, width);
    const card = page.locator("#monthlyBudgetPlannerCard");
    const toggle = page.locator("#monthlyBudgetPlannerToggle");
    await expect(card).toBeAttached();
    if (await toggle.getAttribute("aria-expanded") === "true") {
      await page.evaluate(() => document.getElementById("monthlyBudgetPlannerToggle")?.click());
    }
    await expect(card).toHaveClass(/is-planner-collapsed/);
    const metrics = await card.evaluate(node => {
      const visible = [...node.querySelectorAll(".budget-plan-kpi")].filter(item => getComputedStyle(item).display !== "none");
      const labels = visible.map(item => parseFloat(getComputedStyle(item.querySelector("span")).fontSize));
      const rects = visible.map(item => item.getBoundingClientRect());
      return {
        count:visible.length,
        readable:labels.every(size => size >= 10),
        firstTwoSameRow:rects.length >= 2 && Math.abs(rects[0].top - rects[1].top) < 2,
        thirdNextRow:rects.length >= 3 && rects[2].top > rects[0].top + 2,
        inside:rects.every(box => box.left >= -1 && box.right <= innerWidth + 1)
      };
    });
    expect(metrics.count).toBe(3);
    expect(metrics.readable).toBe(true);
    expect(metrics.firstTwoSameRow).toBe(true);
    expect(metrics.thirdNextRow).toBe(true);
    expect(metrics.inside).toBe(true);
  }
});

test("dark mode keyboard focus indicator is visible", async ({ page }) => {
  await openApp(page, 390);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.themePreference = "dark";
  });
  const button = page.locator("#menuButton");
  await button.focus();
  const focus = await button.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      width:parseFloat(style.outlineWidth),
      style:style.outlineStyle,
      color:style.outlineColor,
      offset:parseFloat(style.outlineOffset)
    };
  });
  expect(focus.width).toBeGreaterThanOrEqual(3);
  expect(focus.style).toBe("solid");
  expect(focus.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(focus.offset).toBeGreaterThanOrEqual(2);
});

test("coarse-pointer tablets keep primary controls touch safe", async ({ browser }) => {
  for (const width of [768, 820, 1024]) {
    const context = await browser.newContext({ viewport:{ width, height:900 }, hasTouch:true, isMobile:true });
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
    await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
    const sizes = await page.evaluate(() => {
      const px = selector => {
        const node = document.querySelector(selector);
        return node ? parseFloat(getComputedStyle(node).minHeight) : 0;
      };
      return {
        workspace:px(".workspace-switcher-button"),
        month:px(".month-nav-button"),
        tools:px("#topbarToolsTrigger")
      };
    });
    expect(sizes.workspace).toBeGreaterThanOrEqual(44);
    expect(sizes.month).toBeGreaterThanOrEqual(44);
    expect(sizes.tools).toBeGreaterThanOrEqual(44);
    await context.close();
  }
});
