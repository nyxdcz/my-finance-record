import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";

async function openDividerFixture(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${APP_URL}/`, { waitUntil:"networkidle" });
  await page.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="${APP_URL}/budget-planning.css">
    <link rel="stylesheet" href="${APP_URL}/projects-calendar.css">
    <link rel="stylesheet" href="${APP_URL}/app.css">
    <link rel="stylesheet" href="${APP_URL}/desktop-ux.css">
    <link rel="stylesheet" href="${APP_URL}/production-ui-audit.css">
  </head><body>
    <section id="projects">
      <div class="agenda-kanban-board"><article class="pc-event-card"><div class="pc-event-main">Agenda</div><div class="pc-event-actions" id="agendaActions"><button class="button">Complete</button></div></article></div>
      <div class="project-kanban-board"><article class="finance-kanban-card project-record"><div>Project</div><div class="project-row-actions" id="projectActions"><button class="button">Edit</button></div></article></div>
    </section>
    <section id="money">
      <article class="card" id="availableMoneySection"><div class="card-header" id="availableMoneyHeader"><div><h3>Available money</h3></div></div><div>Accounts</div></article>
      <div id="earlyExpenses"><article class="record-row" data-expense-row><div class="expense-record-title">Expense</div><div class="desktop-record-actions" id="expenseActions"><button class="button">Mark paid</button></div></article></div>
    </section>
    <section id="income"><div class="cash-forecast-body" id="forecastBody"><section class="savings-outlook" id="savingsOutlook">Savings outlook</section></div></section>
  </body></html>`, { waitUntil:"networkidle" });
}

function dividerGeometry(page) {
  return page.evaluate(() => {
    const measure = (rowSelector, ownerSelector) => {
      const row = document.querySelector(rowSelector);
      const owner = document.querySelector(ownerSelector);
      if (!row || !owner) return null;
      const rowRect = row.getBoundingClientRect();
      const ownerRect = owner.getBoundingClientRect();
      const ownerStyle = getComputedStyle(owner);
      return {
        leftGap:Math.abs(rowRect.left - ownerRect.left - parseFloat(ownerStyle.borderLeftWidth || 0)),
        rightGap:Math.abs(ownerRect.right - parseFloat(ownerStyle.borderRightWidth || 0) - rowRect.right),
        dividerWidth:Math.max(
          parseFloat(getComputedStyle(row).borderTopWidth || 0),
          parseFloat(getComputedStyle(row).borderBottomWidth || 0)
        )
      };
    };
    return {
      agenda:measure("#agendaActions", ".agenda-kanban-board .pc-event-card"),
      project:measure("#projectActions", ".project-kanban-board .project-record"),
      available:measure("#availableMoneyHeader", "#availableMoneySection"),
      savings:measure("#savingsOutlook", "#forecastBody"),
      expense:measure("#expenseActions", "#earlyExpenses > [data-expense-row]"),
      expenseVisible:getComputedStyle(document.querySelector("#expenseActions")).display !== "none",
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

for (const viewport of [{ width:1440, height:1000 }, { width:393, height:852 }]) {
  test(`Specified section dividers reach both edges at ${viewport.width}px`, async ({ page }) => {
    await openDividerFixture(page, viewport);
    const geometry = await dividerGeometry(page);
    const rows = {
      agenda:geometry.agenda,
      project:geometry.project,
      available:geometry.available,
      savings:geometry.savings
    };
    if (geometry.expenseVisible) rows.expense = geometry.expense;
    const failures = Object.entries(rows).filter(([, row]) => !row
      || row.leftGap > 1
      || row.rightGap > 1
      || row.dividerWidth !== 1);

    expect(failures, `Divider geometry:\n${JSON.stringify(geometry, null, 2)}`).toEqual([]);
    expect(geometry.overflow).toBe(false);
  });
}
