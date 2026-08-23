"use strict";

(function installCompactExpenseCardEnhancements(root) {
  const PERIOD_SELECTOR = "#money .period-card[data-collapse-key]";
  const ROW_SELECTOR = "#money .record-row[data-expense-row]";
  const REPEAT_SELECTOR = "#money [data-toggle-saved], #paidExpenseList .desktop-record-actions [data-toggle-saved]";
  let refreshQueued = false;

  function moveDueWarningInline(row) {
    if (!row) return false;
    const statuses = row.querySelector(".expense-record-title .record-statuses");
    const dueCell = row.querySelector(":scope > .due-cell");
    if (!statuses || !dueCell) return false;

    const warning = dueCell.querySelector(".due-warning");
    if (!warning) return false;

    warning.classList.add("expense-inline-due-warning");
    const unpaid = statuses.querySelector(".status-unpaid");
    if (unpaid?.nextSibling) statuses.insertBefore(warning, unpaid.nextSibling);
    else if (unpaid) unpaid.insertAdjacentElement("afterend", warning);
    else statuses.prepend(warning);
    return true;
  }

  function refresh(scope = document) {
    const rows = scope.matches?.(ROW_SELECTOR) ? [scope] : [...scope.querySelectorAll?.(ROW_SELECTOR) || []];
    rows.forEach(moveDueWarningInline);
    return rows.length;
  }

  function queueRefresh(scope = document) {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      refresh(scope);
    });
  }

  function prefersReducedMotion() {
    return root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }

  function animateRepeatMonthly(button) {
    if (!button?.isConnected || prefersReducedMotion()) return false;
    const icon = button.querySelector(".saved-icon-container");
    if (!icon || typeof icon.animate !== "function") return false;

    icon.getAnimations().forEach(animation => animation.cancel());
    icon.animate([
      { transform:"scale(1)", offset:0 },
      { transform:"scale(0.82)", offset:0.24 },
      { transform:"scale(1.12)", offset:0.56 },
      { transform:"scale(0.97)", offset:0.78 },
      { transform:"scale(1)", offset:1 }
    ], {
      duration:340,
      easing:"cubic-bezier(0.22, 1, 0.36, 1)"
    });
    return true;
  }

  function findRepeatButton(key, fallback) {
    if (key) {
      const match = [...document.querySelectorAll(REPEAT_SELECTOR)].find(button => button.dataset.toggleSaved === key);
      if (match) return match;
    }
    return fallback?.isConnected ? fallback : null;
  }

  function ensureCollapseChanged(button, previousExpanded) {
    if (!button?.isConnected) return;
    if (button.getAttribute("aria-expanded") !== previousExpanded) return;

    const key = button.dataset.collapseToggle;
    const section = button.closest(PERIOD_SELECTOR);
    if (!key || !section) return;

    if (typeof root.toggleCollapsibleSection === "function") {
      root.toggleCollapsibleSection(key);
      return;
    }

    const shouldCollapse = previousExpanded !== "false";
    section.classList.toggle("is-collapsed", shouldCollapse);
    button.setAttribute("aria-expanded", shouldCollapse ? "false" : "true");
    const icon = button.querySelector(".collapse-icon");
    if (icon) icon.style.transform = shouldCollapse ? "rotate(-90deg)" : "";
  }

  document.addEventListener("click", event => {
    const repeatButton = event.target.closest?.(REPEAT_SELECTOR);
    if (repeatButton) {
      const repeatKey = repeatButton.dataset.toggleSaved || "";
      requestAnimationFrame(() => animateRepeatMonthly(findRepeatButton(repeatKey, repeatButton)));
    }

    const button = event.target.closest?.(`${PERIOD_SELECTOR} [data-collapse-toggle]`);
    if (!button) return;
    const previousExpanded = button.getAttribute("aria-expanded");
    setTimeout(() => ensureCollapseChanged(button, previousExpanded), 0);
  }, true);

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type !== "childList") continue;
      if (record.target.closest?.("#money") || [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && (node.matches?.("#money, #money *") || node.querySelector?.("#money")))) {
        queueRefresh(document);
        break;
      }
    }
  });

  function start() {
    refresh(document);
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

  root.FinanceExpenseCompact = Object.freeze({ refresh, moveDueWarningInline, animateRepeatMonthly });
})(typeof window !== "undefined" ? window : globalThis);
