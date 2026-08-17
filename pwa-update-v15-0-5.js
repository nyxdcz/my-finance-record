"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v15-20260818-ui-refinement-r39";
  const normalizeCacheVersion = cacheVersion => cacheVersion === LEGACY_INDEX_CACHE ? CURRENT_CACHE_VERSION : cacheVersion;
  const api = {
    financeCachePattern:FINANCE_CACHE_PATTERN,
    shellCacheName(cacheVersion) { return `${normalizeCacheVersion(cacheVersion)}-shell`; },
    serviceWorkerUrl(version, cacheVersion) {
      const normalizedCache = normalizeCacheVersion(cacheVersion);
      return `./sw.js?v=${encodeURIComponent(version)}&cache=${encodeURIComponent(normalizedCache)}`;
    },
    updateState(remote, version, cacheVersion) {
      const normalizedCache = normalizeCacheVersion(cacheVersion);
      return {
        versionChanged:Boolean(remote?.version && remote.version !== version),
        cacheChanged:Boolean(remote?.cacheVersion && remote.cacheVersion !== normalizedCache)
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

  function installSidebarBrand() {
    const doc = root.document;
    if (!doc) return;
    const apply = () => {
      const brand = doc.querySelector(".sidebar .brand strong");
      if (brand && brand.textContent !== "My Finance Records") brand.textContent = "My Finance Records";
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", apply, { once:true });
    else apply();
  }
  installSidebarBrand();

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

  function installQuickEntryToolsMenuRelocation() {
    const doc = root.document;
    if (!doc) return;
    const apply = () => {
      const panel = doc.getElementById("topbarToolsPanel");
      const theme = doc.getElementById("themeToggleButton");
      if (panel && theme) {
        let button = doc.getElementById("quickEntryMenuButton");
        if (!button) {
          button = doc.createElement("button");
          button.className = "topbar-tools-item";
          button.id = "quickEntryMenuButton";
          button.type = "button";
          button.setAttribute("role", "menuitem");
          button.setAttribute("aria-label", "Quick add");
          button.title = "Quick add";
          button.innerHTML = '<span class="toolbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M17 14v6M14 17h6"/></svg></span><span><strong>Quick add</strong><small>Add a finance or work record</small></span>';
        }
        if (theme.nextElementSibling !== button) theme.insertAdjacentElement("afterend", button);
      }
      const standalone = doc.getElementById("mobileAddExpenseButton");
      if (standalone) {
        standalone.hidden = true;
        standalone.setAttribute("aria-hidden", "true");
        standalone.tabIndex = -1;
        standalone.dataset.movedToToolsMenu = "true";
      }
    };
    const activate = event => {
      const button = event.target.closest?.("#quickEntryMenuButton");
      if (!button) return;
      event.preventDefault();
      if (typeof root.FinanceProductivityTools?.openQuickAdd === "function") {
        root.FinanceProductivityTools.openQuickAdd();
        return;
      }
      const fallback = doc.getElementById("mobileAddExpenseButton");
      if (!fallback) return;
      const wasHidden = fallback.hidden;
      fallback.hidden = false;
      fallback.click();
      fallback.hidden = wasHidden;
    };
    doc.addEventListener("click", activate);
    const start = () => {
      apply();
      if (!doc.body || doc.body.dataset.quickEntryMenuRelocationObserved === "true") return;
      doc.body.dataset.quickEntryMenuRelocationObserved = "true";
      const observer = new MutationObserver(() => apply());
      observer.observe(doc.body, { childList:true, subtree:true });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once:true }); else start();
  }
  installQuickEntryToolsMenuRelocation();

  function installHeaderToolsRelocation() {
    const doc = root.document;
    if (!doc) return;
    const hideStandalone = node => {
      if (!node) return;
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      node.tabIndex = -1;
      node.style.setProperty("display", "none", "important");
    };
    const apply = () => {
      const panel = doc.getElementById("topbarToolsPanel");
      const theme = doc.getElementById("themeToggleButton");
      const quick = doc.getElementById("quickEntryMenuButton");
      const search = doc.getElementById("globalSearchButton");
      const quickActions = doc.getElementById("productivityCenterButton");
      const undo = doc.getElementById("undoMoneyMenuButton");
      const redo = doc.getElementById("redoMoneyMenuButton");
      if (panel && theme) {
        let customize = doc.getElementById("customizeDashboardMenuButton");
        if (!customize) {
          customize = doc.createElement("button");
          customize.className = "topbar-tools-item";
          customize.id = "customizeDashboardMenuButton";
          customize.type = "button";
          customize.setAttribute("role", "menuitem");
          customize.setAttribute("aria-label", "Customize dashboard");
          customize.title = "Customize dashboard";
          customize.innerHTML = '<span class="toolbar-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M17 14v6M14 17h6"/></svg></span><span><strong>Customize dashboard</strong><small>Show, hide, reorder, and resize cards</small></span>';
        }
        const anchor = quick || theme;
        if (anchor.nextElementSibling !== customize) anchor.insertAdjacentElement("afterend", customize);
        if (customize && undo && customize.nextElementSibling !== undo) customize.insertAdjacentElement("afterend", undo);
        if (undo && redo && undo.nextElementSibling !== redo) undo.insertAdjacentElement("afterend", redo);
        if (redo && search && redo.nextElementSibling !== search) redo.insertAdjacentElement("afterend", search);
        panel.querySelectorAll(":scope > .menu-command-separator").forEach(separator => separator.remove());
        if (quickActions && quickActions.parentElement === panel && search && search.nextElementSibling !== quickActions) search.insertAdjacentElement("afterend", quickActions);
      }
      const history = doc.querySelector(".topbar-history-actions");
      if (history) {
        history.hidden = true;
        history.setAttribute("aria-hidden", "true");
        history.style.setProperty("display", "none", "important");
        history.querySelectorAll("button").forEach(button => { button.tabIndex = -1; });
      }
      hideStandalone(doc.getElementById("mobileAddExpenseButton"));
      doc.querySelectorAll(".topbar-actions button").forEach(button => {
        if (button.id === "customizeDashboardMenuButton") return;
        const label = `${button.getAttribute("aria-label") || ""} ${button.getAttribute("title") || ""} ${button.textContent || ""}`.toLowerCase();
        if (label.includes("customize dashboard")) hideStandalone(button);
      });
    };
    const activate = event => {
      const button = event.target.closest?.("#customizeDashboardMenuButton");
      if (!button) return;
      event.preventDefault();
      const openCustomizer = () => doc.getElementById("customizeDashboardButton")?.click();
      if (doc.querySelector("#dashboard.active")) {
        openCustomizer();
        return;
      }
      const dashboardNav = doc.querySelector('[data-page="dashboard"]');
      if (dashboardNav) {
        dashboardNav.click();
        root.setTimeout?.(openCustomizer, 0);
      } else openCustomizer();
    };
    doc.addEventListener("click", activate);
    const start = () => {
      apply();
      if (!doc.body || doc.body.dataset.headerToolsRelocationObserved === "true") return;
      doc.body.dataset.headerToolsRelocationObserved = "true";
      const observer = new MutationObserver(() => apply());
      observer.observe(doc.body, { childList:true, subtree:true });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once:true }); else start();
  }
  installHeaderToolsRelocation();

  function installPhoneFinanceCompactStyles() {
    const doc = root.document;
    if (!doc || doc.getElementById("phoneFinanceCompactV1522")) return;
    const style = doc.createElement("style");
    style.id = "phoneFinanceCompactV1522";
    style.textContent = `
      .phone-only-action-icon{display:none;width:20px;height:20px;place-items:center;pointer-events:none}
      .phone-only-action-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      @media (max-width:700px){
        .phone-icon-only-action{width:44px!important;min-width:44px!important;max-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;gap:0!important;flex:0 0 44px!important}
        .phone-icon-only-action .phone-only-action-icon{display:grid}
        .phone-icon-only-action .phone-only-action-label{display:none!important}

        #availableMoneySection .card-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:start!important;margin-bottom:7px!important}
        #availableMoneySection .card-header>div:first-child{min-width:0}
        #availableMoneySection .card-header>div:first-child p{margin-top:2px!important;font-size:.62rem!important;line-height:1.25!important}
        #availableMoneySection .collapse-actions{display:grid!important;grid-template-columns:auto 44px 44px!important;gap:6px!important;align-items:center!important;justify-content:end!important;min-width:0}
        #availableMoneySection .available-money-total-wrap{min-width:0;text-align:right}
        #availableMoneySection .available-money-total-wrap strong{font-size:.82rem!important;white-space:nowrap}
        #availableMoneySection .available-money-account-count{font-size:.58rem!important;white-space:nowrap}
        #availableMoneySection .collapse-toggle{width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important}
        #availableMoneySection .account-grid{gap:8px!important}

        .project-calendar-v13020 .pc-header{display:block!important;padding-bottom:6px!important}
        .project-calendar-v13020 .pc-header>div:first-child p{margin-top:2px!important;font-size:.62rem!important;line-height:1.25!important}
        .project-calendar-v13020 .pc-header-actions{display:grid!important;grid-template-columns:auto minmax(0,1fr) 44px!important;gap:6px!important;align-items:center!important;justify-content:stretch!important;width:100%!important;margin-top:6px!important}
        .project-calendar-v13020 .pc-count{min-width:0;justify-content:center;white-space:nowrap}
        .project-calendar-v13020 [data-pc-view]{width:100%!important;min-width:0!important;min-height:44px!important;padding-inline:8px!important;white-space:nowrap}

        #money .period-card{padding:10px!important}
        #money .period-header{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;margin-bottom:6px!important;padding-bottom:0!important}
        #money .period-header>div:first-child{min-width:0}
        #money .period-header h3{margin:0!important;font-size:.82rem!important;line-height:1.2!important}
        #money .period-header p{margin:2px 0 0!important;font-size:.61rem!important;line-height:1.25!important}
        #money .period-header .collapse-actions{display:flex!important;align-items:center!important;gap:6px!important;min-width:0}
        #money .period-header .period-total{font-size:.8rem!important;white-space:nowrap}
        #money .period-header .collapse-toggle{width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important}
        #money .record-header{display:none!important}
        #money .record-row[data-expense-row]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"title amount" "due account" "actions actions"!important;gap:6px 10px!important;align-items:start!important;padding:9px 10px!important;overflow:visible!important}
        #money .record-row[data-expense-row]>.record-title{grid-area:title!important;grid-column:auto!important;min-width:0!important;padding:0!important;border:0!important;align-items:flex-start!important;gap:6px!important}
        #money .record-row[data-expense-row]>.amount{grid-area:amount!important;grid-column:auto!important;align-self:start!important;justify-self:end!important;min-width:78px!important;padding:1px 0!important;border:0!important;background:transparent!important;text-align:right!important;font-size:.84rem!important;font-weight:850!important;white-space:nowrap!important}
        #money .record-row[data-expense-row]>.amount::before{content:none!important}
        #money .record-row[data-expense-row]>.due-cell{grid-area:due!important;grid-column:auto!important;display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:3px!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;text-align:left!important;font-size:.67rem!important}
        #money .record-row[data-expense-row]>.due-cell::before{content:"Due ·"!important;display:inline!important;margin:0 1px 0 0!important;color:var(--muted)!important;font-size:.6rem!important;font-weight:750!important;line-height:1.2!important}
        #money .record-row[data-expense-row]>[data-label="Planned account"]{grid-area:account!important;grid-column:auto!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;text-align:right!important;font-size:.67rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        #money .record-row[data-expense-row]>[data-label="Planned account"]::before{content:"Account ·"!important;display:inline!important;margin:0 2px 0 0!important;color:var(--muted)!important;font-size:.6rem!important;font-weight:750!important;line-height:1.2!important}
        #money .record-row[data-expense-row]>.mobile-record-actions{grid-area:actions!important;grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1fr) 44px!important;gap:6px!important;align-items:stretch!important;width:100%!important;margin-top:1px!important}
        #money .record-row[data-expense-row]>.mobile-record-actions::before{content:none!important}
        #money .record-row[data-expense-row]>.mobile-record-actions>.button,#money .record-row[data-expense-row] .overflow-menu-trigger{width:100%!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:7px 10px!important}
        #money .record-row[data-expense-row] .record-more-menu{width:44px!important;min-width:44px!important}
        #money .record-row[data-expense-row] .record-more-panel{left:auto!important;right:0!important;bottom:calc(100% + 6px)!important;width:min(230px,calc(100vw - 32px))!important}
        #money .expense-record-title .record-title-copy{min-width:0!important}
        #money .expense-record-title .record-title-copy>strong{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:.77rem!important}
        #money .expense-record-title .record-title-copy>small{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:.61rem!important;line-height:1.25!important}
        #money .expense-record-title .record-statuses{gap:4px!important;margin-top:3px!important}
        #money .expense-record-title .status-badge{min-height:21px!important;padding:2px 6px!important;font-size:.58rem!important;line-height:1.1!important}
        #money .expense-select-checkbox{width:18px!important;height:18px!important}

        #income .income-record-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"title amount" "category date" "account actions"!important;gap:6px 10px!important;align-items:center!important;padding:9px 10px!important;overflow:visible!important}
        #income .income-record-row>.record-title{grid-area:title!important;grid-column:auto!important;min-width:0!important;padding:0!important;border:0!important}
        #income .income-record-row>.amount{grid-area:amount!important;grid-column:auto!important;justify-self:end!important;padding:0!important;border:0!important;background:transparent!important;text-align:right!important;font-size:.84rem!important;white-space:nowrap!important}
        #income .income-record-row>.amount::before{content:none!important}
        #income .income-record-row>[data-label="Category"]{grid-area:category!important}
        #income .income-record-row>[data-label="Date received"]{grid-area:date!important;text-align:right!important}
        #income .income-record-row>[data-label="Account"]{grid-area:account!important}
        #income .income-record-row>.record-actions{grid-area:actions!important;grid-column:auto!important;justify-self:end!important;width:auto!important}
        #income .income-record-row>[data-label]:not(.amount){min-width:0!important;padding:0!important;border:0!important;background:transparent!important;font-size:.66rem!important}
        #income .income-record-row>[data-label]::before{display:inline!important;margin-right:2px!important;font-size:.58rem!important}
        #income .income-record-row>.record-title .record-title-copy>strong,#income .income-record-row>.record-title .record-title-copy>small{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
        #income .income-record-row>.record-actions .button{min-height:44px!important;padding:7px 10px!important}

        #paid-expenses [data-paid-expense-row]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:"title amount" "date account" "actions actions"!important;gap:6px 10px!important;align-items:start!important;padding:9px 10px!important}
        #paid-expenses [data-paid-expense-row]>.record-title{grid-area:title!important;grid-column:auto!important;min-width:0!important;padding:0!important;border:0!important}
        #paid-expenses [data-paid-expense-row]>.amount{grid-area:amount!important;grid-column:auto!important;justify-self:end!important;min-width:78px!important;padding:1px 0!important;border:0!important;background:transparent!important;text-align:right!important;font-size:.84rem!important;white-space:nowrap!important}
        #paid-expenses [data-paid-expense-row]>.amount::before{content:none!important}
        #paid-expenses [data-paid-expense-row]>[data-label="Paid date"]{grid-area:date!important}
        #paid-expenses [data-paid-expense-row]>[data-label="Paid from"]{grid-area:account!important;text-align:right!important}
        #paid-expenses [data-paid-expense-row]>[data-label]:not(.amount){grid-column:auto!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;font-size:.67rem!important}
        #paid-expenses [data-paid-expense-row]>[data-label]:not(.amount)::before{display:inline!important;margin:0 2px 0 0!important;font-size:.58rem!important}
        #paid-expenses [data-paid-expense-row]>.mobile-record-actions{grid-area:actions!important;grid-column:1/-1!important;grid-template-columns:minmax(0,1fr) 44px!important;gap:6px!important;margin-top:1px!important}
        #paid-expenses [data-paid-expense-row]>.mobile-record-actions::before{content:none!important}
        #paid-expenses [data-paid-expense-row] .record-title-copy>strong,#paid-expenses [data-paid-expense-row] .record-title-copy>small{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}

        #quickAddExpense:not([hidden]){position:absolute!important;top:10px!important;right:108px!important;width:44px!important;min-width:44px!important;height:44px!important;min-height:44px!important;padding:0!important;z-index:2!important}
        #quickAddExpense:not([hidden]) .topbar-add-label{display:none!important}
      }
      @media (max-width:390px){
        #availableMoneySection .card-header{grid-template-columns:1fr!important}
        #availableMoneySection .collapse-actions{grid-template-columns:minmax(0,1fr) 44px 44px!important;width:100%!important}
        #availableMoneySection .available-money-total-wrap{text-align:left!important}
        #money .record-row[data-expense-row]{grid-template-columns:minmax(0,1fr) auto!important;gap:6px 7px!important;padding:8px 9px!important}
        #money .record-row[data-expense-row]>.amount{min-width:72px!important;font-size:.8rem!important}
        .project-calendar-v13020 .pc-header-actions{grid-template-columns:auto minmax(0,1fr) 44px!important}
      }
    `;
    doc.head.appendChild(style);
  }

  function bindPhoneIconOnlyButton(button, label, iconMarkup) {
    if (!button || button.dataset.phoneCompactIconBound === "true") return;
    const visibleLabel = String(button.textContent || label).trim() || label;
    button.dataset.phoneCompactIconBound = "true";
    button.classList.add("phone-icon-only-action");
    button.setAttribute("aria-label", label);
    button.title = label;
    button.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "phone-only-action-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = iconMarkup;
    const text = document.createElement("span");
    text.className = "phone-only-action-label";
    text.textContent = visibleLabel;
    button.append(icon, text);
  }

  function enhancePhoneCompactButtons() {
    const doc = root.document;
    if (!doc) return;
    bindPhoneIconOnlyButton(
      doc.getElementById("addAccountButton"),
      "Add account",
      '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 5v14M5 12h14"/></svg>'
    );
    doc.querySelectorAll("[data-pc-add], [data-pc-full-add]").forEach(button => bindPhoneIconOnlyButton(
      button,
      "Schedule event",
      '<svg viewBox="0 0 24 24" focusable="false"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M12 12v5M9.5 14.5h5"/></svg>'
    ));
  }

  function installPhoneFinanceCompactUi() {
    const doc = root.document;
    if (!doc) return;
    installPhoneFinanceCompactStyles();
    const apply = () => enhancePhoneCompactButtons();
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", apply, { once:true }); else apply();
    const startObserver = () => {
      if (!doc.body || doc.body.dataset.phoneFinanceCompactObserved === "true") return;
      doc.body.dataset.phoneFinanceCompactObserved = "true";
      const observer = new MutationObserver(() => enhancePhoneCompactButtons());
      observer.observe(doc.body, { childList:true, subtree:true });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", startObserver, { once:true }); else startObserver();
  }
  installPhoneFinanceCompactUi();
})(typeof window !== "undefined" ? window : globalThis);