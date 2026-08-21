import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

async function openMoney(page, width = 1440) {
  await page.setViewportSize({ width, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => Boolean(window.FinanceSummaryMascots?.apply));
  await page.waitForTimeout(50);
}

test("desktop Budget & Expenses uses the approved supplied mascots and exact spacing", async ({ page }) => {
  await openMoney(page, 1440);

  const state = await page.evaluate(() => {
    for (const id of ["legendEarlyTotal", "legendLateTotal", "legendOtherTotal", "earlyTotal", "lateTotal", "otherTotal"]) {
      const element = document.getElementById(id);
      element.textContent = "₱0.00";
      element.classList.remove("summary-mascot-slot");
      delete element.dataset.summaryMascot;
      element.removeAttribute("aria-label");
      element.removeAttribute("title");
    }

    /* Reproduce the legacy completion smile that previously won this slot. */
    const legacyFirst = document.getElementById("legendEarlyTotal");
    legacyFirst.dataset.firstHalfOriginalText = "₱0.00";
    legacyFirst.textContent = "";
    const legacySmile = document.createElement("img");
    legacySmile.dataset.firstHalfCompleteIcon = "true";
    legacySmile.src = "./icons/heart-smile-light-v15-2-4.png";
    legacyFirst.appendChild(legacySmile);

    window.FinanceSummaryMascots.apply();

    const readSlot = id => {
      const element = document.getElementById(id);
      const box = element.getBoundingClientRect();
      const pseudo = getComputedStyle(element, "::after");
      return {
        mascot:element.dataset.summaryMascot || "",
        aria:element.getAttribute("aria-label") || "",
        width:box.width,
        height:box.height,
        pseudoWidth:parseFloat(pseudo.width),
        pseudoHeight:parseFloat(pseudo.height),
        background:pseudo.backgroundImage
      };
    };

    const top = document.getElementById("legendEarlyTotal");
    const topCard = top.closest(".summary-card").getBoundingClientRect();
    const topBox = top.getBoundingClientRect();
    const firstSection = document.getElementById("firstHalfSection");
    const header = firstSection.querySelector(".period-header").getBoundingClientRect();
    const lowerMascot = document.getElementById("earlyTotal").getBoundingClientRect();
    const collapse = firstSection.querySelector(".collapse-toggle").getBoundingClientRect();
    const mascotCenter = (lowerMascot.top + lowerMascot.bottom) / 2;
    const collapseCenter = (collapse.top + collapse.bottom) / 2;

    return {
      slots:{
        legendEarlyTotal:readSlot("legendEarlyTotal"),
        legendLateTotal:readSlot("legendLateTotal"),
        legendOtherTotal:readSlot("legendOtherTotal"),
        earlyTotal:readSlot("earlyTotal"),
        lateTotal:readSlot("lateTotal"),
        otherTotal:readSlot("otherTotal")
      },
      legacySmileDisplay:getComputedStyle(legacySmile).display,
      topRightInset:topCard.right - topBox.right,
      lower:{
        mascotGap:collapse.left - lowerMascot.right,
        mascotLift:collapseCenter - mascotCenter,
        collapseWidth:collapse.width,
        collapseHeight:collapse.height,
        collapseRightInset:header.right - collapse.right
      }
    };
  });

  const expected = {
    legendEarlyTotal:["red", "mascot-red.svg"],
    legendLateTotal:["orange", "mascot-orange.svg"],
    legendOtherTotal:["blue", "mascot-blue.svg"],
    earlyTotal:["red", "mascot-red.svg"],
    lateTotal:["orange", "mascot-orange.svg"],
    otherTotal:["blue", "mascot-blue.svg"]
  };

  for (const [id, [color, asset]] of Object.entries(expected)) {
    const slot = state.slots[id];
    expect(slot.mascot).toBe(color);
    expect(slot.aria).toContain("₱0.00");
    expect(slot.width).toBeCloseTo(30, 0);
    expect(slot.height).toBeCloseTo(30, 0);
    expect(slot.pseudoWidth).toBeCloseTo(30, 0);
    expect(slot.pseudoHeight).toBeCloseTo(30, 0);
    expect(slot.background).toContain(asset);
  }

  expect(state.legacySmileDisplay).toBe("none");
  expect(state.topRightInset).toBeCloseTo(20, 0);
  expect(state.lower.mascotGap).toBeCloseTo(10, 0);
  expect(state.lower.mascotLift).toBeCloseTo(3, 0);
  expect(state.lower.collapseWidth).toBeCloseTo(20, 0);
  expect(state.lower.collapseHeight).toBeCloseTo(20, 0);
  expect(state.lower.collapseRightInset).toBeCloseTo(10, 0);
});

test("difference cards follow green and red state while phone disables mascot override", async ({ page }) => {
  await openMoney(page, 1440);

  const setDifference = negative => page.evaluate(negative => {
    const card = [...document.querySelectorAll("#moneySummary .summary-card")].find(item => {
      const label = item.querySelector(".summary-label-desktop")?.textContent?.trim()
        || item.querySelector(".summary-card-label")?.textContent?.trim()
        || "";
      return label === "First-half difference";
    });
    const value = card.querySelector(".summary-card-value");
    value.textContent = negative ? "-₱100.00" : "₱100.00";
    delete value.dataset.firstHalfOriginalText;
    value.classList.toggle("text-danger", negative);
    value.classList.toggle("text-green", !negative);
    card.classList.toggle("summary-card-danger", negative);
    card.classList.toggle("summary-card-green", !negative);
    window.FinanceSummaryMascots.apply();
    return {
      mascot:value.dataset.summaryMascot || "",
      aria:value.getAttribute("aria-label") || "",
      text:value.textContent,
      background:getComputedStyle(value, "::after").backgroundImage
    };
  }, negative);

  const positive = await setDifference(false);
  expect(positive.mascot).toBe("green");
  expect(positive.aria).toContain("₱100.00");
  expect(positive.text).toBe("₱100.00");
  expect(positive.background).toContain("mascot-green.svg");

  const negative = await setDifference(true);
  expect(negative.mascot).toBe("red");
  expect(negative.aria).toContain("-₱100.00");
  expect(negative.text).toBe("-₱100.00");
  expect(negative.background).toContain("mascot-red.svg");

  await page.setViewportSize({ width:390, height:844 });

  await expect.poll(() => page.evaluate(() => ({
    slots:document.querySelectorAll("#money .summary-mascot-slot").length,
    data:document.querySelectorAll("#money [data-summary-mascot]").length,
    desktopMedia:window.matchMedia("(min-width: 851px)").matches
  }))).toEqual({ slots:0, data:0, desktopMedia:false });
});
