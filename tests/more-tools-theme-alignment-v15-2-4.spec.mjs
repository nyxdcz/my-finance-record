import { test, expect } from "@playwright/test";

test("More tools Appearance stays compact, left-aligned, and keeps Auto/Light/Dark on one row", async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  await page.evaluate(() => window.FinancePrivacyLock?.unlock?.({ email:"theme-alignment-test@example.invalid" }));

  await page.locator("#topbarToolsTrigger").click();
  await expect(page.locator("#topbarToolsPanel")).toBeVisible();

  const layout = await page.locator("#themeToggleButton").evaluate(button => {
    const icon = button.querySelector(":scope > .toolbar-icon");
    const textWrap = button.querySelector(":scope > span:last-child");
    const label = button.querySelector("#themeToggleText");
    const hiddenHeading = textWrap?.querySelector("strong");
    const searchIcon = document.querySelector("#globalSearchButton > .toolbar-icon");
    if (!icon || !textWrap || !label || !hiddenHeading || !searchIcon) throw new Error("More tools Appearance structure is incomplete");

    const buttonStyle = getComputedStyle(button);
    const wrapStyle = getComputedStyle(textWrap);
    const labelStyle = getComputedStyle(label);
    const headingStyle = getComputedStyle(hiddenHeading);
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const searchIconRect = searchIcon.getBoundingClientRect();

    return {
      buttonDisplay:buttonStyle.display,
      buttonAlign:buttonStyle.alignItems,
      buttonJustify:buttonStyle.justifyContent,
      buttonGap:buttonStyle.gap,
      buttonHeight:buttonRect.height,
      buttonPaddingLeft:buttonStyle.paddingLeft,
      wrapDisplay:wrapStyle.display,
      wrapAlign:wrapStyle.alignItems,
      labelDisplay:labelStyle.display,
      labelHeight:labelRect.height,
      iconWidth:iconRect.width,
      iconHeight:iconRect.height,
      centerDelta:Math.abs((iconRect.top + iconRect.height / 2) - (labelRect.top + labelRect.height / 2)),
      horizontalGap:labelRect.left - iconRect.right,
      iconLeftDelta:Math.abs(iconRect.left - searchIconRect.left),
      headingDisplay:headingStyle.display
    };
  });

  expect(layout.buttonDisplay).toBe("flex");
  expect(layout.buttonAlign).toBe("center");
  expect(layout.buttonJustify).toBe("flex-start");
  expect(layout.buttonGap).toBe("6px");
  expect(layout.buttonHeight).toBe(38);
  expect(layout.buttonPaddingLeft).toBe("10px");
  expect(layout.wrapDisplay).toBe("flex");
  expect(layout.wrapAlign).toBe("center");
  expect(layout.labelDisplay).toBe("flex");
  expect(layout.iconWidth).toBe(20);
  expect(layout.iconHeight).toBe(20);
  expect(layout.labelHeight).toBe(20);
  expect(layout.centerDelta).toBeLessThanOrEqual(1);
  expect(layout.horizontalGap).toBeCloseTo(6, 1);
  expect(layout.iconLeftDelta).toBeLessThanOrEqual(1);
  expect(layout.headingDisplay).toBe("none");

  for (const [preference, expected] of [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]]) {
    await page.evaluate(value => {
      document.documentElement.dataset.themePreference = value;
      document.documentElement.dataset.theme = value === "dark" ? "dark" : "light";
    }, preference);
    const generated = await page.locator("#themeToggleText").evaluate(element => {
      const content = getComputedStyle(element, "::after").content;
      return content && content !== "none" ? content.slice(1, -1) : "";
    });
    expect(generated).toBe(expected);
  }
});
