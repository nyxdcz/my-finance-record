"use strict";

/*
 * Account correction submit compatibility and ledger-ownership guard.
 *
 * iOS Safari / installed PWAs can be unreliable when a button changes between
 * type="button" and type="submit" while the account dialog switches between
 * Record spending and Correct account balance. Intercept the correction-mode
 * tap and dispatch the form submit event explicitly so the ledger-aware
 * account handler always runs. Ledger-backed profiles are also blocked from
 * falling through to the legacy direct-balance handler if the ledger owner is
 * stale or unavailable.
 */
(function installAccountSubmitCompat(root) {
  if (!root?.document || root.FinanceAccountSubmitCompat?.installed) return;

  function activeLedgerVersion() {
    try {
      const stored = JSON.parse(root.localStorage?.getItem("simple-finance-project-records-v2") || "{}");
      return Number(stored?.ledgerSettings?.version || 0);
    } catch (error) { return 0; }
  }

  function ledgerOwnerReady() {
    return Boolean(root.FinanceAccountLedger?.capabilities?.accountReconciliationOwner);
  }

  function guardLedgerBackedAccountSubmit(event) {
    if (!["accountForm", "accountsForm"].includes(event.target?.id)) return;
    if (!activeLedgerVersion() || ledgerOwnerReady()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof root.showToast === "function") root.showToast("Account ledger is updating. Reload Talaan before changing account balances.", "warning");
    else console.warn("Account ledger owner is unavailable; balance edit blocked.");
  }

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

  root.document.addEventListener("submit", guardLedgerBackedAccountSubmit, true);
  root.document.addEventListener("click", submitCorrectionFromPrimaryAction, true);
  root.FinanceAccountSubmitCompat = Object.freeze({ installed:true, ledgerGuard:true });
})(typeof window !== "undefined" ? window : globalThis);
