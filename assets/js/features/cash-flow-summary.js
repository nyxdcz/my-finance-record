"use strict";
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

  function formatMoney(value) {
    try { if (typeof root.money === "function") return root.money(Number(value || 0)); } catch (error) {}
    return new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP", minimumFractionDigits:2, maximumFractionDigits:2 }).format(Number(value || 0));
  }

  function monthShift(month, offset) {
    try { if (typeof root.shiftMonth === "function") return root.shiftMonth(month, offset); } catch (error) {}
    const [year, monthNumber] = String(month || "").split("-").map(Number);
    const date = new Date(year, monthNumber - 1 + offset, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function anchorMonth() {
    try {
      const value = typeof root.selectedMonth === "function" ? root.selectedMonth() : "";
      if (/^\d{4}-\d{2}$/.test(value)) return value;
    } catch (error) {}
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  }

  function monthLabel(month) {
    try { if (typeof root.monthLabel === "function") return root.monthLabel(month); } catch (error) {}
    const [year, monthNumber] = String(month).split("-").map(Number);
    return new Intl.DateTimeFormat("en-PH", { month:"short", year:"numeric" }).format(new Date(year, monthNumber - 1, 1));
  }

  function rangeMonths(rangeValue = activeRange, month = anchorMonth()) {
    if (rangeValue === "ytd") {
      const year = month.slice(0, 4);
      const end = Number(month.slice(5, 7));
      return Array.from({ length:end }, (_, index) => `${year}-${pad(index + 1)}`);
    }
    const count = Number(rangeValue) || 6;
    return Array.from({ length:count }, (_, index) => monthShift(month, index - count + 1));
  }

  function previousMonths(months) {
    if (!months.length) return [];
    const count = months.length;
    return Array.from({ length:count }, (_, index) => monthShift(months[0], index - count));
  }

  function expenseIncluded(item) {
    try { if (typeof root.expenseIncludedInTotals === "function") return root.expenseIncludedInTotals(item); } catch (error) {}
    return item?.includeInTotals !== false;
  }

  function incomeIncluded(item) {
    try { if (typeof root.incomeIncludedInTotals === "function") return root.incomeIncludedInTotals(item); } catch (error) {}
    return item?.includeInTotals !== false && item?.category !== "Transfer from savings";
  }

  function expenseAmount(item) {
    let amount = Number(item?.paidAmount || item?.amount || 0);
    try { if (typeof root.settledExpenseAmount === "function") amount = Number(root.settledExpenseAmount(item) || 0); } catch (error) {}
    return roundMoney(amount);
  }

  function projectIncluded(project) {
    try { if (typeof root.projectIsFinancial === "function") return root.projectIsFinancial(project); } catch (error) {}
    return project?.workSource !== "salary" || project?.compensationType === "extra-paid";
  }

  function projectIncomeForMonth(month) {
    let total = 0;
    (root.data?.projects || []).filter(projectIncluded).forEach(project => {
      const history = Array.isArray(project.paymentHistory) ? project.paymentHistory : [];
      if (history.length) {
        history.forEach(payment => {
          if (String(payment?.date || "").slice(0, 7) === month) total += Number(payment?.amount || 0);
        });
        return;
      }
      if (String(project?.paymentDate || "").slice(0, 7) === month) total += Number(project?.paid || 0);
    });
    return roundMoney(total);
  }

  function monthMetrics(month) {
    const manualIncome = (root.data?.incomeRecords || [])
      .filter(item => incomeIncluded(item) && String(item?.date || "").slice(0, 7) === month)
      .reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const paidExpenses = (root.data?.expenses || [])
      .filter(item => item?.paid && expenseIncluded(item) && String(item?.paidDate || item?.date || "").slice(0, 7) === month);
    const expenses = paidExpenses.reduce((sum, item) => sum + expenseAmount(item), 0);
    const income = roundMoney(manualIncome + projectIncomeForMonth(month));
    return {
      month,
      income,
      expenses:roundMoney(expenses),
      net:roundMoney(income - expenses),
      paidExpenses
    };
  }

  function aggregate(months) {
    const rows = months.map(monthMetrics);
    const income = roundMoney(rows.reduce((sum, item) => sum + item.income, 0));
    const expenses = roundMoney(rows.reduce((sum, item) => sum + item.expenses, 0));
    return { rows, income, expenses, net:roundMoney(income - expenses) };
  }

  function categoryTotals(rows) {
    const totals = new Map();
    rows.flatMap(row => row.paidExpenses).forEach(item => {
      const name = String(item?.category || "Other").trim() || "Other";
      totals.set(name, roundMoney((totals.get(name) || 0) + expenseAmount(item)));
    });
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
      .slice(0, 5);
  }

  function rangeCopy(value = activeRange) {
    return RANGE_OPTIONS.find(option => option.value === value)?.copy || "6 months";
  }

  function comparisonCopy(current, previous) {
    const delta = roundMoney(current.net - previous.net);
    if (Math.abs(delta) < 0.005) return `No change vs previous period · ${rangeCopy()}`;
    const sign = delta > 0 ? "+" : "−";
    return `${sign}${formatMoney(Math.abs(delta))} vs previous period · ${rangeCopy()}`;
  }

  function chartSvg(rows) {
    const width = 980, height = 330;
    const margin = { top:28, right:24, bottom:55, left:64 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = rows.flatMap(row => [row.income, row.expenses, row.net]);
    const maximum = Math.max(1, ...values, 0);
    const minimum = Math.min(0, ...values);
    const span = Math.max(1, maximum - minimum);
    const paddedMax = maximum + span * 0.12;
    const paddedMin = minimum < 0 ? minimum - span * 0.08 : 0;
    const scaleSpan = Math.max(1, paddedMax - paddedMin);
    const y = value => margin.top + ((paddedMax - value) / scaleSpan) * plotHeight;
    const zeroY = y(0);
    const groupWidth = plotWidth / Math.max(1, rows.length);
    const barWidth = Math.max(4, Math.min(24, groupWidth * 0.25));
    const labelEvery = Math.max(1, Math.ceil(rows.length / 7));
    const compactMoney = value => {
      const absolute = Math.abs(Number(value || 0));
      if (absolute >= 1000000) return `₱${(value / 1000000).toFixed(1)}m`;
      if (absolute >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
      return `₱${Math.round(value)}`;
    };
    const gridValues = Array.from({ length:5 }, (_, index) => paddedMin + (scaleSpan * index / 4));
    const grid = gridValues.map(value => {
      const lineY = y(value);
      return `<g class="income-expenses-grid-line"><line x1="${margin.left}" x2="${width - margin.right}" y1="${lineY.toFixed(2)}" y2="${lineY.toFixed(2)}"></line><text x="${margin.left - 10}" y="${(lineY + 4).toFixed(2)}" text-anchor="end">${escapeHtml(compactMoney(value))}</text></g>`;
    }).join("");
    const bars = rows.map((row, index) => {
      const center = margin.left + groupWidth * index + groupWidth / 2;
      const incomeY = y(row.income), expenseY = y(row.expenses);
      const incomeHeight = Math.max(0, zeroY - incomeY), expenseHeight = Math.max(0, zeroY - expenseY);
      const label = monthLabel(row.month);
      return `<g class="income-expenses-month-group">
        <rect class="income-expenses-bar income" x="${(center - barWidth - 2).toFixed(2)}" y="${incomeY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${incomeHeight.toFixed(2)}" rx="4"><title>${escapeHtml(label)} income</title></rect>
        <rect class="income-expenses-bar expense" x="${(center + 2).toFixed(2)}" y="${expenseY.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${expenseHeight.toFixed(2)}" rx="4"><title>${escapeHtml(label)} expenses</title></rect>
        ${index % labelEvery === 0 || index === rows.length - 1 ? `<text class="income-expenses-axis-label" x="${center.toFixed(2)}" y="${height - 19}" text-anchor="middle">${escapeHtml(label.replace(/\s(\d{4})$/, " '$1".slice(0, 4)))}</text>` : ""}
      </g>`;
    }).join("");
    const points = rows.map((row, index) => {
      const center = margin.left + groupWidth * index + groupWidth / 2;
      return { x:center, y:y(row.net), label:monthLabel(row.month) };
    });
    const polyline = points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
    const markers = points.map(point => `<circle class="income-expenses-net-point" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4"><title>${escapeHtml(point.label)} net income</title></circle>`).join("");
    return `<svg class="income-expenses-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="incomeExpensesChartTitle incomeExpensesChartDesc" preserveAspectRatio="xMidYMid meet">
      <title id="incomeExpensesChartTitle">Income, expenses, and net income over time</title>
      <desc id="incomeExpensesChartDesc">Green bars show income, red bars show expenses, and the blue line shows net income for the selected period.</desc>
      ${grid}
      <line class="income-expenses-zero-line" x1="${margin.left}" x2="${width - margin.right}" y1="${zeroY.toFixed(2)}" y2="${zeroY.toFixed(2)}"></line>
      ${bars}
      <polyline class="income-expenses-net-line" points="${polyline}"></polyline>
      ${markers}
    </svg>`;
  }

  function compositionMarkup(metrics) {
    const total = Math.max(0, metrics.income) + Math.max(0, metrics.expenses);
    const incomePercent = total > 0 ? Math.max(0, Math.min(100, metrics.income / total * 100)) : 50;
    const expensePercent = total > 0 ? 100 - incomePercent : 50;
    return `<section class="income-expenses-lower-card income-expenses-composition" aria-label="Income and expenses composition">
      <div class="income-expenses-lower-head"><div><h4>Composition</h4><p>Breakdown for the selected period</p></div></div>
      <div class="income-expenses-composition-body">
        <div class="income-expenses-donut" style="--income-share:${incomePercent.toFixed(2)}%" aria-hidden="true"><span></span></div>
        <div class="income-expenses-composition-list">
          <div><span><i class="income" aria-hidden="true"></i>Income</span><strong>${escapeHtml(formatMoney(metrics.income))}</strong><small>${incomePercent.toFixed(1)}%</small></div>
          <div><span><i class="expense" aria-hidden="true"></i>Expenses</span><strong>${escapeHtml(formatMoney(metrics.expenses))}</strong><small>${expensePercent.toFixed(1)}%</small></div>
        </div>
      </div>
    </section>`;
  }

  function categoryMarkup(metrics) {
    const categories = categoryTotals(metrics.rows);
    const maximum = Math.max(1, ...categories.map(item => item.amount));
    const rows = categories.length ? categories.map(item => `<div class="income-expenses-category-row">
      <span>${escapeHtml(item.name)}</span>
      <div class="income-expenses-category-track" aria-hidden="true"><i style="width:${Math.max(4, item.amount / maximum * 100).toFixed(1)}%"></i></div>
      <strong>${escapeHtml(formatMoney(item.amount))}</strong>
    </div>`).join("") : `<div class="income-expenses-empty">No paid expense categories in this period yet.</div>`;
    return `<section class="income-expenses-lower-card income-expenses-categories" aria-label="Top spending categories">
      <div class="income-expenses-lower-head"><div><h4>Category Trends</h4><p>Top spending categories this period</p></div><span>By Expenses</span></div>
      <div class="income-expenses-category-list">${rows}</div>
    </section>`;
  }

  function installStyles() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    const style = root.document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #dashboard [data-dashboard-card="cash-flow"]{grid-column:1/-1!important;contain:none!important;overflow:visible!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-width:0!important;height:auto!important;min-height:0!important}
      #dashboard [data-dashboard-card="cash-flow"]>.card-header{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important;margin:0 0 12px!important;padding:0 2px!important;border:0!important;background:transparent!important}
      #dashboard [data-dashboard-card="cash-flow"]>.card-header>div:first-child{min-width:0;display:grid;gap:3px}
      #dashboard [data-dashboard-card="cash-flow"]>.card-header p{margin:0;color:var(--muted);font-size:.72rem}
      .income-expenses-eyebrow{color:var(--muted);font-size:.64rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
      .income-expenses-title{margin:0!important;font-size:1.3rem!important;line-height:1.15!important;letter-spacing:-.025em}
      .income-expenses-range{display:inline-grid;grid-template-columns:repeat(4,minmax(48px,auto));align-items:center;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.04)}
      .income-expenses-range button{min-width:48px;min-height:38px;padding:7px 11px;border:0;border-inline-end:1px solid var(--line);background:transparent;color:var(--muted);font:inherit;font-size:.68rem;font-weight:800;cursor:pointer}
      .income-expenses-range button:last-child{border-inline-end:0}
      .income-expenses-range button[aria-pressed="true"]{background:var(--primary);color:var(--primary-contrast,#fff)}
      .income-expenses-range button:hover:not([aria-pressed="true"]){background:color-mix(in srgb,var(--primary) 7%,var(--surface));color:var(--text)}
      #dashCashFlowPeriod{display:none!important}
      #dashCashFlowChart{padding:0!important;background:transparent!important;overflow:visible!important;min-width:0!important}
      .income-expenses-analytics{display:grid;gap:12px;min-width:0}
      .income-expenses-summary,.income-expenses-chart-card,.income-expenses-lower-card{border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:0 2px 7px rgba(15,23,42,.055)}
      .income-expenses-summary{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(420px,1.2fr);align-items:center;min-height:116px;padding:18px 20px;gap:24px}
      .income-expenses-primary{min-width:0;display:grid;gap:4px;padding-inline-end:22px;border-inline-end:1px solid var(--line)}
      .income-expenses-primary-label{color:var(--muted);font-size:.65rem;font-weight:850;letter-spacing:.055em;text-transform:uppercase}
      .income-expenses-primary-value{font-size:1.65rem;line-height:1.08;font-weight:900;letter-spacing:-.035em;color:var(--text);font-variant-numeric:tabular-nums}
      .income-expenses-period-copy{font-size:.67rem;font-weight:750;color:var(--muted);line-height:1.35}
      .income-expenses-period-copy.is-positive{color:var(--green)}
      .income-expenses-period-copy.is-negative{color:var(--red)}
      .income-expenses-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}
      .income-expenses-kpi{min-width:0;display:grid;gap:5px;padding:4px 6px}
      .income-expenses-kpi span{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.65rem;font-weight:750;white-space:nowrap}
      .income-expenses-kpi i,.income-expenses-legend-item i,.income-expenses-composition-list i{display:inline-block;width:8px;height:8px;flex:0 0 8px;border-radius:50%}
      .income-expenses-kpi i.income,.income-expenses-legend-item i.income,.income-expenses-composition-list i.income{background:#13b981}
      .income-expenses-kpi i.expense,.income-expenses-legend-item i.expense,.income-expenses-composition-list i.expense{background:#ef4766}
      .income-expenses-kpi i.net,.income-expenses-legend-item i.net{background:#5865f2}
      .income-expenses-kpi strong{overflow:hidden;text-overflow:ellipsis;font-size:.93rem;font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap}
      .income-expenses-chart-card{min-width:0;padding:16px 16px 10px}
      .income-expenses-chart-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
      .income-expenses-chart-title{margin:0;font-size:.78rem;font-weight:900}
      .income-expenses-legend{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:13px}
      .income-expenses-legend-item{display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:.61rem;font-weight:750}
      .income-expenses-legend-item.net i{width:14px;height:2px;border-radius:999px}
      .income-expenses-svg{display:block;width:100%;height:auto;min-height:260px;overflow:visible}
      .income-expenses-grid-line line{stroke:color-mix(in srgb,var(--line) 88%,transparent);stroke-dasharray:3 4}
      .income-expenses-grid-line text,.income-expenses-axis-label{fill:var(--muted);font-size:10px;font-family:inherit}
      .income-expenses-zero-line{stroke:color-mix(in srgb,var(--muted) 55%,transparent);stroke-width:1}
      .income-expenses-bar.income{fill:#13b981}
      .income-expenses-bar.expense{fill:#ef4766}
      .income-expenses-net-line{fill:none;stroke:#5865f2;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
      .income-expenses-net-point{fill:#5865f2;stroke:var(--surface);stroke-width:2}
      .income-expenses-lower-grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:12px}
      .income-expenses-lower-card{min-width:0;padding:15px 17px}
      .income-expenses-lower-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:13px}
      .income-expenses-lower-head h4{margin:0;font-size:.76rem;font-weight:900}.income-expenses-lower-head p{margin:3px 0 0;color:var(--muted);font-size:.61rem}.income-expenses-lower-head>span{padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--muted);font-size:.59rem;font-weight:800;white-space:nowrap}
      .income-expenses-composition-body{display:grid;grid-template-columns:110px minmax(0,1fr);align-items:center;gap:18px}
      .income-expenses-donut{width:96px;height:96px;margin:auto;border-radius:50%;background:conic-gradient(#13b981 0 var(--income-share),#ef4766 var(--income-share) 100%);display:grid;place-items:center}
      .income-expenses-donut span{width:59px;height:59px;border-radius:50%;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)}
      .income-expenses-composition-list{display:grid;gap:9px}.income-expenses-composition-list>div{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px}.income-expenses-composition-list span{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.64rem;font-weight:750}.income-expenses-composition-list strong{font-size:.72rem;font-variant-numeric:tabular-nums}.income-expenses-composition-list small{color:var(--muted);font-size:.59rem}
      .income-expenses-category-list{display:grid;gap:10px}.income-expenses-category-row{display:grid;grid-template-columns:minmax(88px,.8fr) minmax(100px,1.7fr) auto;align-items:center;gap:10px}.income-expenses-category-row>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.63rem;font-weight:750}.income-expenses-category-row>strong{font-size:.68rem;font-variant-numeric:tabular-nums}.income-expenses-category-track{height:7px;border-radius:999px;background:var(--surface-soft);overflow:hidden}.income-expenses-category-track i{display:block;height:100%;border-radius:inherit;background:#ef4766}.income-expenses-empty{padding:18px 8px;color:var(--muted);font-size:.66rem;text-align:center}
      html[data-theme="dark"] .income-expenses-summary,html[data-theme="dark"] .income-expenses-chart-card,html[data-theme="dark"] .income-expenses-lower-card{box-shadow:0 2px 9px rgba(0,0,0,.18)}
      @media(min-width:1101px){#dashboard [data-dashboard-card="cash-flow"][data-size="wide"]{contain:none!important;height:auto!important;min-height:0!important}#dashboard [data-dashboard-card="cash-flow"][data-size="wide"] .income-expenses-svg{min-height:260px!important}}
      @media(max-width:900px){.income-expenses-summary{grid-template-columns:1fr;gap:14px}.income-expenses-primary{padding:0 0 14px;border-inline-end:0;border-block-end:1px solid var(--line)}.income-expenses-lower-grid{grid-template-columns:1fr}}
      @media(max-width:700px){
        #dashboard [data-dashboard-card="cash-flow"]>.card-header{align-items:stretch!important;display:grid!important;gap:10px!important;padding:0!important}
        .income-expenses-title{font-size:1.08rem!important}.income-expenses-range{width:100%;grid-template-columns:repeat(4,1fr);overflow:visible;border-radius:9px}.income-expenses-range button{box-sizing:border-box;min-width:44px;min-height:44px;padding:7px 6px;font-size:.66rem}
        .income-expenses-analytics{gap:10px}.income-expenses-summary{grid-template-columns:1fr!important;padding:14px;gap:12px}.income-expenses-primary{padding-bottom:12px}.income-expenses-primary-value{font-size:1.42rem}.income-expenses-kpis{grid-template-columns:1fr;gap:0}.income-expenses-kpi{grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:7px 2px;border-block-end:1px solid color-mix(in srgb,var(--line) 72%,transparent)}.income-expenses-kpi:last-child{border-block-end:0}.income-expenses-kpi strong{font-size:.8rem;text-align:right}
        .income-expenses-chart-card{padding:13px 9px 8px;overflow:hidden}.income-expenses-chart-head{align-items:flex-start;display:grid;gap:8px}.income-expenses-legend{justify-content:flex-start;gap:10px}.income-expenses-svg{width:100%;min-height:210px}.income-expenses-grid-line text{font-size:9px}.income-expenses-axis-label{font-size:9px}
        .income-expenses-lower-grid{grid-template-columns:1fr}.income-expenses-lower-card{padding:13px}.income-expenses-composition-body{grid-template-columns:88px minmax(0,1fr);gap:11px}.income-expenses-donut{width:78px;height:78px}.income-expenses-donut span{width:48px;height:48px}.income-expenses-composition-list>div{grid-template-columns:minmax(0,1fr) auto}.income-expenses-composition-list small{display:none}.income-expenses-category-row{grid-template-columns:minmax(82px,.9fr) minmax(70px,1.2fr);gap:8px}.income-expenses-category-row>strong{grid-column:2;text-align:right;margin-top:-5px}.income-expenses-category-track{grid-column:2;grid-row:1}
      }
      @media(max-width:360px){.income-expenses-range button{padding-inline:3px}.income-expenses-summary{padding:12px}.income-expenses-chart-card{padding-inline:6px}.income-expenses-category-row{grid-template-columns:74px minmax(0,1fr)}}
    `;
    root.document.head.appendChild(style);
  }

  function renderHeader(card) {
    const header = card.querySelector(":scope > .card-header");
    if (!header) return;
    const buttons = RANGE_OPTIONS.map(option => `<button type="button" data-range="${option.value}" aria-pressed="${option.value === activeRange ? "true" : "false"}" aria-label="Show ${escapeHtml(option.copy)} of income and expenses">${option.label}</button>`).join("");
    header.innerHTML = `<div><span class="income-expenses-eyebrow">Analytics</span><h3 class="income-expenses-title">Income vs Expenses</h3><p>Income, expenses, and net income over time</p></div><div class="income-expenses-range" role="group" aria-label="Income and expenses date range">${buttons}</div>`;
  }

  function renderAnalytics(force = false) {
    const doc = root.document;
    if (!doc || rendering) return;
    const target = doc.getElementById("dashCashFlowChart");
    const card = target?.closest('[data-dashboard-card="cash-flow"]');
    if (!target || !card) return;
    if (!force && target.dataset.incomeExpensesRange === activeRange && target.querySelector(".income-expenses-analytics") && card.querySelector(".income-expenses-title")) return;
    rendering = true;
    try {
      installStyles();
      const months = rangeMonths();
      const metrics = aggregate(months);
      const previous = aggregate(previousMonths(months));
      const comparison = comparisonCopy(metrics, previous);
      const comparisonTone = metrics.net - previous.net > .005 ? "is-positive" : metrics.net - previous.net < -.005 ? "is-negative" : "";
      renderHeader(card);
      target.dataset.incomeExpensesRange = activeRange;
      target.setAttribute("aria-label", "Income, expenses, and net income analytics");
      target.innerHTML = `<div class="income-expenses-analytics">
        <section class="income-expenses-summary" aria-label="Income and expenses summary">
          <div class="income-expenses-primary"><span class="income-expenses-primary-label">Net Income</span><strong class="income-expenses-primary-value">${escapeHtml(formatMoney(metrics.net))}</strong><span class="income-expenses-period-copy ${comparisonTone}">${escapeHtml(comparison)}</span></div>
          <div class="income-expenses-kpis">
            <div class="income-expenses-kpi"><span><i class="income" aria-hidden="true"></i>Income</span><strong>${escapeHtml(formatMoney(metrics.income))}</strong></div>
            <div class="income-expenses-kpi"><span><i class="expense" aria-hidden="true"></i>Expenses</span><strong>${escapeHtml(formatMoney(metrics.expenses))}</strong></div>
            <div class="income-expenses-kpi"><span><i class="net" aria-hidden="true"></i>Net Income</span><strong>${escapeHtml(formatMoney(metrics.net))}</strong></div>
          </div>
        </section>
        <section class="income-expenses-chart-card" aria-label="Income versus expenses over time chart">
          <div class="income-expenses-chart-head"><h4 class="income-expenses-chart-title">Income vs Expenses · Over Time</h4><div class="income-expenses-legend" aria-label="Chart legend"><span class="income-expenses-legend-item"><i class="income" aria-hidden="true"></i>Income</span><span class="income-expenses-legend-item"><i class="expense" aria-hidden="true"></i>Expenses</span><span class="income-expenses-legend-item net"><i class="net" aria-hidden="true"></i>Net Income</span></div></div>
          ${chartSvg(metrics.rows)}
        </section>
        <div class="income-expenses-lower-grid">${compositionMarkup(metrics)}${categoryMarkup(metrics)}</div>
      </div>`;
      if (root.FinancePrivacyDisplay?.hidden) queueMicrotask(() => root.FinancePrivacyDisplay.mask?.());
    } finally {
      rendering = false;
    }
  }

  function bindRangeControls() {
    const doc = root.document;
    if (!doc || doc.documentElement.dataset.incomeExpensesDashboardBound === "1") return;
    doc.documentElement.dataset.incomeExpensesDashboardBound = "1";
    doc.addEventListener("click", event => {
      const button = event.target.closest?.('[data-dashboard-card="cash-flow"] .income-expenses-range button[data-range]');
      if (!button) return;
      const next = String(button.dataset.range || "");
      if (!RANGE_OPTIONS.some(option => option.value === next)) return;
      activeRange = next;
      renderAnalytics(true);
    });
    root.addEventListener("finance:privacy-display-changed", () => renderAnalytics(true));
    root.addEventListener("finance:page-changed", () => {
      if (typeof root.queueMicrotask === "function") root.queueMicrotask(() => renderAnalytics());
    });
  }

  function start() {
    const target = root.document?.getElementById("dashCashFlowChart");
    if (!target) return;
    installStyles();
    bindRangeControls();
    renderAnalytics(true);
    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (rendering) return;
      if (!target.querySelector(".income-expenses-analytics")) {
        if (typeof root.queueMicrotask === "function") root.queueMicrotask(() => renderAnalytics(true));
        else renderAnalytics(true);
      }
    });
    observer.observe(target, { childList:true });
  }

  if (root.document?.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

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
