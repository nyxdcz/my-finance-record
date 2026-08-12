"use strict";
(() => {
  let overflowMenusReady = false;

  function closeOverflowMenu(menu, returnFocus = false) {
    if (!menu) return;
    const trigger = menu.querySelector(":scope > .overflow-menu-trigger, :scope > .topbar-tools-trigger");
    const panel = trigger ? document.getElementById(trigger.getAttribute("aria-controls")) : null;
    if (panel) panel.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    if (returnFocus) trigger?.focus();
  }

  function closeAllOverflowMenus(except = null) {
    document.querySelectorAll(".overflow-menu.is-open, .topbar-tools-menu.is-open").forEach(menu => {
      if (menu !== except) closeOverflowMenu(menu);
    });
  }

  function openOverflowMenu(menu, focusFirst = false) {
    if (!menu) return;
    const trigger = menu.querySelector(":scope > .overflow-menu-trigger, :scope > .topbar-tools-trigger");
    const panel = trigger ? document.getElementById(trigger.getAttribute("aria-controls")) : null;
    if (!trigger || !panel) return;
    closeAllOverflowMenus(menu);
    panel.querySelectorAll(":scope > button").forEach(item => item.setAttribute("role", "menuitem"));
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    menu.classList.add("is-open");
    if (focusFirst) panel.querySelector('[role="menuitem"]:not([disabled])')?.focus();
  }

  function setupOverflowMenus() {
    if (overflowMenusReady) return;
    overflowMenusReady = true;
    document.addEventListener("click", event => {
      const trigger = event.target.closest(".overflow-menu-trigger, .topbar-tools-trigger");
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        const menu = trigger.parentElement;
        if (menu.classList.contains("is-open")) closeOverflowMenu(menu);
        else openOverflowMenu(menu);
        return;
      }
      const menuItem = event.target.closest('[role="menuitem"]');
      if (menuItem) closeOverflowMenu(menuItem.closest(".overflow-menu, .topbar-tools-menu"));
      else closeAllOverflowMenus();
    });
    document.addEventListener("keydown", event => {
      const trigger = event.target.closest?.(".overflow-menu-trigger, .topbar-tools-trigger");
      if (trigger && ["ArrowDown", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openOverflowMenu(trigger.parentElement, true);
        return;
      }
      const item = event.target.closest?.('[role="menuitem"]');
      const menu = event.target.closest?.(".overflow-menu, .topbar-tools-menu");
      if (event.key === "Escape" && menu?.classList.contains("is-open")) {
        event.preventDefault();
        closeOverflowMenu(menu, true);
        return;
      }
      if (!item || !menu || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')].filter(node => !node.hidden);
      if (!items.length) return;
      const current = Math.max(0, items.indexOf(item));
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    });
  }

  function renderDuplicatedMarquee(track, groupContent) {
    track.innerHTML = `<div class="dashboard-week-marquee-group">${groupContent}</div><div class="dashboard-week-marquee-group" aria-hidden="true">${groupContent}</div>`;
  }

  function middleTruncateFilename(filename, maxLength = 34) {
    const value = String(filename || "");
    if (value.length <= maxLength) return value;
    const dotIndex = value.lastIndexOf(".");
    const extension = dotIndex > 0 ? value.slice(dotIndex) : "";
    const basename = extension ? value.slice(0, dotIndex) : value;
    const available = Math.max(8, maxLength - extension.length - 1);
    const left = Math.ceil(available / 2);
    const right = Math.floor(available / 2);
    return `${basename.slice(0, left)}…${basename.slice(-right)}${extension}`;
  }

  function createDashboardDragController({ dashboard, grid, labels, getOrder, commitMove, announcer }) {
    let draggedKey = "", dropSignature = "", keyboardDrag = null;
    const announce = message => { if (!announcer) return; announcer.textContent = ""; requestAnimationFrame(() => { announcer.textContent = message; }); };
    const clearTargets = () => {
      grid.querySelectorAll(".dashboard-drop-before, .dashboard-drop-after").forEach(card => card.classList.remove("dashboard-drop-before", "dashboard-drop-after"));
      dropSignature = "";
    };
    const dropPosition = (card, clientX, clientY) => {
      const rect = card.getBoundingClientRect();
      const horizontal = rect.width < grid.getBoundingClientRect().width * .8;
      return horizontal ? (clientX > rect.left + rect.width / 2 ? "after" : "before") : (clientY > rect.top + rect.height / 2 ? "after" : "before");
    };
    const cancel = () => { keyboardDrag = null; clearTargets(); };
    const handleKey = event => {
      const handle = event.currentTarget, key = handle.dataset.dashboardDrag;
      if (![" ", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) || !dashboard.classList.contains("dashboard-customizing")) return;
      if (!keyboardDrag && [" ", "Enter"].includes(event.key)) {
        event.preventDefault(); keyboardDrag = { key, targetIndex:getOrder().indexOf(key) };
        announce(`${labels[key]} picked up. Use arrow keys to choose a destination, then press Enter to drop or Escape to cancel.`); return;
      }
      if (!keyboardDrag || keyboardDrag.key !== key) return;
      event.preventDefault();
      if (event.key === "Escape") { cancel(); announce(`${labels[key]} drag cancelled.`); return; }
      if ([" ", "Enter"].includes(event.key)) {
        const order = getOrder(), currentIndex = order.indexOf(key), targetKey = order[keyboardDrag.targetIndex];
        const position = keyboardDrag.targetIndex > currentIndex ? "after" : "before";
        cancel();
        if (targetKey === key) announce(`${labels[key]} returned to its original position.`); else commitMove(key, targetKey, position);
        requestAnimationFrame(() => grid.querySelector(`[data-dashboard-drag="${CSS.escape(key)}"]`)?.focus()); return;
      }
      const delta = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1, order = getOrder();
      keyboardDrag.targetIndex = Math.max(0, Math.min(order.length - 1, keyboardDrag.targetIndex + delta)); clearTargets();
      const targetKey = order[keyboardDrag.targetIndex], target = grid.querySelector(`[data-dashboard-card="${CSS.escape(targetKey)}"]`), position = delta > 0 ? "after" : "before";
      if (target && targetKey !== key) target.classList.add(position === "after" ? "dashboard-drop-after" : "dashboard-drop-before");
      announce(`Destination ${keyboardDrag.targetIndex + 1} of ${order.length}: ${labels[targetKey]}.`);
    };
    const createHandle = (card, key) => {
      if (card.querySelector(".dashboard-drag-handle")) return;
      const button = document.createElement("button");
      button.type = "button"; button.className = "dashboard-drag-handle"; button.draggable = true; button.dataset.dashboardDrag = key; button.innerHTML = "⠿";
      button.setAttribute("aria-label", `Reorder ${labels[key]}. Press Space, then use arrow keys.`); button.title = "Drag to reorder; keyboard controls are also available";
      button.addEventListener("keydown", handleKey); card.appendChild(button);
    };
    document.addEventListener("dragstart", event => {
      const handle = event.target.closest?.("[data-dashboard-drag]");
      if (!handle || !dashboard.classList.contains("dashboard-customizing")) return;
      const card = handle.closest("[data-dashboard-card]"); draggedKey = handle.dataset.dashboardDrag;
      event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-dashboard-card", draggedKey); event.dataTransfer.setData("text/plain", draggedKey);
      card?.classList.add("is-dashboard-dragging");
      const preview = document.createElement("div"); preview.className = "dashboard-drag-preview"; preview.textContent = `Move ${labels[draggedKey]}`; document.body.appendChild(preview);
      event.dataTransfer.setDragImage(preview, 24, 18); requestAnimationFrame(() => preview.remove());
      announce(`${labels[draggedKey]} picked up. Move over another Dashboard card to choose a destination.`);
    });
    document.addEventListener("dragover", event => {
      if (!draggedKey) return; const card = event.target.closest?.("#dashboardCardGrid [data-dashboard-card]");
      if (!card || card.dataset.dashboardCard === draggedKey) return; event.preventDefault();
      const position = dropPosition(card, event.clientX, event.clientY), signature = `${card.dataset.dashboardCard}:${position}`;
      if (signature !== dropSignature) { clearTargets(); dropSignature = signature; card.classList.add(position === "after" ? "dashboard-drop-after" : "dashboard-drop-before"); announce(`Available destination: ${position} ${labels[card.dataset.dashboardCard]}.`); }
      event.dataTransfer.dropEffect = "move";
    });
    document.addEventListener("drop", event => {
      if (!draggedKey) return; const card = event.target.closest?.("#dashboardCardGrid [data-dashboard-card]");
      if (!card || card.dataset.dashboardCard === draggedKey) return; event.preventDefault();
      const source = event.dataTransfer.getData("application/x-dashboard-card") || draggedKey, position = dropPosition(card, event.clientX, event.clientY);
      clearTargets(); commitMove(source, card.dataset.dashboardCard, position); draggedKey = "";
    });
    document.addEventListener("dragend", () => {
      const cancelledKey = draggedKey; grid.querySelectorAll(".is-dashboard-dragging").forEach(card => card.classList.remove("is-dashboard-dragging")); clearTargets(); draggedKey = "";
      if (cancelledKey) announce(`${labels[cancelledKey]} drag ended. The saved order is unchanged unless a drop was completed.`);
    });
    return { announce, cancel, createHandle };
  }

  window.FinanceInteractionPatterns = { closeOverflowMenu, setupOverflowMenus, renderDuplicatedMarquee, middleTruncateFilename, createDashboardDragController };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupOverflowMenus, { once:true });
  else setupOverflowMenus();
})();
