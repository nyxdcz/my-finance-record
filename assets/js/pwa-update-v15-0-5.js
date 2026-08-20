"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v15-20260820-sidebar-icons-r46";
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