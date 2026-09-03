from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "assets/js/account-ledger.js"
INDEX = ROOT / "index.html"
FINANCE_TEST = ROOT / "tests/finance/validate-finance-ui-source.mjs"
SYNC_TEST = ROOT / "tests/sync/validate-money-mutation-sync.mjs"
BROWSER_TEST = ROOT / "tests/browser/money-mutation-integrity.spec.mjs"


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f"Missing start marker for {label}: {start}")
    b = text.find(end, a)
    if b < 0:
        raise SystemExit(f"Missing end marker for {label}: {end}")
    return text[:a] + replacement + text[b:]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label}; found {count}")
    return text.replace(old, new, 1)


ledger = LEDGER.read_text()
ledger = replace_once(
    ledger,
    '  const originalCloneRecurringIncomeForMonth = cloneRecurringIncomeForMonth;\n',
    '  const originalCloneRecurringIncomeForMonth = cloneRecurringIncomeForMonth;\n  const originalProcessGymMonthEndAutoPayments = typeof processGymMonthEndAutoPayments === "function" ? processGymMonthEndAutoPayments : null;\n',
    "gym auto-pay owner capture",
)

expense_block = r'''  function mutateExpensePayment(items, account, { auto = false, paidDate = localDateKey() } = {}) {
    ensureLedgerShape(data);
    const eligible = (items || []).filter(item => item && !item.paid);
    const total = expensePaymentTotal(eligible);
    if (!eligible.length || total <= 0) return { ok:false, reason:"empty", total:0 };
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return { ok:false, reason:"missing-account", total };
    const balance = roundMoney(data.accounts[account]);
    if (balance < total) return { ok:false, reason:"insufficient", total, balance };
    const transactionId = uid();
    const ledgerEntries = eligible.map(item => ({
      id:uid(), transactionId,
      operationId:`expense-payment:${transactionId}:${item.id}`,
      account,
      type:auto ? "gym-auto-payment" : "expense-payment",
      amount:roundMoney(-expensePaymentAmount(item)),
      date:paidDate,
      description:`${auto ? "Gym auto-payment" : "Expense payment"}: ${item.name}`,
      expenseId:item.id,
      source:auto ? "gym-auto-pay" : "expense",
      notes:item.notes || ""
    }));
    const added = appendLedgerEntries(ledgerEntries);
    if (added.length !== eligible.length) return { ok:false, reason:"duplicate-operation", total, balance };
    eligible.forEach(item => {
      const amount = expensePaymentAmount(item);
      if (isDailyBudget(item)) item.amount = amount;
      item.paid = true;
      item.paidDate = paidDate;
      item.paidFromAccount = account;
      item.paidAmount = amount;
      item.accountDeducted = true;
      item.paymentTransactionId = transactionId;
      item.autoPaidAtMonthEnd = Boolean(auto);
      if (isGymExpense(item)) item.gymAutoPaySuppressed = false;
    });
    return { ok:true, total, transactionId, count:eligible.length, account, ledgerEntries:added };
  }

  function mutateExpensePaymentReversal(item) {
    if (!item?.paid) return { ok:true, restored:0 };
    const restored = item.accountDeducted && item.paidFromAccount && Number(item.paidAmount || 0) > 0;
    const amount = restored ? roundMoney(item.paidAmount) : 0;
    let reversalEntry = null;
    if (restored) {
      if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, item.paidFromAccount)) return { ok:false, restored:0, missingAccount:item.paidFromAccount, reason:"missing-account" };
      const original = (data.accountLedger || []).find(entry => entry.transactionId === item.paymentTransactionId && entry.expenseId === item.id && ["expense-payment", "gym-auto-payment"].includes(entry.type));
      const operationId = `expense-payment-reversal:${item.paymentTransactionId || item.id}`;
      const [entry] = appendLedgerEntries([{
        id:uid(), transactionId:uid(), operationId,
        account:item.paidFromAccount, type:"expense-payment-reversal", amount,
        date:localDateKey(), description:`Payment reversal: ${item.name}`,
        expenseId:item.id, reversesEntryId:original?.id || "",
        source:original ? "expense-reversal" : "expense-reversal-legacy"
      }]);
      reversalEntry = entry || ledgerEntryForOperation(operationId);
      if (!reversalEntry) return { ok:false, restored:0, reason:"duplicate-operation" };
    }
    item.paid = false;
    item.paidDate = "";
    item.paidFromAccount = "";
    item.paidAmount = 0;
    item.accountDeducted = false;
    item.paymentTransactionId = "";
    item.autoPaidAtMonthEnd = false;
    if (isGymExpense(item) && expenseMonth(item) < currentMonth) item.gymAutoPaySuppressed = true;
    return { ok:true, restored:amount, reversalEntry };
  }

  applyExpensePayment = function ledgerExpensePayment(items, account, options = {}) {
    if (globalThis.__financeLedgerMutationInternal === true) return mutateExpensePayment(items, account, options);
    return commitExpensePayment(items, account, options);
  };

  restoreExpensePayment = function ledgerExpensePaymentRestore(item, options = {}) {
    if (globalThis.__financeLedgerMutationInternal === true) return mutateExpensePaymentReversal(item);
    return commitExpensePaymentReversal(item, options);
  };

'''
ledger = replace_between(
    ledger,
    '  applyExpensePayment = function ledgerExpensePayment',
    '  cloneRecurringIncomeForMonth = function ledgerRecurringIncomeClone',
    expense_block,
    "expense payment mutation layer",
)

transaction_block = r'''  function moneyMutationCanWrite() {
    const architecture = window.FinanceProfileArchitecture;
    if (!architecture || architecture.canWrite?.() !== false) return true;
    showToast("This Viewer profile is read-only", "warning");
    return false;
  }

  function expectedBalancesMatch(expectedBalances = [], target = data) {
    return expectedBalances.every(item => Object.prototype.hasOwnProperty.call(target.accounts || {}, item.account)
      && roundMoney(target.accounts[item.account]) === roundMoney(item.target));
  }

  function accountStateMatchesRuntime(accounts) {
    const runtimeAccounts = data.accounts && typeof data.accounts === "object" ? data.accounts : {};
    const storedAccounts = accounts && typeof accounts === "object" ? accounts : {};
    const runtimeNames = Object.keys(runtimeAccounts).sort();
    const storedNames = Object.keys(storedAccounts).sort();
    if (runtimeNames.length !== storedNames.length || runtimeNames.some((name, index) => name !== storedNames[index])) return false;
    return runtimeNames.every(name => Number.isFinite(Number(storedAccounts[name]))
      && roundMoney(storedAccounts[name]) === roundMoney(runtimeAccounts[name]));
  }

  function readStoredFinanceState(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(`Could not read finance state from ${storageKey}.`, error);
      return null;
    }
  }

  function restoreUndoSnapshot(undoSnapshot, undoRaw) {
    try { if (typeof undoState !== "undefined") undoState = undoSnapshot ? cloneData(undoSnapshot) : null; } catch (error) {}
    try {
      if (undoRaw == null) localStorage.removeItem(UNDO_KEY);
      else localStorage.setItem(UNDO_KEY, undoRaw);
    } catch (error) {}
  }

  function restoreLedgerTransaction(snapshot, undoSnapshot, undoRaw, message = "Money changes were not saved") {
    data = normalizeData(cloneData(snapshot));
    restoreUndoSnapshot(undoSnapshot, undoRaw);
    try {
      if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("Money transaction rolled back");
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Could not persist the money-transaction rollback; the prior stored copy remains authoritative.", error);
    }
    try { renderAll(false); } catch (error) { console.error("Could not refresh finance state after rollback.", error); }
    showToast(message, "warning");
    return { ok:false, reason:message };
  }

  function accountMutationInvariantReport(expectedBalances = [], target = data) {
    const errors = [];
    const activeAccounts = target?.accounts && typeof target.accounts === "object" ? target.accounts : {};
    const ledgerEntries = Array.isArray(target?.accountLedger) ? target.accountLedger : [];
    const calculated = Object.fromEntries(Object.keys(activeAccounts).map(name => [name, 0]));
    const operationIds = new Set();
    const ledgerById = new Map();

    for (const entry of ledgerEntries) {
      if (!entry || typeof entry !== "object") { errors.push("invalid-ledger-entry"); continue; }
      if (entry.id) ledgerById.set(entry.id, entry);
      if (entry.operationId) {
        if (operationIds.has(entry.operationId)) errors.push(`duplicate-operation:${entry.operationId}`);
        operationIds.add(entry.operationId);
      }
      if (Object.prototype.hasOwnProperty.call(calculated, entry.account)) {
        const amount = Number(entry.amount);
        if (!Number.isFinite(amount)) errors.push(`invalid-ledger-amount:${entry.id || entry.account}`);
        else calculated[entry.account] = roundMoney(calculated[entry.account] + amount);
      }
    }

    for (const [account, balance] of Object.entries(activeAccounts)) {
      if (!Number.isFinite(Number(balance))) errors.push(`invalid-account-balance:${account}`);
      else if (roundMoney(balance) !== roundMoney(calculated[account] || 0)) errors.push(`ledger-balance-mismatch:${account}`);
    }

    for (const item of target?.accountReconciliations || []) {
      if (!item?.ledgerEntryId) continue;
      const entry = ledgerById.get(item.ledgerEntryId);
      if (!entry || entry.account !== item.account || entry.reconciliationId !== item.id) errors.push(`broken-reconciliation:${item.id || item.account}`);
    }

    for (const expected of expectedBalances) {
      if (!Object.prototype.hasOwnProperty.call(activeAccounts, expected.account)
        || roundMoney(activeAccounts[expected.account]) !== roundMoney(expected.target)) errors.push(`expected-balance-mismatch:${expected.account}`);
    }
    return { ok:errors.length === 0, errors };
  }

  function verificationErrors(result, label = "domain") {
    if (result == null || result === true) return [];
    if (result === false) return [`${label}-verification-failed`];
    if (typeof result === "string") return [result];
    if (Array.isArray(result)) return result.filter(Boolean).map(String);
    if (typeof result === "object") {
      if (result.ok === true) return [];
      if (Array.isArray(result.errors)) return result.errors.filter(Boolean).map(String);
    }
    return [`${label}-verification-failed`];
  }

  function moneyMutationInvariantReport(target = data, expectedBalances = [], verify = null, context = null) {
    const base = accountMutationInvariantReport(expectedBalances, target);
    const errors = [...base.errors];
    if (typeof verify === "function") {
      try { errors.push(...verificationErrors(verify(target, context), "money-domain")); }
      catch (error) { errors.push(`money-domain-exception:${error?.message || "unknown"}`); }
    }
    return { ok:errors.length === 0, errors };
  }

  function persistedMoneyStateMatches(target, expectedBalances, verify, context) {
    if (!target || !accountStateMatchesRuntime(target.accounts)) return false;
    return moneyMutationInvariantReport(target, expectedBalances, verify, context).ok;
  }

  function runLedgerTransaction({ undoLabel, message = "Money transaction saved", expectedBalances = [], mutate, verify = null, recordUndo = true, notify = true }) {
    if (!moneyMutationCanWrite()) return { ok:false, reason:"read-only" };
    if (typeof mutate !== "function") return { ok:false, reason:"missing-mutation" };
    const snapshot = cloneData(data);
    const undoSnapshot = typeof undoState !== "undefined" && undoState ? cloneData(undoState) : null;
    const undoRaw = (() => { try { return localStorage.getItem(UNDO_KEY); } catch (error) { return null; } })();
    try {
      if (recordUndo) pushUndo(undoLabel || message || "Money transaction");
      const context = mutate() || {};
      recalculateBalances(data, { stamp:true });
      const beforePersist = moneyMutationInvariantReport(data, expectedBalances, verify, context);
      if (!beforePersist.ok || !expectedBalancesMatch(expectedBalances)) {
        console.error("Money mutation invariants failed before persistence.", beforePersist.errors);
        throw Object.assign(new Error("The money update failed its safety checks."), { userMessage:"The money update failed its safety checks. Nothing was saved." });
      }
      if (context?.changed === false) {
        if (recordUndo) restoreUndoSnapshot(undoSnapshot, undoRaw);
        return { ok:true, skipped:true, context };
      }
      if (typeof persistFinanceDataRaw !== "function") throw new Error("Finance persistence is unavailable.");
      const saved = persistFinanceDataRaw(message);
      if (saved === false) throw Object.assign(new Error("Finance persistence rejected the transaction."), { userMessage:"Money changes were not saved. Check profile permissions and try again." });

      const afterPersist = moneyMutationInvariantReport(data, expectedBalances, verify, context);
      if (!afterPersist.ok || !expectedBalancesMatch(expectedBalances)) {
        console.error("Money mutation invariants failed after persistence.", afterPersist.errors);
        throw Object.assign(new Error("Money state changed during persistence."), { userMessage:"The money state changed during save. The previous value was restored." });
      }

      const localState = readStoredFinanceState(STORAGE_KEY);
      if (!persistedMoneyStateMatches(localState, expectedBalances, verify, context)) {
        throw Object.assign(new Error("Local persistence verification failed."), { userMessage:"The money update could not be verified in local storage." });
      }

      const architecture = window.FinanceProfileArchitecture;
      const profileId = architecture?.activeProfileId?.();
      if (profileId) {
        const profileKey = `simple-finance-profile-data-v1:${profileId}`;
        let profileState = readStoredFinanceState(profileKey);
        if (!persistedMoneyStateMatches(profileState, expectedBalances, verify, context)) {
          let repaired = false;
          try { repaired = architecture?.persistCurrentData?.(data, message) !== false; } catch (error) { console.error("Could not repair profile-scoped money persistence.", error); }
          profileState = readStoredFinanceState(profileKey);
          if (!repaired || !persistedMoneyStateMatches(profileState, expectedBalances, verify, context)) {
            throw Object.assign(new Error("Profile persistence verification failed."), { userMessage:"The money update could not be stored in the active profile." });
          }
        }
      }

      if (notify) showToast(message);
      return { ok:true, context };
    } catch (error) {
      console.error("Money transaction failed.", error);
      return restoreLedgerTransaction(snapshot, undoSnapshot, undoRaw, error?.userMessage || "The money update could not be completed. The previous state was restored.");
    }
  }

  function runAccountMutation({ undoLabel, message, expectedBalances = [], mutate }) {
    return runLedgerTransaction({ undoLabel, message:message || "Account updated", expectedBalances, mutate }).ok;
  }

  function expensePaymentStateErrors(target, context) {
    const errors = [];
    const expenses = Array.isArray(target?.expenses) ? target.expenses : [];
    const ledger = Array.isArray(target?.accountLedger) ? target.accountLedger : [];
    const expectedType = context.auto ? "gym-auto-payment" : "expense-payment";
    const entries = ledger.filter(entry => entry.transactionId === context.transactionId && entry.type === expectedType);
    if (entries.length !== context.itemIds.length) errors.push("expense-payment-entry-count");
    for (const id of context.itemIds) {
      const item = expenses.find(expense => expense.id === id);
      const entry = entries.find(candidate => candidate.expenseId === id);
      const amount = roundMoney(context.itemAmounts[id] || 0);
      if (!item || !item.paid || !item.accountDeducted || item.paymentTransactionId !== context.transactionId || item.paidFromAccount !== context.account || roundMoney(item.paidAmount) !== amount) errors.push(`expense-payment-state:${id}`);
      if (!entry || entry.account !== context.account || roundMoney(entry.amount) !== roundMoney(-amount)) errors.push(`expense-payment-ledger:${id}`);
    }
    if (roundMoney(target?.accounts?.[context.account] || 0) !== roundMoney(context.expectedAfter)) errors.push(`expense-payment-balance:${context.account}`);
    return errors;
  }

  function commitExpensePayment(items, account, { auto = false, paidDate = localDateKey(), undoLabel = "", message = "" } = {}) {
    const ids = (items || []).map(item => item?.id).filter(Boolean);
    const eligible = ids.map(id => (data.expenses || []).find(item => item.id === id)).filter(item => item && !item.paid);
    const total = expensePaymentTotal(eligible);
    if (!eligible.length || total <= 0) return { ok:false, reason:"empty", total:0 };
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return { ok:false, reason:"missing-account", total };
    const before = roundMoney(data.accounts[account]);
    if (before < total) return { ok:false, reason:"insufficient", total, balance:before };
    const expectedAfter = roundMoney(before - total);
    const itemAmounts = Object.fromEntries(eligible.map(item => [item.id, roundMoney(expensePaymentAmount(item))]));
    let mutationResult = null;
    const transaction = runLedgerTransaction({
      undoLabel:undoLabel || (eligible.length === 1 ? `Pay ${eligible[0].name} from ${account}` : `Pay ${eligible.length} expenses from ${account}`),
      message:message || `${money(total)} deducted from ${account}`,
      expectedBalances:[{ account, target:expectedAfter }],
      mutate:() => {
        mutationResult = mutateExpensePayment(eligible, account, { auto, paidDate });
        if (!mutationResult.ok) throw Object.assign(new Error(`Expense payment failed: ${mutationResult.reason || "unknown"}`), { userMessage:"Payment could not be completed. Nothing was changed." });
        return { kind:"expense-payment", auto, account, expectedAfter, itemIds:eligible.map(item => item.id), itemAmounts, transactionId:mutationResult.transactionId };
      },
      verify:expensePaymentStateErrors
    });
    return transaction.ok ? { ...mutationResult, ok:true, before, after:expectedAfter } : { ok:false, reason:transaction.reason || mutationResult?.reason || "transaction-failed", total, balance:before };
  }

  function expenseReversalStateErrors(target, context) {
    const errors = [];
    const item = (target?.expenses || []).find(expense => expense.id === context.itemId);
    if (!item || item.paid || item.accountDeducted || item.paymentTransactionId || item.paidFromAccount || roundMoney(item.paidAmount || 0) !== 0) errors.push(`expense-reversal-state:${context.itemId}`);
    if (context.restored > 0) {
      const reversal = (target?.accountLedger || []).find(entry => entry.operationId === context.operationId && entry.type === "expense-payment-reversal" && entry.expenseId === context.itemId);
      if (!reversal || reversal.account !== context.account || roundMoney(reversal.amount) !== roundMoney(context.restored)) errors.push(`expense-reversal-ledger:${context.itemId}`);
      if (context.originalEntryId && reversal?.reversesEntryId !== context.originalEntryId) errors.push(`expense-reversal-reference:${context.itemId}`);
      if (roundMoney(target?.accounts?.[context.account] || 0) !== roundMoney(context.expectedAfter)) errors.push(`expense-reversal-balance:${context.account}`);
    }
    return errors;
  }

  function commitExpensePaymentReversal(item, { undoLabel = "", message = "" } = {}) {
    const actual = item?.id ? (data.expenses || []).find(expense => expense.id === item.id) : item;
    if (!actual?.paid) return { ok:false, reason:"not-paid", restored:0 };
    const account = actual.paidFromAccount || "";
    const restored = actual.accountDeducted && account ? roundMoney(actual.paidAmount || 0) : 0;
    if (restored > 0 && !Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return { ok:false, reason:"missing-account", missingAccount:account, restored:0 };
    const before = restored > 0 ? roundMoney(data.accounts[account]) : 0;
    const expectedAfter = roundMoney(before + restored);
    const originalTransactionId = actual.paymentTransactionId || "";
    const originalEntry = (data.accountLedger || []).find(entry => entry.transactionId === originalTransactionId && entry.expenseId === actual.id && ["expense-payment", "gym-auto-payment"].includes(entry.type));
    const operationId = `expense-payment-reversal:${originalTransactionId || actual.id}`;
    let mutationResult = null;
    const transaction = runLedgerTransaction({
      undoLabel:undoLabel || `Move ${actual.name} back to unpaid`,
      message:message || (restored ? `${money(restored)} restored to ${account}` : "Expense moved back to unpaid"),
      expectedBalances:restored > 0 ? [{ account, target:expectedAfter }] : [],
      mutate:() => {
        mutationResult = mutateExpensePaymentReversal(actual);
        if (!mutationResult.ok) throw Object.assign(new Error(`Expense reversal failed: ${mutationResult.reason || "unknown"}`), { userMessage:"The payment reversal could not be completed. Nothing was changed." });
        return { kind:"expense-reversal", itemId:actual.id, account, restored, expectedAfter, originalTransactionId, originalEntryId:originalEntry?.id || "", operationId };
      },
      verify:expenseReversalStateErrors
    });
    return transaction.ok ? { ...mutationResult, ok:true, before, after:expectedAfter } : { ok:false, reason:transaction.reason || mutationResult?.reason || "transaction-failed", restored:0 };
  }

  function transferStateErrors(target, context) {
    const entries = (target?.accountLedger || []).filter(entry => entry.transferId === context.transferId);
    const out = entries.find(entry => entry.type === "transfer-out");
    const incoming = entries.find(entry => entry.type === "transfer-in");
    const errors = [];
    if (entries.length !== 2 || !out || !incoming) errors.push("transfer-entry-count");
    if (!out || out.account !== context.from || out.counterpartAccount !== context.to || roundMoney(out.amount) !== roundMoney(-context.amount)) errors.push("transfer-out-invalid");
    if (!incoming || incoming.account !== context.to || incoming.counterpartAccount !== context.from || roundMoney(incoming.amount) !== roundMoney(context.amount)) errors.push("transfer-in-invalid");
    if (out && incoming && out.transactionId !== incoming.transactionId) errors.push("transfer-transaction-mismatch");
    return errors;
  }

  function commitTransfer({ from, to, amount, date = localDateKey(), note = "" }) {
    amount = roundMoney(Number(amount || 0));
    if (!from || !to || !date || amount <= 0) return { ok:false, reason:"invalid-transfer" };
    if (from === to) return { ok:false, reason:"same-account" };
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, from) || !Object.prototype.hasOwnProperty.call(data.accounts || {}, to)) return { ok:false, reason:"missing-account" };
    const beforeFrom = roundMoney(data.accounts[from]);
    const beforeTo = roundMoney(data.accounts[to]);
    if (beforeFrom < amount) return { ok:false, reason:"insufficient", balance:beforeFrom };
    const transferId = uid();
    const expectedFrom = roundMoney(beforeFrom - amount);
    const expectedTo = roundMoney(beforeTo + amount);
    const transaction = runLedgerTransaction({
      undoLabel:`Transfer ${money(amount)} from ${from} to ${to}`,
      message:`${money(amount)} transferred from ${from} to ${to}`,
      expectedBalances:[{ account:from, target:expectedFrom }, { account:to, target:expectedTo }],
      mutate:() => {
        const added = appendLedgerEntries([
          { id:uid(), transactionId:transferId, operationId:`transfer-out:${transferId}`, account:from, counterpartAccount:to, type:"transfer-out", amount:-amount, date, description:`Transfer to ${to}`, transferId, source:"transfer", notes:note },
          { id:uid(), transactionId:transferId, operationId:`transfer-in:${transferId}`, account:to, counterpartAccount:from, type:"transfer-in", amount, date, description:`Transfer from ${from}`, transferId, source:"transfer", notes:note }
        ]);
        if (added.length !== 2) throw Object.assign(new Error("Transfer ledger pair was not created."), { userMessage:"The transfer could not be recorded. Nothing was changed." });
        return { kind:"transfer", transferId, from, to, amount, expectedFrom, expectedTo };
      },
      verify:transferStateErrors
    });
    return transaction.ok ? { ok:true, transferId, from, to, amount, beforeFrom, beforeTo, afterFrom:expectedFrom, afterTo:expectedTo } : { ok:false, reason:transaction.reason || "transaction-failed" };
  }

  function incomeStateErrors(target, context) {
    const errors = [];
    const records = Array.isArray(target?.incomeRecords) ? target.incomeRecords : [];
    const ledger = Array.isArray(target?.accountLedger) ? target.accountLedger : [];
    const record = records.find(item => item.id === context.id);
    if (context.deleted) {
      if (record) errors.push(`income-delete-record:${context.id}`);
    } else {
      if (!record) errors.push(`income-record-missing:${context.id}`);
      else if (context.postToLedger) {
        const deposits = ledger.filter(entry => entry.transactionId === record.ledgerTransactionId && entry.type === "income-deposit" && entry.incomeId === context.id);
        if (!record.ledgerTransactionId || deposits.length !== 1) errors.push(`income-deposit-count:${context.id}`);
        const deposit = deposits[0];
        if (!deposit || deposit.account !== context.account || roundMoney(deposit.amount) !== roundMoney(context.amount)) errors.push(`income-deposit-invalid:${context.id}`);
      } else if (record?.ledgerTransactionId) errors.push(`income-ledger-flag:${context.id}`);
    }
    if (context.originalTransactionId) {
      const operationId = `income-reversal:${context.id}:${context.originalTransactionId}`;
      const reversal = ledger.find(entry => entry.operationId === operationId && entry.type === "income-deposit-reversal" && entry.incomeId === context.id);
      if (!reversal) errors.push(`income-reversal-missing:${context.id}`);
      if (context.originalDepositId && reversal?.reversesEntryId !== context.originalDepositId) errors.push(`income-reversal-reference:${context.id}`);
    }
    return errors;
  }

  function commitIncomeRecord(recordInput) {
    const input = cloneData(recordInput || {});
    const id = input.id || uid();
    const existing = (data.incomeRecords || []).find(item => item.id === id) || null;
    const postToLedger = Boolean(input.postToLedger);
    if (!input.name || !input.date || !input.account || !Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) return { ok:false, reason:"invalid-income" };
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, input.account)) return { ok:false, reason:"missing-account" };
    const originalTransactionId = existing?.ledgerTransactionId || "";
    const originalDeposit = originalTransactionId ? (data.accountLedger || []).find(entry => entry.transactionId === originalTransactionId && entry.type === "income-deposit" && entry.incomeId === id) : null;
    const record = { ...input, id, ledgerTransactionId:originalTransactionId, postToLedger };
    let savedRecord = null;
    const transaction = runLedgerTransaction({
      undoLabel:existing ? `Edit income ${record.name}` : `Add income ${record.name}`,
      message:postToLedger ? (existing ? "Income updated and account ledger adjusted" : "Income added to account ledger") : (existing ? "Income updated" : "Income added"),
      mutate:() => {
        if (existing?.ledgerTransactionId) reverseIncomeLedger(existing, postToLedger ? "Income was edited and reposted" : "Income posting was removed");
        record.ledgerTransactionId = "";
        if (postToLedger && !postIncomeLedger(record)) throw Object.assign(new Error("Income deposit ledger entry was not created."), { userMessage:"The income could not be added to the account ledger. Nothing was changed." });
        if (existing) Object.assign(existing, record); else data.incomeRecords.push(record);
        savedRecord = existing || record;
        return { kind:"income", id, deleted:false, postToLedger, account:record.account, amount:roundMoney(record.amount), originalTransactionId, originalDepositId:originalDeposit?.id || "", ledgerTransactionId:savedRecord.ledgerTransactionId || "" };
      },
      verify:incomeStateErrors
    });
    return transaction.ok ? { ok:true, record:cloneData(savedRecord) } : { ok:false, reason:transaction.reason || "transaction-failed" };
  }

  function commitIncomeDeletion(id) {
    const item = (data.incomeRecords || []).find(record => record.id === id);
    if (!item) return { ok:false, reason:"missing-income" };
    const originalTransactionId = item.ledgerTransactionId || "";
    const originalDeposit = originalTransactionId ? (data.accountLedger || []).find(entry => entry.transactionId === originalTransactionId && entry.type === "income-deposit" && entry.incomeId === id) : null;
    const transaction = runLedgerTransaction({
      undoLabel:`Delete income ${item.name}`,
      message:originalTransactionId ? "Income deleted and account deposit reversed" : "Income deleted",
      mutate:() => {
        if (originalTransactionId) reverseIncomeLedger(item, "Income record deleted");
        data.incomeRecords = data.incomeRecords.filter(record => record.id !== id);
        return { kind:"income", id, deleted:true, postToLedger:false, account:item.account, amount:roundMoney(item.amount), originalTransactionId, originalDepositId:originalDeposit?.id || "" };
      },
      verify:incomeStateErrors
    });
    return transaction.ok ? { ok:true, id } : { ok:false, reason:transaction.reason || "transaction-failed" };
  }

  function quickSpendStateErrors(target, context) {
    const errors = expensePaymentStateErrors(target, context);
    const expense = (target?.expenses || []).find(item => item.id === context.expenseId);
    if (!expense || expense.quickSpend !== true || expense.quickSpendSource !== "account") errors.push(`quick-spend-record:${context.expenseId}`);
    return errors;
  }

  function commitQuickSpend({ account, amount, description, category = "Personal", date = localDateKey(), note = "", includeInTotals = true }) {
    amount = roundMoney(Number(amount || 0));
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return { ok:false, reason:"missing-account" };
    if (amount <= 0) return { ok:false, reason:"invalid-amount" };
    const before = roundMoney(data.accounts[account]);
    if (before < amount) return { ok:false, reason:"insufficient", balance:before };
    const expectedAfter = roundMoney(before - amount);
    let expense = null;
    let mutationResult = null;
    const transaction = runLedgerTransaction({
      undoLabel:`Spend ${money(amount)} from ${account}: ${description}`,
      message:`${description} recorded · ${account} ${money(expectedAfter)} remaining`,
      expectedBalances:[{ account, target:expectedAfter }],
      mutate:() => {
        expense = makeQuickSpendExpense({ account, amount, description:safeText(description || "Purchase", 80), category:safeText(category || "Personal", 80), date, note:safeText(note, 160), includeInTotals });
        data.expenses.push(expense);
        mutationResult = mutateExpensePayment([expense], account, { auto:false, paidDate:date });
        if (!mutationResult.ok) throw Object.assign(new Error(`Quick spend failed: ${mutationResult.reason || "unknown"}`), { userMessage:"The purchase could not be recorded. Nothing was changed." });
        return { kind:"quick-spend", auto:false, account, expectedAfter, itemIds:[expense.id], itemAmounts:{ [expense.id]:amount }, transactionId:mutationResult.transactionId, expenseId:expense.id };
      },
      verify:quickSpendStateErrors
    });
    return transaction.ok ? { ok:true, expense:cloneData(expense), before, after:expectedAfter, transactionId:mutationResult.transactionId } : { ok:false, reason:transaction.reason || mutationResult?.reason || "transaction-failed", balance:before };
  }

  function gymBatchStateErrors(target, context) {
    const errors = [];
    const ledger = Array.isArray(target?.accountLedger) ? target.accountLedger : [];
    const expenses = Array.isArray(target?.expenses) ? target.expenses : [];
    for (const id of context.entryIds || []) {
      const entry = ledger.find(candidate => candidate.id === id && candidate.type === "gym-auto-payment");
      if (!entry) { errors.push(`gym-ledger-missing:${id}`); continue; }
      const item = expenses.find(expense => expense.id === entry.expenseId);
      if (!item || !item.paid || !item.accountDeducted || !item.autoPaidAtMonthEnd || item.paymentTransactionId !== entry.transactionId || item.paidFromAccount !== entry.account || roundMoney(item.paidAmount) !== roundMoney(-entry.amount)) errors.push(`gym-payment-state:${entry.expenseId}`);
    }
    for (const id of context.generatedIds || []) if (!expenses.some(expense => expense.id === id)) errors.push(`gym-generated-missing:${id}`);
    return errors;
  }

  function commitGymAutoPayments({ notify = true } = {}) {
    if (typeof originalProcessGymMonthEndAutoPayments !== "function") return { ok:false, reason:"gym-owner-unavailable" };
    const beforeLedgerIds = new Set((data.accountLedger || []).map(entry => entry.id));
    const beforeExpenseIds = new Set((data.expenses || []).map(item => item.id));
    const transaction = runLedgerTransaction({
      message:"Gym auto-payments updated",
      recordUndo:false,
      notify:false,
      mutate:() => {
        globalThis.__financeLedgerMutationInternal = true;
        globalThis.__financeLedgerGymMutationInternal = true;
        try { originalProcessGymMonthEndAutoPayments({ notify:false }); }
        finally {
          globalThis.__financeLedgerGymMutationInternal = false;
          globalThis.__financeLedgerMutationInternal = false;
        }
        const entryIds = (data.accountLedger || []).filter(entry => !beforeLedgerIds.has(entry.id) && entry.type === "gym-auto-payment").map(entry => entry.id);
        const generatedIds = (data.expenses || []).filter(item => !beforeExpenseIds.has(item.id)).map(item => item.id);
        return { kind:"gym-auto-pay", changed:Boolean(entryIds.length || generatedIds.length), entryIds, generatedIds, paidCount:entryIds.length, generatedCount:generatedIds.length };
      },
      verify:gymBatchStateErrors
    });
    if (!transaction.ok) return transaction;
    const context = transaction.context || {};
    if (!transaction.skipped) {
      try { renderAll(false); } catch (error) { console.error("Gym auto-payments were saved but the interface refresh failed.", error); }
    }
    if (notify && context.paidCount) showToast(`${context.paidCount} gym auto-payment${context.paidCount === 1 ? "" : "s"} processed`);
    else if (notify && context.generatedCount) showToast(`${context.generatedCount} recurring gym expense${context.generatedCount === 1 ? "" : "s"} prepared`, "info");
    return { ok:true, changed:!transaction.skipped, ...context };
  }

  if (originalProcessGymMonthEndAutoPayments) {
    processGymMonthEndAutoPayments = function ledgerGymAutoPayments(options = {}) { return commitGymAutoPayments(options); };
  }

'''
ledger = replace_between(
    ledger,
    '  function accountMutationCanWrite()',
    '  function setAccountSpendStatus',
    transaction_block,
    "unified money transaction engine",
)

quick_spend = r'''  function submitAccountSpending() {
    if (accountSpendSubmitPending) return false;
    const account = document.getElementById("originalAccountName")?.value || "";
    const amountInput = document.getElementById("accountSpendAmount");
    const descriptionInput = document.getElementById("accountSpendDescription");
    const categoryInput = document.getElementById("accountSpendCategory");
    const dateInput = document.getElementById("accountSpendDate");
    [amountInput, descriptionInput, categoryInput, dateInput].forEach(input => input && setFieldError(input, ""));
    setAccountSpendStatus();
    if (!account || !Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) { setAccountSpendStatus("error", "This account no longer exists."); showToast("This account no longer exists", "warning"); return false; }
    if (!validateMoneyInput(amountInput, { required:true, min:.01, message:"Enter an amount greater than zero." })) { setAccountSpendStatus("error", "Enter an amount greater than zero."); return false; }
    const amount = roundMoney(moneyInputValue(amountInput));
    const description = String(descriptionInput?.value || "").trim().replace(/\s+/g, " ");
    const category = String(categoryInput?.value || "").trim();
    const date = String(dateInput?.value || "");
    const note = String(document.getElementById("accountSpendNote")?.value || "").trim();
    const includeInTotals = Boolean(document.getElementById("accountSpendIncludeTotals")?.checked);
    if (!description) { setFieldError(descriptionInput, "Enter what you bought or paid for."); descriptionInput?.focus(); setAccountSpendStatus("error", "Enter what you bought or paid for."); return false; }
    if (!category) { setFieldError(categoryInput, "Choose a category."); categoryInput?.focus(); setAccountSpendStatus("error", "Choose a category."); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setFieldError(dateInput, "Choose the purchase date."); dateInput?.focus(); setAccountSpendStatus("error", "Choose the purchase date."); return false; }
    const balance = roundMoney(data.accounts[account]);
    if (amount > balance) { setFieldError(amountInput, `Available balance is ${money(balance)}.`); updateAccountSpendPreview(); amountInput?.focus(); setAccountSpendStatus("error", `${account} has insufficient funds for this purchase.`); return false; }

    const primary = accountSpendPrimaryButton();
    accountSpendSubmitPending = true;
    if (primary) { primary.disabled = true; primary.textContent = "Recording…"; }
    setAccountSpendStatus("working", "Recording purchase…");
    const result = commitQuickSpend({ account, amount, description, category, date, note, includeInTotals });
    accountSpendSubmitPending = false;
    if (!result.ok) {
      if (primary) { primary.disabled = false; primary.textContent = "Record spending"; }
      const message = result.reason === "read-only" ? "This Viewer profile is read-only." : "The purchase could not be recorded. Your records were left unchanged.";
      setAccountSpendStatus("error", message);
      return false;
    }
    refreshReconciledAccountState(account, result.after);
    setAccountSpendStatus("success", `${description} recorded successfully · ${account} ${money(result.after)} remaining.`);
    closeTrackedFormAfterAction("accountDialog");
    return true;
  }

'''
ledger = replace_between(
    ledger,
    '  function submitAccountSpending()',
    '  function bindPersistentSpendActionDelegation',
    quick_spend,
    "quick spend transaction",
)

transfer_submit = r'''  function submitTransfer() {
    const from = document.getElementById("transferFromAccount").value;
    const to = document.getElementById("transferToAccount").value;
    const date = document.getElementById("transferDate").value;
    if (!validateMoneyInput("transferAmount", { required:true, min:.01, message:"Enter a transfer amount greater than zero." })) return false;
    const amount = roundMoney(moneyInputValue("transferAmount"));
    if (!from || !to || !date) { showToast("Complete all required transfer fields", "warning"); return false; }
    if (from === to) { showToast("Choose two different accounts", "warning"); return false; }
    const result = commitTransfer({ from, to, amount, date, note:document.getElementById("transferNote").value.trim() });
    if (!result.ok) {
      if (result.reason === "insufficient") showToast(`${from} has insufficient funds for this transfer`, "warning");
      else if (result.reason === "missing-account") showToast("One of the transfer accounts no longer exists", "warning");
      return false;
    }
    document.getElementById("accountTransferDialog").close();
    try { renderAll(false); } catch (error) { console.error("Transfer was saved but the interface refresh failed.", error); }
    return true;
  }

'''
ledger = replace_between(
    ledger,
    '  function submitTransfer()',
    '  function submitAccountForm()',
    transfer_submit,
    "transfer transaction",
)

income_block = r'''  function submitIncomeForm() {
    if (!validateMoneyInput("incomeAmount", {required:true,min:.01,message:"Enter an income amount greater than zero."})) return false;
    const rawCategory=document.getElementById("incomeCategory").value;
    let category=rawCategory;
    if (INCOME_OTHER_CATEGORIES.has(rawCategory)) {
      category=document.getElementById("incomeCustomCategory").value.trim();
      if(!category || !/[A-Za-z0-9]/.test(category)) { setFieldError(document.getElementById("incomeCustomCategory"),"Enter a clear category name."); document.getElementById("incomeCustomCategory").focus(); return false; }
    }
    const id=document.getElementById("incomeId").value;
    const existing=(data.incomeRecords||[]).find(item=>item.id===id);
    const recurring=document.getElementById("incomeRecurring").checked?"Monthly":"No";
    const categoryGroup = rawCategory === "Other wages" ? "Wages" : (rawCategory === "Transfer from savings" ? "Internal transfer" : (rawCategory === "Other income" ? "Other income" : incomeCategoryGroup(rawCategory)));
    const recordId = id || uid();
    const postToLedger = rawCategory !== "Transfer from savings" && Boolean(document.getElementById("incomePostToLedger")?.checked);
    const record={ id:recordId, name:document.getElementById("incomeName").value.trim(), amount:moneyInputValue("incomeAmount"), date:document.getElementById("incomeDate").value, category, categoryGroup, account:document.getElementById("incomeAccount").value, recurring, seriesId:existing?.seriesId || (recurring==="Monthly"?`income-series-${recordId}`:""), includeInTotals:category==="Transfer from savings"?false:document.getElementById("incomeIncludeInTotals").checked, notes:document.getElementById("incomeNotes").value.trim(), icon:pickerIcon("income"), ledgerTransactionId:existing?.ledgerTransactionId || "", postToLedger };
    if(!record.name || !record.date || !record.account) { showToast("Complete all required income fields", "warning"); return false; }
    const result = commitIncomeRecord(record);
    if (!result.ok) return false;
    closeTrackedFormAfterAction("incomeDialog");
    try { renderAll(false); } catch (error) { console.error("Income was saved but the interface refresh failed.", error); }
    return true;
  }

  async function deleteIncomeRecord(button) {
    const id=button.dataset.deleteIncome;
    const item=(data.incomeRecords||[]).find(record=>record.id===id);
    if(!item) return false;
    const confirmed=await openAppConfirmation({title:"Delete income?",message:`Delete “${item.name}”?`,details:`${money(item.amount)} · ${item.category}${item.ledgerTransactionId ? " · its account deposit will be reversed" : ""}`,confirmLabel:"Delete income",danger:true});
    if(!confirmed) return false;
    const result = commitIncomeDeletion(id);
    if (!result.ok) return false;
    closeTrackedFormAfterAction("incomeDialog");
    try { renderAll(false); } catch (error) { console.error("Income deletion was saved but the interface refresh failed.", error); }
    return true;
  }

'''
ledger = replace_between(
    ledger,
    '  function submitIncomeForm()',
    '  async function deleteAccountSafely(button)',
    income_block,
    "income transaction ownership",
)

ledger = replace_once(
    ledger,
    '  ensureAccountSpendUi();\n  bindPersistentSpendActionDelegation();\n  injectLedgerUi();\n',
    '  ensureAccountSpendUi();\n  bindPersistentSpendActionDelegation();\n  injectLedgerUi();\n  try { commitGymAutoPayments({ notify:false }); } catch (error) { console.error("Gym auto-payment hardening bootstrap failed.", error); }\n',
    "gym bootstrap transaction",
)

old_exports = r'''  window.FinanceAccountMutations = {
    version:1,
    owner:"account-ledger-v1",
    capabilities:{ singleOwner:true, transactionalPersistence:true, invariantChecks:true, profileVerification:true, failClosedFallback:true },
    submitAccountForm,
    submitAccountsReconciliationForm,
    deleteAccountSafely,
    run:runAccountMutation,
    invariantReport:accountMutationInvariantReport
  };

  window.FinanceAccountLedger = {
    version:LEDGER_VERSION,
    releaseVersion:"13.0.13",
    capabilities:{ accountSpending:true, verifiedSpendSubmit:true, persistentSpendActions:true, transactionalSpend:true, isolatedSpendAction:true, accountReconciliationOwner:true, transactionalAccountCorrection:true, profileVerifiedAccountCorrection:true, singleAccountMutationOwner:true, accountMutationInvariants:true },
    recalculateBalances,
    appendLedgerEntries,
    appendReconciliation,
    submitAccountForm,
    submitAccountsReconciliationForm,
    openSpend:openAccountSpendDialog,
    submitSpend:submitAccountSpending,
    recordSpend:({account,amount,description,category="Personal",date=localDateKey(),note="",includeInTotals=true}) => {
      if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return {ok:false,reason:"missing-account"};
      amount=roundMoney(Number(amount||0)); if(amount<=0) return {ok:false,reason:"invalid-amount"};
      const before=roundMoney(data.accounts[account]); if(before<amount) return {ok:false,reason:"insufficient",balance:before};
      const expense=makeQuickSpendExpense({account,amount,description:safeText(description||"Purchase",80),category:safeText(category||"Personal",80),date,note:safeText(note,160),includeInTotals});
      data.expenses.push(expense); const result=applyExpensePayment([expense],account,{auto:false,paidDate:date});
      if(!result.ok){data.expenses=data.expenses.filter(item=>item.id!==expense.id);return result;} return {ok:true,expense,before,after:roundMoney(data.accounts[account]),transactionId:result.transactionId};
    },
    render:renderLedgerWorkspace,
    get entries() { return cloneData(data.accountLedger || []); },
    get reconciliations() { return cloneData(data.accountReconciliations || []); }
  };
'''
new_exports = r'''  window.FinanceLedgerTransactions = Object.freeze({
    version:1,
    owner:"account-ledger-v1",
    capabilities:{ unifiedMoneyMutations:true, transactionalPersistence:true, localVerification:true, profileVerification:true, ledgerInvariants:true, domainInvariants:true, rollback:true },
    run:runLedgerTransaction,
    transfer:commitTransfer,
    payExpenses:commitExpensePayment,
    reverseExpensePayment:commitExpensePaymentReversal,
    quickSpend:commitQuickSpend,
    saveIncome:commitIncomeRecord,
    deleteIncome:commitIncomeDeletion,
    processGymAutoPayments:commitGymAutoPayments,
    invariantReport:moneyMutationInvariantReport
  });

  window.FinanceAccountMutations = {
    version:1,
    owner:"account-ledger-v1",
    capabilities:{ singleOwner:true, transactionalPersistence:true, invariantChecks:true, profileVerification:true, failClosedFallback:true, unifiedMoneyEngine:true },
    submitAccountForm,
    submitAccountsReconciliationForm,
    deleteAccountSafely,
    run:runAccountMutation,
    invariantReport:(expectedBalances = []) => accountMutationInvariantReport(expectedBalances, data)
  };

  window.FinanceAccountLedger = {
    version:LEDGER_VERSION,
    releaseVersion:"13.0.13",
    capabilities:{ accountSpending:true, verifiedSpendSubmit:true, persistentSpendActions:true, transactionalSpend:true, isolatedSpendAction:true, accountReconciliationOwner:true, transactionalAccountCorrection:true, profileVerifiedAccountCorrection:true, singleAccountMutationOwner:true, accountMutationInvariants:true, unifiedMoneyTransactions:true },
    recalculateBalances,
    appendLedgerEntries,
    appendReconciliation,
    submitAccountForm,
    submitAccountsReconciliationForm,
    openSpend:openAccountSpendDialog,
    submitSpend:submitAccountSpending,
    recordSpend:commitQuickSpend,
    render:renderLedgerWorkspace,
    get entries() { return cloneData(data.accountLedger || []); },
    get reconciliations() { return cloneData(data.accountReconciliations || []); }
  };
'''
if old_exports not in ledger:
    raise SystemExit("Current FinanceAccountLedger export block did not match Phase 1 baseline")
ledger = ledger.replace(old_exports, new_exports, 1)
LEDGER.write_text(ledger)

index = INDEX.read_text()
index = replace_once(
    index,
    '      data.accounts[account] = roundMoney(balance - total);\n',
    '      return window.FinanceLedgerTransactions?.payExpenses ? window.FinanceLedgerTransactions.payExpenses(eligible, account, { auto, paidDate }) : { ok:false, reason:"ledger-unavailable", total, balance };\n',
    "legacy expense account deduction",
)
index = replace_once(
    index,
    '        data.accounts[item.paidFromAccount] = roundMoney(Number(data.accounts[item.paidFromAccount] || 0) + amount);\n',
    '        return window.FinanceLedgerTransactions?.reverseExpensePayment ? window.FinanceLedgerTransactions.reverseExpensePayment(item) : { ok:false, restored:0, reason:"ledger-unavailable" };\n',
    "legacy expense account restore",
)
index = replace_once(
    index,
    '      if (changed) persistFinanceDataRaw();\n',
    '      if (changed && !globalThis.__financeLedgerGymMutationInternal) persistFinanceDataRaw();\n',
    "gym raw persistence bypass",
)
old_payment_handler = '''      pushUndo(items.length === 1 ? `Pay ${items[0].name} from ${account}` : `Pay ${items.length} expenses from ${account}`);\n      const result = applyExpensePayment(items, account, { auto:false });\n      if (!result.ok) { expensePaymentSubmitting = false; refreshExpensePaymentPreview(); showToast("Payment could not be completed", "warning"); return; }\n      closeExpensePaymentDialog();\n      selectedExpenseIds.clear();\n      document.getElementById("bulkExpenseAction").value = "";\n      refreshBulkActionValue();\n      saveData(`${money(result.total)} deducted from ${account}`);\n'''
new_payment_handler = '''      const service = window.FinanceLedgerTransactions;\n      if (!service?.payExpenses) { expensePaymentSubmitting = false; refreshExpensePaymentPreview(); showToast("Account ledger is updating. Reload Talaan before recording a payment.", "warning"); return; }\n      const result = service.payExpenses(items, account, { auto:false });\n      if (!result.ok) { expensePaymentSubmitting = false; refreshExpensePaymentPreview(); showToast("Payment could not be completed", "warning"); return; }\n      closeExpensePaymentDialog();\n      selectedExpenseIds.clear();\n      document.getElementById("bulkExpenseAction").value = "";\n      refreshBulkActionValue();\n      try { renderAll(false); } catch (error) { console.error("Payment was saved but the interface refresh failed.", error); }\n'''
index = replace_once(index, old_payment_handler, new_payment_handler, "manual expense payment handler")
old_undo = '''            pushUndo(`Move ${item.name} back to unpaid`);\n            const result = restoreExpensePayment(item);\n            saveData(result.restored ? `${money(result.restored)} restored to the payment account` : "Expense moved back to unpaid");\n'''
new_undo = '''            const service = window.FinanceLedgerTransactions;\n            if (!service?.reverseExpensePayment) { showToast("Account ledger is updating. Reload Talaan before reversing a payment.", "warning"); return; }\n            const result = service.reverseExpensePayment(item);\n            if (!result.ok) { showToast("Payment reversal could not be completed", "warning"); return; }\n            try { renderAll(false); } catch (error) { console.error("Payment reversal was saved but the interface refresh failed.", error); }\n'''
index = replace_once(index, old_undo, new_undo, "paid expense reversal handler")
INDEX.write_text(index)

finance = FINANCE_TEST.read_text()
finance_guard = '''\n// Phase 2 money-mutation ownership: Account Ledger is the only balance-changing runtime owner.\nassert(accountLedger.includes("function runLedgerTransaction("), "unified ledger transaction runner is missing");\nassert(accountLedger.includes("window.FinanceLedgerTransactions = Object.freeze"), "money mutation service is not exposed");\nfor (const capability of ["unifiedMoneyMutations:true","transactionalPersistence:true","domainInvariants:true","rollback:true"]) assert(accountLedger.includes(capability), `money mutation capability ${capability} is missing`);\nassert(!index.includes("data.accounts[account] = roundMoney(balance - total)"), "legacy expense payment still writes account balances directly");\nassert(!index.includes("data.accounts[item.paidFromAccount] = roundMoney"), "legacy payment reversal still writes account balances directly");\n'''
if "Phase 2 money-mutation ownership" not in finance:
    pos = finance.rfind('console.log(')
    if pos < 0:
        raise SystemExit("Finance source test has no completion log marker")
    finance = finance[:pos] + finance_guard + "\n" + finance[pos:]
FINANCE_TEST.write_text(finance)

SYNC_TEST.write_text(r'''import assert from "node:assert/strict";
import fs from "node:fs";

const ledger = fs.readFileSync("assets/js/account-ledger.js", "utf8");
const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");

assert.match(ledger, /function runLedgerTransaction\(/);
assert.match(ledger, /persistFinanceDataRaw\(message\)/);
assert.match(ledger, /readStoredFinanceState\(STORAGE_KEY\)/);
assert.match(ledger, /architecture\?\.persistCurrentData\?\.\(data, message\)/);
assert.match(ledger, /commitTransfer/);
assert.match(ledger, /commitExpensePayment/);
assert.match(ledger, /commitExpensePaymentReversal/);
assert.match(ledger, /commitQuickSpend/);
assert.match(ledger, /commitIncomeRecord/);
assert.match(ledger, /commitIncomeDeletion/);
assert.match(ledger, /commitGymAutoPayments/);
assert.match(cloud, /accountLedger/);
assert.match(cloud, /accountReconciliations/);
assert.match(cloud, /accounts/);
assert.match(cloud, /finance:data-persisted/);

console.log("Unified money mutations persist before Cloud Sync observation and retain ledger/account collections.");
''')

BROWSER_TEST.write_text(r'''import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";

const APP_URL = "http://127.0.0.1:3000";
const ACCOUNT_INTEGRITY_SOURCES = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const hash = crypto.createHash("sha256");
for (const file of ACCOUNT_INTEGRITY_SOURCES) { hash.update(`${file}\0`); hash.update(fs.readFileSync(file)); }
const REVISION = hash.digest("hex").slice(0, 12);
const REFRESH_KEY = `finance-account-integrity-${REVISION}`;

test.use({ serviceWorkers:"allow" });
test.beforeEach(async ({ page }) => { await page.addInitScript(key => localStorage.setItem(key, "done"), REFRESH_KEY); });

async function authenticate(page) {
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.waitForFunction(() => !document.body.classList.contains("finance-auth-pending"));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => Boolean(window.FinanceLedgerTransactions?.capabilities?.unifiedMoneyMutations && window.FinanceProfileArchitecture));
}

async function openApp(page) {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(`${APP_URL}/?page=money`, { waitUntil:"networkidle" });
  await authenticate(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) { await page.reload({ waitUntil:"networkidle" }); await authenticate(page); }
}

async function boostAccount(page, account, target) {
  await page.evaluate(({ account, target }) => {
    const card = document.querySelector(`#moneyAccounts [data-account-card="${CSS.escape(account)}"]`);
    card?.querySelector("[data-edit-account]")?.click();
    const input = document.getElementById("accountBalance");
    input.value = target.toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 });
    document.getElementById("accountForm").dispatchEvent(new Event("submit", { bubbles:true, cancelable:true }));
  }, { account, target });
}

function storedSnapshot() {
  const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
  const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
  const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");
  return { persisted, profile };
}

test("transfer persists as one equal-and-opposite ledger transaction", async ({ page }) => {
  await openApp(page);
  const setup = await page.evaluate(() => ({ names:Object.keys(data.accounts || {}).slice(0, 2), balances:{...data.accounts} }));
  expect(setup.names.length).toBe(2);
  const [from, to] = setup.names;
  await boostAccount(page, from, Math.max(1000, Number(setup.balances[from] || 0) + 500));
  const before = await page.evaluate(({from,to}) => ({ from:Number(data.accounts[from]), to:Number(data.accounts[to]) }), {from,to});
  const result = await page.evaluate(({from,to}) => window.FinanceLedgerTransactions.transfer({ from, to, amount:125.25, date:new Date().toISOString().slice(0,10), note:"Phase 2 transfer" }), {from,to});
  expect(result.ok).toBe(true);
  const state = await page.evaluate(({from,to,transferId}) => {
    const { persisted, profile } = storedSnapshot();
    const entries = (data.accountLedger || []).filter(entry => entry.transferId === transferId);
    return { runtimeFrom:data.accounts[from], runtimeTo:data.accounts[to], persistedFrom:persisted.accounts[from], persistedTo:persisted.accounts[to], profileFrom:profile.accounts[from], profileTo:profile.accounts[to], entries };
  }, {from,to,transferId:result.transferId});
  expect(state.runtimeFrom).toBeCloseTo(before.from - 125.25, 2);
  expect(state.runtimeTo).toBeCloseTo(before.to + 125.25, 2);
  expect(state.persistedFrom).toBe(state.runtimeFrom);
  expect(state.persistedTo).toBe(state.runtimeTo);
  expect(state.profileFrom).toBe(state.runtimeFrom);
  expect(state.profileTo).toBe(state.runtimeTo);
  expect(state.entries).toHaveLength(2);
  expect(state.entries.reduce((sum, entry) => sum + Number(entry.amount), 0)).toBeCloseTo(0, 2);
});

test("quick spend and payment reversal remain ledger/account consistent", async ({ page }) => {
  await openApp(page);
  const account = await page.evaluate(() => Object.keys(data.accounts || {})[0]);
  const original = await page.evaluate(account => Number(data.accounts[account]), account);
  await boostAccount(page, account, Math.max(1500, original + 750));
  const before = await page.evaluate(account => Number(data.accounts[account]), account);
  const spend = await page.evaluate(account => window.FinanceLedgerTransactions.quickSpend({ account, amount:87.65, description:"Phase 2 purchase", category:"Personal", date:new Date().toISOString().slice(0,10), note:"integrity regression", includeInTotals:true }), account);
  expect(spend.ok).toBe(true);
  const paid = await page.evaluate(({account,id,transactionId}) => {
    const { persisted, profile } = storedSnapshot();
    const item = data.expenses.find(expense => expense.id === id);
    const entry = data.accountLedger.find(candidate => candidate.transactionId === transactionId && candidate.expenseId === id);
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], item, entry };
  }, {account,id:spend.expense.id,transactionId:spend.transactionId});
  expect(paid.balance).toBeCloseTo(before - 87.65, 2);
  expect(paid.persisted).toBe(paid.balance);
  expect(paid.profile).toBe(paid.balance);
  expect(paid.item.paid).toBe(true);
  expect(paid.entry.amount).toBeCloseTo(-87.65, 2);

  const reversed = await page.evaluate(id => {
    const item = data.expenses.find(expense => expense.id === id);
    return window.FinanceLedgerTransactions.reverseExpensePayment(item);
  }, spend.expense.id);
  expect(reversed.ok).toBe(true);
  const after = await page.evaluate(({account,id}) => {
    const { persisted, profile } = storedSnapshot();
    const item = data.expenses.find(expense => expense.id === id);
    const reversal = data.accountLedger.find(entry => entry.expenseId === id && entry.type === "expense-payment-reversal");
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], item, reversal };
  }, {account,id:spend.expense.id});
  expect(after.balance).toBeCloseTo(before, 2);
  expect(after.persisted).toBe(after.balance);
  expect(after.profile).toBe(after.balance);
  expect(after.item.paid).toBe(false);
  expect(after.reversal.amount).toBeCloseTo(87.65, 2);
});

test("income add edit delete uses deposit and reversal pairs atomically", async ({ page }) => {
  await openApp(page);
  const account = await page.evaluate(() => Object.keys(data.accounts || {})[0]);
  const before = await page.evaluate(account => Number(data.accounts[account]), account);
  const base = { name:"Phase 2 income", amount:222.22, date:new Date().toISOString().slice(0,10), category:"Other income", categoryGroup:"Other income", account, recurring:"No", seriesId:"", includeInTotals:true, notes:"integrity regression", icon:null, postToLedger:true };
  const created = await page.evaluate(record => window.FinanceLedgerTransactions.saveIncome(record), base);
  expect(created.ok).toBe(true);
  const edited = await page.evaluate(({id,record}) => window.FinanceLedgerTransactions.saveIncome({ ...record, id, amount:333.33 }), { id:created.record.id, record:base });
  expect(edited.ok).toBe(true);
  const mid = await page.evaluate(({account,id}) => {
    const record = data.incomeRecords.find(item => item.id === id);
    const deposits = data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit");
    const reversals = data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit-reversal");
    return { balance:data.accounts[account], record, deposits, reversals };
  }, {account,id:created.record.id});
  expect(mid.balance).toBeCloseTo(before + 333.33, 2);
  expect(mid.deposits).toHaveLength(2);
  expect(mid.reversals).toHaveLength(1);
  expect(mid.record.ledgerTransactionId).not.toBe("");

  const deleted = await page.evaluate(id => window.FinanceLedgerTransactions.deleteIncome(id), created.record.id);
  expect(deleted.ok).toBe(true);
  const finalState = await page.evaluate(({account,id}) => {
    const { persisted, profile } = storedSnapshot();
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], record:data.incomeRecords.find(item => item.id === id), reversals:data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit-reversal") };
  }, {account,id:created.record.id});
  expect(finalState.balance).toBeCloseTo(before, 2);
  expect(finalState.persisted).toBe(finalState.balance);
  expect(finalState.profile).toBe(finalState.balance);
  expect(finalState.record).toBeUndefined();
  expect(finalState.reversals).toHaveLength(2);

  await page.reload({ waitUntil:"networkidle" });
  await authenticate(page);
  const reloaded = await page.evaluate(({account,id}) => ({ balance:data.accounts[account], record:data.incomeRecords.find(item => item.id === id) }), {account,id:created.record.id});
  expect(reloaded.balance).toBeCloseTo(before, 2);
  expect(reloaded.record).toBeUndefined();
});

test("Viewer money mutation fails before transfer ledger changes", async ({ page }) => {
  await openApp(page);
  const names = await page.evaluate(() => Object.keys(data.accounts || {}).slice(0,2));
  expect(names.length).toBe(2);
  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem("simple-finance-profiles-v1") || "{}");
    const active = (meta.profiles || []).find(profile => profile.id === meta.activeProfileId);
    if (!active) throw new Error("Active profile metadata missing");
    active.role = "viewer";
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify(meta));
  });
  await page.reload({ waitUntil:"networkidle" });
  await authenticate(page);
  await page.waitForFunction(() => window.FinanceProfileArchitecture?.activeRole?.() === "viewer");
  const before = await page.evaluate(() => ({ accounts:{...data.accounts}, count:(data.accountLedger || []).length }));
  const result = await page.evaluate(([from,to]) => window.FinanceLedgerTransactions.transfer({ from, to, amount:1, date:new Date().toISOString().slice(0,10) }), names);
  expect(result.ok).toBe(false);
  expect(result.reason).toBe("read-only");
  const after = await page.evaluate(() => ({ accounts:{...data.accounts}, count:(data.accountLedger || []).length }));
  expect(after).toEqual(before);
});
''')

print("Phase 2 unified money-mutation hardening staged.")
