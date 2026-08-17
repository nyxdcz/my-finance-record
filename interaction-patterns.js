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

  function renderActiveFilterChips(container, filters, onRemove) {
    if (!container) return;
    const active = filters.filter(Boolean);
    container.hidden = active.length === 0;
    container.innerHTML = active.map(({ key, label }) => `<span class="ui-chip"><span>${String(label).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character])}</span><button class="ui-chip-remove" type="button" data-remove-filter="${key}" aria-label="Remove ${String(label).replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character])} filter">×</button></span>`).join("");
    container.onclick = event => {
      const button = event.target.closest("[data-remove-filter]");
      if (button) onRemove(button.dataset.removeFilter);
    };
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

  function emptyStateHtml(title, text, action = null) {
    const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
    const label = String(action?.label || "");
    const actionHtml = label ? `<div class="empty-state-actions"><button class="button button-secondary button-small" type="button"${action?.go ? ` data-go="${escape(action.go)}"` : ""}${action?.action ? ` data-empty-action="${escape(action.action)}"` : ""}>${escape(label)}</button></div>` : "";
    return `<div class="empty-state"><strong>${escape(title)}</strong>${escape(text)}${actionHtml}</div>`;
  }

  function renderIncomeFilterChips() {
    const container = document.getElementById("incomeActiveFilterChips");
    const searchInput = document.getElementById("incomeSearch");
    const categoryInput = document.getElementById("incomeCategoryFilter");
    if (!container || !searchInput || !categoryInput) return;
    const search = searchInput.value.trim();
    const category = categoryInput.value;
    renderActiveFilterChips(container, [
      search ? { key:"search", label:`Search: ${search}` } : null,
      category ? { key:"category", label:`Category: ${category}` } : null
    ], key => {
      if (key === "search") searchInput.value = "";
      if (key === "category") categoryInput.value = "";
      globalThis.renderIncomePage?.();
    });
  }

  function setupEmptyStateActions() {
    if (document.documentElement.dataset.emptyStateActionsReady === "true") return;
    document.documentElement.dataset.emptyStateActionsReady = "true";
    document.addEventListener("click", event => {
      const button = event.target.closest?.("[data-empty-action]");
      if (!button) return;
      const action = button.dataset.emptyAction;
      if (action === "clear-income-filters") {
        const search = document.getElementById("incomeSearch"), category = document.getElementById("incomeCategoryFilter");
        if (search) search.value = ""; if (category) category.value = ""; globalThis.renderIncomePage?.(); return;
      }
      if (action === "add-income") { globalThis.openIncomeDialog?.(); return; }
      if (action === "clear-expense-filters") {
        const search = document.getElementById("expenseSearch"), category = document.getElementById("expenseCategoryFilter");
        if (search) search.value = ""; if (category) category.value = ""; globalThis.renderMoneyPage?.(); return;
      }
      if (action === "add-expense") { globalThis.openExpenseDialog?.(); return; }
      if (action === "clear-project-filters") {
        ["projectSearch", "projectStatusFilter", "projectTypeFilter", "projectSourceFilter"].forEach(id => { const node = document.getElementById(id); if (node) node.value = ""; });
        globalThis.renderProjects?.(); return;
      }
      if (action === "add-project") globalThis.openProjectDialog?.();
    });
  }

  const FIRST_HALF_COMPLETE_LIGHT_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAGOklEQVR4AexZ3VEjORDutsvvbAaQgalCYx7ZDNgIbjcDiACIYMmAzQAygKcrM+MqyGDJgH26q7oru+/7RqOx5JnxD+At6grhHkmt7lZ/+pfoyf8kfAB5bx350SMfPbKlFth4aB0cjE6yLLvOstFP5zIDPZD3Uv+oW9l69vHo1jn3dVN7awEZDo92DrzTpmrfzeTYzHbLykyG5Dk3Iig7PDw8khXBOTd0B2UjVPZKWzvepkFfr1xVH+z5elbYXAnEudHtYPDXs3YZqguslJhOZ7dZ5n6WmZZPlmUo0wcJel6tRdKzYA89P7r1ue7vUiDOZc8ihhZaNKCXIr1vqvIFdLFYaqa70LVFPnlmkrawyi8RvYQd2iI17NEH6D7LktAJBIoPYrIjosKAip6KIldP96dFMf6R5/kN6NzzclWVJ4kCbNRg4nQl8ljpfSqK+1PYoS3S3J5IbG8HNh6kI7QCqcblUOAZ9RBdoKI9ppeRl+l9i2VQ+TPmRNKaZr3PALEfy7Wl8yLfY91R2fDgoH0OtgLhuPTKbFB7hIPnPr/6W6CnZGCxk+xVkNft9//Zm0zGdz63+lvV/UhJeqM6a50vrUCoFGidlguyIS7+LFCxYh4Fjo/ZuuPxYzxcfMGKb1HkZcNoJTccHu1UyTpqAHFudBVKUfHGlQbdAuM+pENctW7IbhpjUfAqg8HfZz41/zaAwPmjebGcRumNk4a5IKIYRnrX7/dWzjFZGnq1L/DxeFG0AcRvSl4M6Rf3CC1wLqBnMLHvP4/H41fZ6vcFDSJlgF/pEg5uAwh49a//b7/uzprZkXAuewBZ16oSq1GGsqDO5TSWZ3o6nTbmBfmBGkBUtW656UDiYSZdoXJoyPKuVYVlgSKZYaUbipbE/dI+BWIfmSc1gIjYIws82R8+XvmtK6Ek9o0kT16gao8KWcadsiycU+xL7KOXaADp9eaTCqDW6hE/qcVbNJGi4PLrs4vfZK5ANtFdFE7yVvuS+uiFGkCSikSlpQW9ZvT1kzpXrkzFJNeoqDVZ4KiDRtqnLHVbhSLm8PAwmdypj16wAcSztVohTOa7vC9Z9m2roEu+WNJrizqD6QwnZs9VlXoOSxRagXDJjGSEq0yc/51pzLfkkoVNtXU/agXiHQ29IhKtMvL7Q29+0jC5kY7QCWSxV7BMJifYYI9XVZSVt0OkLfBXxUHHlTfL9qutwy0Rc6n80V4+yb8wbqNOIBTm5GVcEe4Do8bJczK5rw+HqibOjb5X8p0RZOpWppeYLz8Whf1NkqUoUZEFX8BMf0uB+MmrtaNidoQKWo70Wjriu8NO4GgDcKjWl1k07r1uKGfMOsxk10TxJ2IqF94XlrbTUiBUwRA7hTW/UiiMmpw5dxg5wn3jPrlMQerIYVjAIby2ZMeUdzhVO/BYJjAoVYD9RBfD8wQgzlisAihqT5M8b2k8SsxpJRCKFnmOlQIomAGZzPDK4ZIducDeMJeAEH5wCK8tei2QR7YCTylDVn5Rh4lAXB0xPJOhmecF6g4S3fFaQKiOlqMHTFbtqTgkNsEIHhIkCaXT4MSxXgLEJzDrH5ZZPCvNkiEJmbrOWrAjsTYQ6jcNt4G5x8NErooXFuhE5zZ5JI820CinEgWCENHkJEw52SBsBIR2mxU0wVAuxwsLZPdB1ctLvk8ey2LCPMIlKQahOKvla/dEsLUxECrSOcY1GcGkC0BdtiTBRQDz6BpzupZCb20MgsovAkLFBExZ9ewKrXvOsnXIy878flLqy4t6ItT1YiA0kIABA6175h1EZsmPMpRNe2Lz4RRX8SogNEQwYT1iflbuMyPf0mQskMN+UoIg/w16gmZIrwZCIxPsIYxJ3jf7mrmsPnqTT0JPgGfRfvK64USbgd4ECI2xZ7C8+hMAGCay6x1HBj+m0RPRBckaGyLEXvx7MyD0AMsr32qfwtjHMCtf5R2OJoYXesqQCBjAkw2R/NfQmwKhIwQjquUhUsmoCX2ENEDwxX3VsQOSm/3eHAirx17A/51cMB0TQFwAaOedIpbdNL0VIHQCDp/D8dppw/MpeSzbBm0NCJ2F4ze8EJEmk/EdeduirQKh02O8+ZKY3iZtHcg2nY9tfwCJW+M9pD965D30QuzDfwAAAP//weB7+gAAAAZJREFUAwBE23+D/97JdgAAAABJRU5ErkJggg==";
  const FIRST_HALF_COMPLETE_DARK_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAFpElEQVR4AeyYi3XUOhCGZ0ID0EHSQeggdAAVXG4HpIJkKwgdkA6gg9BB0kHSQahgdf9Pkr3SWl57X3APZ300esyMRvNrJFn2mf0lzwnI/y2Qp4icInKkGdh6aYUQvoi+i55FpEdlX3b1j74ibL3m8kHl523tzQIiw29FMWmAO9FH0bmIdKnsLgpTdqX2xiS1S1FMUsQett6qTkn/b1GYMngSbU6TQGTrIZi9bjIjeSl+WIbwXDLKuuwheyx5E3Wi9TChYxuBaFAAXPmalaXZVzP7V/RJtFiXq32uvmv4zDIvz3Av/iUb2MMWtFC7TsGuQljiS80vWqNAQgjMGuHu1F88P2/cr939XvRDdCuKSYovoj7JRu9tUJh6Qaz4U+zk/s6TPWxBQ3tOB2d54xONATWByAFm7bLQXmiwi6LdrGYdItXLg2YyhPBq0Zme/UG67/vWSEU6jLnoZ8OMvcUeGvRoApHWs6hLzNxt15gqNfi9dAonnahCYsd0IZ2fsTYjk+6tmz1ZfCKk5n4ZA6JusZPJUOGU2DOS+jAw636lncwR2Wr5rRTGa7KXfRAkqSnC5cSIY8PNLqVvUWJOsfWgdII0+DVlTzIn3uzI9v1WFQ6FrnXTVbqyFZFyDdbOdL3mlx+kyjKCWO9q7pxKX3iPVYZaQM7TKoh6O0eE3orATxEbG9rLluxpMnrPOIzEWqUWkLSokk4ZzsQZybUkuaqoCGVEm9pS0nshcCKPHqeNjtoXWp8NAawWkHLmJp3CSEjvnO64bp4q6BUUdeQWx+lcMJ19zJQ+0h5udrPAiROFFuyfVJnIg5WD8Aav2lY8Ar2+LEZ1i25UC18KH5GIGhHx1aZymxURrUU2tXWPuz919fVSsjSboZdUfXvusFL44isfs94AiLungbJCYwazZFWoD5vaxeFlR6nqeJK+C/x7SpE28bguknUf1KfyEZ0BEJii0nj5lpdoPLUGGNOW7mjUGn1KHwYg0G8C0SB9uFkBmpEirHT7faSxq48s+XbRGr0JJCvGqHhqxFMmVX97nm8acdwfMW9ko0CEXFEhHqmXZuY11epcfD59VaRUS8dbaC/JElWz3vVC1NUp5RPfK1QHNAokaXoMY4bD98AgMu5eXQ41OJ+uqftILp04y57lssGNObdSIZ24L/LYMKMvVFq0EYgGeOFrsBtQBngjty5+pSNEaABYfWOSg8hWEVha2dd4pMMY8X3jCcnkrXkjEIzyNWjBypPiRgOtHDEzAa4+pswMwFIL/G35GEL4LIo/FJCJ+uRvvOorPf7I3FgCYObGl+mtTTyTQOjvZ66wdpbhGE5Vb2TXEyV1xi31u1haSiGBD2ql9EtdimCbCQSn410UZ4l0NHbkbMxmAcGCCw1lQVwSW2CqPVPop2py8KscfJcYKRcIbLHsIgO80knakbM5mw0EMw3DLTDXWY8TpnjpOfVPyETX2OsIEHK8ujyeSamTzym3AoJB2XfKggZgkEmPPyLdNURNpz54DwgEy++xNOp6sLENbQ0E4xonj6t5hGEGmLQHUntWLhD0YQ/1+ivbPWtWZScgWI4DhowHhhkHwOTpklTjxkZXh0DHMYs2bbdnZyAMp/1fIRHvRrOMg6qOp6xzU2rsAwI7ewHBQMMBwFQzjV5HAoHsoCCwvTcQjACm3y0wzHgBxitGaqZcIOCxLxJDOX1V7J0OAgQv8nH5UgDSj+wljiO2DOI8NlI2eCEm9m75wYAwvGb3QpsmXWciIhcYQVCS/NwiTzUzrh3VC9H2fA4KBF8Ao/LehGjltzgk8VTwfpm6dkhtu3RwIAwvMFwEF8lvOD0tJOON3zMOVTkKEJyTwxzDpdP8bYSH+OB0NCB4KjBcSVhGF6rHT2f4x6CjAsFhAWBjpwMAxpHo6ECO5PfA7AnIYEr+MOMUkT8cgMHw/wEAAP//YUsM3AAAAAZJREFUAwDrShCD9GJligAAAABJRU5ErkJggg==";
  let firstHalfCompletionObserver = null;

  function selectedFinanceMonth() {
    try {
      const value = typeof globalThis.selectedMonth === "function" ? globalThis.selectedMonth() : "";
      if (/^\d{4}-\d{2}$/.test(String(value || ""))) return String(value);
    } catch (error) {}
    const picker = document.getElementById("monthPicker")?.value;
    if (/^\d{4}-\d{2}$/.test(String(picker || ""))) return String(picker);
    const shortValue = document.getElementById("monthDisplayShort")?.textContent?.trim();
    return /^\d{4}-\d{2}$/.test(String(shortValue || "")) ? String(shortValue) : "";
  }

  function manilaTodayKey() {
    const override = String(globalThis.FINANCE_FIRST_HALF_TODAY_OVERRIDE || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Manila", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
      const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    } catch (error) {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    }
  }

  function firstHalfFinished(month = selectedFinanceMonth()) {
    if (!/^\d{4}-\d{2}$/.test(month)) return false;
    const today = manilaTodayKey();
    const currentMonth = today.slice(0, 7);
    if (month < currentMonth) return true;
    if (month > currentMonth) return false;
    return Number(today.slice(8, 10)) > 15;
  }

  function moneyTextValue(text) {
    const parsed = Number(String(text || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function firstHalfCompletionIconSource() {
    return document.documentElement.dataset.theme === "dark" ? FIRST_HALF_COMPLETE_DARK_ICON : FIRST_HALF_COMPLETE_LIGHT_ICON;
  }

  function ensureFirstHalfCompletionStyles() {
    if (document.getElementById("firstHalfCompletionIconStyles")) return;
    const style = document.createElement("style");
    style.id = "firstHalfCompletionIconStyles";
    style.textContent = `.first-half-complete-value{display:inline-flex!important;align-items:center;justify-content:center;min-width:34px;line-height:1}.first-half-complete-icon{display:block;width:32px;height:32px;object-fit:contain;flex:0 0 auto}@media(max-width:700px){.first-half-complete-icon{width:30px;height:30px}}`;
    document.head.appendChild(style);
  }

  function renderFirstHalfCompleteIcon(value) {
    if (!value) return;
    const existing = value.querySelector("img[data-first-half-complete-icon]");
    if (!existing) {
      value.dataset.firstHalfOriginalText = value.textContent || "";
      value.textContent = "";
      const icon = document.createElement("img");
      icon.className = "first-half-complete-icon";
      icon.dataset.firstHalfCompleteIcon = "true";
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      value.appendChild(icon);
    }
    const icon = value.querySelector("img[data-first-half-complete-icon]");
    const dark = document.documentElement.dataset.theme === "dark";
    if (icon && icon.dataset.themeVariant !== (dark ? "dark" : "light")) {
      icon.src = firstHalfCompletionIconSource();
      icon.dataset.themeVariant = dark ? "dark" : "light";
    }
    value.classList.add("first-half-complete-value");
    value.setAttribute("aria-label", "First half completed");
    value.title = "First half completed";
  }

  function restoreFirstHalfAmount(value) {
    if (!value) return;
    const icon = value.querySelector("img[data-first-half-complete-icon]");
    if (icon) value.textContent = value.dataset.firstHalfOriginalText || "";
    delete value.dataset.firstHalfOriginalText;
    value.classList.remove("first-half-complete-value");
    value.removeAttribute("aria-label");
    if (value.title === "First half completed") value.removeAttribute("title");
  }

  function renderOtherExpensesCompleteIcon(value) {
    if (!value) return;
    const existing = value.querySelector("img[data-other-expenses-complete-icon]");
    if (!existing) {
      value.dataset.otherExpensesOriginalText = value.textContent || "";
      value.textContent = "";
      const icon = document.createElement("img");
      icon.className = "first-half-complete-icon";
      icon.dataset.otherExpensesCompleteIcon = "true";
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      value.appendChild(icon);
    }
    const icon = value.querySelector("img[data-other-expenses-complete-icon]");
    const dark = document.documentElement.dataset.theme === "dark";
    if (icon && icon.dataset.themeVariant !== (dark ? "dark" : "light")) {
      icon.src = firstHalfCompletionIconSource();
      icon.dataset.themeVariant = dark ? "dark" : "light";
    }
    value.classList.add("first-half-complete-value");
    value.setAttribute("aria-label", "No other expenses");
    value.title = "No other expenses";
  }

  function restoreOtherExpensesAmount(value) {
    if (!value) return;
    const icon = value.querySelector("img[data-other-expenses-complete-icon]");
    if (icon) value.textContent = value.dataset.otherExpensesOriginalText || "";
    delete value.dataset.otherExpensesOriginalText;
    value.classList.remove("first-half-complete-value");
    value.removeAttribute("aria-label");
    if (value.title === "No other expenses") value.removeAttribute("title");
  }

  function updateFirstHalfCompletionIcons() {
    ensureFirstHalfCompletionStyles();
    const month = selectedFinanceMonth();
    const finished = firstHalfFinished(month);
    const firstHalfValue = document.getElementById("legendEarlyTotal");
    const firstDifferenceValue = document.querySelector("#moneySummary > .summary-item:nth-child(2) .summary-card-value");
    const otherExpensesValue = document.getElementById("legendOtherTotal");

    const currentOtherAmount = otherExpensesValue?.querySelector("img[data-other-expenses-complete-icon]")
      ? moneyTextValue(otherExpensesValue.dataset.otherExpensesOriginalText)
      : moneyTextValue(otherExpensesValue?.textContent);
    if (currentOtherAmount === 0) renderOtherExpensesCompleteIcon(otherExpensesValue);
    else restoreOtherExpensesAmount(otherExpensesValue);

    if (!finished) {
      restoreFirstHalfAmount(firstHalfValue);
      restoreFirstHalfAmount(firstDifferenceValue);
      return;
    }

    const currentFirstHalfAmount = firstHalfValue?.querySelector("img[data-first-half-complete-icon]")
      ? moneyTextValue(firstHalfValue.dataset.firstHalfOriginalText)
      : moneyTextValue(firstHalfValue?.textContent);
    if (currentFirstHalfAmount === 0) renderFirstHalfCompleteIcon(firstHalfValue);
    else restoreFirstHalfAmount(firstHalfValue);
    renderFirstHalfCompleteIcon(firstDifferenceValue);
  }

  function setupFirstHalfCompletionIcons() {
    ensureFirstHalfCompletionStyles();
    updateFirstHalfCompletionIcons();
    const moneyPage = document.getElementById("money");
    if (moneyPage && !firstHalfCompletionObserver) {
      let scheduled = false;
      firstHalfCompletionObserver = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          updateFirstHalfCompletionIcons();
        });
      });
      firstHalfCompletionObserver.observe(moneyPage, { childList:true, subtree:true, characterData:true });
    }
    if (document.documentElement.dataset.firstHalfThemeObserverReady !== "true") {
      document.documentElement.dataset.firstHalfThemeObserverReady = "true";
      new MutationObserver(updateFirstHalfCompletionIcons).observe(document.documentElement, { attributes:true, attributeFilter:["data-theme"] });
    }
    if (document.documentElement.dataset.firstHalfEventsReady !== "true") {
      document.documentElement.dataset.firstHalfEventsReady = "true";
      window.addEventListener("finance:page-changed", updateFirstHalfCompletionIcons);
      document.addEventListener("change", event => {
        if (event.target?.id === "monthPicker") updateFirstHalfCompletionIcons();
      });
    }
  }

  function setupInteractionPatterns() {
    setupOverflowMenus();
    setupEmptyStateActions();
    setupFirstHalfCompletionIcons();
  }

  window.FinanceInteractionPatterns = { closeOverflowMenu, setupOverflowMenus, renderDuplicatedMarquee, renderActiveFilterChips, emptyStateHtml, renderIncomeFilterChips, setupEmptyStateActions, middleTruncateFilename, createDashboardDragController, updateFirstHalfCompletionIcons, firstHalfFinished };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupInteractionPatterns, { once:true });
  else setupInteractionPatterns();
})();