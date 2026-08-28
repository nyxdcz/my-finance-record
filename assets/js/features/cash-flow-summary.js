"use strict";
/* global data, selectedMonth, shiftMonth, monthLabel, money, monthlyCashFlow, expenseIncludedInTotals, monthlyExpenseAmount, expenseMonth */
(function installIncomeExpensesDashboard(root) {
  const STYLE_ID = "incomeExpensesDashboardStyles";
  const RANGE_OPTIONS = [
    { value:"6", label:"6M", copy:"6 months" },
    { value:"ytd", label:"YTD", copy:"Year to date" },
    { value:"12", label:"1Y", copy:"12 months" },
    { value:"24", label:"2Y", copy:"24 months" }
  ];
  let activeRange = "6";
  let rendering = false;
  let observer = null;

  const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const pad = value => String(value).padStart(2, "0");
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[character]));

  function parseMoneyText(value) {
    const numeric = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function formatAbsoluteMoney(value) {
    return `₱${Math.abs(Number(value || 0)).toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  }

  function readCashFlowRows(panel) {
    const rows = [];
    panel.querySelectorAll("title").forEach(titleNode => {
      const match = String(titleNode.textContent || "").match(/^(.+?)\s+(income|expenses|balance):\s*(.+)$/i);
      if (!match) return;
      const label = match[1].trim(), key = match[2].toLowerCase();
      let row = rows.find(item => item.label === label);
      if (!row) { row = { label }; rows.push(row); }
      row[key] = { text:match[3].trim(), value:parseMoneyText(match[3]) };
    });
    return rows.filter(row => row.income && row.expenses && row.balance);
  }

  function comparisonMarkup(current, previous) {
    if (!previous) return '<div class="cash-flow-summary-change comparison-neutral"><span>vs previous month</span><strong>No previous month</strong></div>';
    const delta = current.balance.value - previous.balance.value;
    const direction = delta > .005 ? "up" : delta < -.005 ? "down" : "flat";
    const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
    const tone = direction === "up" ? "comparison-good" : direction === "down" ? "comparison-bad" : "comparison-neutral";
    const percent = Math.abs(previous.balance.value) > .005 ? ` · ${Math.abs((delta / previous.balance.value) * 100).toFixed(1)}%` : "";
    return `<div class="cash-flow-summary-change ${tone}"><span>vs ${escapeHtml(previous.label)}</span><strong>${arrow} ${formatAbsoluteMoney(delta)}${percent}</strong></div>`;
  }

  function upgradeCashFlowLayout() {
    const doc = root.document;
    if (!doc) return false;
    const target = doc.getElementById("dashCashFlowChart");
    if (!target) return false;
    const grid = target.querySelector(":scope > .cash-flow-chart-grid");
    if (!grid) return false;
    const panels = grid.querySelectorAll(":scope > .cash-flow-chart-panel");
    if (panels.length < 2) return false;
    if (panels[1].classList.contains("cash-flow-summary-panel")) return true;
    const mainPanel = panels[0], comparisonPanel = panels[1], rows = readCashFlowRows(comparisonPanel);
    if (!rows.length) return false;
    const current = rows[0], previous = rows[1] || null;
    mainPanel.classList.add("cash-flow-chart-main");
    const mainHeading = mainPanel.querySelector("h4");
    if (mainHeading) mainHeading.textContent = "Monthly income & expenses";
    const legend = target.querySelector(":scope > .chart-legend");
    if (legend) mainPanel.appendChild(legend);
    target.querySelector(":scope > .chart-note")?.remove();
    const summaryPanel = doc.createElement("section");
    summaryPanel.className = "cash-flow-chart-panel cash-flow-summary-panel";
    summaryPanel.setAttribute("aria-label", `${current.label} income, expenses, and balance summary`);
    summaryPanel.innerHTML = `<div class="cash-flow-summary-head"><h4>Monthly summary</h4><strong>${escapeHtml(current.label)}</strong></div><div class="cash-flow-summary-metrics"><div class="cash-flow-summary-metric"><span><i class="income" aria-hidden="true"></i>Income</span><strong class="income-value">${escapeHtml(current.income.text)}</strong></div><div class="cash-flow-summary-metric"><span><i class="expense" aria-hidden="true"></i>Expenses</span><strong class="expense-value">${escapeHtml(current.expenses.text)}</strong></div><div class="cash-flow-summary-metric"><span><i class="balance" aria-hidden="true"></i>Balance</span><strong class="balance-value">${escapeHtml(current.balance.text)}</strong></div></div>${comparisonMarkup(current, previous)}`;
    comparisonPanel.replaceWith(summaryPanel);
    target.setAttribute("aria-label", "Income, expenses, and balance chart with monthly summary");
    return true;
  }

  function financeData() {
    try { if (typeof data !== "undefined" && data && typeof data === "object") return data; } catch (error) {}
    return {};
  }

  function formatMoney(value) {
    try { if (typeof money === "function") return money(Number(value || 0)); } catch (error) {}
    return new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP", minimumFractionDigits:2, maximumFractionDigits:2 }).format(Number(value || 0));
  }

  function monthShift(month, offset) {
    try { if (typeof shiftMonth === "function") return shiftMonth(month, offset); } catch (error) {}
    const [year, monthNumber] = String(month || "").split("-").map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function anchorMonth() {
    try {
      if (typeof selectedMonth === "function") {
        const value = selectedMonth();
        if (/^\d{4}-\d{2}$/.test(value)) return value;
      }
    } catch (error) {}
    const picker = root.document?.getElementById("monthPicker")?.value;
    if (/^\d{4}-\d{2}$/.test(String(picker || ""))) return picker;
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  }

  function labelMonth(month) {
    try { if (typeof monthLabel === "function") return monthLabel(month); } catch (error) {}
    const [year, monthNumber] = String(month).split("-").map(Number);
    return new Intl.DateTimeFormat("en-PH", { month:"short", year:"numeric" }).format(new Date(year, monthNumber - 1, 1));
  }

  function shortMonthLabel(month) {
    const [year, monthNumber] = String(month).split("-").map(Number);
    const name = new Intl.DateTimeFormat("en-PH", { month:"short" }).format(new Date(year, monthNumber - 1, 1));
    return `${name} '${String(year).slice(-2)}`;
  }

  function rangeMonths(rangeValue = activeRange, month = anchorMonth()) {
    if (rangeValue === "ytd") {
      const year = month.slice(0, 4), count = Number(month.slice(5, 7));
      return Array.from({ length:count }, (_, index) => `${year}-${pad(index + 1)}`);
    }
    const count = Number(rangeValue) || 6;
    return Array.from({ length:count }, (_, index) => monthShift(month, index - count + 1));
  }

  function previousMonths(months) {
    if (!months.length) return [];
    return Array.from({ length:months.length }, (_, index) => monthShift(months[0], index - months.length));
  }

  function fallbackMonthlyCashFlow(month) {
    const source = financeData();
    const manualIncome = (source.incomeRecords || []).filter(item => String(item?.date || "").slice(0, 7) === month && item?.includeInTotals !== false && item?.category !== "Transfer from savings").reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const expenses = (source.expenses || []).filter(item => String(item?.date || "").slice(0, 7) === month && item?.includeInTotals !== false).reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    return { month, label:labelMonth(month), income:roundMoney(manualIncome), expenses:roundMoney(expenses), net:roundMoney(manualIncome - expenses) };
  }

  function monthMetrics(month) {
    try {
      if (typeof monthlyCashFlow === "function") {
        const row = monthlyCashFlow(month);
        return { month, label:row.label || labelMonth(month), income:roundMoney(row.income), expenses:roundMoney(row.expenses), net:roundMoney(row.net) };
      }
    } catch (error) {}
    return fallbackMonthlyCashFlow(month);
  }

  function aggregate(months) {
    const rows = months.map(monthMetrics);
    const income = roundMoney(rows.reduce((sum, row) => sum + row.income, 0));
    const expenses = roundMoney(rows.reduce((sum, row) => sum + row.expenses, 0));
    return { rows, income, expenses, net:roundMoney(income - expenses) };
  }

  function rangeCopy(value = activeRange) {
    return RANGE_OPTIONS.find(option => option.value === value)?.copy || "6 months";
  }

  function comparisonCopy(current, previous) {
    const delta = roundMoney(current.net - previous.net);
    if (Math.abs(delta) < .005) return `No change vs previous period · ${rangeCopy()}`;
    return `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta))} vs previous period · ${rangeCopy()}`;
  }

  function categoryTotals(months) {
    const monthSet = new Set(months);
    const totals = new Map();
    (financeData().expenses || []).forEach(item => {
      let included = item?.includeInTotals !== false;
      try { if (typeof expenseIncludedInTotals === "function") included = expenseIncludedInTotals(item); } catch (error) {}
      if (!included) return;
      let month = String(item?.date || "").slice(0, 7);
      try { if (typeof expenseMonth === "function") month = expenseMonth(item); } catch (error) {}
      if (!monthSet.has(month)) return;
      let amount = Number(item?.amount || 0);
      try { if (typeof monthlyExpenseAmount === "function") amount = monthlyExpenseAmount(item); } catch (error) {}
      const category = String(item?.category || "Other").trim() || "Other";
      totals.set(category, roundMoney((totals.get(category) || 0) + amount));
    });
    return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)).slice(0, 5);
  }

  function chartSvg(rows) {
    const width = 980, height = 330, left = 64, right = 24, top = 28, bottom = 55;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const values = rows.flatMap(row => [row.income, row.expenses, row.net]);
    const maximum = Math.max(1, ...values, 0), minimum = Math.min(0, ...values);
    const span = Math.max(1, maximum - minimum), paddedMax = maximum + span * .12, paddedMin = minimum < 0 ? minimum - span * .08 : 0;
    const scale = Math.max(1, paddedMax - paddedMin), y = value => top + ((paddedMax - value) / scale) * plotHeight, zeroY = y(0);
    const groupWidth = plotWidth / Math.max(1, rows.length), barWidth = Math.max(4, Math.min(24, groupWidth * .25));
    const compact = value => Math.abs(value) >= 1000000 ? `₱${(value / 1000000).toFixed(1)}m` : Math.abs(value) >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${Math.round(value)}`;
    const grid = Array.from({ length:5 }, (_, index) => paddedMin + scale * index / 4).map(value => {
      const yy = y(value); return `<g class="income-expenses-grid-line"><line x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}"></line><text x="${left-10}" y="${yy+4}" text-anchor="end">${escapeHtml(compact(value))}</text></g>`;
    }).join("");
    const labelEvery = Math.max(1, Math.ceil(rows.length / 7));
    const bars = rows.map((row, index) => {
      const center = left + groupWidth * index + groupWidth / 2, incomeY = y(row.income), expenseY = y(row.expenses);
      return `<g><rect class="income-expenses-bar income" x="${center-barWidth-2}" y="${incomeY}" width="${barWidth}" height="${Math.max(0,zeroY-incomeY)}" rx="4"><title>${escapeHtml(`${row.label} income: ${formatMoney(row.income)}`)}</title></rect><rect class="income-expenses-bar expense" x="${center+2}" y="${expenseY}" width="${barWidth}" height="${Math.max(0,zeroY-expenseY)}" rx="4"><title>${escapeHtml(`${row.label} expenses: ${formatMoney(row.expenses)}`)}</title></rect>${index % labelEvery === 0 || index === rows.length - 1 ? `<text class="income-expenses-axis-label" x="${center}" y="${height-19}" text-anchor="middle">${escapeHtml(shortMonthLabel(row.month))}</text>` : ""}</g>`;
    }).join("");
    const points = rows.map((row, index) => ({ x:left + groupWidth * index + groupWidth / 2, y:y(row.net), row }));
    const line = points.map(point => `${point.x},${point.y}`).join(" ");
    const markers = points.map(point => `<circle class="income-expenses-net-point" cx="${point.x}" cy="${point.y}" r="4"><title>${escapeHtml(`${point.row.label} net income: ${formatMoney(point.row.net)}`)}</title></circle>`).join("");
    return `<svg class="income-expenses-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Income, expenses, and net income over time">${grid}<line class="income-expenses-zero-line" x1="${left}" x2="${width-right}" y1="${zeroY}" y2="${zeroY}"></line>${bars}<polyline class="income-expenses-net-line" points="${line}"></polyline>${markers}</svg>`;
  }

  function compositionMarkup(metrics) {
    const total = Math.max(0, metrics.income) + Math.max(0, metrics.expenses);
    const incomePercent = total > 0 ? Math.max(0, Math.min(100, metrics.income / total * 100)) : 50;
    return `<section class="income-expenses-lower-card" aria-label="Income and expenses composition"><div class="income-expenses-lower-head"><div><h4>Composition</h4><p>Breakdown for the selected period</p></div></div><div class="income-expenses-composition-body"><div class="income-expenses-donut" style="--income-share:${incomePercent.toFixed(2)}%" aria-hidden="true"><span></span></div><div class="income-expenses-composition-list"><div><span><i class="income"></i>Income</span><strong>${escapeHtml(formatMoney(metrics.income))}</strong></div><div><span><i class="expense"></i>Expenses</span><strong>${escapeHtml(formatMoney(metrics.expenses))}</strong></div></div></div></section>`;
  }

  function categoryMarkup(months) {
    const categories = categoryTotals(months), maximum = Math.max(1, ...categories.map(item => item.amount));
    const rows = categories.length ? categories.map(item => `<div class="income-expenses-category-row"><span>${escapeHtml(item.name)}</span><div class="income-expenses-category-track"><i style="width:${Math.max(4,item.amount/maximum*100).toFixed(1)}%"></i></div><strong>${escapeHtml(formatMoney(item.amount))}</strong></div>`).join("") : '<div class="income-expenses-empty">No expense categories in this period yet.</div>';
    return `<section class="income-expenses-lower-card" aria-label="Top spending categories"><div class="income-expenses-lower-head"><div><h4>Category Trends</h4><p>Top spending categories this period</p></div><span>By Expenses</span></div><div class="income-expenses-category-list">${rows}</div></section>`;
  }

  function installStyles() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #dashboard [data-dashboard-card="cash-flow"]{grid-column:1/-1!important;contain:none!important;overflow:visible!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;height:auto!important;min-height:0!important}
      #dashboard [data-dashboard-card="cash-flow"]>.card-header{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}
      #dashCashFlowChart{padding:0!important;background:transparent!important;overflow:visible!important;min-width:0!important}
      #dashCashFlowChart>:not(.income-expenses-analytics){display:none!important}
      .income-expenses-analytics{display:grid;gap:12px;min-width:0}
      .income-expenses-analytics-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:0 2px}
      .income-expenses-eyebrow{display:block;color:var(--muted);font-size:.64rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}
      .income-expenses-title{margin:0!important;font-size:1.3rem!important;line-height:1.15!important;letter-spacing:-.025em}.income-expenses-subtitle{margin:4px 0 0;color:var(--muted);font-size:.72rem}
      .income-expenses-range{display:grid;grid-template-columns:repeat(4,minmax(48px,auto));border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden}.income-expenses-range button{min-width:48px;min-height:38px;padding:7px 11px;border:0;border-inline-end:1px solid var(--line);background:transparent;color:var(--muted);font:inherit;font-size:.68rem;font-weight:800}.income-expenses-range button:last-child{border-inline-end:0}.income-expenses-range button[aria-pressed="true"]{background:var(--primary);color:var(--primary-contrast,#fff)}
      .income-expenses-summary,.income-expenses-chart-card,.income-expenses-lower-card{border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 2px 7px rgba(15,23,42,.055)}
      .income-expenses-summary{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(420px,1.2fr);align-items:center;min-height:116px;padding:18px 20px;gap:24px}.income-expenses-primary{display:grid;gap:4px;padding-inline-end:22px;border-inline-end:1px solid var(--line)}.income-expenses-primary-label{color:var(--muted);font-size:.65rem;font-weight:850;text-transform:uppercase}.income-expenses-primary-value{font-size:1.65rem;line-height:1.08;font-weight:900;font-variant-numeric:tabular-nums}.income-expenses-period-copy{font-size:.67rem;font-weight:750;color:var(--muted)}.income-expenses-period-copy.is-positive{color:var(--green)}.income-expenses-period-copy.is-negative{color:var(--red)}
      .income-expenses-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.income-expenses-kpi{display:grid;gap:5px;padding:4px 6px;min-width:0}.income-expenses-kpi span,.income-expenses-composition-list span{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.65rem;font-weight:750}.income-expenses-kpi i,.income-expenses-legend-item i,.income-expenses-composition-list i{display:inline-block;width:8px;height:8px;border-radius:50%}.income-expenses-kpi i.income,.income-expenses-legend-item i.income,.income-expenses-composition-list i.income{background:#13b981}.income-expenses-kpi i.expense,.income-expenses-legend-item i.expense,.income-expenses-composition-list i.expense{background:#ef4766}.income-expenses-kpi i.net,.income-expenses-legend-item i.net{background:#5865f2}.income-expenses-kpi strong{font-size:.93rem;font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .income-expenses-chart-card{padding:16px 16px 10px;min-width:0;overflow:hidden}.income-expenses-chart-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.income-expenses-chart-title{margin:0;font-size:.78rem;font-weight:900}.income-expenses-legend{display:flex;flex-wrap:wrap;gap:13px}.income-expenses-legend-item{display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:.61rem;font-weight:750}.income-expenses-legend-item.net i{width:14px;height:2px;border-radius:999px}.income-expenses-svg{display:block;width:100%;height:auto;min-height:260px}.income-expenses-grid-line line{stroke:color-mix(in srgb,var(--line) 88%,transparent);stroke-dasharray:3 4}.income-expenses-grid-line text,.income-expenses-axis-label{fill:var(--muted);font-size:10px;font-family:inherit}.income-expenses-zero-line{stroke:color-mix(in srgb,var(--muted) 55%,transparent)}.income-expenses-bar.income{fill:#13b981}.income-expenses-bar.expense{fill:#ef4766}.income-expenses-net-line{fill:none;stroke:#5865f2;stroke-width:2.5}.income-expenses-net-point{fill:#5865f2;stroke:var(--surface);stroke-width:2}
      .income-expenses-lower-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:12px}.income-expenses-lower-card{padding:15px 17px;min-width:0}.income-expenses-lower-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:13px}.income-expenses-lower-head h4{margin:0;font-size:.76rem}.income-expenses-lower-head p{margin:3px 0 0;color:var(--muted);font-size:.61rem}.income-expenses-lower-head>span{font-size:.59rem;color:var(--muted)}.income-expenses-composition-body{display:grid;grid-template-columns:110px minmax(0,1fr);align-items:center;gap:18px}.income-expenses-donut{width:96px;height:96px;border-radius:50%;background:conic-gradient(#13b981 0 var(--income-share),#ef4766 var(--income-share) 100%);display:grid;place-items:center}.income-expenses-donut span{width:59px;height:59px;border-radius:50%;background:var(--surface)}.income-expenses-composition-list{display:grid;gap:10px}.income-expenses-composition-list>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.income-expenses-category-list{display:grid;gap:10px}.income-expenses-category-row{display:grid;grid-template-columns:minmax(88px,.8fr) minmax(100px,1.7fr) auto;align-items:center;gap:10px}.income-expenses-category-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.63rem}.income-expenses-category-row>strong{font-size:.68rem}.income-expenses-category-track{height:7px;border-radius:999px;background:var(--surface-soft);overflow:hidden}.income-expenses-category-track i{display:block;height:100%;background:#ef4766}.income-expenses-empty{padding:18px;color:var(--muted);font-size:.66rem;text-align:center}
      @media(max-width:900px){.income-expenses-summary{grid-template-columns:1fr}.income-expenses-primary{padding:0 0 14px;border-inline-end:0;border-block-end:1px solid var(--line)}.income-expenses-lower-grid{grid-template-columns:1fr}}
      @media(max-width:700px){.income-expenses-analytics-head{display:grid;align-items:stretch;gap:10px}.income-expenses-title{font-size:1.08rem!important}.income-expenses-range{grid-template-columns:repeat(4,1fr);width:100%}.income-expenses-range button{min-width:44px;min-height:44px;padding:7px 6px}.income-expenses-summary{grid-template-columns:1fr!important;padding:14px;gap:12px}.income-expenses-primary-value{font-size:1.42rem}.income-expenses-kpis{grid-template-columns:1fr;gap:0}.income-expenses-kpi{grid-template-columns:1fr auto;align-items:center;padding:7px 2px;border-block-end:1px solid var(--line)}.income-expenses-kpi:last-child{border-block-end:0}.income-expenses-chart-card{padding:13px 9px 8px}.income-expenses-chart-head{display:grid;align-items:start;gap:8px}.income-expenses-svg{min-height:210px}.income-expenses-lower-grid{grid-template-columns:1fr}.income-expenses-lower-card{padding:13px}.income-expenses-composition-body{grid-template-columns:88px 1fr;gap:11px}.income-expenses-donut{width:78px;height:78px}.income-expenses-donut span{width:48px;height:48px}.income-expenses-category-row{grid-template-columns:minmax(82px,.9fr) minmax(70px,1.2fr)}.income-expenses-category-row>strong{grid-column:2;text-align:right;margin-top:-5px}.income-expenses-category-track{grid-column:2;grid-row:1}}
    `;
    root.document.head.appendChild(style);
  }

  function buildAnalytics() {
    const months = rangeMonths(), metrics = aggregate(months), previous = aggregate(previousMonths(months));
    const delta = metrics.net - previous.net;
    const wrapper = root.document.createElement("div");
    wrapper.className = "income-expenses-analytics";
    wrapper.dataset.range = activeRange;
    const buttons = RANGE_OPTIONS.map(option => `<button type="button" data-range="${option.value}" aria-pressed="${option.value === activeRange ? "true" : "false"}" aria-label="Show ${escapeHtml(option.copy)} of income and expenses">${option.label}</button>`).join("");
    wrapper.innerHTML = `<div class="income-expenses-analytics-head"><div><span class="income-expenses-eyebrow">Analytics</span><h3 class="income-expenses-title">Income vs Expenses</h3><p class="income-expenses-subtitle">Income, expenses, and net income over time</p></div><div class="income-expenses-range" role="group" aria-label="Income and expenses date range">${buttons}</div></div><section class="income-expenses-summary"><div class="income-expenses-primary"><span class="income-expenses-primary-label">Net Income</span><strong class="income-expenses-primary-value">${escapeHtml(formatMoney(metrics.net))}</strong><span class="income-expenses-period-copy ${delta > .005 ? "is-positive" : delta < -.005 ? "is-negative" : ""}">${escapeHtml(comparisonCopy(metrics, previous))}</span></div><div class="income-expenses-kpis"><div class="income-expenses-kpi"><span><i class="income"></i>Income</span><strong>${escapeHtml(formatMoney(metrics.income))}</strong></div><div class="income-expenses-kpi"><span><i class="expense"></i>Expenses</span><strong>${escapeHtml(formatMoney(metrics.expenses))}</strong></div><div class="income-expenses-kpi"><span><i class="net"></i>Net Income</span><strong>${escapeHtml(formatMoney(metrics.net))}</strong></div></div></section><section class="income-expenses-chart-card"><div class="income-expenses-chart-head"><h4 class="income-expenses-chart-title">Income vs Expenses · Over Time</h4><div class="income-expenses-legend"><span class="income-expenses-legend-item"><i class="income"></i>Income</span><span class="income-expenses-legend-item"><i class="expense"></i>Expenses</span><span class="income-expenses-legend-item net"><i class="net"></i>Net Income</span></div></div>${chartSvg(metrics.rows)}</section><div class="income-expenses-lower-grid">${compositionMarkup(metrics)}${categoryMarkup(months)}</div>`;
    return wrapper;
  }

  function renderAnalytics(force = false) {
    const target = root.document?.getElementById("dashCashFlowChart");
    if (!target || rendering) return;
    const current = target.querySelector(":scope > .income-expenses-analytics");
    if (!force && current?.dataset.range === activeRange) return;
    rendering = true;
    try {
      installStyles();
      const next = buildAnalytics();
      if (current) current.replaceWith(next); else target.appendChild(next);
      if (root.FinancePrivacyDisplay?.hidden) root.queueMicrotask?.(() => root.FinancePrivacyDisplay.mask?.());
    } finally { rendering = false; }
  }

  function enhanceCashFlow(forceAnalytics = false) {
    if (rendering) return;
    upgradeCashFlowLayout();
    renderAnalytics(forceAnalytics);
  }

  function bindRangeControls() {
    const doc = root.document;
    if (!doc || doc.documentElement.dataset.incomeExpensesDashboardBound === "1") return;
    doc.documentElement.dataset.incomeExpensesDashboardBound = "1";
    doc.addEventListener("click", event => {
      const button = event.target.closest?.(".income-expenses-range button[data-range]");
      if (!button) return;
      const next = String(button.dataset.range || "");
      if (!RANGE_OPTIONS.some(option => option.value === next)) return;
      activeRange = next;
      renderAnalytics(true);
    });
    root.addEventListener("finance:privacy-display-changed", () => renderAnalytics(true));
    root.addEventListener("finance:page-changed", () => root.queueMicrotask?.(() => enhanceCashFlow(true)));
  }

  function installCashFlowLayoutUpgrade() {
    const doc = root.document;
    if (!doc) return;
    const start = () => {
      const target = doc.getElementById("dashCashFlowChart");
      if (!target) return;
      installStyles();
      bindRangeControls();
      enhanceCashFlow(true);
      observer?.disconnect();
      observer = new MutationObserver(() => {
        if (rendering) return;
        root.queueMicrotask?.(() => enhanceCashFlow(false));
      });
      observer.observe(target, { childList:true });
      root.requestAnimationFrame?.(() => enhanceCashFlow(false));
      root.setTimeout?.(() => enhanceCashFlow(false), 250);
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once:true }); else start();
  }

  installCashFlowLayoutUpgrade();
  root.FinanceIncomeExpensesDashboard = Object.freeze({
    render:() => renderAnalytics(true),
    get range() { return activeRange; },
    setRange(value) {
      const next = String(value || "");
      if (!RANGE_OPTIONS.some(option => option.value === next)) return false;
      activeRange = next;
      renderAnalytics(true);
      return true;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
