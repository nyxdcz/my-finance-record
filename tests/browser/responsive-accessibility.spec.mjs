import { test, expect } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000/?page=money";
const widths = [320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];

test.use({ serviceWorkers:"block" });

async function openApp(page, width) {
  const height = width <= 430 ? 852 : width <= 1024 ? 900 : 1000;
  await page.setViewportSize({ width, height });
  await page.goto(APP_URL, { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.waitForFunction(() => !document.body.classList.contains("finance-auth-pending"));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await expect(page.locator("body")).toHaveClass(/finance-signed-in/);
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
        switcherInside:inside(rect(switcher))
      };
    });
    expect(metrics.overflow).toBe(false);
    expect(metrics.topbarInside).toBe(true);
    expect(metrics.switcherInside).toBe(true);
  });
}

test("collapsed Monthly Budget Plan stays compact and readable at narrow phone widths", async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await openApp(page, width);
    const card = page.locator("#monthlyBudgetPlannerCard");
    await expect(card).toBeAttached();
    await page.evaluate(() => {
      const planner = document.getElementById("monthlyBudgetPlannerCard");
      if (planner) planner.classList.add("is-planner-collapsed");
    });
    const metrics = await card.evaluate(node => {
      const visible = [...node.querySelectorAll(".budget-plan-kpi")].filter(item => getComputedStyle(item).display !== "none");
      const labels = visible.map(item => parseFloat(getComputedStyle(item.querySelector("span")).fontSize));
      const rects = visible.map(item => item.getBoundingClientRect());
      const cardRect = node.getBoundingClientRect();
      return {
        count:visible.length,
        readable:labels.every(size => size >= 10),
        sameRow:rects.length === 3 && rects.every(box => Math.abs(box.top - rects[0].top) < 2),
        inside:rects.every(box => box.left >= -1 && box.right <= innerWidth + 1),
        height:cardRect.height
      };
    });
    expect(metrics.count).toBe(3);
    expect(metrics.readable).toBe(true);
    expect(metrics.sameRow).toBe(true);
    expect(metrics.inside).toBe(true);
    expect(metrics.height).toBeLessThanOrEqual(130);
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
      color:style.outlineColor,
      offset:parseFloat(style.outlineOffset)
    };
  });
  expect(focus.width).toBeGreaterThanOrEqual(3);
  expect(focus.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(focus.offset).toBeGreaterThanOrEqual(2);
});

test("touch tablets keep visible primary controls touch safe", async ({ browser }) => {
  for (const width of [768, 820, 1024]) {
    const context = await browser.newContext({ viewport:{ width, height:900 }, hasTouch:true, isMobile:true });
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil:"domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
    await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
    const sizes = await page.evaluate(() => {
      const visibleHeight = selector => {
        const node = [...document.querySelectorAll(selector)].find(candidate => {
          const box = candidate.getBoundingClientRect();
          const style = getComputedStyle(candidate);
          return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        });
        return node ? node.getBoundingClientRect().height : null;
      };
      return {
        coarse:matchMedia("(pointer:coarse)").matches,
        hoverNone:matchMedia("(hover:none)").matches,
        workspace:visibleHeight(".workspace-switcher-button"),
        month:visibleHeight(".month-nav-button"),
        tools:visibleHeight("#topbarToolsTrigger")
      };
    });
    expect(sizes.coarse || sizes.hoverNone).toBe(true);
    const visibleTargets = [sizes.workspace, sizes.month, sizes.tools].filter(Number.isFinite);
    expect(visibleTargets.length).toBeGreaterThanOrEqual(2);
    visibleTargets.forEach(height => expect(height).toBeGreaterThanOrEqual(44));
    await context.close();
  }
});
