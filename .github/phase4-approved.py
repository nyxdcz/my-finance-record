from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text()

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)

def replace_once(path, old, new, label):
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match in {path}, found {count}")
    write(path, source.replace(old, new, 1))

def regex_once(path, pattern, replacement, label, flags=0):
    source = read(path)
    next_source, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected one regex match in {path}, found {count}")
    write(path, next_source)

integrity_js = r'''"use strict";
(function financeIntegrityBootstrap(root) {
  const VERSION = 1;
  const EPSILON = 0.005;

  function clone(value) {
    try { return structuredClone(value); } catch (error) {}
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }
  function roundMoney(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function finiteMoney(value) { return Number.isFinite(Number(value)); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function issue(severity, code, message, details = {}, repair = null) {
    return { severity, code, message, details:clone(details), repair:repair ? clone(repair) : null };
  }
  function stable(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  function financialProjection(value) {
    const source = asObject(value);
    return {
      accounts:asObject(source.accounts),
      accountLedger:asArray(source.accountLedger),
      accountReconciliations:asArray(source.accountReconciliations),
      expenses:asArray(source.expenses).map(item => ({
        id:item?.id || "", paid:Boolean(item?.paid), accountDeducted:Boolean(item?.accountDeducted),
        paidFromAccount:item?.paidFromAccount || "", paidAmount:Number(item?.paidAmount || 0), paymentTransactionId:item?.paymentTransactionId || "",
        autoPaidAtMonthEnd:Boolean(item?.autoPaidAtMonthEnd)
      })),
      incomeRecords:asArray(source.incomeRecords).map(item => ({
        id:item?.id || "", account:item?.account || "", amount:Number(item?.amount || 0), postToLedger:Boolean(item?.postToLedger), ledgerTransactionId:item?.ledgerTransactionId || ""
      }))
    };
  }
  function currentProfileId() {
    try { return String(root.FinanceProfileArchitecture?.activeProfileId?.() || "profile-personal"); } catch (error) { return "profile-personal"; }
  }
  function readStored(key) {
    try {
      const raw = root.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) { return null; }
  }
  function storageIssues(source) {
    if (!root.localStorage) return [];
    const active = readStored("simple-finance-project-records-v2");
    const profile = readStored(`simple-finance-profile-data-v1:${currentProfileId()}`);
    const issues = [];
    if (active && profile && stable(financialProjection(active)) !== stable(financialProjection(profile))) {
      issues.push(issue("warning", "storage-profile-mismatch", "The active local finance copy and active profile copy do not match.", { profileId:currentProfileId() }));
    }
    if (active && source && stable(financialProjection(active)) !== stable(financialProjection(source))) {
      issues.push(issue("warning", "runtime-storage-mismatch", "The current runtime finance state does not match the active local copy."));
    }
    return issues;
  }

  function scan(source, { includeStorage = false } = {}) {
    const target = asObject(source);
    const accounts = asObject(target.accounts);
    const ledger = asArray(target.accountLedger);
    const reconciliations = asArray(target.accountReconciliations);
    const expenses = asArray(target.expenses);
    const incomes = asArray(target.incomeRecords);
    const issues = [];
    const accountNames = new Set(Object.keys(accounts));
    const ledgerById = new Map();
    const ledgerByTransaction = new Map();
    const operationIds = new Set();
    const requestTransactions = new Map();
    const calculated = Object.fromEntries(Object.keys(accounts).map(name => [name, 0]));
    const hasLedgerHistory = ledger.length > 0;

    for (const [name, balance] of Object.entries(accounts)) {
      if (!finiteMoney(balance)) issues.push(issue("critical", "invalid-account-balance", `Account “${name}” has an invalid balance.`, { account:name, value:balance }));
    }

    for (const entry of ledger) {
      if (!entry || typeof entry !== "object") {
        issues.push(issue("critical", "invalid-ledger-entry", "Account Ledger contains an invalid entry."));
        continue;
      }
      const id = String(entry.id || "");
      const operationId = String(entry.operationId || "");
      const account = String(entry.account || "");
      const transactionId = String(entry.transactionId || "");
      if (!id) issues.push(issue("critical", "missing-ledger-id", "A ledger entry is missing its ID.", { operationId }));
      else if (ledgerById.has(id)) issues.push(issue("critical", "duplicate-ledger-id", `Ledger entry ID “${id}” is duplicated.`, { id }));
      else ledgerById.set(id, entry);
      if (!operationId) issues.push(issue("warning", "missing-operation-id", "A ledger entry is missing its operation ID.", { id }));
      else if (operationIds.has(operationId)) issues.push(issue("critical", "duplicate-operation-id", `Ledger operation “${operationId}” is duplicated.`, { operationId }));
      else operationIds.add(operationId);
      if (!finiteMoney(entry.amount)) issues.push(issue("critical", "invalid-ledger-amount", `Ledger entry “${id || operationId || "unknown"}” has an invalid amount.`, { id, amount:entry.amount }));
      if (!accountNames.has(account)) issues.push(issue("critical", "ledger-account-missing", `Ledger entry references missing account “${account || "unknown"}”.`, { id, account }));
      else if (finiteMoney(entry.amount)) calculated[account] = roundMoney(calculated[account] + Number(entry.amount));
      if (transactionId) {
        if (!ledgerByTransaction.has(transactionId)) ledgerByTransaction.set(transactionId, []);
        ledgerByTransaction.get(transactionId).push(entry);
      }
      const requestId = String(entry.requestId || "");
      if (requestId) {
        if (!requestTransactions.has(requestId)) requestTransactions.set(requestId, new Set());
        requestTransactions.get(requestId).add(transactionId || id || operationId);
      }
    }

    if (!hasLedgerHistory && Object.keys(accounts).length && Number(target?.ledgerSettings?.version || 0) < 1) {
      issues.push(issue("warning", "legacy-ledger-migration", "This dataset predates Account Ledger initialization and will use the existing opening-balance migration."));
    }
    if (hasLedgerHistory) {
      for (const [account, balance] of Object.entries(accounts)) {
        if (!finiteMoney(balance) || !finiteMoney(calculated[account])) continue;
        const targetBalance = roundMoney(calculated[account]);
        if (Math.abs(roundMoney(balance) - targetBalance) >= EPSILON) {
          issues.push(issue("safe-repair", "ledger-balance-mismatch", `Cached balance for “${account}” does not match Account Ledger.`, { account, stored:roundMoney(balance), ledger:targetBalance }, { type:"recalculate-account", account, target:targetBalance }));
        }
      }
    }

    for (const reconciliation of reconciliations) {
      if (!reconciliation || typeof reconciliation !== "object") {
        issues.push(issue("critical", "invalid-reconciliation", "Account reconciliation history contains an invalid record."));
        continue;
      }
      const id = String(reconciliation.id || "");
      const account = String(reconciliation.account || "");
      const linkedId = String(reconciliation.ledgerEntryId || "");
      let linked = linkedId ? ledgerById.get(linkedId) : null;
      if (!linked) {
        const candidates = ledger.filter(entry => entry?.reconciliationId === id && entry?.account === account);
        if (candidates.length === 1) {
          linked = candidates[0];
          issues.push(issue("safe-repair", "reconciliation-link-missing", `Reconciliation “${id || account}” can be relinked to its unambiguous ledger entry.`, { reconciliationId:id, account }, { type:"relink-reconciliation", reconciliationId:id, ledgerEntryId:String(linked.id || "") }));
        } else {
          issues.push(issue("critical", "broken-reconciliation", `Reconciliation “${id || account}” does not have a valid ledger link.`, { reconciliationId:id, account, candidates:candidates.length }));
          continue;
        }
      }
      if (linked.account !== account || linked.reconciliationId !== id || linked.type !== "reconciliation-adjustment") {
        issues.push(issue("critical", "reconciliation-ledger-mismatch", `Reconciliation “${id || account}” does not match its ledger entry.`, { reconciliationId:id, ledgerEntryId:linked.id }));
      }
      if (!finiteMoney(reconciliation.difference) || !finiteMoney(linked.amount) || roundMoney(reconciliation.difference) !== roundMoney(linked.amount)) {
        issues.push(issue("critical", "reconciliation-amount-mismatch", `Reconciliation “${id || account}” amount does not match Account Ledger.`, { reconciliationId:id }));
      }
    }

    const transferGroups = new Map();
    for (const entry of ledger.filter(item => item?.type === "transfer-out" || item?.type === "transfer-in")) {
      const transferId = String(entry.transferId || "");
      if (!transferId) {
        issues.push(issue("critical", "transfer-id-missing", "A transfer ledger entry is missing its transfer ID.", { ledgerEntryId:entry.id || "" }));
        continue;
      }
      if (!transferGroups.has(transferId)) transferGroups.set(transferId, []);
      transferGroups.get(transferId).push(entry);
    }
    for (const [transferId, entries] of transferGroups) {
      const outgoing = entries.filter(entry => entry.type === "transfer-out");
      const incoming = entries.filter(entry => entry.type === "transfer-in");
      if (entries.length !== 2 || outgoing.length !== 1 || incoming.length !== 1) {
        issues.push(issue("critical", "transfer-pair-incomplete", `Transfer “${transferId}” does not have exactly one outgoing and one incoming ledger entry.`, { transferId, count:entries.length }));
        continue;
      }
      const out = outgoing[0], inc = incoming[0];
      if (String(out.transactionId || "") !== String(inc.transactionId || "") || roundMoney(Number(out.amount || 0) + Number(inc.amount || 0)) !== 0 || Number(out.amount) >= 0 || Number(inc.amount) <= 0 || out.counterpartAccount !== inc.account || inc.counterpartAccount !== out.account) {
        issues.push(issue("critical", "transfer-pair-mismatch", `Transfer “${transferId}” has mismatched ledger sides.`, { transferId }));
      }
    }

    for (const expense of expenses) {
      if (!expense || typeof expense !== "object") continue;
      const id = String(expense.id || "");
      const paid = Boolean(expense.paid);
      const deducted = Boolean(expense.accountDeducted);
      const transactionId = String(expense.paymentTransactionId || "");
      const paidAccount = String(expense.paidFromAccount || "");
      const paidAmount = Number(expense.paidAmount || 0);
      if (paid && deducted) {
        const entries = asArray(ledgerByTransaction.get(transactionId)).filter(entry => entry?.expenseId === id && ["expense-payment", "gym-auto-payment"].includes(entry?.type));
        if (!transactionId || entries.length !== 1) {
          issues.push(issue("critical", "expense-payment-ledger-missing", `Paid expense “${expense.name || id}” does not have exactly one payment debit.`, { expenseId:id, transactionId, count:entries.length }));
        } else {
          const debit = entries[0];
          if (!paidAccount || debit.account !== paidAccount || !finiteMoney(paidAmount) || roundMoney(debit.amount) !== roundMoney(-paidAmount)) {
            issues.push(issue("critical", "expense-payment-mismatch", `Paid expense “${expense.name || id}” does not match its payment ledger debit.`, { expenseId:id, ledgerEntryId:debit.id || "" }));
          }
        }
      }
      if (!paid && (deducted || paidAccount || transactionId || Math.abs(paidAmount) >= EPSILON)) {
        issues.push(issue("warning", "unpaid-expense-payment-state", `Unpaid expense “${expense.name || id}” still contains payment state.`, { expenseId:id }));
      }
    }

    for (const reversal of ledger.filter(entry => entry?.type === "expense-payment-reversal")) {
      const originalId = String(reversal.reversesEntryId || "");
      if (!originalId) {
        issues.push(issue("warning", "legacy-payment-reversal-link", "A payment reversal has no link to its original debit.", { ledgerEntryId:reversal.id || "" }));
        continue;
      }
      const original = ledgerById.get(originalId);
      if (!original || !["expense-payment", "gym-auto-payment"].includes(original.type) || original.expenseId !== reversal.expenseId || original.account !== reversal.account || roundMoney(Number(original.amount || 0) + Number(reversal.amount || 0)) !== 0) {
        issues.push(issue("critical", "payment-reversal-mismatch", "A payment reversal does not match its original payment debit.", { ledgerEntryId:reversal.id || "", reversesEntryId:originalId }));
      }
    }

    for (const income of incomes) {
      if (!income || typeof income !== "object" || (!income.postToLedger && !income.ledgerTransactionId)) continue;
      const id = String(income.id || "");
      const transactionId = String(income.ledgerTransactionId || "");
      const deposits = asArray(ledgerByTransaction.get(transactionId)).filter(entry => entry?.type === "income-deposit" && entry?.incomeId === id);
      if (!transactionId || deposits.length !== 1) {
        issues.push(issue("critical", "income-deposit-ledger-missing", `Posted income “${income.name || id}” does not have exactly one active deposit.`, { incomeId:id, transactionId, count:deposits.length }));
        continue;
      }
      const deposit = deposits[0];
      if (deposit.account !== income.account || roundMoney(deposit.amount) !== roundMoney(income.amount)) {
        issues.push(issue("critical", "income-deposit-mismatch", `Posted income “${income.name || id}” does not match its ledger deposit.`, { incomeId:id, ledgerEntryId:deposit.id || "" }));
      }
    }

    for (const [requestId, transactions] of requestTransactions) {
      if (transactions.size > 1) issues.push(issue("critical", "idempotency-request-conflict", `Request ID “${requestId}” is reused by multiple financial transactions.`, { requestId, transactions:[...transactions] }));
    }

    if (includeStorage) issues.push(...storageIssues(target));
    const counts = {
      critical:issues.filter(item => item.severity === "critical").length,
      warning:issues.filter(item => item.severity === "warning").length,
      safeRepair:issues.filter(item => item.severity === "safe-repair").length
    };
    return { version:VERSION, ok:counts.critical === 0, issues, counts, checkedAt:new Date().toISOString() };
  }

  function repairSafe(source) {
    const before = scan(source, { includeStorage:false });
    if (before.counts.critical) return { ok:false, data:clone(source), changes:[], report:before, reason:"critical-issues" };
    const next = clone(asObject(source));
    next.accounts = asObject(next.accounts);
    next.accountReconciliations = asArray(next.accountReconciliations);
    const changes = [];
    for (const item of before.issues.filter(candidate => candidate.severity === "safe-repair" && candidate.repair)) {
      const repair = item.repair;
      if (repair.type === "recalculate-account" && Object.prototype.hasOwnProperty.call(next.accounts, repair.account)) {
        next.accounts[repair.account] = roundMoney(repair.target);
        changes.push({ type:repair.type, account:repair.account, target:roundMoney(repair.target) });
      } else if (repair.type === "relink-reconciliation") {
        const reconciliation = next.accountReconciliations.find(candidate => candidate?.id === repair.reconciliationId);
        if (reconciliation && repair.ledgerEntryId) {
          reconciliation.ledgerEntryId = repair.ledgerEntryId;
          changes.push({ type:repair.type, reconciliationId:repair.reconciliationId, ledgerEntryId:repair.ledgerEntryId });
        }
      }
    }
    const report = scan(next, { includeStorage:false });
    return { ok:report.counts.critical === 0, data:next, changes, report };
  }

  function summary(report) {
    const counts = report?.counts || { critical:0, warning:0, safeRepair:0 };
    if (counts.critical) return `${counts.critical} critical · ${counts.warning} review · ${counts.safeRepair} safe repair`;
    if (counts.warning || counts.safeRepair) return `${counts.warning} review · ${counts.safeRepair} safe repair`;
    return "No financial integrity issues found";
  }

  root.FinanceIntegrity = Object.freeze({ version:VERSION, scan, repairSafe, summary, financialProjection });
})(typeof window !== "undefined" ? window : globalThis);
'''
write("assets/js/finance-integrity.js", integrity_js)

# Account Ledger: add a deterministic safe-repair owner and export it.
ledger = read("assets/js/account-ledger.js")
marker = '''  function requestLedgerEntries(requestId, types = []) {'''
if marker not in ledger:
    raise SystemExit("account-ledger safe repair insertion marker missing")
repair_fn = r'''  function commitSafeIntegrityRepair({ message = "Safe financial integrity repairs applied" } = {}) {
    const service = window.FinanceIntegrity;
    if (!service?.repairSafe || !service?.scan) return { ok:false, reason:"integrity-service-unavailable" };
    const planned = service.repairSafe(data);
    if (!planned.ok) return { ok:false, reason:planned.reason || "critical-integrity", report:planned.report };
    if (!planned.changes.length) return { ok:true, skipped:true, count:0, report:planned.report };
    const expectedBalances = Object.entries(planned.data.accounts || {}).map(([account, target]) => ({ account, target:roundMoney(target) }));
    const repairedReconciliations = cloneData(planned.data.accountReconciliations || []);
    const transaction = runLedgerTransaction({
      undoLabel:"Repair safe financial integrity issues",
      message,
      expectedBalances,
      mutate:() => {
        data.accounts = cloneData(planned.data.accounts || {});
        data.accountReconciliations = repairedReconciliations;
        return { kind:"integrity-safe-repair", changed:true, changes:cloneData(planned.changes) };
      },
      verify:target => {
        const report = service.scan(target, { includeStorage:false });
        return report.counts.critical ? report.issues.filter(item => item.severity === "critical").map(item => `integrity:${item.code}`) : [];
      }
    });
    const report = service.scan(data, { includeStorage:true });
    return transaction.ok ? { ok:true, count:planned.changes.length, changes:planned.changes, report } : { ok:false, reason:transaction.reason || "transaction-failed", report };
  }

'''
ledger = ledger.replace(marker, repair_fn + marker, 1)
ledger = ledger.replace('''    capabilities:{ unifiedMoneyMutations:true, centralizedOwnership:true, transactionalPersistence:true, localVerification:true, profileVerification:true, ledgerInvariants:true, domainInvariants:true, rollback:true, idempotentRequests:true, externalPayments:true, paymentAccountCorrection:true, reconciliationBatch:true },''', '''    capabilities:{ unifiedMoneyMutations:true, centralizedOwnership:true, transactionalPersistence:true, localVerification:true, profileVerification:true, ledgerInvariants:true, domainInvariants:true, rollback:true, idempotentRequests:true, externalPayments:true, paymentAccountCorrection:true, reconciliationBatch:true, integrityRepair:true },''', 1)
ledger = ledger.replace('''    reconcileAccounts:commitReconciliationBatch,
    quickSpend:commitQuickSpend,''', '''    reconcileAccounts:commitReconciliationBatch,
    repairSafeIntegrity:commitSafeIntegrityRepair,
    quickSpend:commitQuickSpend,''', 1)
write("assets/js/account-ledger.js", ledger)

# Privacy/recovery: make import reconciliation explicit and rollback to the persisted pre-import recovery snapshot.
privacy = read("assets/js/privacy-lock.js")
old_reconcile = r'''  function reconcileImportedAccountBalances(mode, conflictPolicy){
    const service=window.FinanceLedgerTransactions;
    if(!service?.reconcileAccounts) return 0;
    if(window.FinanceProfileArchitecture?.canWrite?.()===false) return 0;
    const desired=importedAccounts();
    const before=importReviewState.beforeAccounts || {};
    const after=currentAccounts();
    const changes=[];
    Object.entries(desired).forEach(([name, rawValue])=>{
      const target=Number(rawValue);
      if(!Number.isFinite(target) || !Object.prototype.hasOwnProperty.call(after,name)) return;
      const existedBefore=Object.prototype.hasOwnProperty.call(before,name);
      const shouldUseIncoming=mode==="replace" || conflictPolicy==="incoming" || !existedBefore;
      if(!shouldUseIncoming) return;
      const actual=Number(after[name] || 0);
      if(Math.abs(actual-target)<0.005) return;
      changes.push({account:name,target});
    });
    if(!changes.length) return 0;
    const result=service.reconcileAccounts(changes,{note:"Imported backup balance",message:"Imported account balances reconciled",recordUndo:false});
    if(!result?.ok){ console.error("Imported balance reconciliation failed",result?.reason || "unknown error"); return 0; }
    return Number(result.count || 0);
  }
'''
new_reconcile = r'''  function reconcileImportedAccountBalances(mode, conflictPolicy){
    const service=window.FinanceLedgerTransactions;
    if(!service?.reconcileAccounts) return {ok:false,count:0,reason:"ledger-transaction-service-unavailable"};
    if(window.FinanceProfileArchitecture?.canWrite?.()===false) return {ok:false,count:0,reason:"read-only"};
    const desired=importedAccounts();
    const before=importReviewState.beforeAccounts || {};
    const after=currentAccounts();
    const changes=[];
    Object.entries(desired).forEach(([name, rawValue])=>{
      const target=Number(rawValue);
      if(!Number.isFinite(target) || !Object.prototype.hasOwnProperty.call(after,name)) return;
      const existedBefore=Object.prototype.hasOwnProperty.call(before,name);
      const shouldUseIncoming=mode==="replace" || conflictPolicy==="incoming" || !existedBefore;
      if(!shouldUseIncoming) return;
      const actual=Number(after[name] || 0);
      if(Math.abs(actual-target)<0.005) return;
      changes.push({account:name,target});
    });
    if(!changes.length) return {ok:true,count:0};
    const result=service.reconcileAccounts(changes,{note:"Imported backup balance",message:"Imported account balances reconciled",recordUndo:false});
    if(!result?.ok){ console.error("Imported balance reconciliation failed",result?.reason || "unknown error"); return {ok:false,count:0,reason:result?.reason || "reconciliation-failed"}; }
    return {ok:true,count:Number(result.count || 0)};
  }
'''
if old_reconcile not in privacy:
    raise SystemExit("privacy reconcile function changed")
privacy = privacy.replace(old_reconcile, new_reconcile, 1)

getall_marker = r'''  async function recoveryGetAll(){
    const db=await openRecoveryDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(RECOVERY_STORE,"readonly");
      const request=tx.objectStore(RECOVERY_STORE).getAll();
      request.onsuccess=()=>resolve(request.result || []);
      request.onerror=()=>reject(request.error || new Error("Could not read recovery snapshots"));
      tx.oncomplete=()=>db.close();
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("Recovery read was aborted")); };
    });
  }
'''
restore_helpers = getall_marker + r'''

  async function recoveryGet(id){
    if(!id) return null;
    const db=await openRecoveryDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(RECOVERY_STORE,"readonly");
      const request=tx.objectStore(RECOVERY_STORE).get(id);
      request.onsuccess=()=>resolve(request.result || null);
      request.onerror=()=>reject(request.error || new Error("Could not read recovery snapshot"));
      tx.oncomplete=()=>db.close();
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("Recovery snapshot read was aborted")); };
    });
  }

  async function restoreRecoverySnapshot(id,fallbackData,message="Import rolled back to the recovery snapshot"){
    const snapshot=await recoveryGet(id).catch(()=>null);
    const source=cloneValue(snapshot?.data || fallbackData || {});
    if(!source || typeof source!=="object") throw new Error("The pre-import recovery snapshot is unavailable.");
    if(typeof data!=="undefined") data=typeof normalizeData==="function" ? normalizeData(source) : source;
    if(typeof persistFinanceDataRaw==="function"){
      const saved=persistFinanceDataRaw(message);
      if(saved===false) throw new Error("The recovery snapshot could not be restored to local storage.");
    } else {
      localStorage.setItem("simple-finance-project-records-v2",JSON.stringify(data));
      window.FinanceProfileArchitecture?.persistCurrentData?.(data,message);
    }
    try { if(typeof renderAll==="function") renderAll(false); } catch(error) { console.error("Recovery snapshot restored but UI refresh failed",error); }
    return true;
  }
'''
if getall_marker not in privacy:
    raise SystemExit("privacy recoveryGetAll marker changed")
privacy = privacy.replace(getall_marker, restore_helpers, 1)

old_execute = r'''  async function executeRecoveryImport(button,action){
    if(recoveryImportBusy) return;
    recoveryImportBusy=true;
    setImportButtonsBusy(true,button);
    const dialog=document.getElementById("syncReviewDialog");
    let originalCreateRecoverySnapshot=null;
    let replacedSnapshotCreator=false;
    try {
      await ensureRecoveryStorageReady();
      const before=currentFinanceData();
      const recoveryMeta=await persistRecoverySnapshot(`Before ${action[0]} import`,before);

      try {
        if(typeof createRecoverySnapshot!=="function") throw new Error("Recovery snapshot hook is unavailable");
        originalCreateRecoverySnapshot=createRecoverySnapshot;
        createRecoverySnapshot=function(){ return recoveryMeta; };
        replacedSnapshotCreator=true;
      } catch(error){
        throw new Error(`Could not attach safe recovery storage: ${error?.message || "unknown error"}`);
      }

      if(typeof window.applyPendingSyncImport!=="function") throw new Error("Import action is unavailable");
      window.applyPendingSyncImport(action[0],action[1]);
      if(dialog?.open) throw new Error("Import review expired. Choose the backup again.");
      reconcileImportedAccountBalances(action[0],action[1]);
      clearImportReviewCapture();
    } catch(error) {
      console.error("Recovery import action failed",error);
      try { if(typeof showToast==="function") showToast(`Import failed: ${error?.message || "unknown error"}`,"warning"); } catch(e){}
    } finally {
      if(replacedSnapshotCreator){
        try { createRecoverySnapshot=originalCreateRecoverySnapshot; } catch(e){}
      }
      setImportButtonsBusy(false);
      recoveryImportBusy=false;
    }
  }
'''
new_execute = r'''  async function executeRecoveryImport(button,action){
    if(recoveryImportBusy) return;
    recoveryImportBusy=true;
    setImportButtonsBusy(true,button);
    const dialog=document.getElementById("syncReviewDialog");
    let originalCreateRecoverySnapshot=null;
    let replacedSnapshotCreator=false;
    let recoveryMeta=null;
    let before=null;
    let importApplied=false;
    try {
      await ensureRecoveryStorageReady();
      before=currentFinanceData();
      recoveryMeta=await persistRecoverySnapshot(`Before ${action[0]} import`,before);
      const integrity=window.FinanceIntegrity;
      if(!integrity?.scan) throw new Error("Financial integrity protection is unavailable. Reload Talaan before importing records.");
      const incoming=importReviewState.bundle?.data || importReviewState.bundle || {};
      const incomingReport=integrity.scan(incoming,{includeStorage:false});
      if(incomingReport.counts.critical) throw new Error(`Import blocked: ${incomingReport.counts.critical} critical financial integrity issue${incomingReport.counts.critical===1?"":"s"} found.`);

      try {
        if(typeof createRecoverySnapshot!=="function") throw new Error("Recovery snapshot hook is unavailable");
        originalCreateRecoverySnapshot=createRecoverySnapshot;
        createRecoverySnapshot=function(){ return recoveryMeta; };
        replacedSnapshotCreator=true;
      } catch(error){
        throw new Error(`Could not attach safe recovery storage: ${error?.message || "unknown error"}`);
      }

      if(typeof window.applyPendingSyncImport!=="function") throw new Error("Import action is unavailable");
      window.applyPendingSyncImport(action[0],action[1]);
      importApplied=true;
      if(dialog?.open) throw new Error("Import review expired. Choose the backup again.");
      const appliedReport=integrity.scan(currentFinanceData(),{includeStorage:false});
      if(appliedReport.counts.critical) throw new Error(`Imported records failed integrity verification with ${appliedReport.counts.critical} critical issue${appliedReport.counts.critical===1?"":"s"}.`);
      const reconciliation=reconcileImportedAccountBalances(action[0],action[1]);
      if(!reconciliation?.ok) throw new Error(`Imported account reconciliation failed: ${reconciliation?.reason || "unknown error"}.`);
      const finalReport=integrity.scan(currentFinanceData(),{includeStorage:true});
      if(finalReport.counts.critical) throw new Error(`Imported records failed final integrity verification with ${finalReport.counts.critical} critical issue${finalReport.counts.critical===1?"":"s"}.`);
      clearImportReviewCapture();
    } catch(error) {
      if(importApplied && recoveryMeta?.id){
        try { await restoreRecoverySnapshot(recoveryMeta.id,before,"Import failed; pre-import recovery snapshot restored"); }
        catch(rollbackError){ console.error("Recovery import rollback failed",rollbackError); }
      }
      console.error("Recovery import action failed",error);
      try { if(typeof showToast==="function") showToast(`Import failed: ${error?.message || "unknown error"}`,"warning"); } catch(e){}
    } finally {
      if(replacedSnapshotCreator){
        try { createRecoverySnapshot=originalCreateRecoverySnapshot; } catch(e){}
      }
      setImportButtonsBusy(false);
      recoveryImportBusy=false;
    }
  }
'''
if old_execute not in privacy:
    raise SystemExit("privacy executeRecoveryImport changed")
privacy = privacy.replace(old_execute, new_execute, 1)
write("assets/js/privacy-lock.js", privacy)

# Security profiles: guarded full replacements + user-facing integrity card.
security = read("assets/js/security-profiles.js")
canwrite_marker = '''  function canWrite() { return activeRole() !== "viewer"; }\n'''
if canwrite_marker not in security:
    raise SystemExit("security canWrite marker missing")
security_helpers = canwrite_marker + r'''
  function integrityReport(source = (typeof data !== "undefined" ? data : profileData() || {}), includeStorage = true) {
    const service = window.FinanceIntegrity;
    if (!service?.scan) throw new Error("Financial integrity protection is unavailable. Reload Talaan.");
    return service.scan(source, { includeStorage });
  }

  function assertReplacementIntegrity(source, label = "Finance data") {
    const report = integrityReport(source, false);
    if (report.counts.critical) throw new Error(`${label} contains ${report.counts.critical} critical financial integrity issue${report.counts.critical === 1 ? "" : "s"}. The current profile was not replaced.`);
    return report;
  }

  function restoreReplacementSnapshot(snapshot, message = "Finance replacement rolled back") {
    if (typeof data !== "undefined") data = typeof normalizeData === "function" ? normalizeData(clone(snapshot)) : clone(snapshot);
    if (typeof persistFinanceDataRaw === "function") {
      const saved = persistFinanceDataRaw(message);
      if (saved === false) throw new Error("The previous finance state could not be restored.");
    } else {
      localStorage.setItem(ACTIVE_DATA_KEY, JSON.stringify(data));
      persistCurrentData(data, message);
    }
    if (typeof renderAll === "function") renderAll(false);
  }

  function applyGuardedFinanceReplacement(source, message) {
    if (!canWrite()) throw new Error("Viewer profiles cannot replace records.");
    assertReplacementIntegrity(source, message);
    const before = clone(typeof data !== "undefined" ? data : profileData() || {});
    try {
      const next = typeof normalizeData === "function" ? normalizeData(clone(source)) : clone(source);
      const normalizedReport = integrityReport(next, false);
      if (normalizedReport.counts.critical) throw new Error(`${message} failed integrity verification before persistence.`);
      if (typeof data !== "undefined") data = next;
      if (typeof persistFinanceDataRaw === "function") {
        const saved = persistFinanceDataRaw(message);
        if (saved === false) throw new Error(`${message} could not be saved on this device.`);
      } else {
        localStorage.setItem(ACTIVE_DATA_KEY, JSON.stringify(next));
        if (!persistCurrentData(next, message)) throw new Error(`${message} could not be stored in the active profile.`);
      }
      const finalReport = integrityReport(typeof data !== "undefined" ? data : next, true);
      if (finalReport.counts.critical) throw new Error(`${message} failed final integrity verification.`);
      if (typeof renderAll === "function") renderAll(false);
      return finalReport;
    } catch (error) {
      restoreReplacementSnapshot(before, `${message} rolled back`);
      throw error;
    }
  }
'''
security = security.replace(canwrite_marker, security_helpers, 1)
security = security.replace('''    if (typeof pushUndo === "function") pushUndo("Before encrypted backup restore");
    if (typeof data !== "undefined") data = typeof normalizeData === "function" ? normalizeData(payload.data) : payload.data;
    if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("Encrypted backup restored");
    else {
      localStorage.setItem(ACTIVE_DATA_KEY, JSON.stringify(data));
      persistCurrentData(data, "Encrypted backup restored");
    }
    if (typeof renderAll === "function") renderAll(false);''', '''    if (typeof pushUndo === "function") pushUndo("Before encrypted backup restore");
    applyGuardedFinanceReplacement(payload.data, "Encrypted backup restored");''', 1)
security = security.replace('''    if (typeof pushUndo === "function") pushUndo("Before cloud restore point");
    data = typeof normalizeData === "function" ? normalizeData(snapshot.data) : snapshot.data;
    if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("Cloud restore point applied");
    if (typeof renderAll === "function") renderAll(false);''', '''    if (typeof pushUndo === "function") pushUndo("Before cloud restore point");
    applyGuardedFinanceReplacement(snapshot.data, "Cloud restore point applied");''', 1)

card_marker = '''      <div class="profile-two-column">'''
integrity_card = r'''      <article class="card profile-integrity-card">
        <div class="card-header"><div><h3>Financial integrity</h3><p>Check Account Ledger, payments, income deposits, transfers, reconciliations, and persisted profile state</p></div><span class="v13-chip info" id="financeIntegrityChip">Not checked</span></div>
        <p class="v13-help" id="financeIntegritySummary">Run a read-only integrity check. Talaan will not invent missing transactions or change financial history automatically.</p>
        <div class="profile-actions"><button class="button button-secondary" id="runIntegrityCheckButton" type="button">Run integrity check</button><button class="button button-primary" id="repairIntegrityButton" type="button" hidden ${canWrite() ? "" : "disabled"}>Repair safe issues</button></div>
        <div id="financeIntegrityIssues" class="profile-result"></div>
      </article>

'''
if security.count(card_marker) < 1:
    raise SystemExit("security profile card marker missing")
security = security.replace(card_marker, integrity_card + card_marker, 1)

# Insert integrity renderer before renderAccessibleCloudProfiles.
renderer_marker = '''  async function renderAccessibleCloudProfiles() {'''
integrity_renderer = r'''  function renderIntegrityStatus(report = null) {
    const chip = document.getElementById("financeIntegrityChip");
    const summaryNode = document.getElementById("financeIntegritySummary");
    const issuesNode = document.getElementById("financeIntegrityIssues");
    const repairButton = document.getElementById("repairIntegrityButton");
    if (!chip || !summaryNode || !issuesNode || !repairButton) return report;
    try { report = report || integrityReport(); }
    catch (error) {
      chip.textContent = "Unavailable"; chip.className = "v13-chip warning";
      summaryNode.textContent = error.message || "Financial integrity check is unavailable.";
      repairButton.hidden = true; issuesNode.innerHTML = ""; return null;
    }
    const counts = report.counts || { critical:0, warning:0, safeRepair:0 };
    chip.textContent = counts.critical ? `${counts.critical} critical` : (counts.warning || counts.safeRepair) ? "Review" : "Healthy";
    chip.className = `v13-chip ${counts.critical ? "warning" : (counts.warning || counts.safeRepair) ? "info" : "success"}`;
    summaryNode.textContent = window.FinanceIntegrity?.summary?.(report) || "Integrity check complete";
    repairButton.hidden = !counts.safeRepair;
    repairButton.disabled = !canWrite() || counts.critical > 0;
    issuesNode.innerHTML = report.issues.length ? report.issues.slice(0,12).map(item => `<div class="profile-security-row"><div><strong>${escape(item.severity === "critical" ? "Critical" : item.severity === "safe-repair" ? "Safe repair" : "Review")}</strong><small>${escape(item.message)}</small></div></div>`).join("") : `<div class="v13-empty">No financial integrity issues found.</div>`;
    return report;
  }

'''
if renderer_marker not in security:
    raise SystemExit("security renderAccessible marker missing")
security = security.replace(renderer_marker, integrity_renderer + renderer_marker, 1)

bind_marker = '''    get("profileSwitchButton")?.addEventListener("click", () => {'''
handlers = r'''    get("runIntegrityCheckButton")?.addEventListener("click", () => run(async () => {
      const report=renderIntegrityStatus(integrityReport());
      if(report && !report.counts.critical && !report.counts.warning && !report.counts.safeRepair) toast("Financial integrity check passed", "success");
    }));
    get("repairIntegrityButton")?.addEventListener("click", () => run(async () => {
      if(!canWrite()) throw new Error("Viewer profiles cannot repair finance records.");
      const service=window.FinanceLedgerTransactions;
      if(!service?.repairSafeIntegrity) throw new Error("Safe integrity repair is unavailable. Reload Talaan.");
      const result=service.repairSafeIntegrity();
      if(!result?.ok) throw new Error(result?.report?.counts?.critical ? "Critical issues require review and were not changed." : "Safe integrity repair could not be completed.");
      renderIntegrityStatus(result.report || integrityReport());
      toast(result.count ? `${result.count} safe integrity repair${result.count===1?"":"s"} applied` : "No safe integrity repairs were needed", "success");
    }));
'''
if bind_marker not in security:
    raise SystemExit("security bind marker missing")
security = security.replace(bind_marker, handlers + bind_marker, 1)
write("assets/js/security-profiles.js", security)

# Cloud Sync: refuse critical reconstructed states before replacing local data; rollback if persistence verification ever fails.
cloud = read("assets/js/cloud-sync.js")
old_apply = r'''  function applyEffectiveRecords(message = "Cloud records applied") {
    suppressQueue = true;
    try {
      const next = fromRecordStore(effectiveRecordStore(), typeof data !== "undefined" ? data : {});
      data = normalizeData(clone(next));
      if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw(message);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastObservedData = clone(data);
      if (typeof renderAll === "function") renderAll(false);
      if (typeof renderV12Settings === "function") renderV12Settings();
      try { if (typeof addSyncHistory === "function") addSyncHistory(message, "success", { cloudSchemaVersion:3, profileId:cloudProfileId(), auditId:state.lastAuditId }); } catch (error) {}
    } finally { suppressQueue = false; }
  }
'''
new_apply = r'''  function applyEffectiveRecords(message = "Cloud records applied") {
    suppressQueue = true;
    const previous = clone(typeof data !== "undefined" ? data : {});
    let replaced = false;
    try {
      const integrity = window.FinanceIntegrity;
      if (!integrity?.scan) throw new Error("Financial integrity protection is unavailable. Reload Talaan before applying cloud records.");
      const next = fromRecordStore(effectiveRecordStore(), typeof data !== "undefined" ? data : {});
      const proposedReport = integrity.scan(next, { includeStorage:false });
      if (proposedReport.counts.critical) {
        setStatus("Integrity review required", `${proposedReport.counts.critical} critical issue${proposedReport.counts.critical === 1 ? "" : "s"} found in the proposed cloud finance state. Local records were kept.`, "danger");
        throw new Error("Cloud finance state failed integrity verification before local replacement.");
      }
      const normalized = normalizeData(clone(next));
      const normalizedReport = integrity.scan(normalized, { includeStorage:false });
      if (normalizedReport.counts.critical) {
        setStatus("Integrity review required", `${normalizedReport.counts.critical} critical issue${normalizedReport.counts.critical === 1 ? "" : "s"} remained after safe normalization. Local records were kept.`, "danger");
        throw new Error("Cloud finance state failed integrity verification after normalization.");
      }
      data = normalized;
      replaced = true;
      if (typeof persistFinanceDataRaw === "function") {
        const saved = persistFinanceDataRaw(message);
        if (saved === false) throw new Error("Cloud records could not be persisted locally.");
      } else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const persistedReport = integrity.scan(data, { includeStorage:true });
      if (persistedReport.counts.critical) throw new Error("Persisted cloud finance state failed integrity verification.");
      lastObservedData = clone(data);
      if (typeof renderAll === "function") renderAll(false);
      if (typeof renderV12Settings === "function") renderV12Settings();
      try { if (typeof addSyncHistory === "function") addSyncHistory(message, "success", { cloudSchemaVersion:3, profileId:cloudProfileId(), auditId:state.lastAuditId }); } catch (error) {}
    } catch (error) {
      if (replaced) {
        data = normalizeData(clone(previous));
        try {
          if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("Cloud integrity rollback restored local records");
          else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          lastObservedData = clone(data);
          if (typeof renderAll === "function") renderAll(false);
        } catch (rollbackError) { console.error("Cloud integrity rollback failed.", rollbackError); }
      }
      throw error;
    } finally { suppressQueue = false; }
  }
'''
if old_apply not in cloud:
    raise SystemExit("cloud applyEffectiveRecords changed")
cloud = cloud.replace(old_apply, new_apply, 1)
write("assets/js/cloud-sync.js", cloud)

# PWA update includes the new critical runtime in targeted stale-cache removal.
pwa = read("assets/js/pwa-update.js")
pwa = pwa.replace('''      const removed = await deleteCachedPaths([\n        "/account-ledger.js",''', '''      const removed = await deleteCachedPaths([\n        "/finance-integrity.js",\n        "/account-ledger.js",''', 1)
write("assets/js/pwa-update.js", pwa)

# Runtime assembly: include integrity source in hash, copies, query normalization, app shell, and network-first delivery.
prepare = read("scripts/prepare-runtime.mjs")
prepare = prepare.replace('''const ACCOUNT_INTEGRITY_SOURCES = Object.freeze([\n  "assets/js/account-ledger.js",''', '''const ACCOUNT_INTEGRITY_SOURCES = Object.freeze([\n  "assets/js/finance-integrity.js",\n  "assets/js/account-ledger.js",''', 1)
prepare = prepare.replace('''  "assets/js": [\n    "account-ledger.js",''', '''  "assets/js": [\n    "finance-integrity.js",\n    "account-ledger.js",''', 1)
prepare = prepare.replace('''const applyAccountIntegrityAssetQuery = source => source\n  .replace(/account-ledger\\.js\\?v=[^\\"'\\s<>)]+/g, `account-ledger.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}`)''', '''const applyAccountIntegrityAssetQuery = source => source\n  .replace(/finance-integrity\\.js\\?v=[^\\"'\\s<>)]+/g, `finance-integrity.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}`)\n  .replace(/account-ledger\\.js\\?v=[^\\"'\\s<>)]+/g, `account-ledger.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}`)''', 1)
# Ensure prepared index gets the tag even if a future source cleanup removes it.
prepare = prepare.replace('''patchTextFile("index.html", source => {\n  let next = applyAccountIntegrityAssetQuery(normalizeReleaseAssetQuery(normalizeRuntimeReferences(source)))''', '''patchTextFile("index.html", source => {\n  let next = applyAccountIntegrityAssetQuery(normalizeReleaseAssetQuery(normalizeRuntimeReferences(source)))\n  if (!next.includes("finance-integrity.js")) {\n    next = next.replace(/(<script src="\\.\\/account-ledger\\.js\\?v=[^"]+"><\\/script>)/, `<script src="./finance-integrity.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}"></script>\\n  $1`);\n  }\n  next = next''', 1)
prepare = prepare.replace('''  if (!next.includes('asset("./account-submit-compat.js')) {''', '''  if (!next.includes('asset("./finance-integrity.js')) {\n    next = next.replace(\n      /(asset\\("\\.\\/account-ledger\\.js\\?v=[^"')]+"\\),)/,\n      `asset("./finance-integrity.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}"),\\n  $1`\n    );\n  }\n  if (!next.includes('asset("./account-submit-compat.js')) {''', 1)
prepare = prepare.replace('''      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("account-ledger.js") || url.pathname.endsWith("account-submit-compat.js") || url.pathname.endsWith("interaction-patterns.js") ||' ''', '''      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("finance-integrity.js") || url.pathname.endsWith("account-ledger.js") || url.pathname.endsWith("account-submit-compat.js") || url.pathname.endsWith("interaction-patterns.js") ||' ''', 1)
write("scripts/prepare-runtime.mjs", prepare)

# Source index gets a canonical integrity script directly before Account Ledger.
index = read("index.html")
if "finance-integrity.js" not in index:
    index, count = re.subn(r'(<script src="\.\/account-ledger\.js\?v=[^"]+"></script>)', r'<script src="./finance-integrity.js?v=2.5.0-account-runtime"></script>\n  \1', index, count=1)
    if count != 1:
        raise SystemExit("index account-ledger script tag missing")
write("index.html", index)

# PWA regression hash/input contract and critical runtime expectations.
pwa_test = read("tests/regression/validate-pwa-runtime.mjs")
pwa_test = pwa_test.replace('''const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];''', '''const accountIntegritySources = ["assets/js/finance-integrity.js","assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];''', 1)
pwa_test = pwa_test.replace('''for (const file of ["account-ledger.js", "account-submit-compat.js", "cloud-sync.js", "cloud-sync-lifecycle.js"]) {''', '''for (const file of ["finance-integrity.js", "account-ledger.js", "account-submit-compat.js", "cloud-sync.js", "cloud-sync-lifecycle.js"]) {''', 1)
pwa_test = pwa_test.replace('''assert.ok(index.includes(`./account-ledger.js?v=${accountIntegrityQuery}`), "index must load account-ledger on the Account Integrity asset query");''', '''assert.ok(index.includes(`./finance-integrity.js?v=${accountIntegrityQuery}`), "index must load finance-integrity on the Account Integrity asset query");\nassert.ok(worker.includes(`./finance-integrity.js?v=${accountIntegrityQuery}`), "service worker must precache finance-integrity on the Account Integrity asset query");\nassert.ok(index.includes(`./account-ledger.js?v=${accountIntegrityQuery}`), "index must load account-ledger on the Account Integrity asset query");''', 1)
pwa_test = pwa_test.replace('''assert.match(worker, /url\\.pathname\\.endsWith\\(\"account-ledger\\.js\"\\)/);''', '''assert.match(worker, /url\\.pathname\\.endsWith\\(\"finance-integrity\\.js\"\\)/);\nassert.match(worker, /url\\.pathname\\.endsWith\\(\"account-ledger\\.js\"\\)/);''', 1)
write("tests/regression/validate-pwa-runtime.mjs", pwa_test)

# Scanner engine regression.
finance_test = r'''import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("assets/js/finance-integrity.js", "utf8");
const storage = new Map();
const context = vm.createContext({
  console,
  structuredClone,
  Date,
  JSON,
  Number,
  Math,
  Object,
  Array,
  Set,
  Map,
  window:{
    localStorage:{ getItem:key => storage.has(key) ? storage.get(key) : null, setItem:(key,value)=>storage.set(key,String(value)) },
    FinanceProfileArchitecture:{ activeProfileId:()=>"profile-personal" }
  }
});
vm.runInContext(source, context);
const integrity = context.window.FinanceIntegrity;
assert.equal(integrity.version, 1);

const valid = {
  accounts:{ Cash:700, Bank:300 }, ledgerSettings:{version:1},
  accountLedger:[
    {id:"open-cash",operationId:"open-cash",transactionId:"open-cash",account:"Cash",type:"opening-balance",amount:1000},
    {id:"open-bank",operationId:"open-bank",transactionId:"open-bank",account:"Bank",type:"opening-balance",amount:0},
    {id:"transfer-out",operationId:"transfer-out",transactionId:"transfer-1",requestId:"request-transfer-1",transferId:"transfer-1",account:"Cash",counterpartAccount:"Bank",type:"transfer-out",amount:-300},
    {id:"transfer-in",operationId:"transfer-in",transactionId:"transfer-1",requestId:"request-transfer-1",transferId:"transfer-1",account:"Bank",counterpartAccount:"Cash",type:"transfer-in",amount:300}
  ],
  accountReconciliations:[], expenses:[], incomeRecords:[]
};
assert.equal(integrity.scan(valid).counts.critical, 0, "valid transfer history must pass");

const halfTransfer = structuredClone(valid);
halfTransfer.accountLedger = halfTransfer.accountLedger.filter(entry => entry.id !== "transfer-in");
halfTransfer.accounts.Bank = 0;
assert.ok(integrity.scan(halfTransfer).issues.some(item => item.code === "transfer-pair-incomplete" && item.severity === "critical"));

const duplicate = structuredClone(valid);
duplicate.accountLedger.push({...duplicate.accountLedger[0],id:"duplicate-open",amount:0});
assert.ok(integrity.scan(duplicate).issues.some(item => item.code === "duplicate-operation-id" && item.severity === "critical"));

const brokenPayment = structuredClone(valid);
brokenPayment.expenses=[{id:"expense-1",name:"Rent",paid:true,accountDeducted:true,paidFromAccount:"Cash",paidAmount:100,paymentTransactionId:"missing-payment"}];
assert.ok(integrity.scan(brokenPayment).issues.some(item => item.code === "expense-payment-ledger-missing"));

const externalPayment = structuredClone(valid);
externalPayment.expenses=[{id:"expense-ext",name:"Shared bill",paid:true,accountDeducted:false,paidFromAccount:"",paidAmount:0,paymentTransactionId:""}];
assert.equal(integrity.scan(externalPayment).counts.critical, 0, "external household payment must not create a false critical issue");

const brokenIncome = structuredClone(valid);
brokenIncome.incomeRecords=[{id:"income-1",name:"Salary",account:"Cash",amount:500,postToLedger:true,ledgerTransactionId:"income-tx"}];
assert.ok(integrity.scan(brokenIncome).issues.some(item => item.code === "income-deposit-ledger-missing"));

const safeMismatch = structuredClone(valid);
safeMismatch.accounts.Cash = 999;
const mismatchReport = integrity.scan(safeMismatch);
assert.ok(mismatchReport.issues.some(item => item.code === "ledger-balance-mismatch" && item.severity === "safe-repair"));
const repaired = integrity.repairSafe(safeMismatch);
assert.equal(repaired.ok, true);
assert.equal(repaired.data.accounts.Cash, 700);
assert.ok(repaired.changes.some(item => item.type === "recalculate-account"));

const relink = structuredClone(valid);
relink.accountLedger.push({id:"rec-ledger",operationId:"rec-op",transactionId:"rec-tx",reconciliationId:"rec-1",account:"Cash",type:"reconciliation-adjustment",amount:0});
relink.accountReconciliations=[{id:"rec-1",account:"Cash",previousBalance:700,statementBalance:700,difference:0,ledgerEntryId:""}];
const relinkReport=integrity.scan(relink);
assert.ok(relinkReport.issues.some(item => item.code === "reconciliation-link-missing" && item.severity === "safe-repair"));
assert.equal(integrity.repairSafe(relink).data.accountReconciliations[0].ledgerEntryId,"rec-ledger");

storage.set("simple-finance-project-records-v2", JSON.stringify(valid));
const profileCopy = structuredClone(valid); profileCopy.accounts.Cash = 701;
storage.set("simple-finance-profile-data-v1:profile-personal", JSON.stringify(profileCopy));
assert.ok(integrity.scan(valid,{includeStorage:true}).issues.some(item => item.code === "storage-profile-mismatch"));

console.log("Financial integrity scanner and deterministic repair validation passed.");
'''
write("tests/finance/validate-finance-integrity.mjs", finance_test)

sync_test = r'''import assert from "node:assert/strict";
import fs from "node:fs";

const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const security = fs.readFileSync("assets/js/security-profiles.js", "utf8");

for (const token of [
  "const proposedReport = integrity.scan(next, { includeStorage:false });",
  'setStatus("Integrity review required"',
  "Cloud integrity rollback restored local records",
  "persistedReport.counts.critical"
]) assert.ok(cloud.includes(token), `Cloud integrity gate missing: ${token}`);

for (const token of [
  "persistRecoverySnapshot(`Before ${action[0]} import`,before)",
  "restoreRecoverySnapshot(recoveryMeta.id,before",
  "incomingReport.counts.critical",
  "appliedReport.counts.critical",
  "finalReport.counts.critical",
  "if(!reconciliation?.ok)"
]) assert.ok(privacy.includes(token), `Recovery import integrity guard missing: ${token}`);

for (const token of [
  "function applyGuardedFinanceReplacement(",
  "assertReplacementIntegrity(source",
  'applyGuardedFinanceReplacement(payload.data, "Encrypted backup restored")',
  'applyGuardedFinanceReplacement(snapshot.data, "Cloud restore point applied")',
  "runIntegrityCheckButton",
  "repairSafeIntegrity"
]) assert.ok(security.includes(token), `Profile/restore integrity guard missing: ${token}`);

console.log("Cloud, import, encrypted backup, and restore-point integrity gates validated.");
'''
write("tests/sync/validate-integrity-recovery-gates.mjs", sync_test)

browser_test = r'''/* global data */
import { test, expect } from "@playwright/test";

const appUrl = "http://127.0.0.1:3000/index.html?page=settings&settings=profiles";

async function stable(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Boolean(window.FinanceIntegrity?.scan && window.FinanceLedgerTransactions?.repairSafeIntegrity));
}

test("financial integrity UI scans without mutating records and Viewer cannot repair", async ({ page }) => {
  await page.goto(appUrl, { waitUntil:"networkidle" });
  await stable(page);
  const before = await page.evaluate(() => JSON.stringify(data));
  await expect(page.locator("#runIntegrityCheckButton")).toBeVisible();
  await page.locator("#runIntegrityCheckButton").click();
  await expect(page.locator("#financeIntegrityChip")).not.toHaveText("Not checked");
  expect(await page.evaluate(() => JSON.stringify(data))).toBe(before);

  const critical = await page.evaluate(() => {
    const sample = structuredClone(data);
    const accounts = Object.keys(sample.accounts || {});
    if (accounts.length < 2) {
      sample.accounts.Second = 0;
      sample.accountTypes = {...(sample.accountTypes || {}), Second:"Cash"};
    }
    const names = Object.keys(sample.accounts);
    sample.accountLedger = [...(sample.accountLedger || []), {
      id:"phase4-half-transfer",operationId:"phase4-half-transfer",transactionId:"phase4-half-transfer",transferId:"phase4-transfer",account:names[0],counterpartAccount:names[1],type:"transfer-out",amount:-1
    }];
    return window.FinanceIntegrity.scan(sample,{includeStorage:false});
  });
  expect(critical.counts.critical).toBeGreaterThan(0);
  expect(critical.issues.some(item => item.code === "transfer-pair-incomplete")).toBe(true);

  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem("simple-finance-profiles-v1") || "{}");
    const active = meta.profiles?.find(item => item.id === meta.activeProfileId);
    if (active) active.role = "viewer";
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify(meta));
  });
  await page.reload({ waitUntil:"networkidle" });
  await stable(page);
  const viewerResult = await page.evaluate(() => window.FinanceLedgerTransactions.repairSafeIntegrity());
  expect(viewerResult.ok).toBe(false);
  expect(viewerResult.reason).toBe("read-only");
});

test("failed post-import reconciliation restores the pre-import recovery snapshot", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=settings&settings=sync", { waitUntil:"networkidle" });
  await stable(page);
  await page.waitForFunction(() => typeof window.openSyncReview === "function" && typeof window.applyPendingSyncImport === "function" && Boolean(window.FinancePrivacyLock?.recoveryStorage));
  const baseline = await page.evaluate(() => ({ accounts:structuredClone(data.accounts), serialized:JSON.stringify(data) }));
  const importedName = `Phase4 rollback ${Date.now()}`;
  await page.evaluate(importedName => {
    const bundle = window.buildBundle("phase4-integrity-test");
    bundle.data.accounts = { ...(bundle.data.accounts || {}), [importedName]:123.45 };
    window.openSyncReview(bundle);
    const original = window.FinanceLedgerTransactions;
    window.FinanceLedgerTransactions = Object.freeze({ ...original, reconcileAccounts:()=>({ok:false,reason:"phase4-forced-reconciliation-failure"}) });
  }, importedName);
  await expect(page.locator("#syncReviewDialog")).toBeVisible();
  await page.locator("#mergeUseIncomingButton").click();
  await expect.poll(() => page.evaluate(name => Object.prototype.hasOwnProperty.call(data.accounts || {}, name), importedName), { timeout:10000 }).toBe(false);
  const after = await page.evaluate(() => JSON.stringify(data));
  expect(JSON.parse(after).accounts).toEqual(baseline.accounts);
});
'''
write("tests/browser/finance-integrity-recovery.spec.mjs", browser_test)

# Register source suites.
run = read("tests/run.mjs")
run = run.replace('''  { suite: "finance", file: "tests/finance/validate-money-mutation-ownership.mjs" },''', '''  { suite: "finance", file: "tests/finance/validate-money-mutation-ownership.mjs" },\n  { suite: "finance", file: "tests/finance/validate-finance-integrity.mjs" },''', 1)
run = run.replace('''  { suite: "sync", file: "tests/sync/validate-money-mutation-sync.mjs" },''', '''  { suite: "sync", file: "tests/sync/validate-money-mutation-sync.mjs" },\n  { suite: "sync", file: "tests/sync/validate-integrity-recovery-gates.mjs" },''', 1)
write("tests/run.mjs", run)

# Money mutation ownership explicitly recognizes the read-only integrity scanner as a non-owner.
ownership = read("tests/finance/validate-money-mutation-ownership.mjs")
ownership = ownership.replace('''  "assets/js/cloud-sync.js",''', '''  "assets/js/cloud-sync.js",\n  "assets/js/finance-integrity.js",''', 1)
write("tests/finance/validate-money-mutation-ownership.mjs", ownership)

# Changelog: add one V2.5.0 hardening bullet without changing release metadata.
changelog = read("CHANGELOG.md")
heading = "## V2.5.0 · Talaan"
pos = changelog.find(heading)
if pos < 0:
    raise SystemExit("V2.5.0 changelog heading missing")
insert_at = changelog.find("\n", pos) + 1
bullet = "- Adds read-only financial integrity detection and guarded recovery for historical, imported, restored, and cloud-reconstructed finance data, with deterministic safe repairs only and automatic rollback on failed imports/restores.\n"
if bullet not in changelog:
    changelog = changelog[:insert_at] + bullet + changelog[insert_at:]
write("CHANGELOG.md", changelog)

print("Phase 4 integrity hardening staged successfully.")
