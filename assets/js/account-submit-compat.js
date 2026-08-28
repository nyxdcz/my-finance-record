"use strict";

/*
 * Account correction submit compatibility.
 *
 * iOS Safari / installed PWAs can be unreliable when a button changes between
 * type="button" and type="submit" while the account dialog switches between
 * Record spending and Correct account balance. Intercept the correction-mode
 * tap and dispatch the form submit event explicitly so the ledger-aware
 * account handler always runs. Keyboard/implicit form submission is unchanged.
 */
(function installAccountSubmitCompat(root) {
  if (!root?.document || root.FinanceAccountSubmitCompat?.installed) return;

  function submitCorrectionFromPrimaryAction(event) {
    const primary = event.target?.closest?.("#accountPrimaryAction");
    if (!primary) return;

    const dialog = root.document.getElementById("accountDialog");
    if (!dialog || dialog.dataset.accountMode === "spend") return;

    const form = root.document.getElementById("accountForm");
    if (!form || !form.contains(primary)) return;

    event.preventDefault();
    form.dispatchEvent(new root.Event("submit", { bubbles:true, cancelable:true }));
  }

  root.document.addEventListener("click", submitCorrectionFromPrimaryAction, true);
  root.FinanceAccountSubmitCompat = Object.freeze({ installed:true });
})(typeof window !== "undefined" ? window : globalThis);
