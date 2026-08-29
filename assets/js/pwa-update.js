"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  // Compatibility-only cache identity used to upgrade clients installed before Talaan V2.
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v2-20260828-household-splits-r17";
  const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v2-0-1-talaan7";
  const DASHBOARD_PRESENTATION_REFRESH_KEY = "finance-dashboard-presentation-v2-5-0-talaan9";
  const EXPENSE_DARK_MODE_REFRESH_KEY = "finance-expense-dark-mode-v2-5-0-talaan1";
  const normalizeCacheVersion = cacheVersion => cacheVersion === LEGACY_INDEX_CACHE ? CURRENT_CACHE_VERSION : cacheVersion;

  async function installBrowserBrandIcons() {
    try {
      await import("./brand-icons.js?v=2.5.0-talaan1");
      return true;
    } catch (error) {
      return false;
    }
  }

  async function installAccountSubmitCompat() {
    try {
      await import("./account-submit-compat.js?v=2.5.0-account-submit1");
      return true;
    } catch (error) {
      return false;
    }
  }

  function installPaidCalendarSortCompat() {
    if (root.FinancePaidCalendarSort) return false;
    const CALENDAR_SELECTOR = "#transactionCalendar-paid";
    const SORT_SELECTOR = "#transactionToolbar-paid [data-transaction-sort]";
    let refreshQueued = false;

    const dayTimestamp = day => {
      const label = String(day?.querySelector(":scope > h4")?.textContent || "").trim();
      if (!label || label === "Unscheduled") return null;
      const timestamp = Date.parse(label);
      return Number.isFinite(timestamp) ? timestamp : null;
    };

    const applySort = () => {
      const calendar = document.querySelector(CALENDAR_SELECTOR);
      const sortControl = document.querySelector(SORT_SELECTOR);
      if (!calendar || !sortControl || !["oldest", "newest"].includes(sortControl.value)) return false;
      const days = [...calendar.querySelectorAll(":scope > .transaction-calendar-day")];
      if (days.length < 2) return false;
      const direction = sortControl.value === "oldest" ? 1 : -1;
      const sorted = [...days].sort((a, b) => {
        const aTime = dayTimestamp(a);
        const bTime = dayTimestamp(b);
        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return direction * (aTime - bTime);
      });
      const unchanged = days.every((day, index) => day === sorted[index]);
      if (unchanged) return false;
      sorted.forEach(day => calendar.append(day));
      return true;
    };

    const queueApply = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      root.requestAnimationFrame(() => {
        refreshQueued = false;
        applySort();
      });
    };

    document.addEventListener("change", event => {
      if (event.target?.matches?.(SORT_SELECTOR)) queueApply();
    });

    const observer = new MutationObserver(records => {
      if (records.some(record => record.target?.closest?.(CALENDAR_SELECTOR) || [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && (node.matches?.(CALENDAR_SELECTOR) || node.querySelector?.(CALENDAR_SELECTOR))))) queueApply();
    });

    const start = () => {
      observer.observe(document.documentElement, { childList:true, subtree:true });
      queueApply();
    };

    root.FinancePaidCalendarSort = Object.freeze({ applySort, queueApply });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
    else start();
    return true;
  }

  async function deleteCachedPaths(pathnames) {
    if (!("caches" in root)) return 0;
    try {
      const cacheNames = (await root.caches.keys()).filter(name => FINANCE_CACHE_PATTERN.test(name));
      const deletedCounts = await Promise.all(cacheNames.map(async cacheName => {
        const cache = await root.caches.open(cacheName);
        const requests = await cache.keys();
        const targets = requests.filter(request => {
          try {
            const pathname = new URL(request.url).pathname;
            return pathnames.some(suffix => pathname.endsWith(suffix));
          } catch (error) {
            return false;
          }
        });
        const deleted = await Promise.all(targets.map(request => cache.delete(request)));
        return deleted.filter(Boolean).length;
      }));
      return deletedCounts.reduce((sum, count) => sum + count, 0);
    } catch (error) {
      return 0;
    }
  }

  async function refreshCachedHeaderToolsOnce() {
    if (!root.navigator?.serviceWorker?.controller || !("caches" in root)) return false;
    try {
      if (root.localStorage?.getItem(UI_HOTFIX_REFRESH_KEY) === "done") return false;
      const removed = await deleteCachedPaths([
        "/header-tools-compat.js",
        "/cash-flow-summary.js",
        "/desktop-ui-phase1.css",
        "/black-canvas.css",
        "/production-ui-audit.css",
        "/phone-finance-compat.js",
        "/sidebar-compact-brand.css",
        "/talaan-brand-logo.png"
      ]);
      if (!removed) return false;
      root.localStorage?.setItem(UI_HOTFIX_REFRESH_KEY, "done");
      root.location.reload();
      return true;
    } catch (error) {
      return false;
    }
  }

  async function refreshDashboardPresentationOnce() {
    if (!root.navigator?.serviceWorker?.controller || !("caches" in root)) return false;
    try {
      if (root.localStorage?.getItem(DASHBOARD_PRESENTATION_REFRESH_KEY) === "done") return false;
      const removed = await deleteCachedPaths([
        "/brand-icons.js",
        "/income-expenses-compact.css",
        "/production-ui-audit.css"
      ]);
      if (!removed) return false;
      root.localStorage?.setItem(DASHBOARD_PRESENTATION_REFRESH_KEY, "done");
      root.location.reload();
      return true;
    } catch (error) {
      return false;
    }
  }

  async function refreshExpenseDarkModeOnce() {
    if (!root.navigator?.serviceWorker?.controller || !("caches" in root)) return false;
    try {
      if (root.localStorage?.getItem(EXPENSE_DARK_MODE_REFRESH_KEY) === "done") return false;
      const removed = await deleteCachedPaths([
        "/phone-finance-compat.js"
      ]);
      if (!removed) return false;
      root.localStorage?.setItem(EXPENSE_DARK_MODE_REFRESH_KEY, "done");
      root.location.reload();
      return true;
    } catch (error) {
      return false;
    }
  }

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
  void installBrowserBrandIcons();
  void installAccountSubmitCompat();
  installPaidCalendarSortCompat();
  void refreshCachedHeaderToolsOnce();
  void refreshDashboardPresentationOnce();
  void refreshExpenseDarkModeOnce();
})(typeof window !== "undefined" ? window : globalThis);
