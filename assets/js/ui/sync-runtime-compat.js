(function applyTalaanReleaseLayer() {
  const VERSION = "2.5.0";
  const RELEASE_NAME = "Talaan";
  const RELEASE_DATE = "August 28, 2026";
  window.FINANCE_APP_VERSION_OVERRIDE = VERSION;
  window.FINANCE_RELEASE_OVERRIDE = { version:VERSION, name:RELEASE_NAME, released:"2026-08-28" };

  function ensureLiquidGlassStyles() {
    if (document.getElementById("financeLiquidGlassStyles")) return;
    const link = document.createElement("link");
    link.id = "financeLiquidGlassStyles";
    link.rel = "stylesheet";
    link.href = "./liquid-glass.css?v=2.5.0-talaan1";
    document.head.appendChild(link);
  }

  function synchronizeTalaanReleaseDisplay() {
    document.documentElement.dataset.appVersion = VERSION;
    document.title = `Talaan · V${VERSION}`;
    const badge = document.getElementById("buildBadge");
    if (badge) {
      badge.textContent = `V${VERSION}`;
      badge.title = `V${VERSION} · ${RELEASE_NAME} · ${RELEASE_DATE}`;
    }
  }

  function bootReleaseLayer() {
    ensureLiquidGlassStyles();
    synchronizeTalaanReleaseDisplay();
    const title = document.querySelector("title");
    if (title && title.dataset.releaseObserveBound !== "true") {
      title.dataset.releaseObserveBound = "true";
      new MutationObserver(synchronizeTalaanReleaseDisplay).observe(title, { childList:true, characterData:true, subtree:true });
    }
    const badge = document.getElementById("buildBadge");
    if (badge && badge.dataset.releaseObserveBound !== "true") {
      badge.dataset.releaseObserveBound = "true";
      new MutationObserver(() => {
        if (badge.textContent !== `V${VERSION}`) synchronizeTalaanReleaseDisplay();
      }).observe(badge, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:["title"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootReleaseLayer, { once:true });
  else bootReleaseLayer();
})();

(function enhanceTalaanRuntimeUi() {
  let workMarqueeObserver = null;
  let dashboardActionObserver = null;

  function insertEnhancementStyles() {
    if (document.getElementById("financeUiEnhancementStyles")) return;
    const style = document.createElement("style");
    style.id = "financeUiEnhancementStyles";
    style.textContent = `
      /* Talaan Cloud Sync status artwork */
      #cloudSyncStatusButton[data-sync-state="synced"]{color:#43cf78!important}#cloudSyncStatusButton[data-sync-state="syncing"]{color:#f5a623!important}#cloudSyncStatusButton[data-sync-state="needs-sync"],#cloudSyncStatusButton[data-sync-state="sync-issue"],#cloudSyncStatusButton[data-sync-state="offline"]{color:#ff786e!important}
      #cloudSyncStatusButton[data-sync-state] .cloud-sync-label,#cloudSyncStatusButton[data-sync-state] .toolbar-icon{color:inherit!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]{background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]::before,#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon] svg{display:none!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="synced"]{background-image:url("./icons/sync-synced.png")!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="syncing"]{background-image:url("./icons/sync-syncing.png")!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="needs-sync"]{background-image:url("./icons/sync-needs-sync.png")!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="offline"]{background-image:url("./icons/sync-issue-offline.png")!important}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]::before,#themeToggleIcon[data-uploaded-theme-icon]::before{display:none!important}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon],#themeToggleIcon[data-uploaded-theme-icon]{background-repeat:no-repeat;background-position:center;background-size:contain}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="syncing"]{background-image:url("./icons/sync-syncing-alternate.png")}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="error"]{background-image:url("./icons/sync-error.png")}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="success"]{background-image:url("./icons/sync-success.png")}#themeToggleIcon[data-uploaded-theme-icon="night"]{background-image:url("./icons/theme-night.png")}#themeToggleIcon[data-uploaded-theme-icon="day"]{background-image:url("./icons/theme-day.png")}#themeToggleIcon[data-uploaded-theme-icon="auto"]{background-image:url("./icons/theme-auto.png")}
      @media(max-width:700px){.finance-workspace-marquee-row>.project-workspace-switcher{width:100%}#dashboard>.page-heading{display:none!important}#customizeDashboardButton[data-dashboard-toolbar-action]{width:44px;min-width:44px;height:44px;padding:0;font-size:0;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function updateSyncIcon() {
    const button = document.getElementById("cloudSyncStatusButton");
    const icon = button?.querySelector(".toolbar-icon");
    if (!button || !icon) return;
    const state = String(button.dataset.syncState || "");
    const mapped = state === "syncing" ? "syncing" : (state === "needs-sync" ? "needs-sync" : (["sync-issue", "offline"].includes(state) ? "offline" : (state === "synced" ? "synced" : "")));
    if (mapped) icon.dataset.uploadedSyncIcon = mapped;
    else delete icon.dataset.uploadedSyncIcon;
  }

  function updateThemeIcon() {
    const icon = document.getElementById("themeToggleIcon");
    if (!icon) return;
    let preference = String(document.documentElement.dataset.themePreference || "").toLowerCase();
    if (!preference) {
      try { preference = String(localStorage.getItem("simple-finance-theme-v1") || "system").toLowerCase(); }
      catch (error) { preference = "system"; }
    }
    icon.dataset.uploadedThemeIcon = preference === "dark" ? "night" : (preference === "light" ? "day" : "auto");
  }

  function bindUploadedIcons() {
    insertEnhancementStyles();
    updateSyncIcon();
    updateThemeIcon();
    const syncButton = document.getElementById("cloudSyncStatusButton");
    if (syncButton && syncButton.dataset.uploadedIconObserveBound !== "true") {
      syncButton.dataset.uploadedIconObserveBound = "true";
      new MutationObserver(updateSyncIcon).observe(syncButton, { attributes:true, attributeFilter:["data-sync-state", "aria-label", "aria-busy"] });
    }
    const root = document.documentElement;
    if (root.dataset.uploadedThemeObserveBound !== "true") {
      root.dataset.uploadedThemeObserveBound = "true";
      new MutationObserver(updateThemeIcon).observe(root, { attributes:true, attributeFilter:["data-theme-preference", "data-theme"] });
    }
    document.getElementById("themeToggleButton")?.addEventListener("click", () => queueMicrotask(updateThemeIcon), { passive:true });
  }

  function syncDashboardToolbarAction() {
    const dashboard = document.getElementById("dashboard");
    const button = document.getElementById("customizeDashboardButton");
    const toolsMenu = document.getElementById("topbarToolsMenu");
    if (!dashboard || !button || !toolsMenu) return;
    if (button.parentElement !== toolsMenu.parentElement || button.nextElementSibling !== toolsMenu) toolsMenu.before(button);
    button.dataset.dashboardToolbarAction = "true";
    button.setAttribute("aria-label", "Customize dashboard");
    button.title = "Customize dashboard";
    button.hidden = !dashboard.classList.contains("active");
  }

  function bindDashboardToolbarAction() {
    insertEnhancementStyles();
    syncDashboardToolbarAction();
    const dashboard = document.getElementById("dashboard");
    if (!dashboard || dashboardActionObserver) return;
    dashboardActionObserver = new MutationObserver(syncDashboardToolbarAction);
    dashboardActionObserver.observe(dashboard, { attributes:true, attributeFilter:["class"] });
  }

  function workMarqueeMarkup(prefix) {
    return `<section class="dashboard-week-marquee finance-week-marquee work-week-marquee" id="${prefix}WorkWeekMarquee" aria-labelledby="${prefix}WorkWeekMarqueeTitle"><div class="dashboard-week-marquee-heading"><strong id="${prefix}WorkWeekMarqueeTitle">This week</strong><span id="${prefix}WorkWeekMarqueeRange">Seven-day calendar</span></div><div class="dashboard-week-marquee-window" tabindex="0" aria-describedby="${prefix}WorkWeekMarqueeHelp"><div class="dashboard-week-marquee-track" id="${prefix}WorkWeekMarqueeTrack"></div></div><span class="sr-only" id="${prefix}WorkWeekMarqueeHelp">Seven days of income, expenses, projects, and payments. Animation pauses while focused.</span></section>`;
  }

  function ensureWorkMarquee(pageId) {
    const page = document.getElementById(pageId);
    const switcher = page?.querySelector(".project-workspace-switcher");
    if (!page || !switcher) return;
    let row = switcher.closest(".work-workspace-marquee-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "finance-workspace-marquee-row work-workspace-marquee-row no-print";
      switcher.before(row);
      row.appendChild(switcher);
    }
    if (!document.getElementById(`${pageId}WorkWeekMarquee`)) row.insertAdjacentHTML("beforeend", workMarqueeMarkup(pageId));
  }

  function syncWorkMarquees() {
    const sourceTrack = document.getElementById("dashboardWeekMarqueeTrack");
    const sourceRange = document.getElementById("dashboardWeekMarqueeRange");
    if (!sourceTrack) return;
    ["projects", "payments"].forEach(pageId => {
      const track = document.getElementById(`${pageId}WorkWeekMarqueeTrack`);
      const range = document.getElementById(`${pageId}WorkWeekMarqueeRange`);
      if (track && track.innerHTML !== sourceTrack.innerHTML) track.innerHTML = sourceTrack.innerHTML;
      if (range && sourceRange && range.textContent !== sourceRange.textContent) range.textContent = sourceRange.textContent;
    });
  }

  function ensureWorkMarquees() {
    insertEnhancementStyles();
    ensureWorkMarquee("projects");
    ensureWorkMarquee("payments");
    syncWorkMarquees();
    const source = document.getElementById("dashboardWeekMarquee");
    if (source && !workMarqueeObserver) {
      workMarqueeObserver = new MutationObserver(syncWorkMarquees);
      workMarqueeObserver.observe(source, { childList:true, subtree:true, characterData:true });
    }
  }

  function boot() {
    insertEnhancementStyles();
    bindUploadedIcons();
    bindDashboardToolbarAction();
    ensureWorkMarquees();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
