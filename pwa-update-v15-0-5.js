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
})(typeof window !== "undefined" ? window : globalThis);
