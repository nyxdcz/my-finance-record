import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

async function openMoney(page, width = 1440) {
  await page.setViewportSize({ width, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => Boolean(window.FinanceSummaryMascots));
  await page.waitForTimeout(50);
}

test("desktop Budget & Expenses uses the approved supplied mascots and exact spacing", async ({ page }) => {
  await openMoney(page, 1440);

  await page.evaluate(() => {
    for (const id of ["legendEarlyTotal", "legendLateTotal", "legendOtherTotal", "earlyTotal", "lateTotal", "otherTotal"]) {
      const element = document.getElementById(id);
      element.textContent = "₱0.00";
      element.classList.remove("summary-mascot-slot");
      delete element.dataset.summaryMascotActive;
      delete element.dataset.summaryMascotValue;
      delete element.dataset.summaryMascotColor;
    }
    window.FinanceSummaryMascots.refresh();
  });

  const expected = [
    ["#legendEarlyTotal", "mascot-red.svg"],
    ["#legendLateTotal", "mascot-orange.svg"],
    ["#legendOtherTotal", "mascot-blue.svg"],
    ["#earlyTotal", "mascot-red.svg"],
    ["#lateTotal", "mascot-orange.svg"],
    ["#otherTotal", "mascot-blue.svg"]
  ];

  for (const [selector, asset] of expected) {
    const slot = page.locator(selector);
    await expect(slot.locator(".summary-mascot-image")).toHaveCount(1);
    await expect(slot.locator(".summary-mascot-image")).toHaveAttribute("src", new RegExp(asset.replace(".", "\\.")));
    await expect(slot).toHaveAttribute("aria-label", /₱0\.00/);
  }

  const topGeometry = await page.locator("#legendEarlyTotal").evaluate(element => {
    const slot = element.getBoundingClientRect();
    const image = element.querySelector(".summary-mascot-image").getBoundingClientRect();
    const card = element.closest(".summary-card").getBoundingClientRect();
    return { slotWidth:slot.width, slotHeight:slot.height, imageWidth:image.width, imageHeight:image.height, rightInset:card.right - slot.right };
  });
  expect(topGeometry.slotWidth).toBeCloseTo(25, 0);
  expect(topGeometry.slotHeight).toBeCloseTo(25, 0);
  expect(topGeometry.imageWidth).toBeCloseTo(25, 0);
  expect(topGeometry.imageHeight).toBeCloseTo(25, 0);
  expect(topGeometry.rightInset).toBeCloseTo(20, 0);

  const lowerGeometry = await page.locator("#firstHalfSection").evaluate(section => {
    const header = section.querySelector(".period-header").getBoundingClientRect();
    const mascot = section.querySelector("#earlyTotal").getBoundingClientRect();
    const collapse = section.querySelector(".collapse-toggle").getBoundingClientRect();
    return {
      mascotWidth:mascot.width,
      mascotHeight:mascot.height,
      collapseWidth:collapse.width,
      collapseHeight:collapse.height,
      mascotGap:collapse.left - mascot.right,
      collapseRightInset:header.right - collapse.right
    };
  });
  expect(lowerGeometry.mascotWidth).toBeCloseTo(25, 0);
  expect(lowerGeometry.mascotHeight).toBeCloseTo(25, 0);
  expect(lowerGeometry.collapseWidth).toBeCloseTo(20, 0);
  expect(lowerGeometry.collapseHeight).toBeCloseTo(20, 0);
  expect(lowerGeometry.mascotGap).toBeCloseTo(10, 0);
  expect(lowerGeometry.collapseRightInset).toBeCloseTo(10, 0);
});

test("difference cards follow green and red state while phone keeps numeric values", async ({ page }) => {
  await openMoney(page, 1440);

  const setDifference = async ({ negative }) => {
    await page.evaluate(({ negative }) => {
      const card = [...document.querySelectorAll("#moneySummary .summary-card")].find(item => {
        const label = item.querySelector(".summary-label-desktop")?.textContent?.trim()
          || item.querySelector(".summary-card-label")?.textContent?.trim()
          || "";
        return label === "First-half difference";
      });
      const value = card.querySelector(".summary-card-value");
      value.textContent = negative ? "-₱100.00" : "₱100.00";
      value.classList.toggle("text-danger", negative);
      value.classList.toggle("text-green", !negative);
      card.classList.toggle("summary-card-danger", negative);
      card.classList.toggle("summary-card-green", !negative);
      window.FinanceSummaryMascots.refresh();
    }, { negative });
  };

  await setDifference({ negative:false });
  const difference = page.locator("#moneySummary .summary-card").filter({ hasText:"First-half difference" }).locator(".summary-card-value");
  await expect(difference.locator(".summary-mascot-image")).toHaveAttribute("src", /mascot-green\.svg/);
  await expect(difference).toHaveAttribute("aria-label", /₱100\.00/);

  await setDifference({ negative:true });
  await expect(difference.locator(".summary-mascot-image")).toHaveAttribute("src", /mascot-red\.svg/);
  await expect(difference).toHaveAttribute("aria-label", /-₱100\.00/);

  await page.setViewportSize({ width:390, height:844 });
  await expect(difference.locator(".summary-mascot-image")).toHaveCount(0);
  await expect(difference).toHaveText("-₱100.00");
});
