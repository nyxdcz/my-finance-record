"use strict";
(function installFinanceKanbanMenuCompat(root) {
  const doc = root.document;
  if (!doc) return;

  const EDGE_GAP = 8;
  const TRIGGER_GAP = 6;
  let frame = 0;

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  const menuTrigger = menu => menu?.querySelector(":scope > .overflow-menu-trigger");
  const menuPanel = menu => {
    const trigger = menuTrigger(menu);
    const id = trigger?.getAttribute("aria-controls");
    return id ? doc.getElementById(id) : null;
  };

  function resetPanel(panel) {
    if (!panel) return;
    ["position", "left", "top", "right", "bottom", "z-index", "margin", "max-width", "max-height", "overflow-y", "visibility"].forEach(property => panel.style.removeProperty(property));
    delete panel.dataset.viewportPlacement;
  }

  function positionMenu(menu) {
    if (!menu) return;
    const trigger = menuTrigger(menu);
    const panel = menuPanel(menu);
    if (!trigger || !panel) return;
    if (!menu.classList.contains("is-open") || panel.hidden) {
      resetPanel(panel);
      return;
    }

    const viewportWidth = Math.max(doc.documentElement.clientWidth || 0, root.innerWidth || 0);
    const viewportHeight = Math.max(doc.documentElement.clientHeight || 0, root.innerHeight || 0);
    const availableWidth = Math.max(0, viewportWidth - (EDGE_GAP * 2));
    const availableHeight = Math.max(0, viewportHeight - (EDGE_GAP * 2));

    panel.style.setProperty("position", "fixed", "important");
    panel.style.setProperty("z-index", "2600", "important");
    panel.style.setProperty("margin", "0", "important");
    panel.style.setProperty("right", "auto", "important");
    panel.style.setProperty("bottom", "auto", "important");
    panel.style.setProperty("max-width", `${availableWidth}px`, "important");
    panel.style.setProperty("max-height", `${availableHeight}px`, "important");
    panel.style.setProperty("overflow-y", "auto", "important");
    panel.style.setProperty("visibility", "hidden", "important");
    panel.style.setProperty("left", `${EDGE_GAP}px`, "important");
    panel.style.setProperty("top", `${EDGE_GAP}px`, "important");

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const spaceBelow = viewportHeight - triggerRect.bottom - EDGE_GAP;
    const spaceAbove = triggerRect.top - EDGE_GAP;
    const openAbove = panelRect.height + TRIGGER_GAP > spaceBelow && spaceAbove > spaceBelow;
    const idealTop = openAbove
      ? triggerRect.top - panelRect.height - TRIGGER_GAP
      : triggerRect.bottom + TRIGGER_GAP;
    const top = clamp(idealTop, EDGE_GAP, viewportHeight - panelRect.height - EDGE_GAP);
    const idealLeft = triggerRect.right - panelRect.width;
    const left = clamp(idealLeft, EDGE_GAP, viewportWidth - panelRect.width - EDGE_GAP);

    panel.style.setProperty("left", `${Math.round(left)}px`, "important");
    panel.style.setProperty("top", `${Math.round(top)}px`, "important");
    panel.style.removeProperty("visibility");
    panel.dataset.viewportPlacement = openAbove ? "above" : "below";
  }

  function syncOpenMenus() {
    frame = 0;
    doc.querySelectorAll(".kanban-column-menu").forEach(positionMenu);
  }

  function scheduleSync() {
    if (frame) root.cancelAnimationFrame?.(frame);
    frame = (root.requestAnimationFrame || (callback => root.setTimeout(callback, 0)))(syncOpenMenus);
  }

  function scheduleAfterNativeMenuHandling() {
    const enqueue = root.queueMicrotask || (callback => Promise.resolve().then(callback));
    enqueue(scheduleSync);
  }

  function start() {
    if (!doc.body || doc.documentElement.dataset.kanbanViewportMenusReady === "true") return;
    doc.documentElement.dataset.kanbanViewportMenusReady = "true";

    doc.addEventListener("click", event => {
      if (event.target.closest?.(".kanban-column-menu") || doc.querySelector(".kanban-column-menu.is-open")) scheduleAfterNativeMenuHandling();
    });

    doc.addEventListener("keydown", event => {
      if (event.target.closest?.(".kanban-column-menu") || event.key === "Escape") scheduleAfterNativeMenuHandling();
    });

    doc.addEventListener("scroll", event => {
      const target = event.target;
      if (target?.matches?.(".finance-kanban-board") || target?.closest?.(".finance-kanban-board")) scheduleSync();
    }, true);

    root.addEventListener("resize", scheduleSync);

    const observer = new MutationObserver(mutations => {
      if (mutations.some(mutation => mutation.target?.closest?.(".kanban-column-menu") || mutation.target?.classList?.contains("kanban-column-menu"))) scheduleSync();
    });
    observer.observe(doc.body, { subtree:true, attributes:true, attributeFilter:["class", "hidden"] });

    scheduleSync();
  }

  root.FinanceKanbanMenuCompat = { reposition:scheduleSync };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})(typeof window !== "undefined" ? window : globalThis);