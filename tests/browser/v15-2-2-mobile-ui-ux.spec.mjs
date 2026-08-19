import { test, expect } from "@playwright/test";

const widths = [320, 360, 375, 390, 393, 412, 414, 428];
const css = [
  "budget-planning.css?v=15.2.9-ui1",
  "productivity-tools.css?v=14.0.23",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop2",
  "mobile-v14-0-23.css?v=15.2.2-mobile1",
  "app.css?v=15.1.0-desktop3",
  "dashboard-interactions.css?v=15.1.0-desktop3",
  "ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3",
  "black-canvas-v15-1-0.css?v=15.1.0-light1",
  "desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1",
  "desktop-ux-v15-2-0.css?v=15.2.1"
];

async function fixture(page, width, height = 800) {
  await page.setViewportSize({ width, height });
  const links = css.map(href => `<link rel="stylesheet" href="http://127.0.0.1:3000/${href}">`).join("");
  await page.setContent(`<!doctype html><html data-theme="light"><head>${links}<style>*,*::before,*::after{animation:none!important;transition:none!important}.edge-shell{display:flex;justify-content:flex-end;position:relative;width:100%}</style></head><body class="dashboard-view"><header class="topbar"><div class="topbar-left"><button class="menu-button">Menu</button><div><h1>Finance</h1></div></div><div class="mobile-topbar-tools"><button class="mobile-tool-button">Tools</button></div><div class="month-navigator"><button class="month-nav-button">‹</button><div class="month-control"><button class="month-display-button">August</button></div><button class="month-nav-button">›</button></div></header><aside class="sidebar"><button class="sidebar-close-button" id="drawerClose">×</button></aside><main class="main"><div class="content"><section class="page active" id="money"><div class="workspace-switcher money-workspace-switcher" id="workspace"><button class="workspace-switcher-button" id="workspaceButton">Income</button><button class="workspace-switcher-button">Budget</button><button class="workspace-switcher-button">Paid</button></div><section class="dashboard-week-marquee finance-week-marquee" id="phoneMarquee">Week</section><div class="empty-state">No records<div class="empty-state-actions"><button class="button button-secondary" id="emptyAction">Clear filters</button></div></div><article class="card budget-planner-card"><div class="budget-planner-header"><div class="budget-planner-actions"><button class="button" id="buildBudgetFromExpenses">Build</button><button class="button" id="copyPreviousBudget">Copy</button><div class="overflow-menu budget-planner-more-menu"><button class="button overflow-menu-trigger" id="budgetMore" aria-haspopup="menu">More</button><div class="record-more-panel budget-planner-more-panel" id="budgetMenu"><button class="button" role="menuitem" id="budgetMenuItem">Plan settings</button></div></div><button class="button" id="addBudgetItem">Add category</button><button class="budget-planner-toggle budget-panel-collapse">Toggle</button></div></div></article></section><section class="page active" id="income"><div class="income-active-filter-chips"><span class="ui-chip">Category<button id="chipRemove" aria-label="Remove filter">×</button></span></div></section><section class="page active" id="paid-expenses"><div class="record-row" data-paid-expense-row><div class="record-title">Expense</div><div data-label="Paid date" id="paidFieldOne">Aug 16</div><div data-label="Paid from" id="paidFieldTwo">Long account name</div><div class="amount" data-label="Amount">₱1,000</div><div class="mobile-record-actions"><button class="button">Undo</button><button class="overflow-menu-trigger">More</button></div></div></section><div class="edge-shell"><div class="pc-event-more-menu"><button class="button overflow-menu-trigger" id="agendaMore" aria-haspopup="menu">More</button><div class="record-more-panel pc-event-more-panel" id="agendaMenu"><button class="button" role="menuitem" id="agendaMenuItem">Export ICS</button></div></div></div><div class="productivity-empty">No matching records<div class="empty-state-actions"><button class="button" id="searchClear">Clear search</button></div></div><dialog class="app-dialog"><form><div class="modal-body"><input class="input" id="dialogInput"><button class="button" id="dialogButton">Save</button></div></form></dialog><div class="toast show"><span class="toast-message">Saved</span><button class="toast-dismiss" id="toastDismiss">×</button></div></div></main></body></html>`, { waitUntil:"networkidle" });
  await page.evaluate(() => document.querySelector(".app-dialog")?.showModal());
}

for (const width of widths) {
  test(`V15.2.2 phone geometry is safe at ${width}px`, async ({ page }) => {
    await fixture(page, width);
    const metrics = await page.evaluate(() => {
      const el = id => document.getElementById(id);
      const px = (id, prop) => parseFloat(getComputedStyle(el(id))[prop]);
      const budgetRect = el("budgetMenu").getBoundingClientRect();
      const agendaRect = el("agendaMenu").getBoundingClientRect();
      const first = el("paidFieldOne").getBoundingClientRect();
      const second = el("paidFieldTwo").getBoundingClientRect();
      return {
        workspaceTop:getComputedStyle(el("workspace")).top,
        workspaceButton:px("workspaceButton", "minHeight"),
        drawerCloseW:px("drawerClose", "width"),
        drawerCloseH:px("drawerClose", "height"),
        toastDismissW:px("toastDismiss", "width"),
        toastDismissH:px("toastDismiss", "height"),
        emptyAction:px("emptyAction", "minHeight"),
        chipRemove:px("chipRemove", "minHeight"),
        budgetMore:px("budgetMore", "minHeight"),
        budgetMenuItem:px("budgetMenuItem", "minHeight"),
        agendaMore:px("agendaMore", "minHeight"),
        agendaMenuItem:px("agendaMenuItem", "minHeight"),
        searchClear:px("searchClear", "minHeight"),
        dialogInput:px("dialogInput", "minHeight"),
        dialogInputFont:px("dialogInput", "fontSize"),
        dialogButton:px("dialogButton", "minHeight"),
        marqueeDisplay:getComputedStyle(el("phoneMarquee")).display,
        budgetInside:budgetRect.left >= -1 && budgetRect.right <= innerWidth + 1,
        agendaInside:agendaRect.left >= -1 && agendaRect.right <= innerWidth + 1,
        paidSameColumn:Math.abs(first.left - second.left) < 2,
        horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 1
      };
    });
    expect(metrics.workspaceTop).toBe("112px");
    expect(metrics.workspaceButton).toBeGreaterThanOrEqual(44);
    expect(metrics.drawerCloseW).toBeGreaterThanOrEqual(44);
    expect(metrics.drawerCloseH).toBeGreaterThanOrEqual(44);
    expect(metrics.toastDismissW).toBeGreaterThanOrEqual(44);
    expect(metrics.toastDismissH).toBeGreaterThanOrEqual(44);
    expect(metrics.emptyAction).toBeGreaterThanOrEqual(44);
    expect(metrics.chipRemove).toBeGreaterThanOrEqual(44);
    expect(metrics.budgetMore).toBeGreaterThanOrEqual(44);
    expect(metrics.budgetMenuItem).toBeGreaterThanOrEqual(44);
    expect(metrics.agendaMore).toBeGreaterThanOrEqual(44);
    expect(metrics.agendaMenuItem).toBeGreaterThanOrEqual(44);
    expect(metrics.searchClear).toBeGreaterThanOrEqual(44);
    expect(metrics.dialogInput).toBeGreaterThanOrEqual(44);
    expect(metrics.dialogInputFont).toBeGreaterThanOrEqual(16);
    expect(metrics.dialogButton).toBeGreaterThanOrEqual(44);
    expect(metrics.marqueeDisplay).toBe("none");
    expect(metrics.budgetInside).toBe(true);
    expect(metrics.agendaInside).toBe(true);
    expect(metrics.horizontalOverflow).toBe(false);
    expect(metrics.paidSameColumn).toBe(width <= 340);
  });
}

test("V15.2.2 short landscape phones retain touch-safe controls", async ({ page }) => {
  await fixture(page, 844, 390);
  const metrics = await page.evaluate(() => ({
    workspaceTop:getComputedStyle(document.getElementById("workspace")).top,
    input:parseFloat(getComputedStyle(document.getElementById("dialogInput")).minHeight),
    button:parseFloat(getComputedStyle(document.getElementById("dialogButton")).minHeight),
    dismiss:parseFloat(getComputedStyle(document.getElementById("toastDismiss")).height),
    drawer:parseFloat(getComputedStyle(document.getElementById("drawerClose")).height),
    dialogInside:document.querySelector(".app-dialog").getBoundingClientRect().right <= innerWidth + 1
  }));
  expect(metrics.workspaceTop).toBe("112px");
  expect(metrics.input).toBeGreaterThanOrEqual(44);
  expect(metrics.button).toBeGreaterThanOrEqual(44);
  expect(metrics.dismiss).toBeGreaterThanOrEqual(44);
  expect(metrics.drawer).toBeGreaterThanOrEqual(44);
  expect(metrics.dialogInside).toBe(true);
});

test("V15.2.2 short portrait keeps the dialog within the dynamic viewport", async ({ page }) => {
  await fixture(page, 390, 480);
  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector(".app-dialog").getBoundingClientRect();
    return { top:dialog.top, bottom:dialog.bottom, height:dialog.height, viewport:innerHeight };
  });
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.height).toBeLessThanOrEqual(metrics.viewport - 15);
});

test("V15.2.2 mobile stylesheet does not change the 1024px desktop workspace contract", async ({ page }) => {
  await fixture(page, 1024, 800);
  const metrics = await page.evaluate(() => ({
    workspaceTop:getComputedStyle(document.getElementById("workspace")).top,
    workspaceButton:getComputedStyle(document.getElementById("workspaceButton")).minHeight,
    dialogInput:getComputedStyle(document.getElementById("dialogInput")).minHeight
  }));
  expect(metrics.workspaceTop).toBe("64px");
  expect(metrics.workspaceButton).toBe("35px");
  expect(metrics.dialogInput).toBe("38px");
});
