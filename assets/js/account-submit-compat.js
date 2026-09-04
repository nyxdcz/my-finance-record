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
 *
 * Payment compatibility also reconciles a narrow legacy case: FinanceIntegrity
 * can classify a stale reconciliation ledgerEntryId as safe-repairable when one
 * unambiguous matching ledger entry exists. The account transaction invariant is
 * intentionally strict and otherwise blocks every later money mutation. Before a
 * manual payment, repair that deterministic history link through the ledger-owned
 * safe-repair transaction, then retry the payment against the verified state.
 */
(function installAccountSubmitCompat(root) {
  if (!root?.document || root.FinanceAccountSubmitCompat?.installed) return;

  let lastPaymentFailure = null;

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

  function currentFinanceData() {
    try { return typeof data !== "undefined" ? data : null; } catch (error) { return null; }
  }

  function safelyRepairPaymentHistory(transactions) {
    const source = currentFinanceData();
    const integrity = root.FinanceIntegrity;
    if (!source || !integrity?.scan || typeof transactions?.repairSafeIntegrity !== "function") return { attempted:false, ok:true };

    let report = null;
    try { report = integrity.scan(source, { includeStorage:false }); }
    catch (error) { return { attempted:false, ok:true }; }

    if (Number(report?.counts?.critical || 0) > 0) return { attempted:false, ok:true, report };
    const needsReconciliationLinkRepair = (report?.issues || []).some(item => item?.severity === "safe-repair" && item?.code === "reconciliation-link-missing");
    if (!needsReconciliationLinkRepair) return { attempted:false, ok:true, report };

    const result = transactions.repairSafeIntegrity({ message:"Finance history repaired safely" });
    return { attempted:true, ok:Boolean(result?.ok), result, report:result?.report || report };
  }

  function friendlyPaymentFailure(result) {
    const reason = String(result?.reason || "").trim();
    if (reason && reason.includes(" ")) return reason;
    if (reason === "read-only") return "This Viewer profile is read-only. The payment was not recorded.";
    if (reason === "insufficient") return "The selected payment account does not have enough balance. Nothing was changed.";
    if (reason === "missing-account") return "The selected payment account no longer exists. Choose another account.";
    if (reason === "empty") return "This expense is no longer available to mark as paid.";
    if (reason === "critical-issues") return "Finance history has a critical integrity issue. The payment was not recorded.";
    if (reason === "integrity-service-unavailable") return "Finance integrity protection is still loading. Reload Talaan before recording this payment.";
    return "The payment was rolled back by finance safety checks. No balances were changed.";
  }

  function installPaymentCompatibility() {
    const transactions = root.FinanceLedgerTransactions;
    if (!transactions?.payExpenses) return false;
    if (transactions.capabilities?.paymentCompatibilityRepair) return true;

    const wrapped = Object.freeze({
      ...transactions,
      capabilities:Object.freeze({ ...(transactions.capabilities || {}), paymentCompatibilityRepair:true, paymentFailureReason:true }),
      payExpenses(items, account, options = {}) {
        const repair = safelyRepairPaymentHistory(transactions);
        if (repair.attempted && !repair.ok) {
          lastPaymentFailure = { ok:false, reason:repair.result?.reason || "critical-issues" };
          return lastPaymentFailure;
        }
        const result = transactions.payExpenses(items, account, options);
        lastPaymentFailure = result?.ok ? null : result;
        return result;
      }
    });
    root.FinanceLedgerTransactions = wrapped;
    return true;
  }

  function installToastCompatibility() {
    if (root.showToast?.__accountPaymentFailureCompat === true) return true;
    if (typeof root.showToast !== "function") return false;
    const originalShowToast = root.showToast;
    const wrappedShowToast = function accountCompatToast(message, tone, ...args) {
      let nextMessage = message;
      if (String(message || "") === "Payment could not be completed" && lastPaymentFailure) {
        nextMessage = friendlyPaymentFailure(lastPaymentFailure);
        lastPaymentFailure = null;
      }
      return originalShowToast.call(this, nextMessage, tone, ...args);
    };
    Object.defineProperty(wrappedShowToast, "__accountPaymentFailureCompat", { value:true });
    root.showToast = wrappedShowToast;
    return true;
  }

  function ensureCompatibilityReady() {
    const paymentReady = installPaymentCompatibility();
    const toastReady = installToastCompatibility();
    if (paymentReady && toastReady) return;

    let attempts = 0;
    const retry = () => {
      attempts += 1;
      const paymentInstalled = installPaymentCompatibility();
      const toastInstalled = installToastCompatibility();
      if (paymentInstalled && toastInstalled) return;
      if (attempts < 100) root.setTimeout(retry, 50);
    };
    root.setTimeout(retry, 0);
  }

  root.document.addEventListener("submit", guardLedgerBackedAccountSubmit, true);
  root.document.addEventListener("click", submitCorrectionFromPrimaryAction, true);
  root.addEventListener?.("load", ensureCompatibilityReady, { once:true });
  ensureCompatibilityReady();
  root.FinanceAccountSubmitCompat = Object.freeze({
    installed:true,
    ledgerGuard:true,
    paymentCompatibilityRepair:true,
    paymentFailureReason:true,
    deferredInitialization:true
  });
})(typeof window !== "undefined" ? window : globalThis);
