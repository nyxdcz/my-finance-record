(() => {
  const root = window;
  const DESKTOP_QUERY = "(min-width: 851px)";
  const media = window.matchMedia(DESKTOP_QUERY);
  const ASSETS = Object.freeze({
    red:"./assets/mascots/mascot-red.png?v=2.0.1-talaan5",
    green:"./assets/mascots/mascot-green.png?v=2.0.1-talaan5",
    blue:"./assets/mascots/mascot-blue.png?v=2.0.1-talaan5",
    orange:"./assets/mascots/mascot-orange.png?v=2.0.1-talaan5"
  });

  let queued = false;

  function storedAmountText(element) {
    if (!element) return "";
    return element.dataset.firstHalfOriginalText
      || element.dataset.otherExpensesOriginalText
      || element.textContent?.trim()
      || "";
  }

  function numericAmount(value) {
    const text = String(value || "").replace(/,/g, "").trim();
    if (!text) return NaN;
    const negative = /^\(.*\)$/.test(text) || /(^|\s)-/.test(text);
    const number = Number(text.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(number)) return NaN;
    return negative ? -number : number;
  }

  function clearMascot(element) {
    if (!element) return;
    const legacyAmount = storedAmountText(element);
    const hasLegacyCompletion = Boolean(element.querySelector("img[data-first-half-complete-icon], img[data-other-expenses-complete-icon]"));
    element.classList.remove("summary-mascot-slot");
    delete element.dataset.summaryMascot;
    if (hasLegacyCompletion && legacyAmount) {
      element.setAttribute("aria-label", legacyAmount);
      element.title = legacyAmount;
    } else {
      element.removeAttribute("aria-label");
      element.removeAttribute("title");
    }
    element.closest(".summary-card")?.classList.remove("has-summary-mascot");
    element.closest(".collapse-actions")?.classList.remove("has-period-mascot");
  }

  function useMascot(element, { color, accessibleLabel, cardClass = true, periodClass = false }) {
    if (!element) return;
    const value = storedAmountText(element);
    const nextLabel = `${accessibleLabel}: ${value}`;
    if (!element.classList.contains("summary-mascot-slot")) element.classList.add("summary-mascot-slot");
    if (element.dataset.summaryMascot !== color) element.dataset.summaryMascot = color;
    if (element.getAttribute("aria-label") !== nextLabel) element.setAttribute("aria-label", nextLabel);
    if (element.getAttribute("title") !== nextLabel) element.setAttribute("title", nextLabel);
    if (cardClass) element.closest(".summary-card")?.classList.add("has-summary-mascot");
    if (periodClass) element.closest(".collapse-actions")?.classList.add("has-period-mascot");
  }

  function zeroTotal(id, color, label, { period = false } = {}) {
    const element = document.getElementById(id);
    if (!element) return;
    const amount = numericAmount(storedAmountText(element));
    if (Number.isFinite(amount) && Math.abs(amount) < 0.005) {
      useMascot(element, { color, accessibleLabel:label, cardClass:!period, periodClass:period });
    } else {
      clearMascot(element);
    }
  }

  function differenceCards() {
    const cards = document.querySelectorAll("#moneySummary .summary-card");
    for (const card of cards) {
      const label = card.querySelector(".summary-label-desktop")?.textContent?.trim()
        || card.querySelector(".summary-card-label")?.textContent?.trim()
        || "";
      if (label !== "First-half difference" && label !== "Second-half difference") continue;
      const value = card.querySelector(".summary-card-value");
      if (!value) continue;
      const isRed = card.classList.contains("summary-card-danger") || value.classList.contains("text-danger") || value.classList.contains("text-red");
      useMascot(value, { color:isRed ? "red" : "green", accessibleLabel:label, cardClass:true });
    }
  }

  function clearAll() {
    document.querySelectorAll("#money .summary-mascot-slot").forEach(clearMascot);
  }

  function apply() {
    queued = false;
    if (!media.matches) {
      clearAll();
      return;
    }

    zeroTotal("legendEarlyTotal", "red", "First half of the month");
    zeroTotal("legendLateTotal", "orange", "Second half of the month");
    zeroTotal("legendOtherTotal", "blue", "Other expenses");

    differenceCards();

    zeroTotal("earlyTotal", "red", "First half of the month", { period:true });
    zeroTotal("lateTotal", "orange", "Second half of the month", { period:true });
    zeroTotal("otherTotal", "blue", "Other expenses", { period:true });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function start() {
    apply();
    const money = document.getElementById("money") || document.body;
    new MutationObserver(schedule).observe(money, {
      childList:true,
      subtree:true,
      characterData:true,
      attributes:true,
      attributeFilter:["class"]
    });
    media.addEventListener?.("change", schedule);
    window.addEventListener("pageshow", schedule);
  }

  root.FinanceSummaryMascots = Object.freeze({ refresh:schedule, apply, assets:ASSETS });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
