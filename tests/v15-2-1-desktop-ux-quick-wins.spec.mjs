import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

test("V15.2.1 source keeps the approved desktop UX quick wins", async () => {
  const index = source("index.html");
  const agenda = source("projects-calendar-v13.0.20.js");
  const budget = source("budget-planning.js");
  const sw = source("sw.js");
  const version = JSON.parse(source("version.json"));

  expect(index).toContain("V15.2.2");
  expect(index).toContain("Manage available money, planned budgets, and unpaid expenses for this month.");
  expect(index).toContain('id="incomeActiveFilterChips"');
  expect(index).toContain("No income matches these filters");
  expect(index).toContain("No expenses match these filters");
  expect(index).toContain("No active projects match these filters");
  expect(index).toContain("View unpaid expenses");
  expect(index).toContain('action:"clear-income-filters"');
  expect(source("interaction-patterns.js")).toContain("emptyStateHtml");
  expect(source("interaction-patterns.js")).toContain("renderIncomeFilterChips");
  expect(source("interaction-patterns.js")).toContain("setupEmptyStateActions");

  expect(agenda).toContain("Enter an event title.");
  expect(agenda).toContain("Choose an event date.");
  expect(agenda).toContain("End time must be after the start time.");
  expect(agenda).toContain("openAppConfirmation");
  expect(agenda).not.toContain('confirm(`Delete “${event.title}”?`)');
  expect(agenda).toContain("pc-event-more-panel");
  expect(agenda).toContain("Export ICS");
  expect(agenda).toContain("Delete event");

  expect(budget).toContain('id="budgetPlannerMorePanel"');
  expect(budget).toContain('id="openBudgetSettings"');
  expect(budget).toContain('id="exportBudgetCsv"');
  expect(budget).toContain('aria-haspopup="menu"');

  expect(source("productivity-tools.js")).toContain("data-clear-global-search");
  expect(source("productivity-tools.js")).toContain("Clear search");
  expect(source("productivity-tools.js")).toContain('input.value=""');
  expect(index).toContain("./productivity-tools.js?v=15.2.1-ux2");

  expect(version.version).toBe("15.2.2");
  expect(version.schemaVersion).toBe(12);
  expect(version.cloudSchemaVersion).toBe(3);
  expect(version.cacheVersion).toBe("finance-v15-20260816-import-review-r34");
  expect(sw).toContain('const APP_VERSION = "15.2.2";');
  expect(sw).toContain('finance-v15-20260816-import-review-r34');
});

for (const width of [1024, 1280, 1366, 1440, 1920]) {
  test(`V15.2.1 desktop-only additions avoid horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="http://127.0.0.1:3000/app.css?v=15.1.0-desktop3"><link rel="stylesheet" href="http://127.0.0.1:3000/desktop-ux-v15-2-0.css?v=15.2.1"></head><body><div class="income-active-filter-chips"><span class="ui-chip"><span>Category: Utilities</span><button class="ui-chip-remove" aria-label="Remove category filter">×</button></span></div><div class="empty-state"><strong>No records</strong>Nothing matches.<div class="empty-state-actions"><button class="button button-secondary button-small">Clear filters</button></div></div><div class="budget-planner-more-menu overflow-menu"><button class="button button-secondary button-small overflow-menu-trigger">More</button><div class="record-more-panel budget-planner-more-panel" hidden></div></div></body></html>`, { waitUntil:"networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    expect(overflow).toBe(false);
  });
}
