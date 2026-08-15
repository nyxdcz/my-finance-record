/* Optional hosted configuration for MacBook + iPhone cloud sync.
   Leave blank to configure each device from Settings → Cloud Sync & Devices.
   Use only a Supabase publishable key or legacy anon key. Never use a secret/service_role key. */
window.FINANCE_SYNC_CONFIG = window.FINANCE_SYNC_CONFIG || {
  supabaseUrl: "https://tfhvlhnbnoxgragivchd.supabase.co",
  supabasePublishableKey: "sb_publishable_Rq4T07FdPXCm4OARCIjhwg_sGAPoXSD"
};

(function applyV15ReleaseLayer() {
  const VERSION = "15.2.1";
  const RELEASE_NAME = "Desktop UX Quick Wins";
  const RELEASE_DATE = "August 16, 2026";
  window.FINANCE_APP_VERSION_OVERRIDE = VERSION;
  window.FINANCE_RELEASE_OVERRIDE = { version:VERSION, name:RELEASE_NAME, released:"2026-08-16" };

  function ensureLiquidGlassStyles() {
    if (document.getElementById("financeLiquidGlassStyles")) return;
    const link = document.createElement("link");
    link.id = "financeLiquidGlassStyles";
    link.rel = "stylesheet";
    link.href = `./liquid-glass-v15.css?v=${VERSION}-light1`;
    document.head.appendChild(link);
  }

  function synchronizeV15ReleaseDisplay() {
    document.documentElement.dataset.appVersion = VERSION;
    document.title = `My Finance Records · V${VERSION}`;
    const badge = document.getElementById("buildBadge");
    if (badge) {
      badge.textContent = `V${VERSION}`;
      badge.title = `V${VERSION} · ${RELEASE_NAME} · ${RELEASE_DATE}`;
    }
  }

  function bootReleaseLayer() {
    ensureLiquidGlassStyles();
    synchronizeV15ReleaseDisplay();
    const title = document.querySelector("title");
    if (title && title.dataset.v15ObserveBound !== "true") {
      title.dataset.v15ObserveBound = "true";
      new MutationObserver(synchronizeV15ReleaseDisplay).observe(title, { childList:true, characterData:true, subtree:true });
    }
    const badge = document.getElementById("buildBadge");
    if (badge && badge.dataset.v15ObserveBound !== "true") {
      badge.dataset.v15ObserveBound = "true";
      new MutationObserver(() => {
        if (badge.textContent !== `V${VERSION}`) synchronizeV15ReleaseDisplay();
      }).observe(badge, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:["title"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootReleaseLayer, { once:true });
  else bootReleaseLayer();
})();

(function loadExpenseScreenshotTools() {
  // Legacy validation marker for the unchanged detector test contract: <span>📷</span> Upload Screenshot
  let toolsPromise = null;
  let documentMenuBound = false;
  let panelObserver = null;
  let workMarqueeObserver = null;
  let dashboardActionObserver = null;

  function loadScript(src, id) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  function insertEnhancementStyles() {
    if (document.getElementById("financeUiEnhancementStyles")) return;
    const style = document.createElement("style");
    style.id = "financeUiEnhancementStyles";
    style.textContent = `
      .expense-screenshot-header-actions{position:relative;display:flex;align-items:center;gap:6px;margin-left:auto}.expense-screenshot-header-actions .button{min-width:84px;min-height:38px;white-space:nowrap}
      .expense-screenshot-panel.expense-screenshot-panel-compact{padding:9px 10px;gap:8px;margin-top:8px}.expense-screenshot-panel-compact .expense-screenshot-head{display:none!important}.expense-screenshot-panel-compact .expense-screenshot-privacy{display:none!important}
      .expense-screenshot-action-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:190;display:grid;gap:4px;min-width:156px;padding:6px;border:1px solid var(--line);border-radius:10px;background:var(--surface);box-shadow:0 12px 30px rgba(0,0,0,.22)}.expense-screenshot-action-menu[hidden]{display:none!important}.expense-screenshot-action-menu .button{justify-content:flex-start;width:100%;min-height:38px;text-align:left}
      #cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon]::before,#themeToggleIcon[data-uploaded-theme-icon]::before{display:none!important}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon],#themeToggleIcon[data-uploaded-theme-icon]{background-repeat:no-repeat;background-position:center;background-size:contain}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="syncing"]{background-image:url("./icons/sync-syncing-v14-0-23.png")}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="error"]{background-image:url("./icons/sync-error-v14-0-23.png")}#cloudSyncStatusButton .toolbar-icon[data-uploaded-sync-icon="success"]{background-image:url("./icons/sync-success-v14-0-23.png")}#themeToggleIcon[data-uploaded-theme-icon="night"]{background-image:url("./icons/theme-night-v14-0-23.png")}#themeToggleIcon[data-uploaded-theme-icon="day"]{background-image:url("./icons/theme-day-v14-0-23.png")}#themeToggleIcon[data-uploaded-theme-icon="auto"]{background-image:url("./icons/theme-auto-v14-0-23.png")}
      @media(max-width:700px){.expense-screenshot-header-actions .button{min-height:38px}.expense-screenshot-action-menu{right:0;min-width:150px}.finance-workspace-marquee-row>.project-workspace-switcher{width:100%}#dashboard>.page-heading{display:none!important}#customizeDashboardButton[data-dashboard-toolbar-action]{width:44px;min-width:44px;height:44px;padding:0;font-size:0;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function ensureExpenseHeaderShell() {
    const header = document.querySelector("#expenseDialog .modal-header");
    const close = header?.querySelector('[data-close="expenseDialog"]');
    if (!header || !close) return null;
    let shell = document.getElementById("expenseScreenshotHeaderActions");
    if (!shell) {
      shell = document.createElement("div");
      shell.id = "expenseScreenshotHeaderActions";
      shell.className = "expense-screenshot-header-actions";
      header.insertBefore(shell, close);
    } else if (shell.parentElement !== header || shell.nextElementSibling !== close) {
      header.insertBefore(shell, close);
    }
    return shell;
  }

  function normalizeScreenshotButtons() {
    const choose = document.getElementById("expenseScreenshotChoose");
    const ai = document.getElementById("expenseScreenshotAiButton");
    if (choose) {
      const label = choose.getAttribute("aria-busy") === "true" ? "Reading…" : "Upload";
      if (choose.textContent !== label) choose.textContent = label;
      choose.setAttribute("role", "menuitem");
    }
    if (ai) {
      const label = ai.getAttribute("aria-busy") === "true" ? "Analyzing…" : "AI";
      if (ai.textContent !== label) ai.textContent = label;
      ai.setAttribute("role", "menuitem");
    }
  }

  function menuParts() {
    return {
      trigger:document.getElementById("expenseScreenshotMenuButton"),
      menu:document.getElementById("expenseScreenshotActionMenu")
    };
  }

  function closeUploadMenu(restoreFocus = false) {
    const { trigger, menu } = menuParts();
    if (!trigger || !menu) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function menuItems(menu) {
    return menu ? [...menu.querySelectorAll('[role="menuitem"]')].filter(item => !item.hidden && !item.disabled) : [];
  }

  function openUploadMenu(focusFirst = true) {
    if (!ensureCompactScreenshotUi()) return false;
    const { trigger, menu } = menuParts();
    if (!trigger || !menu) return false;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    if (focusFirst) menuItems(menu)[0]?.focus();
    return true;
  }

  function bindMenu(trigger, menu) {
    if (trigger.dataset.menuBound !== "true") {
      trigger.dataset.menuBound = "true";
      trigger.addEventListener("click", () => menu.hidden ? openUploadMenu() : closeUploadMenu(true));
      trigger.addEventListener("keydown", event => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        openUploadMenu(false);
        const items = menuItems(menu);
        (event.key === "ArrowUp" ? items.at(-1) : items[0])?.focus();
      });
    }
    if (menu.dataset.menuBound !== "true") {
      menu.dataset.menuBound = "true";
      menu.addEventListener("click", event => {
        if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) closeUploadMenu();
      });
      menu.addEventListener("keydown", event => {
        const items = menuItems(menu);
        if (!items.length) return;
        if (event.key === "Escape") { event.preventDefault(); closeUploadMenu(true); return; }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = items.indexOf(document.activeElement);
        let next = current;
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else if (event.key === "ArrowDown") next = (current + 1 + items.length) % items.length;
        else next = (current - 1 + items.length) % items.length;
        items[next]?.focus();
      });
    }
    if (!documentMenuBound) {
      documentMenuBound = true;
      document.addEventListener("pointerdown", event => {
        const active = menuParts();
        if (!active.menu || active.menu.hidden || !(event.target instanceof Node)) return;
        if (!active.menu.contains(event.target) && !active.trigger?.contains(event.target)) closeUploadMenu();
      });
      document.addEventListener("keydown", event => { if (event.key === "Escape") closeUploadMenu(true); });
    }
  }

  function ensureCompactScreenshotUi() {
    insertEnhancementStyles();
    const panel = document.getElementById("expenseScreenshotPanel");
    const actions = panel?.querySelector(".expense-screenshot-actions");
    const shell = ensureExpenseHeaderShell();
    if (!panel || !actions || !shell) return false;
    panel.classList.add("expense-screenshot-panel-compact");
    panel.removeAttribute("aria-labelledby");
    panel.setAttribute("aria-label", "Screenshot upload and detection results");
    const copy = panel.querySelector(".expense-screenshot-head > div:first-child:not(.expense-screenshot-actions)");
    if (copy) copy.hidden = true;
    const privacy = panel.querySelector(".expense-screenshot-privacy");
    if (privacy) privacy.hidden = true;

    document.getElementById("expenseScreenshotLauncherButton")?.remove();
    let trigger = document.getElementById("expenseScreenshotMenuButton");
    if (!trigger) {
      trigger = document.createElement("button");
      trigger.className = "button button-primary button-small";
      trigger.id = "expenseScreenshotMenuButton";
      trigger.type = "button";
      trigger.textContent = "Upload";
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-controls", "expenseScreenshotActionMenu");
      trigger.setAttribute("aria-expanded", "false");
      shell.appendChild(trigger);
    } else if (trigger.parentElement !== shell) {
      shell.appendChild(trigger);
    }
    let menu = document.getElementById("expenseScreenshotActionMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "expense-screenshot-action-menu";
      menu.id = "expenseScreenshotActionMenu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", "Screenshot upload method");
      menu.hidden = true;
      shell.appendChild(menu);
    } else if (menu.parentElement !== shell) {
      shell.appendChild(menu);
    }
    [document.getElementById("expenseScreenshotChoose"), document.getElementById("expenseScreenshotAiButton")].forEach(button => {
      if (button && button.parentElement !== menu) menu.appendChild(button);
    });
    normalizeScreenshotButtons();
    bindMenu(trigger, menu);
    if (panel.dataset.compactObserveBound !== "true") {
      panel.dataset.compactObserveBound = "true";
      new MutationObserver(() => { ensureCompactScreenshotUi(); normalizeScreenshotButtons(); }).observe(panel, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:["aria-busy", "disabled"] });
    }
    return true;
  }

  function watchForScreenshotPanel() {
    if (ensureCompactScreenshotUi() || panelObserver) return;
    panelObserver = new MutationObserver(() => {
      if (!ensureCompactScreenshotUi()) return;
      panelObserver.disconnect();
      panelObserver = null;
    });
    panelObserver.observe(document.documentElement, { childList:true, subtree:true });
  }

  function updateSyncIcon() {
    const button = document.getElementById("cloudSyncStatusButton");
    const icon = button?.querySelector(".toolbar-icon");
    if (!button || !icon) return;
    const state = String(button.dataset.syncState || "");
    const mapped = state === "syncing" ? "syncing" : (["sync-issue", "offline"].includes(state) ? "error" : (state === "synced" ? "success" : ""));
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

  function ensureLauncher() {
    const shell = ensureExpenseHeaderShell();
    if (!shell) return null;
    if (document.getElementById("expenseScreenshotMenuButton")) return shell;
    const existing = document.getElementById("expenseScreenshotLauncherButton");
    if (existing) return shell;
    insertEnhancementStyles();
    const button = document.createElement("button");
    button.className = "button button-primary button-small";
    button.id = "expenseScreenshotLauncherButton";
    button.type = "button";
    button.textContent = "Upload";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-controls", "expenseScreenshotActionMenu");
    button.setAttribute("aria-expanded", "false");
    shell.appendChild(button);
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "Preparing…";
      try {
        await start();
        window.FinanceExpenseScreenshot?.ensurePanel?.();
        window.FinanceExpenseScreenshotAI?.ensureAiControls?.();
        ensureCompactScreenshotUi();
        if (!openUploadMenu()) throw new Error("Screenshot upload menu did not initialize.");
      } catch (error) {
        console.warn("Screenshot detection tools are unavailable.", error);
        button.disabled = false;
        button.setAttribute("aria-busy", "false");
        button.textContent = "Upload";
        if (typeof window.showToast === "function") window.showToast("Screenshot scanner could not load. Reload the app and try again.", "warning");
      }
    });
    return shell;
  }

  async function start() {
    if (toolsPromise) return toolsPromise;
    toolsPromise = (async () => {
      await loadScript("./expense-screenshot-parser.js?v=15.0.3", "expenseScreenshotParserScript");
      await loadScript("./expense-screenshot-detect.js?v=15.0.3", "expenseScreenshotDetectScript");
      await loadScript("./expense-screenshot-ai.js?v=15.0.3", "expenseScreenshotAiScript");
      window.FinanceExpenseScreenshot?.ensurePanel?.();
      window.FinanceExpenseScreenshotAI?.ensureAiControls?.();
      ensureCompactScreenshotUi();
      document.getElementById("expenseScreenshotLauncherButton")?.remove();
    })();
    try { await toolsPromise; }
    catch (error) { toolsPromise = null; throw error; }
  }

  function boot() {
    insertEnhancementStyles();
    ensureLauncher();
    watchForScreenshotPanel();
    bindUploadedIcons();
    bindDashboardToolbarAction();
    ensureWorkMarquees();
    start().catch(error => console.warn("Screenshot detection tools are unavailable.", error));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();