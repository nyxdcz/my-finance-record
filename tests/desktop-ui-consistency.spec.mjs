import { test, expect } from "@playwright/test";

const widths = [1024, 1280, 1366, 1440, 1920];
const css = [
  "app.css?v=15.1.0-desktop1",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop1",
  "security-profiles.css?v=15.1.0-desktop1",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop1",
  "dashboard-interactions.css?v=15.1.0-desktop1",
  "liquid-glass-v15.css?v=15.1.0-monthnav1",
  "black-canvas-v15-1-0.css?v=15.1.0-periodradius1"
];

async function fixture(page, width, theme) {
  await page.setViewportSize({ width, height:900 });
  await page.setContent(`<!doctype html><html data-theme="${theme}"><head>${css.map(href => `<link rel="stylesheet" href="http://127.0.0.1:3000/${href}">`).join("")}</head><body class="dashboard-view"><header class="topbar"><div class="topbar-actions"><button class="button">Action</button></div></header><main class="main"><div class="content"><section class="page-heading"><div><h2>Heading</h2><p>Copy</p></div></section><article class="card" id="card">Card</article><div class="workspace-switcher"><button class="workspace-switcher-button">Tab</button></div><div class="expense-toolbar-compact"><input class="input" id="compactFilter"><div class="expense-view-toggle"><button class="button">View</button></div></div><div class="record-header" id="recordHeader">Header</div><section id="reports"><nav class="report-section-nav"><button id="reportTab">Report</button></nav></section><div class="report-insights-filters"><input class="input" id="reportFilter"></div><div class="budget-plan-kpi" id="budgetKpi">Budget</div><div class="project-summary-strip"><div id="projectSummary">Project</div></div><section id="settings"><div class="settings-tablist"><button id="settingsTab">Settings</button></div></section><button class="sidebar-close-button" id="sidebarPin">Pin</button><span class="v13-chip" id="profileChip">Private</span><div class="pc-event-card" id="calendarCard"><div class="pc-event-actions"><button class="button" id="calendarAction">Edit</button></div></div></div></main></body></html>`, { waitUntil:"load" });
  await page.waitForFunction(() => document.styleSheets.length >= 8);
}

for (const width of widths) {
  test(`desktop geometry is consistent at ${width}px`, async ({ page }) => {
    await fixture(page, width, "light");
    const metrics = await page.evaluate(() => {
      const value = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
      return {
        topbarMin:value(".topbar", "minHeight"),
        contentTop:value(".content", "paddingTop"),
        contentRight:value(".content", "paddingRight"),
        contentBottom:value(".content", "paddingBottom"),
        cardRadius:value("#card", "borderRadius"),
        buttonMin:value(".topbar .button", "minHeight"),
        compactHeight:value("#compactFilter", "height"),
        workspaceRadius:value(".workspace-switcher", "borderRadius"),
        workspaceButton:value(".workspace-switcher-button", "minHeight"),
        reportTab:value("#reportTab", "minHeight"),
        reportFilter:value("#reportFilter", "height"),
        settingsTab:value("#settingsTab", "minHeight"),
        sidebarPin:value("#sidebarPin", "height"),
        budgetKpi:value("#budgetKpi", "minHeight"),
        profileChip:value("#profileChip", "minHeight"),
        calendarRadius:value("#calendarCard", "borderRadius"),
        calendarAction:value("#calendarAction", "minHeight"),
        recordBackground:value("#recordHeader", "backgroundColor"),
        inputBackground:value("#compactFilter", "backgroundColor")
      };
    });
    expect(metrics).toEqual({
      topbarMin:"72px",
      contentTop:"18px",
      contentRight:"22px",
      contentBottom:"34px",
      cardRadius:"9px",
      buttonMin:"38px",
      compactHeight:"35px",
      workspaceRadius:"8px",
      workspaceButton:"35px",
      reportTab:"35px",
      reportFilter:"35px",
      settingsTab:"38px",
      sidebarPin:"44px",
      budgetKpi:"70px",
      profileChip:"23px",
      calendarRadius:"8px",
      calendarAction:"32px",
      recordBackground:"rgb(14, 19, 27)",
      inputBackground:"rgb(8, 11, 16)"
    });
  });
}

test("Black Canvas component surfaces stay dark in both appearance attributes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await fixture(page, 1440, theme);
    const colors = await page.evaluate(() => ({
      record:getComputedStyle(document.querySelector("#recordHeader")).backgroundColor,
      input:getComputedStyle(document.querySelector("#compactFilter")).backgroundColor
    }));
    expect(["rgb(8, 11, 16)", "rgb(14, 19, 27)"]).toContain(colors.record);
    expect(colors.input).toBe("rgb(8, 11, 16)");
  }
});
