"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v15-20260821-horizontal-kanban-r54";
  const HEADER_TOOLS_REFRESH_KEY = "finance-header-tools-hotfix-v15-2-18-kanban-menu3";
  const normalizeCacheVersion = cacheVersion => cacheVersion === LEGACY_INDEX_CACHE ? CURRENT_CACHE_VERSION : cacheVersion;

  async function refreshCachedHeaderToolsOnce() {
    if (!root.navigator?.serviceWorker?.controller || !("caches" in root)) return false;
    try {
      if (root.localStorage?.getItem(HEADER_TOOLS_REFRESH_KEY) === "done") return false;
      const cacheNames = (await root.caches.keys()).filter(name => FINANCE_CACHE_PATTERN.test(name));
      await Promise.all(cacheNames.map(async cacheName => {
        const cache = await root.caches.open(cacheName);
        const requests = await cache.keys();
        const targets = requests.filter(request => {
          try { return new URL(request.url).pathname.endsWith("/header-tools-compat.js"); }
          catch (error) { return false; }
        });
        await Promise.all(targets.map(request => cache.delete(request)));
      }));
      root.localStorage?.setItem(HEADER_TOOLS_REFRESH_KEY, "done");
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
  void refreshCachedHeaderToolsOnce();
})(typeof window !== "undefined" ? window : globalThis);