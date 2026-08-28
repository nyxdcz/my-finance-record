"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  // Compatibility-only cache identity used to upgrade clients installed before Talaan V2.
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v2-20260828-household-splits-r13";
  const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v2-0-1-talaan8";
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


  async function refreshCachedHeaderToolsOnce() {
    if (!root.navigator?.serviceWorker?.controller || !("caches" in root)) return false;
    try {
      if (root.localStorage?.getItem(UI_HOTFIX_REFRESH_KEY) === "done") return false;
      const cacheNames = (await root.caches.keys()).filter(name => FINANCE_CACHE_PATTERN.test(name));
      await Promise.all(cacheNames.map(async cacheName => {
        const cache = await root.caches.open(cacheName);
        const requests = await cache.keys();
        const targets = requests.filter(request => {
          try {
            const pathname = new URL(request.url).pathname;
            return pathname.endsWith("/header-tools-compat.js")
              || pathname.endsWith("/cash-flow-summary.js")
              || pathname.endsWith("/brand-icons.js")
              || pathname.endsWith("/income-expenses-compact.css")
              || pathname.endsWith("/desktop-ui-phase1.css")
              || pathname.endsWith("/black-canvas.css")
              || pathname.endsWith("/production-ui-audit.css")
              || pathname.endsWith("/phone-finance-compat.js")
              || pathname.endsWith("/sidebar-compact-brand.css")
              || pathname.endsWith("/talaan-brand-logo.png");
          }
          catch (error) { return false; }
        });
        await Promise.all(targets.map(request => cache.delete(request)));
      }));
      root.localStorage?.setItem(UI_HOTFIX_REFRESH_KEY, "done");
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
  void refreshCachedHeaderToolsOnce();
})(typeof window !== "undefined" ? window : globalThis);
