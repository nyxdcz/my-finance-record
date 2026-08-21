"use strict";
(function exposeFinancePwaUpdate(root) {
  const FINANCE_CACHE_PATTERN = /^finance-v\d+-/;
  const LEGACY_INDEX_CACHE = "finance-v15-20260816-mobile-ui-ux-r32";
  const CURRENT_CACHE_VERSION = "finance-v15-20260821-horizontal-kanban-r54";
  const KANBAN_MENU_COMPAT_SRC = "./kanban-menu-compat.js?v=15.2.18-kanban-menu1";
  const normalizeCacheVersion = cacheVersion => cacheVersion === LEGACY_INDEX_CACHE ? CURRENT_CACHE_VERSION : cacheVersion;

  function loadKanbanMenuCompat() {
    const doc = root.document;
    if (!doc || doc.querySelector("script[data-finance-kanban-menu-compat]")) return;
    const script = doc.createElement("script");
    script.src = KANBAN_MENU_COMPAT_SRC;
    script.async = true;
    script.dataset.financeKanbanMenuCompat = "true";
    (doc.head || doc.documentElement).appendChild(script);
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
  loadKanbanMenuCompat();
})(typeof window !== "undefined" ? window : globalThis);