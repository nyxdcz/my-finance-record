"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  const api = {
    financeCachePattern:FINANCE_CACHE_PATTERN,
    shellCacheName(cacheVersion) { return `${cacheVersion}-shell`; },
    serviceWorkerUrl(version, cacheVersion) { return `./sw.js?v=${encodeURIComponent(version)}&cache=${encodeURIComponent(cacheVersion)}`; },
    updateState(remote, version, cacheVersion) {
      return {
        versionChanged:Boolean(remote?.version && remote.version !== version),
        cacheChanged:Boolean(remote?.cacheVersion && remote.cacheVersion !== cacheVersion)
      };
    },
    async clearFinanceCaches() {
      if (!("caches" in root)) return 0;
      const keys = await root.caches.keys();
      const targets = keys.filter(key => FINANCE_CACHE_PATTERN.test(key));
      await Promise.all(targets.map(key => root.caches.delete(key)));
      return targets.length;
    }
  };
  root.FinancePwaUpdate = api;

  function installCashFlowStyles() {
    const doc = root.document;
    if (!doc || doc.getElementById("cashFlowLayoutV1522")) return;
    const style = doc.createElement("style");
    style.id = "cashFlowLayoutV1522";
    style.textContent = `
      #dashCashFlowChart .cash-flow-chart-grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(190px,3fr);gap:10px;align-items:stretch}
      #dashCashFlowChart .cash-flow-chart-main{display:flex;min-width:0;flex-direction:column}
      #dashCashFlowChart .cash-flow-chart-main .chart-svg{flex:1 1 auto;min-height:170px}
      #dashCashFlowChart .cash-flow-chart-main .chart-legend{margin:6px 0 0;padding-top:6px;border-top:1px solid var(--line)}
      #dashCashFlowChart .cash-flow-summary-panel{display:flex;min-width:0;flex-direction:column;gap:9px;padding:10px}
      #dashCashFlowChart .cash-flow-summary-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding-bottom:7px;border-bottom:1px solid var(--line)}
      #dashCashFlowChart .cash-flow-summary-head h4{margin:0}
      #dashCashFlowChart .cash-flow-summary-head strong{color:var(--text);font-size:.72rem;text-align:right;white-space:nowrap}
      #dashCashFlowChart .cash-flow-summary-metrics{display:grid;gap:6px}
      #dashCashFlowChart .cash-flow-summary-metric{display:flex;align-items:center;justify-content:space-between;gap:9px;min-width:0;padding:7px 8px;border:1px solid var(--line);border-radius:7px;background:var(--surface)}
      #dashCashFlowChart .cash-flow-summary-metric span{display:flex;align-items:center;gap:6px;min-width:0;color:var(--muted);font-size:.66rem;font-weight:750}
      #dashCashFlowChart .cash-flow-summary-metric i{width:8px;height:8px;flex:0 0 8px;border-radius:999px}
      #dashCashFlowChart .cash-flow-summary-metric i.income{background:var(--green)}
      #dashCashFlowChart .cash-flow-summary-metric i.expense{background:var(--red)}
      #dashCashFlowChart .cash-flow-summary-metric i.balance{background:var(--blue)}
      #dashCashFlowChart .cash-flow-summary-metric strong{min-width:0;font-size:.75rem;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
      #dashCashFlowChart .cash-flow-summary-metric .income-value{color:var(--green)}
      #dashCashFlowChart .cash-flow-summary-metric .expense-value{color:var(--red)}
      #dashCashFlowChart .cash-flow-summary-metric .balance-value{color:var(--blue)}
      #dashCashFlowChart .cash-flow-summary-change{margin-top:auto;padding:8px;border:1px solid var(--line);border-radius:7px;background:var(--surface-soft)}
      #dashCashFlowChart .cash-flow-summary-change span{display:block;color:var(--muted);font-size:.61rem;font-weight:750}
      #dashCashFlowChart .cash-flow-summary-change strong{display:block;margin-top:2px;font-size:.72rem;font-variant-numeric:tabular-nums}
      @media (min-width:701px) and (max-width:1100px){#dashCashFlowChart .cash-flow-chart-grid{grid-template-columns:minmax(0,3fr) minmax(180px,2fr)}}
      @media (max-width:700px){#dashCashFlowChart .cash-flow-chart-grid{grid-template-columns:1fr}#dashCashFlowChart .cash-flow-summary-panel{gap:7px}#dashCashFlowChart .cash-flow-summary-metrics{grid-template-columns:1fr}#dashCashFlowChart .cash-flow-summary-change{margin-top:0}}
    `;
    doc.head.appendChild(style);
  }

  function parseMoneyText(value) {
    const numeric = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }
  function formatAbsoluteMoney(value) {
    return `₱${Math.abs(Number(value || 0)).toLocaleString("en-PH", {minimumFractionDigits:2,maximumFractionDigits:2})}`;
  }
  function escapeHtml(value) {
    return String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
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
    if (!doc) return;
    const target = doc.getElementById("dashCashFlowChart");
    if (!target) return;
    const grid = target.querySelector(".cash-flow-chart-grid");
    if (!grid) return;
    const panels = grid.querySelectorAll(":scope > .cash-flow-chart-panel");
    if (panels.length < 2 || panels[1].classList.contains("cash-flow-summary-panel")) return;
    const mainPanel = panels[0], comparisonPanel = panels[1], rows = readCashFlowRows(comparisonPanel);
    if (!rows.length) return;
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
  }
  function installCashFlowLayoutUpgrade() {
    const doc = root.document;
    if (!doc) return;
    installCashFlowStyles();
    const start = () => {
      const target = doc.getElementById("dashCashFlowChart");
      if (!target) return;
      upgradeCashFlowLayout();
      const observer = new MutationObserver(() => {
        if (typeof root.queueMicrotask === "function") root.queueMicrotask(upgradeCashFlowLayout); else upgradeCashFlowLayout();
      });
      observer.observe(target, { childList:true });
      if (typeof root.requestAnimationFrame === "function") root.requestAnimationFrame(upgradeCashFlowLayout);
      if (typeof root.setTimeout === "function") root.setTimeout(upgradeCashFlowLayout, 250);
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once:true }); else start();
  }
  installCashFlowLayoutUpgrade();
})(typeof window !== "undefined" ? window : globalThis);
