"use strict";

/* My Finance Records V12.20.0 · account ledger, transfers, and reconciliation.
   The ledger is append-only. Account balances are recalculated from signed entries.
   Existing V12.19.1 balances migrate once as opening-balance entries without changing totals. */
(function accountLedgerBootstrap() {
  const LEDGER_VERSION = 1;
  const LEDGER_TYPES = new Set([
    "opening-balance",
    "expense-payment",
    "gym-auto-payment",
    "expense-payment-reversal",
    "income-deposit",
    "income-deposit-reversal",
    "transfer-out",
    "transfer-in",
    "reconciliation-adjustment",
    "manual-adjustment"
  ]);
  const LEDGER_LABELS = {
    "opening-balance":"Opening balance",
    "expense-payment":"Expense payment",
    "gym-auto-payment":"Gym auto-payment",
    "expense-payment-reversal":"Payment reversal",
    "income-deposit":"Income deposit",
    "income-deposit-reversal":"Income reversal",
    "transfer-out":"Transfer sent",
    "transfer-in":"Transfer received",
    "reconciliation-adjustment":"Reconciliation",
    "manual-adjustment":"Manual adjustment"
  };
  const originalNormalizeData = normalizeData;
  const originalSaveData = saveData;
  const originalRenderAll = renderAll;
  const originalOpenAccountDialog = openAccountDialog;
  const originalOpenIncomeDialog = openIncomeDialog;
  const originalSyncIncomeCategoryFields = syncIncomeCategoryFields;
  const originalCloneRecurringIncomeForMonth = cloneRecurringIncomeForMonth;

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function safeText(value, limit = 160) {
    return String(value || "").trim().slice(0, limit);
  }

  function deterministicOpeningId(account) {
    const slug = encodeURIComponent(String(account || "account")).replace(/%/g, "").slice(0, 80);
    return `ledger-opening-v1-${slug}`;
  }

  function normalizeLedgerEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const account = safeText(entry.account, 100);
    const amount = roundMoney(Number(entry.amount || 0));
    const type = LEDGER_TYPES.has(entry.type) ? entry.type : "manual-adjustment";
    if (!account || !Number.isFinite(amount)) return null;
    const id = safeText(entry.id || uid(), 120);
    return {
      ...entry,
      id,
      transactionId:safeText(entry.transactionId || id, 120),
      operationId:safeText(entry.operationId || id, 180),
      account,
      type,
      amount,
      date:/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || "")) ? String(entry.date) : localDateKey(),
      description:safeText(entry.description || LEDGER_LABELS[type] || "Account activity", 180),
      createdAt:entry.createdAt || new Date().toISOString(),
      createdByDevice:safeText(entry.createdByDevice || "", 120),
      expenseId:safeText(entry.expenseId || "", 120),
      incomeId:safeText(entry.incomeId || "", 120),
      projectId:safeText(entry.projectId || "", 120),
      transferId:safeText(entry.transferId || "", 120),
      reconciliationId:safeText(entry.reconciliationId || "", 120),
      reversesEntryId:safeText(entry.reversesEntryId || "", 120),
      counterpartAccount:safeText(entry.counterpartAccount || "", 100),
      source:safeText(entry.source || "app", 40),
      notes:safeText(entry.notes || "", 240)
    };
  }

  function openingEntriesFromAccounts(accounts, initializedAt = new Date().toISOString()) {
    return Object.entries(accounts || {}).map(([account, balance]) => {
      const id = deterministicOpeningId(account);
      return normalizeLedgerEntry({
        id,
        transactionId:id,
        operationId:id,
        account,
        type:"opening-balance",
        amount:roundMoney(balance),
        date:String(initializedAt).slice(0, 10),
        description:"Opening balance migrated from V12.19.1",
        createdAt:initializedAt,
        source:"migration"
      });
    }).filter(Boolean);
  }

  function normalizeReconciliation(item) {
    if (!item || typeof item !== "object") return null;
    const account = safeText(item.account, 100);
    if (!account) return null;
    const id = safeText(item.id || uid(), 120);
    return {
      ...item,
      id,
      account,
      date:/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || "")) ? String(item.date) : localDateKey(),
      previousBalance:roundMoney(item.previousBalance),
      statementBalance:roundMoney(item.statementBalance),
      difference:roundMoney(item.difference),
      note:safeText(item.note || "", 240),
      ledgerEntryId:safeText(item.ledgerEntryId || "", 120),
      createdAt:item.createdAt || new Date().toISOString(),
      createdByDevice:safeText(item.createdByDevice || "", 120)
    };
  }

  function ensureLedgerShape(value) {
    const normalized = value && typeof value === "object" ? value : {};
    const activeAccounts = normalized.accounts && typeof normalized.accounts === "object" ? normalized.accounts : {};
    const settingsSource = normalized.ledgerSettings && typeof normalized.ledgerSettings === "object" ? normalized.ledgerSettings : {};
    const initializedAt = settingsSource.initializedAt || new Date().toISOString();
    let ledger = (Array.isArray(normalized.accountLedger) ? normalized.accountLedger : []).map(normalizeLedgerEntry).filter(Boolean);
    if (!ledger.length) ledger = openingEntriesFromAccounts(activeAccounts, initializedAt);
    const seenOperations = new Set();
    ledger = ledger.filter(entry => {
      const key = entry.operationId || entry.id;
      if (seenOperations.has(key)) return false;
      seenOperations.add(key);
      return true;
    });
    normalized.accountLedger = ledger;
    normalized.accountReconciliations = (Array.isArray(normalized.accountReconciliations) ? normalized.accountReconciliations : []).map(normalizeReconciliation).filter(Boolean);
    normalized.ledgerSettings = {
      version:LEDGER_VERSION,
      initializedAt,
      migratedFrom:settingsSource.migratedFrom || (settingsSource.version ? "" : "12.19.1"),
      lastRecalculatedAt:settingsSource.lastRecalculatedAt || initializedAt
    };
    (normalized.incomeRecords || []).forEach(item => {
      item.ledgerTransactionId = safeText(item.ledgerTransactionId || "", 120);
      item.postToLedger = Boolean(item.ledgerTransactionId || item.postToLedger === true);
    });
    recalculateBalances(normalized);
    return normalized;
  }

  function recalculateBalances(target = data) {
    if (!target?.accounts || typeof target.accounts !== "object") target.accounts = {};
    const balances = Object.fromEntries(Object.keys(target.accounts).map(name => [name, 0]));
    (target.accountLedger || []).forEach(entry => {
      if (!entry || !Object.prototype.hasOwnProperty.call(balances, entry.account)) return;
      balances[entry.account] = roundMoney(balances[entry.account] + Number(entry.amount || 0));
    });
    Object.keys(target.accounts).forEach(name => { target.accounts[name] = roundMoney(balances[name] || 0); });
    if (target.ledgerSettings) target.ledgerSettings.lastRecalculatedAt = new Date().toISOString();
    return target.accounts;
  }

  function currentDeviceIdSafe() {
    try {
      if (typeof ensureCurrentDevice === "function") ensureCurrentDevice();
      return typeof appMeta !== "undefined" ? String(appMeta.currentDeviceId || "") : "";
    } catch (error) { return ""; }
  }

  function ledgerOperationExists(operationId) {
    return Boolean(operationId && (data.accountLedger || []).some(entry => entry.operationId === operationId));
  }

  function appendLedgerEntries(entries, { recalculate = true } = {}) {
    ensureLedgerShape(data);
    const added = [];
    for (const candidate of entries || []) {
      const entry = normalizeLedgerEntry({ ...candidate, createdByDevice:candidate?.createdByDevice || currentDeviceIdSafe() });
      if (!entry || ledgerOperationExists(entry.operationId)) continue;
      data.accountLedger.push(entry);
      added.push(entry);
    }
    if (recalculate) recalculateBalances(data);
    return added;
  }

  function ledgerEntryForOperation(operationId) {
    return (data.accountLedger || []).find(entry => entry.operationId === operationId) || null;
  }

  function appendReconciliation(account, statementBalance, { date = localDateKey(), note = "" } = {}) {
    ensureLedgerShape(data);
    if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, account)) return null;
    const previousBalance = roundMoney(data.accounts[account]);
    const target = roundMoney(statementBalance);
    const difference = roundMoney(target - previousBalance);
    if (difference === 0) return null;
    const reconciliationId = uid();
    const operationId = `reconciliation:${reconciliationId}`;
    const [entry] = appendLedgerEntries([{
      id:uid(), transactionId:reconciliationId, operationId,
      account, type:"reconciliation-adjustment", amount:difference, date,
      description:`Reconciled ${account} to ${money(target)}`,
      reconciliationId, source:"reconciliation", notes:note
    }]);
    if (!entry) return null;
    const reconciliation = normalizeReconciliation({
      id:reconciliationId, account, date,
      previousBalance, statementBalance:target, difference,
      note, ledgerEntryId:entry.id, createdByDevice:currentDeviceIdSafe()
    });
    data.accountReconciliations.push(reconciliation);
    return reconciliation;
  }

  function refreshReconciledAccountState(account, targetBalance = null) {
    recalculateBalances(data);
    const actual = roundMoney(data.accounts?.[account] || 0);
    if (targetBalance != null && Number.isFinite(Number(targetBalance)) && actual !== roundMoney(targetBalance)) {
      console.warn(`Account ledger refresh mismatch for ${account}: expected ${roundMoney(targetBalance)}, calculated ${actual}`);
    }
    renderAll(false);
    try { window.dispatchEvent(new CustomEvent("finance:account-balance-refreshed", { detail:{ account, balance:actual } })); } catch (error) {}
    return actual;
  }

  function reverseIncomeLedger(existing, reason = "Income record changed") {
    if (!existing?.ledgerTransactionId) return null;
    const original = (data.accountLedger || []).find(entry => entry.transactionId === existing.ledgerTransactionId && entry.type === "income-deposit" && entry.incomeId === existing.id);
    if (!original) return null;
    const operationId = `income-reversal:${existing.id}:${existing.ledgerTransactionId}`;
    const [entry] = appendLedgerEntries([{
      id:uid(), transactionId:uid(), operationId,
      account:original.account, type:"income-deposit-reversal", amount:roundMoney(-original.amount), date:localDateKey(),
      description:`Reversed income: ${existing.name}`, incomeId:existing.id,
      reversesEntryId:original.id, source:"income", notes:reason
    }]);
    return entry || ledgerEntryForOperation(operationId);
  }

  function postIncomeLedger(record) {
    const transactionId = uid();
    const [entry] = appendLedgerEntries([{
      id:uid(), transactionId, operationId:`income-deposit:${record.id}:${transactionId}`,
      account:record.account, type:"income-deposit", amount:record.amount, date:record.date,
      description:`Income received: ${record.name}`, incomeId:record.id,
      source:"income", notes:record.notes
    }]);
    if (entry) {
      record.ledgerTransactionId = transactionId;
      record.postToLedger = true;
    }
    return entry;
  }

  normalizeData = function ledgerAwareNormalizeData(value) {
    return ensureLedgerShape(originalNormalizeData(value));
  };

  data = ensureLedgerShape(data);

  saveData = function ledgerAwareSaveData(message = "Saved") {
    ensureLedgerShape(data);
    return originalSaveData(message);
  };

  renderAll = function ledgerAwareRenderAll(...args) {
    recalculateBalances(data);
    const result = originalRenderAll(...args);
    renderLedgerWorkspace();
    return result;
  };

  applyExpensePayment = function ledgerExpensePayment(items, account, { auto = false, paidDate = localDateKey() } = {}) {
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
  };

  restoreExpensePayment = function ledgerExpensePaymentRestore(item) {
    if (!item?.paid) return { restored:0 };
    const restored = item.accountDeducted && item.paidFromAccount && Number(item.paidAmount || 0) > 0;
    const amount = restored ? roundMoney(item.paidAmount) : 0;
    if (restored) {
      if (!Object.prototype.hasOwnProperty.call(data.accounts || {}, item.paidFromAccount)) return { restored:0, missingAccount:item.paidFromAccount };
      const original = (data.accountLedger || []).find(entry => entry.transactionId === item.paymentTransactionId && entry.expenseId === item.id && ["expense-payment", "gym-auto-payment"].includes(entry.type));
      const operationId = `expense-payment-reversal:${item.paymentTransactionId || item.id}`;
      appendLedgerEntries([{
        id:uid(), transactionId:uid(), operationId,
        account:item.paidFromAccount, type:"expense-payment-reversal", amount,
        date:localDateKey(), description:`Payment reversal: ${item.name}`,
        expenseId:item.id, reversesEntryId:original?.id || "",
        source:"expense-reversal"
      }]);
    }
    item.paid = false;
    item.paidDate = "";
    item.paidFromAccount = "";
    item.paidAmount = 0;
    item.accountDeducted = false;
    item.paymentTransactionId = "";
    item.autoPaidAtMonthEnd = false;
    if (isGymExpense(item) && expenseMonth(item) < currentMonth) item.gymAutoPaySuppressed = true;
    return { restored:amount };
  };

  cloneRecurringIncomeForMonth = function ledgerRecurringIncomeClone(source, month) {
    const copy = originalCloneRecurringIncomeForMonth(source, month);
    copy.ledgerTransactionId = "";
    copy.postToLedger = false;
    return copy;
  };

  function renameAccountReferences(originalName, newName) {
    if (!originalName || originalName === newName) return;
    (data.accountLedger || []).forEach(entry => {
      if (entry.account === originalName) entry.account = newName;
      if (entry.counterpartAccount === originalName) entry.counterpartAccount = newName;
    });
    (data.accountReconciliations || []).forEach(item => { if (item.account === originalName) item.account = newName; });
    (data.expenses || []).forEach(item => {
      if (item.account === originalName) item.account = newName;
      if (item.paidFromAccount === originalName) item.paidFromAccount = newName;
      if (item.gymAutoPayAccount === originalName) item.gymAutoPayAccount = newName;
    });
    (data.incomeRecords || []).forEach(item => { if (item.account === originalName) item.account = newName; });
    (data.savingsGoals || []).forEach(goal => { if (goal.linkedAccount === originalName) goal.linkedAccount = newName; });
  }

  openAccountDialog = function ledgerOpenAccountDialog(name = "") {
    originalOpenAccountDialog(name);
    const editing = Boolean(name);
    const note = document.querySelector("#accountDialog .dialog-context-note");
    const label = document.querySelector('#accountDialog label[for="accountBalance"]');
    if (note) note.textContent = editing ? "Changing the balance creates a reconciliation entry in the account ledger." : "The starting amount becomes this account’s opening-balance ledger entry.";
    if (label) label.textContent = editing ? "Reconciled balance" : "Opening balance";
  };

  openIncomeDialog = function ledgerOpenIncomeDialog(item = null) {
    originalOpenIncomeDialog(item);
    const checkbox = document.getElementById("incomePostToLedger");
    if (checkbox) checkbox.checked = item ? Boolean(item.ledgerTransactionId) : true;
    syncIncomeCategoryFields();
  };

  syncIncomeCategoryFields = function ledgerSyncIncomeCategoryFields() {
    originalSyncIncomeCategoryFields();
    const transfer = document.getElementById("incomeCategory")?.value === "Transfer from savings";
    const checkbox = document.getElementById("incomePostToLedger");
    const field = document.getElementById("incomePostToLedgerField");
    if (checkbox) {
      checkbox.disabled = transfer;
      if (transfer) checkbox.checked = false;
    }
    field?.classList.toggle("is-transfer", transfer);
  };

  function injectLedgerUi() {
    if (document.getElementById("accountLedgerCard")) return;
    const panel = document.getElementById("settings-panel-accounts");
    if (!panel) return;
    const accountForm = document.getElementById("accountsForm");
    const accountCard = accountForm?.closest("article.card") || null;
    if (accountCard) {
      const heading = accountCard.querySelector("h3");
      if (heading) {
        const headingText = [...heading.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (headingText) headingText.textContent = "Update account balances";
        else heading.prepend(document.createTextNode("Update account balances"));
      }
      const copy = accountCard.querySelector(".card-header p");
      if (copy) copy.textContent = "Enter the balances shown by your bank, wallet, or cash count. Any difference is safely recorded.";
      const submit = accountForm.querySelector('button[type="submit"]');
      if (submit) submit.textContent = "Save account updates";
      if (!accountForm.querySelector(".ledger-reconcile-note")) accountForm.insertAdjacentHTML("afterbegin", '<p class="v12-help ledger-reconcile-note">Saving a different balance records an adjustment so earlier account activity stays available.</p>');
    }

    const ledgerCard = document.createElement("article");
    ledgerCard.className = "card account-ledger-card";
    ledgerCard.id = "accountLedgerCard";
    ledgerCard.innerHTML = `
      <div class="card-header"><div><h3>Account ledger</h3><p>Every balance change, transfer, payment, and reconciliation</p></div><div class="ledger-header-actions"><button class="button button-primary button-small" id="openTransferDialog" type="button">Transfer money</button><button class="button button-secondary button-small" id="exportLedgerCsv" type="button">Export CSV</button></div></div>
      <div class="ledger-summary-grid"><div><span>Ledger entries</span><strong id="ledgerEntryCount">0</strong></div><div><span>Transfers</span><strong id="ledgerTransferCount">0</strong></div><div><span>Reconciliations</span><strong id="ledgerReconciliationCount">0</strong></div><div><span>Calculated accounts</span><strong id="ledgerAccountCount">0</strong></div></div>
      <div class="ledger-filter-grid"><div class="field"><label for="ledgerAccountFilter">Account</label><select class="select" id="ledgerAccountFilter"></select></div><div class="field"><label for="ledgerTypeFilter">Activity type</label><select class="select" id="ledgerTypeFilter"><option value="">All activity</option>${[...LEDGER_TYPES].map(type => `<option value="${type}">${LEDGER_LABELS[type]}</option>`).join("")}</select></div><div class="field ledger-search-field"><label for="ledgerSearch">Search</label><input class="input" id="ledgerSearch" placeholder="Description or note"></div></div>
      <div class="table-scroll"><table class="responsive-table ledger-table"><thead><tr><th>Date</th><th>Account</th><th>Activity</th><th>Description</th><th>Change</th><th>Balance after</th></tr></thead><tbody id="accountLedgerBody"></tbody></table></div>
      <p class="v12-help">Ledger entries are append-only. Corrections create reversal or reconciliation entries so earlier activity remains traceable.</p>`;

    const reconciliationCard = document.createElement("article");
    reconciliationCard.className = "card account-reconciliation-card";
    reconciliationCard.id = "accountReconciliationCard";
    reconciliationCard.innerHTML = `
      <div class="card-header"><div><h3>Reconciliation history</h3><p>Recorded differences between the app and actual account statements</p></div><button class="button button-secondary button-small" id="exportReconciliationsCsv" type="button">Export CSV</button></div>
      <div class="table-scroll"><table class="responsive-table reconciliation-table"><thead><tr><th>Date</th><th>Account</th><th>Before</th><th>Actual</th><th>Difference</th><th>Note</th></tr></thead><tbody id="accountReconciliationBody"></tbody></table></div>`;
    panel.append(ledgerCard, reconciliationCard);
    window.simplifyAccountLedgerSettings?.(panel, ledgerCard, reconciliationCard);

    document.querySelector("#incomeDialog .income-account-helper")?.replaceChildren(document.createTextNode("When enabled below, saving the income adds it to this account’s ledger balance."));
    const incomeTotalsField = document.getElementById("incomeIncludeTotalsField");
    if (incomeTotalsField && !document.getElementById("incomePostToLedgerField")) incomeTotalsField.insertAdjacentHTML("beforebegin", '<label class="expense-total-choice income-total-choice" id="incomePostToLedgerField" for="incomePostToLedger"><input id="incomePostToLedger" type="checkbox" checked><span><strong>Add to account balance</strong><small>Creates a traceable income-deposit entry in the selected account ledger.</small></span></label>');

    if (!document.getElementById("accountTransferDialog")) document.body.insertAdjacentHTML("beforeend", `
      <dialog id="accountTransferDialog" class="app-dialog dialog-form dialog-standard" aria-labelledby="accountTransferDialogTitle">
        <form id="accountTransferForm">
          <div class="modal-header"><h3 id="accountTransferDialogTitle">Transfer money</h3><button type="button" class="button button-secondary button-small" data-close-ledger-dialog="accountTransferDialog">Close</button></div>
          <div class="modal-body"><p class="required-note"><span class="required-mark">*</span> Required fields</p><div class="dialog-context-note">A transfer creates two linked ledger entries and does not count as income or an expense.</div><div class="form-grid">
            <div class="field"><label for="transferFromAccount">From account <span class="required-mark">*</span></label><select class="select" id="transferFromAccount" required></select></div>
            <div class="field"><label for="transferToAccount">To account <span class="required-mark">*</span></label><select class="select" id="transferToAccount" required></select></div>
            <div class="field"><label for="transferAmount">Amount <span class="required-mark">*</span></label><div class="calculator-input-shell"><input class="input" id="transferAmount" type="text" inputmode="decimal" autocomplete="off" data-money-input data-min="0.01" required placeholder="0.00"></div></div>
            <div class="field"><label for="transferDate">Transfer date <span class="required-mark">*</span></label><input class="input" id="transferDate" type="date" required></div>
            <div class="field field-full"><label for="transferNote">Note</label><textarea class="textarea" id="transferNote" rows="2" maxlength="240" placeholder="Optional transfer reference"></textarea></div>
            <div class="ledger-transfer-preview field-full" id="transferPreview" aria-live="polite"></div>
          </div></div>
          <div class="modal-footer form-action-footer"><span class="footer-spacer"></span><button type="button" class="button button-secondary" data-close-ledger-dialog="accountTransferDialog">Cancel</button><button type="submit" class="button button-primary" id="saveTransferButton">Transfer money</button></div>
        </form>
      </dialog>`);
    setupNumericInputs(document);
  }

  function ledgerRowsWithBalances() {
    const balances = {};
    return [...(data.accountLedger || [])]
      .sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)))
      .map(entry => {
        balances[entry.account] = roundMoney((balances[entry.account] || 0) + Number(entry.amount || 0));
        return { entry, balanceAfter:balances[entry.account] };
      });
  }

  function renderLedgerWorkspace() {
    injectLedgerUi();
    if (!document.getElementById("accountLedgerBody")) return;
    ensureLedgerShape(data);
    const accountFilter = document.getElementById("ledgerAccountFilter");
    const savedAccount = accountFilter.value;
    const activeAndHistorical = [...new Set([...accountNames(), ...(data.accountLedger || []).map(entry => entry.account)])].sort((a,b) => a.localeCompare(b));
    accountFilter.innerHTML = `<option value="">All accounts</option>${activeAndHistorical.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
    if (activeAndHistorical.includes(savedAccount)) accountFilter.value = savedAccount;
    const type = document.getElementById("ledgerTypeFilter")?.value || "";
    const search = document.getElementById("ledgerSearch")?.value.trim().toLowerCase() || "";
    const rows = ledgerRowsWithBalances().filter(({entry}) => !accountFilter.value || entry.account === accountFilter.value).filter(({entry}) => !type || entry.type === type).filter(({entry}) => !search || `${entry.description} ${entry.notes} ${entry.account} ${entry.counterpartAccount}`.toLowerCase().includes(search)).reverse().slice(0, 300);
    document.getElementById("accountLedgerBody").innerHTML = rows.length ? rows.map(({entry,balanceAfter}) => `<tr><td data-label="Date">${formatDate(entry.date)}</td><td data-label="Account">${escapeHtml(entry.account)}</td><td data-label="Activity"><span class="status-badge ${entry.amount >= 0 ? "status-saved" : "status-excluded"}">${escapeHtml(LEDGER_LABELS[entry.type] || entry.type)}</span></td><td data-label="Description"><strong>${escapeHtml(entry.description)}</strong>${entry.counterpartAccount ? `<small>${entry.amount < 0 ? "To" : "From"}: ${escapeHtml(entry.counterpartAccount)}</small>` : ""}${entry.notes ? `<small>${escapeHtml(entry.notes)}</small>` : ""}</td><td data-label="Change" class="amount ${entry.amount >= 0 ? "text-green" : "text-red"}">${entry.amount >= 0 ? "+" : "−"}${money(Math.abs(entry.amount))}</td><td data-label="Balance after" class="amount">${money(balanceAfter)}</td></tr>`).join("") : `<tr><td colspan="6"><div class="v12-empty">No ledger activity matches these filters.</div></td></tr>`;
    const reconciliations = [...(data.accountReconciliations || [])].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100);
    document.getElementById("accountReconciliationBody").innerHTML = reconciliations.length ? reconciliations.map(item => `<tr><td data-label="Date">${formatDate(item.date)}</td><td data-label="Account">${escapeHtml(item.account)}</td><td data-label="Before">${money(item.previousBalance)}</td><td data-label="Actual">${money(item.statementBalance)}</td><td data-label="Difference" class="amount ${item.difference >= 0 ? "text-green" : "text-red"}">${item.difference >= 0 ? "+" : "−"}${money(Math.abs(item.difference))}</td><td data-label="Note">${escapeHtml(item.note || "Balance reconciliation")}</td></tr>`).join("") : `<tr><td colspan="6"><div class="v12-empty">No reconciliations recorded yet.</div></td></tr>`;
    document.getElementById("ledgerEntryCount").textContent = String((data.accountLedger || []).length);
    document.getElementById("ledgerTransferCount").textContent = String(new Set((data.accountLedger || []).filter(entry => entry.transferId).map(entry => entry.transferId)).size);
    document.getElementById("ledgerReconciliationCount").textContent = String((data.accountReconciliations || []).length);
    document.getElementById("ledgerAccountCount").textContent = String(accountNames().length);
  }

  function openTransferDialog() {
    const from = document.getElementById("transferFromAccount");
    const to = document.getElementById("transferToAccount");
    const options = accountNames().map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)} · ${money(data.accounts[name])}</option>`).join("");
    from.innerHTML = options;
    to.innerHTML = options;
    from.value = accountNames()[0] || "";
    to.value = accountNames()[1] || accountNames()[0] || "";
    setMoneyInputValue("transferAmount", "", true);
    document.getElementById("transferDate").value = localDateKey();
    document.getElementById("transferNote").value = "";
    updateTransferPreview();
    showAppDialog("accountTransferDialog", "#transferFromAccount");
  }

  function updateTransferPreview() {
    const from = document.getElementById("transferFromAccount")?.value || "";
    const to = document.getElementById("transferToAccount")?.value || "";
    const amount = moneyInputValue("transferAmount") || 0;
    const fromBalance = Number(data.accounts?.[from] || 0);
    const preview = document.getElementById("transferPreview");
    if (!preview) return;
    preview.innerHTML = `<div><span>Source balance</span><strong>${from ? money(fromBalance) : "—"}</strong></div><div><span>After transfer</span><strong class="${amount > fromBalance ? "text-red" : ""}">${from ? money(fromBalance - amount) : "—"}</strong></div><div><span>Destination receives</span><strong class="text-green">${to ? money(amount) : "—"}</strong></div>`;
  }

  function submitTransfer() {
    const from = document.getElementById("transferFromAccount").value;
    const to = document.getElementById("transferToAccount").value;
    const date = document.getElementById("transferDate").value;
    if (!validateMoneyInput("transferAmount", { required:true, min:.01, message:"Enter a transfer amount greater than zero." })) return;
    const amount = roundMoney(moneyInputValue("transferAmount"));
    if (!from || !to || !date) return showToast("Complete all required transfer fields", "warning");
    if (from === to) return showToast("Choose two different accounts", "warning");
    if (!Object.prototype.hasOwnProperty.call(data.accounts, from) || !Object.prototype.hasOwnProperty.call(data.accounts, to)) return showToast("One of the transfer accounts no longer exists", "warning");
    if (roundMoney(data.accounts[from]) < amount) return showToast(`${from} has insufficient funds for this transfer`, "warning");
    pushUndo(`Transfer ${money(amount)} from ${from} to ${to}`);
    const transferId = uid();
    const note = document.getElementById("transferNote").value.trim();
    const added = appendLedgerEntries([
      { id:uid(), transactionId:transferId, operationId:`transfer-out:${transferId}`, account:from, counterpartAccount:to, type:"transfer-out", amount:-amount, date, description:`Transfer to ${to}`, transferId, source:"transfer", notes:note },
      { id:uid(), transactionId:transferId, operationId:`transfer-in:${transferId}`, account:to, counterpartAccount:from, type:"transfer-in", amount, date, description:`Transfer from ${from}`, transferId, source:"transfer", notes:note }
    ]);
    if (added.length !== 2) return showToast("The transfer could not be recorded", "warning");
    document.getElementById("accountTransferDialog").close();
    saveData(`${money(amount)} transferred from ${from} to ${to}`);
  }

  function submitAccountForm() {
    const originalName = document.getElementById("originalAccountName").value;
    const newName = document.getElementById("accountName").value.trim();
    if (!validateMoneyInput("accountBalance", { required:false, min:0, message:"Enter a valid account balance of zero or more." })) return;
    const balanceInput = document.getElementById("accountBalance").value.trim();
    const targetBalance = balanceInput === "" ? 0 : moneyInputValue("accountBalance");
    const type = ACCOUNT_TYPES.includes(document.getElementById("accountType").value) ? document.getElementById("accountType").value : "Other";
    if (!newName || !Number.isFinite(targetBalance)) return showToast("Enter a valid account name and balance", "warning");
    const duplicate = accountNames().some(name => name.toLowerCase() === newName.toLowerCase() && name !== originalName);
    if (duplicate) return showToast("An account with this name already exists", "warning");
    pushUndo(originalName ? `Edit account ${originalName}` : `Add account ${newName}`);
    const existingOrder = accountNames();
    if (originalName && originalName !== newName) {
      renameAccountReferences(originalName, newName);
      data.accountOrder = existingOrder.map(name => name === originalName ? newName : name);
      data.accounts[newName] = Number(data.accounts[originalName] || 0);
      delete data.accounts[originalName];
      data.accountTypes[newName] = data.accountTypes[originalName];
      delete data.accountTypes[originalName];
      if (data.accountIcons?.[originalName]) { data.accountIcons[newName] = data.accountIcons[originalName]; delete data.accountIcons[originalName]; }
      if (data.savingsSettings?.defaultAccount === originalName) data.savingsSettings.defaultAccount = newName;
    }
    data.accounts[newName] = Number(data.accounts[newName] || 0);
    data.accountTypes[newName] = type;
    data.accountIcons = data.accountIcons || {};
    const accountIcon = pickerIcon("account");
    if (accountIcon) data.accountIcons[newName] = accountIcon; else delete data.accountIcons[newName];
    if (!originalName && !data.accountOrder.includes(newName)) data.accountOrder.push(newName);
    if (!originalName) {
      const openingId = `opening:${uid()}`;
      appendLedgerEntries([{ id:uid(), transactionId:openingId, operationId:openingId, account:newName, type:"opening-balance", amount:targetBalance, date:localDateKey(), description:`Opening balance for ${newName}`, source:"account-create" }]);
    } else appendReconciliation(newName, targetBalance, { note:"Balance changed from Edit account" });
    recalculateBalances(data);
    if (type !== "Savings") (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && goal.linkedAccount === newName) { goal.sourceType = "manual"; goal.currentAmount = Number(data.accounts[newName] || 0); goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
    if (type === "Savings" && !data.savingsSettings.defaultAccount) data.savingsSettings.defaultAccount = newName;
    if (type !== "Savings" && data.savingsSettings.defaultAccount === newName) data.savingsSettings.defaultAccount = "";
    closeTrackedFormAfterAction("accountDialog");
    saveData(originalName ? "Account updated and reconciled" : "Account added with opening balance");
    refreshReconciledAccountState(newName, targetBalance);
  }

  function submitAccountsReconciliationForm() {
    const accountInputs = [...document.querySelectorAll(".account-input")];
    for (const input of accountInputs) if (!validateMoneyInput(input, { required:false, min:0, message:"Enter a balance of zero or more." })) return;
    const changes = accountInputs.map(input => ({ account:input.dataset.account, target:moneyInputValue(input) })).filter(item => roundMoney(data.accounts[item.account]) !== roundMoney(item.target));
    const typeChanges = [...document.querySelectorAll(".account-type-input")].filter(select => accountType(select.dataset.accountType) !== select.value);
    if (!changes.length && !typeChanges.length) return showToast("Account balances already match the entered values", "info");
    pushUndo("Reconcile account balances");
    typeChanges.forEach(select => { data.accountTypes[select.dataset.accountType] = ACCOUNT_TYPES.includes(select.value) ? select.value : "Other"; });
    changes.forEach(item => appendReconciliation(item.account, item.target, { note:"Balances form reconciliation" }));
    (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && accountType(goal.linkedAccount) !== "Savings") { goal.currentAmount = Number(data.accounts[goal.linkedAccount] || goal.currentAmount || 0); goal.sourceType = "manual"; goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
    if (data.savingsSettings.defaultAccount && accountType(data.savingsSettings.defaultAccount) !== "Savings") data.savingsSettings.defaultAccount = "";
    saveData(`${changes.length} account balance${changes.length === 1 ? "" : "s"} reconciled`);
  }

  function submitIncomeForm() {
    if (!validateMoneyInput("incomeAmount", {required:true,min:.01,message:"Enter an income amount greater than zero."})) return;
    const rawCategory=document.getElementById("incomeCategory").value;
    let category=rawCategory;
    if (INCOME_OTHER_CATEGORIES.has(rawCategory)) {
      category=document.getElementById("incomeCustomCategory").value.trim();
      if(!category || !/[A-Za-z0-9]/.test(category)) { setFieldError(document.getElementById("incomeCustomCategory"),"Enter a clear category name."); document.getElementById("incomeCustomCategory").focus(); return; }
    }
    const id=document.getElementById("incomeId").value;
    const existing=(data.incomeRecords||[]).find(item=>item.id===id);
    const recurring=document.getElementById("incomeRecurring").checked?"Monthly":"No";
    const categoryGroup = rawCategory === "Other wages" ? "Wages" : (rawCategory === "Transfer from savings" ? "Internal transfer" : (rawCategory === "Other income" ? "Other income" : incomeCategoryGroup(rawCategory)));
    const recordId = id || uid();
    const postToLedger = rawCategory !== "Transfer from savings" && Boolean(document.getElementById("incomePostToLedger")?.checked);
    const record={ id:recordId, name:document.getElementById("incomeName").value.trim(), amount:moneyInputValue("incomeAmount"), date:document.getElementById("incomeDate").value, category, categoryGroup, account:document.getElementById("incomeAccount").value, recurring, seriesId:existing?.seriesId || (recurring==="Monthly"?`income-series-${recordId}`:""), includeInTotals:category==="Transfer from savings"?false:document.getElementById("incomeIncludeInTotals").checked, notes:document.getElementById("incomeNotes").value.trim(), icon:pickerIcon("income"), ledgerTransactionId:existing?.ledgerTransactionId || "", postToLedger };
    if(!record.name || !record.date || !record.account) return showToast("Complete all required income fields", "warning");
    pushUndo(existing ? `Edit income ${record.name}` : `Add income ${record.name}`);
    if (existing?.ledgerTransactionId) reverseIncomeLedger(existing, postToLedger ? "Income was edited and reposted" : "Income posting was removed");
    record.ledgerTransactionId = "";
    if (postToLedger) postIncomeLedger(record);
    if(existing) Object.assign(existing,record); else data.incomeRecords.push(record);
    closeTrackedFormAfterAction("incomeDialog");
    saveData(postToLedger ? (existing?"Income updated and account ledger adjusted":"Income added to account ledger") : (existing?"Income updated":"Income added"));
  }

  async function deleteIncomeRecord(button) {
    const id=button.dataset.deleteIncome;
    const item=(data.incomeRecords||[]).find(record=>record.id===id);
    if(!item) return;
    const confirmed=await openAppConfirmation({title:"Delete income?",message:`Delete “${item.name}”?`,details:`${money(item.amount)} · ${item.category}${item.ledgerTransactionId ? " · its account deposit will be reversed" : ""}`,confirmLabel:"Delete income",danger:true});
    if(!confirmed) return;
    pushUndo(`Delete income ${item.name}`);
    if (item.ledgerTransactionId) reverseIncomeLedger(item, "Income record deleted");
    data.incomeRecords=data.incomeRecords.filter(record=>record.id!==id);
    closeTrackedFormAfterAction("incomeDialog");
    saveData(item.ledgerTransactionId ? "Income deleted and account deposit reversed" : "Income deleted");
  }

  async function deleteAccountSafely(button) {
    const name = button.dataset.deleteAccount;
    if (!name) return;
    if (accountNames().length <= 1) return showToast("Keep at least one account", "warning");
    const balance = roundMoney(data.accounts[name]);
    if (balance !== 0) return showToast(`Transfer or reconcile ${name} to ₱0.00 before deleting it. Current balance: ${money(balance)}`, "warning");
    const deductedPayments = data.expenses.filter(item => item.paid && item.accountDeducted && item.paidFromAccount === name).length;
    if (deductedPayments) return showToast(`Move ${deductedPayments} paid expense${deductedPayments === 1 ? "" : "s"} back to unpaid before deleting ${name}.`, "warning");
    const confirmed = await openAppConfirmation({ title:"Delete zero-balance account?", message:`Delete “${name}”?`, details:"Historical ledger entries remain available for audit, but the account will no longer appear in selectors.", confirmLabel:"Delete account", danger:true });
    if (!confirmed) return;
    pushUndo(`Delete account ${name}`);
    (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && goal.linkedAccount === name) { goal.sourceType = "manual"; goal.currentAmount = 0; goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
    delete data.accounts[name];
    delete data.accountTypes[name];
    if (data.accountIcons) delete data.accountIcons[name];
    data.accountOrder = accountNames().filter(accountName => accountName !== name);
    if (data.savingsSettings?.defaultAccount === name) data.savingsSettings.defaultAccount = "";
    if (button.closest("#accountDialog")) closeTrackedFormAfterAction("accountDialog");
    saveData("Zero-balance account deleted; ledger history preserved");
  }

  function exportLedgerCsv() {
    const rows = [["Date","Account","Activity Type","Description","Change","Counterpart Account","Transaction ID","Operation ID","Expense ID","Income ID","Transfer ID","Reconciliation ID","Notes"], ...(data.accountLedger || []).map(entry => [entry.date,entry.account,LEDGER_LABELS[entry.type] || entry.type,entry.description,entry.amount,entry.counterpartAccount,entry.transactionId,entry.operationId,entry.expenseId,entry.incomeId,entry.transferId,entry.reconciliationId,entry.notes])];
    exportCsv(`account-ledger-${localDateKey()}.csv`, rows);
  }

  function exportReconciliationsCsv() {
    const rows = [["Date","Account","Balance Before","Actual Statement Balance","Difference","Note","Ledger Entry ID"], ...(data.accountReconciliations || []).map(item => [item.date,item.account,item.previousBalance,item.statementBalance,item.difference,item.note,item.ledgerEntryId])];
    exportCsv(`account-reconciliations-${localDateKey()}.csv`, rows);
  }

  document.addEventListener("submit", event => {
    if (event.target?.id === "accountForm") { event.preventDefault(); event.stopImmediatePropagation(); submitAccountForm(); }
    else if (event.target?.id === "accountsForm") { event.preventDefault(); event.stopImmediatePropagation(); submitAccountsReconciliationForm(); }
    else if (event.target?.id === "incomeForm") { event.preventDefault(); event.stopImmediatePropagation(); submitIncomeForm(); }
    else if (event.target?.id === "accountTransferForm") { event.preventDefault(); event.stopImmediatePropagation(); submitTransfer(); }
  }, true);

  document.addEventListener("click", event => {
    const deleteIncome = event.target.closest("#deleteIncomeFromDialog");
    const deleteAccount = event.target.closest("[data-delete-account]");
    const openTransfer = event.target.closest("#openTransferDialog");
    const closeDialog = event.target.closest("[data-close-ledger-dialog]");
    const exportLedger = event.target.closest("#exportLedgerCsv");
    const exportReconciliations = event.target.closest("#exportReconciliationsCsv");
    if (deleteIncome) { event.preventDefault(); event.stopImmediatePropagation(); deleteIncomeRecord(deleteIncome); }
    else if (deleteAccount) { event.preventDefault(); event.stopImmediatePropagation(); deleteAccountSafely(deleteAccount); }
    else if (openTransfer) openTransferDialog();
    else if (closeDialog) document.getElementById(closeDialog.dataset.closeLedgerDialog)?.close();
    else if (exportLedger) exportLedgerCsv();
    else if (exportReconciliations) exportReconciliationsCsv();
  }, true);

  document.addEventListener("input", event => {
    if (["transferAmount","transferFromAccount","transferToAccount"].includes(event.target?.id)) updateTransferPreview();
    if (["ledgerSearch"].includes(event.target?.id)) renderLedgerWorkspace();
  });
  document.addEventListener("change", event => {
    if (["transferFromAccount","transferToAccount","ledgerAccountFilter","ledgerTypeFilter"].includes(event.target?.id)) {
      if (String(event.target.id).startsWith("transfer")) updateTransferPreview();
      else renderLedgerWorkspace();
    }
  });

  injectLedgerUi();
  recalculateBalances(data);
  if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("Account ledger updated");
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll(false);

  window.FinanceAccountLedger = {
    version:LEDGER_VERSION,
    recalculateBalances,
    appendLedgerEntries,
    appendReconciliation,
    render:renderLedgerWorkspace,
    get entries() { return cloneData(data.accountLedger || []); },
    get reconciliations() { return cloneData(data.accountReconciliations || []); }
  };
})();
