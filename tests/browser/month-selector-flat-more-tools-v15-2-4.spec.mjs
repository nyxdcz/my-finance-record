import { test, expect } from "@playwright/test";

test("desktop month selector uses rounded standalone controls and a compact 4x3 picker", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--surface", "#0a0f17");
    document.documentElement.style.setProperty("--surface-soft", "#111827");
    document.documentElement.style.setProperty("--line", "#243247");
    document.documentElement.style.setProperty("--text", "#f8fafc");
    document.documentElement.style.setProperty("--muted", "#94a3b8");
    document.documentElement.style.setProperty("--primary", "#173e76");
    document.documentElement.style.setProperty("--primary-contrast", "#ffffff");
    document.body.innerHTML = `
      <div class="topbar-actions">
        <div class="month-navigator">
          <button class="month-nav-button" id="previousMonthButton" type="button" aria-label="Previous month">‹</button>
          <div class="month-control" id="monthControl">
            <button class="month-display-button" id="monthDisplayButton" type="button" aria-haspopup="dialog" aria-expanded="true" aria-controls="monthPickerPopover">
              <span class="month-display-label">Month</span>
              <span class="month-display-separator"></span>
              <span class="month-display-value">August 2026</span>
            </button>
            <div class="month-picker-popover" id="monthPickerPopover" role="dialog" aria-label="Choose month">
              <div class="month-picker-heading">
                <button type="button" class="month-picker-year-button" aria-label="Previous year">‹</button>
                <strong>2026</strong>
                <button type="button" class="month-picker-year-button" aria-label="Next year">›</button>
              </div>
              <div class="month-picker-grid" role="grid" aria-label="Months">
                ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((name, index) => `<button type="button" class="month-picker-option" aria-selected="${index === 7 ? "true" : "false"}">${name}</button>`).join("")}
              </div>
            </div>
          </div>
          <button class="month-nav-button" id="nextMonthButton" type="button" aria-label="Next month">›</button>
          <span class="month-status-chip current">Current</span>
        </div>
      </div>`;
  });

  await page.addStyleTag({ url:"http://127.0.0.1:3000/app.css?v=month-rounded-test" });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/ui-icon-alignment-v15-0-5.css?v=month-rounded-test" });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/liquid-glass-v15.css?v=month-rounded-test" });

  const nav = page.locator(".month-navigator");
  const previous = page.locator("#previousMonthButton");
  const control = page.locator("#monthControl");
  const display = page.locator("#monthDisplayButton");
  const label = page.locator(".month-display-label");
  const separator = page.locator(".month-display-separator");
  const popover = page.locator("#monthPickerPopover");
  const grid = page.locator(".month-picker-grid");
  const next = page.locator("#nextMonthButton");
  const current = page.locator(".month-status-chip");

  await expect(nav).toHaveCSS("box-shadow", "none");
  await expect(nav).toHaveCSS("backdrop-filter", "none");
  await expect(nav).toHaveCSS("gap", "6px");

  await expect(previous).toHaveCSS("height", "38px");
  await expect(previous).toHaveCSS("border-right-width", "1px");
  await expect(previous).toHaveCSS("border-radius", "9px");
  await expect(next).toHaveCSS("height", "38px");
  await expect(next).toHaveCSS("border-left-width", "1px");
  await expect(next).toHaveCSS("border-radius", "9px");

  await expect(control).toHaveCSS("height", "38px");
  await expect(control).toHaveCSS("width", "178px");
  await expect(control).toHaveCSS("border-right-width", "1px");
  await expect(control).toHaveCSS("border-radius", "9px");
  await expect(control).toHaveCSS("backdrop-filter", "none");
  await expect(label).toHaveCSS("display", "none");
  await expect(separator).toHaveCSS("display", "none");

  const geometry = await page.evaluate(() => {
    const previous = document.querySelector("#previousMonthButton");
    const control = document.querySelector("#monthControl");
    const display = document.querySelector("#monthDisplayButton");
    const popover = document.querySelector("#monthPickerPopover");
    const grid = document.querySelector(".month-picker-grid");
    const before = getComputedStyle(display, "::before");
    const previousStyle = getComputedStyle(previous);
    const controlStyle = getComputedStyle(control);
    const popoverStyle = getComputedStyle(popover);
    const gridStyle = getComputedStyle(grid);
    return {
      previousShadow:previousStyle.boxShadow,
      controlShadow:controlStyle.boxShadow,
      calendarMask:before.webkitMaskImage || before.maskImage,
      popoverWidth:popoverStyle.width,
      popoverTransform:popoverStyle.transform,
      popoverBackdrop:popoverStyle.backdropFilter,
      rightDelta:Math.abs(popover.getBoundingClientRect().right - control.getBoundingClientRect().right),
      gridColumns:gridStyle.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      optionCount:grid.children.length
    };
  });

  expect(geometry.previousShadow).not.toBe("none");
  expect(geometry.controlShadow).not.toBe("none");
  expect(geometry.calendarMask).not.toBe("none");
  expect(geometry.popoverWidth).toBe("280px");
  expect(geometry.popoverTransform).toBe("none");
  expect(geometry.popoverBackdrop).toBe("none");
  expect(geometry.rightDelta).toBeLessThanOrEqual(1);
  expect(geometry.gridColumns).toBe(4);
  expect(geometry.optionCount).toBe(12);

  await expect(popover).toHaveCSS("border-radius", "12px");
  await expect(grid.locator(".month-picker-option").nth(7)).toHaveCSS("background-color", "rgb(23, 62, 118)");
  await expect(current).toHaveCSS("margin-left", "2px");
  await expect(current).toHaveCSS("height", "38px");
});
