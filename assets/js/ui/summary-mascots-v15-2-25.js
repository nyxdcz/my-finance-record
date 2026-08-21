(() => {
  const root = window;
  const DESKTOP_QUERY = "(min-width: 851px)";
  const media = window.matchMedia(DESKTOP_QUERY);
  const ASSETS = Object.freeze({
    red:"./assets/mascots/mascot-red.svg",
    green:"./assets/mascots/mascot-green.svg",
    blue:"./assets/mascots/mascot-blue.svg",
    orange:"./assets/mascots/mascot-orange.svg"
  });

  let queued = false;

  function numericAmount(value) {
    const text = String(value || "").replace(/,/g, "").trim();
    if (!text) return NaN;
    const negative = /^\(.*\)$/.test(text) || /(^|\s)-/.test(text);
    const number = Number(text.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(number)) return NaN;
    return negative ? -number : number;
  }

  function mascot(color) {
    const img = document.createElement("img");
    img.className = "summary-mascot-image";
    img.src = ASSETS[color];
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.decoding = "async";
    img.loading = "eager";
    return img;
  }

  function clearMascotState(element) {
    if (!element) return;
    delete element.dataset.summaryMascotActive;
    delete element.dataset.summaryMascotValue;
    delete element.dataset.summaryMascotColor;
    element.classList.remove("summary-mascot-slot");
    element.removeAttribute("aria-label");
    element.removeAttribute("title");
    element.closest(".summary-card")?.classList.remove("has-summary-mascot");
    element.closest(".collapse-actions")?.classList.remove("has-period-mascot");
  }

  function restoreSlot(element) {
    if (!element || element.dataset.summaryMascotActive !== "true") return;
    const value = element.dataset.summaryMascotValue || "";
    element.textContent = value;
    clearMascotState(element);
  }

  function useMascot(element, { color, accessibleLabel, cardClass = true, periodClass = false }) {
    if (!element) return;
    if (element.dataset.summaryMascotActive === "true" && element.querySelector(".summary-mascot-image")) {
      if (element.dataset.summaryMascotColor !== color) {
        element.replaceChildren(mascot(color));
        element.dataset.summaryMascotColor = color;
      }
      return;
    }
    const value = element.textContent.trim();
    element.dataset.summaryMascotValue = value;
    element.dataset.summaryMascotActive = "true";
    element.dataset.summaryMascotColor = color;
    element.classList.add("summary-mascot-slot");
    element.setAttribute("aria-label", `${accessibleLabel}: ${value}`);
    element.setAttribute("title", `${accessibleLabel}: ${value}`);
    element.replaceChildren(mascot(color));
    if (cardClass) element.closest(".summary-card")?.classList.add("has-summary-mascot");
    if (periodClass) element.closest(".collapse-actions")?.classList.add("has-period-mascot");
  }

  function zeroTotal(id, color, label, { period = false } = {}) {
    const element = document.getElementById(id);
    if (!element) return;
    const active = element.dataset.summaryMascotActive === "true";
    const hasImage = Boolean(element.querySelector(".summary-mascot-image"));
    if (active && hasImage) return;
    if (active && !hasImage) clearMascotState(element);

    const amount = numericAmount(element.textContent);
    if (Number.isFinite(amount) && Math.abs(amount) < 0.005) {
      useMascot(element, { color, accessibleLabel:label, cardClass:!period, periodClass:period });
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
      if (value.dataset.summaryMascotActive === "true" && value.querySelector(".summary-mascot-image")) continue;
      const isRed = card.classList.contains("summary-card-danger") || value.classList.contains("text-danger") || value.classList.contains("text-red");
      useMascot(value, { color:isRed ? "red" : "green", accessibleLabel:label, cardClass:true });
    }
  }

  function restoreAll() {
    document.querySelectorAll("#money [data-summary-mascot-active='true']").forEach(restoreSlot);
  }

  function refresh() {
    queued = false;
    if (!media.matches) {
      restoreAll();
      return;
    }

    /* Top Budget & Expenses summary cards: replace only zero period totals. */
    zeroTotal("legendEarlyTotal", "red", "First half of the month");
    zeroTotal("legendLateTotal", "orange", "Second half of the month");
    zeroTotal("legendOtherTotal", "blue", "Other expenses");

    /* Difference cards always use the mascot that matches their current green/red state. */
    differenceCards();

    /* Lower period headers: mascot replaces only a zero amount, before the 20×20 collapse control. */
    zeroTotal("earlyTotal", "red", "First half of the month", { period:true });
    zeroTotal("lateTotal", "orange", "Second half of the month", { period:true });
    zeroTotal("otherTotal", "blue", "Other expenses", { period:true });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  function start() {
    refresh();
    const money = document.getElementById("money") || document.body;
    new MutationObserver(schedule).observe(money, { childList:true, subtree:true, characterData:true });
    media.addEventListener?.("change", schedule);
    window.addEventListener("pageshow", schedule);
  }

  root.FinanceSummaryMascots = Object.freeze({ refresh:schedule, assets:ASSETS });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
