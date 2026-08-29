"use strict";
/* global data */

(function installPaidCalendarSortCompat(root) {
  const CALENDAR_SELECTOR = "#transactionCalendar-paid";
  const SORT_SELECTOR = "#transactionToolbar-paid [data-transaction-sort]";
  let refreshQueued = false;

  function paidExpenses() {
    try {
      if (typeof data !== "undefined" && Array.isArray(data?.expenses)) return data.expenses.filter(item => item?.paid);
    } catch (error) {}
    return Array.isArray(root.data?.expenses) ? root.data.expenses.filter(item => item?.paid) : [];
  }

  function dateForDay(day, byId) {
    const trigger = day.querySelector("[data-transaction-open]");
    const item = trigger ? byId.get(String(trigger.dataset.transactionOpen || "")) : null;
    return String(item?.paidDate || item?.date || "");
  }

  function amountFromEntry(entry) {
    const raw = entry.querySelector("strong")?.textContent || "";
    const numeric = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function reorder(container, nodes) {
    const current = [...container.children];
    if (current.length === nodes.length && current.every((node, index) => node === nodes[index])) return false;
    nodes.forEach(node => container.append(node));
    return true;
  }

  function sortEntriesWithinDay(day, mode) {
    if (!mode.startsWith("amount") && mode !== "name") return false;
    const heading = day.querySelector(":scope > h4");
    const entries = [...day.querySelectorAll(":scope > .transaction-calendar-entry")];
    const sorted = [...entries].sort((a, b) => {
      if (mode === "name") return String(a.querySelector("span")?.textContent || "").localeCompare(String(b.querySelector("span")?.textContent || ""));
      const delta = amountFromEntry(a) - amountFromEntry(b);
      return mode === "amount-low" ? delta : -delta;
    });
    return reorder(day, [heading, ...sorted].filter(Boolean));
  }

  function applySort() {
    const calendar = document.querySelector(CALENDAR_SELECTOR);
    const sortControl = document.querySelector(SORT_SELECTOR);
    if (!calendar || !sortControl) return false;

    const mode = sortControl.value || "default";
    const days = [...calendar.querySelectorAll(":scope > .transaction-calendar-day")];
    if (!days.length) return false;

    if (mode === "oldest" || mode === "newest") {
      const byId = new Map(paidExpenses().map(item => [String(item.id), item]));
      const direction = mode === "oldest" ? 1 : -1;
      const sortedDays = [...days].sort((a, b) => {
        const aDate = dateForDay(a, byId);
        const bDate = dateForDay(b, byId);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return direction * aDate.localeCompare(bDate);
      });
      return reorder(calendar, sortedDays);
    }

    let changed = false;
    days.forEach(day => { changed = sortEntriesWithinDay(day, mode) || changed; });
    return changed;
  }

  function queueApply() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      applySort();
    });
  }

  document.addEventListener("change", event => {
    if (!event.target?.matches?.(SORT_SELECTOR)) return;
    queueApply();
  });

  const observer = new MutationObserver(records => {
    if (records.some(record => record.target?.closest?.(CALENDAR_SELECTOR) || [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE && (node.matches?.(CALENDAR_SELECTOR) || node.querySelector?.(CALENDAR_SELECTOR))))) queueApply();
  });

  function start() {
    observer.observe(document.documentElement, { childList:true, subtree:true });
    queueApply();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

  root.FinancePaidCalendarSort = Object.freeze({ applySort, queueApply });
})(typeof window !== "undefined" ? window : globalThis);
