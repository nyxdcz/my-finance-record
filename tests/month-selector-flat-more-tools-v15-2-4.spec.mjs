import { test, expect } from "@playwright/test";

test("desktop month selector stays flat and removes nested glass chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--surface", "#0a0f17");
    document.documentElement.style.setProperty("--surface-soft", "#111827");
    document.documentElement.style.setProperty("--line", "#243247");
    document.documentElement.style.setProperty("--text", "#f8fafc");
    document.documentElement.style.setProperty("--muted", "#94a3b8");
    document.body.innerHTML = `
      <div class="topbar-actions">
        <div class="month-navigator">
          <button class="month-nav-button" id="previousMonthButton" type="button">‹</button>
          <div class="month-control">
            <button class="month-display-button" type="button">
              <span class="month-display-label">Month</span>
              <span class="month-display-separator"></span>
              <span class="month-display-value">August 2026</span>
            </button>
          </div>
          <button class="month-nav-button" id="nextMonthButton" type="button">›</button>
          <span class="month-status-chip current">Current</span>
        </div>
      </div>`;
  });

  await page.addStyleTag({ url:"http://127.0.0.1:3000/ui-icon-alignment-v15-0-5.css?v=month-flat-test" });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/liquid-glass-v15.css?v=month-flat-test" });

  const nav = page.locator(".month-navigator");
  const previous = page.locator("#previousMonthButton");
  const control = page.locator(".month-control");
  const next = page.locator("#nextMonthButton");
  const current = page.locator(".month-status-chip");

  await expect(nav).toHaveCSS("box-shadow", "none");
  await expect(nav).toHaveCSS("backdrop-filter", "none");
  await expect(nav).toHaveCSS("gap", "0px");
  await expect(previous).toHaveCSS("height", "38px");
  await expect(previous).toHaveCSS("border-right-width", "0px");
  await expect(control).toHaveCSS("height", "38px");
  await expect(control).toHaveCSS("backdrop-filter", "none");
  await expect(next).toHaveCSS("height", "38px");
  await expect(current).toHaveCSS("margin-left", "8px");
  await expect(current).toHaveCSS("height", "38px");
});
