"use strict";
(function installCashFlowSummaryFeature(root) {
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
