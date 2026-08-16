import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

for (const [label, width] of [["phone", 390], ["desktop", 1280]]) {
  test(`expense dialog removes redundant guidance on ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="http://127.0.0.1:3000/desktop-ux-v15-2-0.css?v=15.2.1"></head><body><dialog id="expenseDialog" open><form><div class="modal-body"><p class="required-note" id="expenseRequired">* Required fields</p><div class="expense-form-mode-note" id="expenseFormModeNote">Normal expenses use an amount, category, date, and optional monthly repeat.</div><div class="form-grid" id="expenseGrid"><div>Expense type</div><div>Expense name</div></div></div></form></dialog><dialog id="incomeDialog" open><form><div class="modal-body"><p class="required-note" id="incomeRequired">* Required fields</p></div></form></dialog></body></html>`, { waitUntil:"networkidle" });

    const metrics = await page.evaluate(() => ({
      expenseRequired:getComputedStyle(document.getElementById("expenseRequired")).display,
      modeNote:getComputedStyle(document.getElementById("expenseFormModeNote")).display,
      incomeRequired:getComputedStyle(document.getElementById("incomeRequired")).display
    }));

    expect(metrics.expenseRequired).toBe("none");
    expect(metrics.modeNote).toBe("none");
    expect(metrics.incomeRequired).not.toBe("none");
  });
}

test("expense dialog cleanup is delivered by the current service worker without changing cache identity", async () => {
  const worker = source("sw.js");
  expect(worker).toContain("re-precache the expense dialog after removing the redundant required-fields and mode-note strip");
  expect(worker).toContain('const CACHE_VERSION = "finance-v15-20260816-import-review-r34";');
  expect(worker).toContain('new Request(url, { cache:"reload" })');
});
