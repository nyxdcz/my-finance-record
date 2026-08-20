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
