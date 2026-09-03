from pathlib import Path
import re


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


def regex_once(path, pattern, replacement, flags=re.S):
    file = Path(path)
    text = file.read_text()
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"Expected exactly one regex match in {path}, found {count}: {pattern[:120]!r}")
    file.write_text(next_text)


ledger_path = Path("assets/js/account-ledger.js")
ledger = ledger_path.read_text()

# Strengthen persistence verification so add/rename/delete and balance corrections all
# verify the complete account state in the local record and active profile.
old_profile = '''  function profileBalancesMatch(expectedBalances = []) {
    if (!expectedBalances.length) return true;
    const architecture = window.FinanceProfileArchitecture;
    const profileId = architecture?.activeProfileId?.();
    if (!profileId) return true;
    try {
      const raw = localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`);
      if (!raw) return false;
      const stored = JSON.parse(raw);
      return expectedBalances.every(item => Object.prototype.hasOwnProperty.call(stored.accounts || {}, item.account)
        && roundMoney(stored.accounts[item.account]) === roundMoney(item.target));
    } catch (error) {
      console.error("Could not verify profile-scoped account persistence.", error);
      return false;
    }
  }
'''
new_profile = '''  function accountStateMatchesRuntime(accounts) {
    const runtimeAccounts = data.accounts && typeof data.accounts === "object" ? data.accounts : {};
    const storedAccounts = accounts && typeof accounts === "object" ? accounts : {};
    const runtimeNames = Object.keys(runtimeAccounts).sort();
    const storedNames = Object.keys(storedAccounts).sort();
    if (runtimeNames.length !== storedNames.length || runtimeNames.some((name, index) => name !== storedNames[index])) return false;
    return runtimeNames.every(name => Number.isFinite(Number(storedAccounts[name]))
      && roundMoney(storedAccounts[name]) === roundMoney(runtimeAccounts[name]));
  }

  function localAccountsMatchRuntime() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      return accountStateMatchesRuntime(JSON.parse(raw).accounts);
    } catch (error) {
      console.error("Could not verify local account persistence.", error);
      return false;
    }
  }

  function profileAccountsMatchRuntime() {
    const architecture = window.FinanceProfileArchitecture;
    const profileId = architecture?.activeProfileId?.();
    if (!profileId) return true;
    try {
      const raw = localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`);
      if (!raw) return false;
      return accountStateMatchesRuntime(JSON.parse(raw).accounts);
    } catch (error) {
      console.error("Could not verify profile-scoped account persistence.", error);
      return false;
    }
  }
'''
if old_profile not in ledger:
    raise SystemExit("Profile balance verifier block not found")
ledger = ledger.replace(old_profile, new_profile, 1)

old_persist = '''  function persistAccountMutation(snapshot, message, expectedBalances = []) {
    recalculateBalances(data);
    if (!expectedBalancesMatch(expectedBalances)) {
      return restoreAccountMutation(snapshot, "The corrected account balance could not be verified. Nothing was saved.");
    }
    try {
      if (typeof persistFinanceDataRaw !== "function") throw new Error("Finance persistence is unavailable.");
      const saved = persistFinanceDataRaw(message);
      if (saved === false) return restoreAccountMutation(snapshot, "Account changes were not saved. Check profile permissions and try again.");
    } catch (error) {
      console.error("Account changes could not be persisted.", error);
      return restoreAccountMutation(snapshot, "Account changes could not be saved on this device.");
    }
    if (!expectedBalancesMatch(expectedBalances)) {
      return restoreAccountMutation(snapshot, "The account balance changed during save. The previous value was restored.");
    }
    if (!profileBalancesMatch(expectedBalances)) {
      const architecture = window.FinanceProfileArchitecture;
      let repaired = false;
      try { repaired = architecture?.persistCurrentData?.(data, message) !== false; } catch (error) { console.error("Could not repair profile-scoped account persistence.", error); }
      if (!repaired || !profileBalancesMatch(expectedBalances)) {
        return restoreAccountMutation(snapshot, "The account update could not be stored in the active profile.");
      }
    }
    showToast(message);
    return true;
  }
'''
new_persist = '''  function accountMutationInvariantReport(expectedBalances = []) {
    const errors = [];
    const activeAccounts = data.accounts && typeof data.accounts === "object" ? data.accounts : {};
    const ledgerEntries = Array.isArray(data.accountLedger) ? data.accountLedger : [];
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

    for (const item of data.accountReconciliations || []) {
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

  function persistAccountMutation(snapshot, message, expectedBalances = []) {
    recalculateBalances(data);
    const beforePersist = accountMutationInvariantReport(expectedBalances);
    if (!beforePersist.ok || !expectedBalancesMatch(expectedBalances)) {
      console.error("Account mutation invariants failed before persistence.", beforePersist.errors);
      return restoreAccountMutation(snapshot, "The account update failed its safety checks. Nothing was saved.");
    }
    try {
      if (typeof persistFinanceDataRaw !== "function") throw new Error("Finance persistence is unavailable.");
      const saved = persistFinanceDataRaw(message);
      if (saved === false) return restoreAccountMutation(snapshot, "Account changes were not saved. Check profile permissions and try again.");
    } catch (error) {
      console.error("Account changes could not be persisted.", error);
      return restoreAccountMutation(snapshot, "Account changes could not be saved on this device.");
    }
    const afterPersist = accountMutationInvariantReport(expectedBalances);
    if (!afterPersist.ok || !expectedBalancesMatch(expectedBalances)) {
      console.error("Account mutation invariants failed after persistence.", afterPersist.errors);
      return restoreAccountMutation(snapshot, "The account state changed during save. The previous value was restored.");
    }
    if (!localAccountsMatchRuntime()) {
      return restoreAccountMutation(snapshot, "The account update could not be verified in local storage.");
    }
    if (!profileAccountsMatchRuntime()) {
      const architecture = window.FinanceProfileArchitecture;
      let repaired = false;
      try { repaired = architecture?.persistCurrentData?.(data, message) !== false; } catch (error) { console.error("Could not repair profile-scoped account persistence.", error); }
      if (!repaired || !profileAccountsMatchRuntime()) {
        return restoreAccountMutation(snapshot, "The account update could not be stored in the active profile.");
      }
    }
    showToast(message);
    return true;
  }

  function runAccountMutation({ undoLabel, message, expectedBalances = [], mutate }) {
    if (!accountMutationCanWrite()) return false;
    if (typeof mutate !== "function") return false;
    const snapshot = cloneData(data);
    try {
      pushUndo(undoLabel || message || "Account update");
      mutate();
      recalculateBalances(data, { stamp:true });
      const report = accountMutationInvariantReport(expectedBalances);
      if (!report.ok) {
        console.error("Account mutation invariants failed.", report.errors);
        return restoreAccountMutation(snapshot, "The account update failed its safety checks. Nothing was saved.");
      }
      return persistAccountMutation(snapshot, message || "Account updated", expectedBalances);
    } catch (error) {
      console.error("Account mutation failed before persistence.", error);
      return restoreAccountMutation(snapshot, "The account update could not be completed. The previous value was restored.");
    }
  }
'''
if old_persist not in ledger:
    raise SystemExit("Account persistence block not found")
ledger = ledger.replace(old_persist, new_persist, 1)
ledger_path.write_text(ledger)

# Route Edit/Add/Rename through the one transaction runner.
regex_once(
    "assets/js/account-ledger.js",
    r'''  function submitAccountForm\(\) \{[\s\S]*?\n  \}\n\n  function submitAccountsReconciliationForm\(\) \{''',
    '''  function submitAccountForm() {
    const originalName = document.getElementById("originalAccountName").value;
    const newName = document.getElementById("accountName").value.trim();
    if (!validateMoneyInput("accountBalance", { required:false, min:0, message:"Enter a valid account balance of zero or more." })) return false;
    const balanceInput = document.getElementById("accountBalance").value.trim();
    const targetBalance = balanceInput === "" ? 0 : moneyInputValue("accountBalance");
    const type = ACCOUNT_TYPES.includes(document.getElementById("accountType").value) ? document.getElementById("accountType").value : "Other";
    if (!newName || !Number.isFinite(targetBalance)) { showToast("Enter a valid account name and balance", "warning"); return false; }
    const duplicate = accountNames().some(name => name.toLowerCase() === newName.toLowerCase() && name !== originalName);
    if (duplicate) { showToast("An account with this name already exists", "warning"); return false; }

    const saved = runAccountMutation({
      undoLabel:originalName ? `Edit account ${originalName}` : `Add account ${newName}`,
      message:originalName ? "Account updated and reconciled" : "Account added with opening balance",
      expectedBalances:[{ account:newName, target:targetBalance }],
      mutate:() => {
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
        if (type !== "Savings") (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && goal.linkedAccount === newName) { goal.sourceType = "manual"; goal.currentAmount = Number(data.accounts[newName] || 0); goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
        if (type === "Savings" && !data.savingsSettings.defaultAccount) data.savingsSettings.defaultAccount = newName;
        if (type !== "Savings" && data.savingsSettings.defaultAccount === newName) data.savingsSettings.defaultAccount = "";
      }
    });
    if (!saved) return false;
    closeTrackedFormAfterAction("accountDialog");
    refreshReconciledAccountState(newName, targetBalance);
    return true;
  }

  function submitAccountsReconciliationForm() {'''
)

regex_once(
    "assets/js/account-ledger.js",
    r'''  function submitAccountsReconciliationForm\(\) \{[\s\S]*?\n  \}\n\n  function submitIncomeForm\(\) \{''',
    '''  function submitAccountsReconciliationForm() {
    const accountInputs = [...document.querySelectorAll(".account-input")];
    for (const input of accountInputs) if (!validateMoneyInput(input, { required:false, min:0, message:"Enter a balance of zero or more." })) return false;
    const changes = accountInputs.map(input => ({ account:input.dataset.account, target:moneyInputValue(input) })).filter(item => roundMoney(data.accounts[item.account]) !== roundMoney(item.target));
    const typeChanges = [...document.querySelectorAll(".account-type-input")].filter(select => accountType(select.dataset.accountType) !== select.value);
    if (!changes.length && !typeChanges.length) { showToast("Account balances already match the entered values", "info"); return false; }

    const saved = runAccountMutation({
      undoLabel:"Reconcile account balances",
      message:`${changes.length} account balance${changes.length === 1 ? "" : "s"} reconciled`,
      expectedBalances:changes.map(item => ({ account:item.account, target:item.target })),
      mutate:() => {
        typeChanges.forEach(select => { data.accountTypes[select.dataset.accountType] = ACCOUNT_TYPES.includes(select.value) ? select.value : "Other"; });
        changes.forEach(item => appendReconciliation(item.account, item.target, { note:"Balances form reconciliation" }));
        (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && accountType(goal.linkedAccount) !== "Savings") { goal.currentAmount = Number(data.accounts[goal.linkedAccount] || goal.currentAmount || 0); goal.sourceType = "manual"; goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
        if (data.savingsSettings.defaultAccount && accountType(data.savingsSettings.defaultAccount) !== "Savings") data.savingsSettings.defaultAccount = "";
      }
    });
    if (saved) {
      try { renderAll(false); } catch (error) { console.error("Account balances were saved but Settings refresh failed.", error); }
    }
    return saved;
  }

  function submitIncomeForm() {'''
)

regex_once(
    "assets/js/account-ledger.js",
    r'''  async function deleteAccountSafely\(button\) \{[\s\S]*?\n  \}\n\n  function exportLedgerCsv\(\) \{''',
    '''  async function deleteAccountSafely(button) {
    const name = button.dataset.deleteAccount;
    if (!name) return false;
    if (accountNames().length <= 1) { showToast("Keep at least one account", "warning"); return false; }
    const balance = roundMoney(data.accounts[name]);
    if (balance !== 0) { showToast(`Transfer or reconcile ${name} to ₱0.00 before deleting it. Current balance: ${money(balance)}`, "warning"); return false; }
    const deductedPayments = data.expenses.filter(item => item.paid && item.accountDeducted && item.paidFromAccount === name).length;
    if (deductedPayments) { showToast(`Move ${deductedPayments} paid expense${deductedPayments === 1 ? "" : "s"} back to unpaid before deleting ${name}.`, "warning"); return false; }
    const confirmed = await openAppConfirmation({ title:"Delete zero-balance account?", message:`Delete “${name}”?`, details:"Historical ledger entries remain available for audit, but the account will no longer appear in selectors.", confirmLabel:"Delete account", danger:true });
    if (!confirmed) return false;
    const saved = runAccountMutation({
      undoLabel:`Delete account ${name}`,
      message:"Zero-balance account deleted; ledger history preserved",
      mutate:() => {
        (data.savingsGoals || []).forEach(goal => { if (goal.sourceType === "linked" && goal.linkedAccount === name) { goal.sourceType = "manual"; goal.currentAmount = 0; goal.linkedAccount = ""; goal.updatedAt = new Date().toISOString(); } });
        delete data.accounts[name];
        delete data.accountTypes[name];
        if (data.accountIcons) delete data.accountIcons[name];
        data.accountOrder = accountNames().filter(accountName => accountName !== name);
        if (data.savingsSettings?.defaultAccount === name) data.savingsSettings.defaultAccount = "";
      }
    });
    if (!saved) return false;
    if (button.closest("#accountDialog")) closeTrackedFormAfterAction("accountDialog");
    try { renderAll(false); } catch (error) { console.error("Account deletion was saved but the interface refresh failed.", error); }
    return true;
  }

  function exportLedgerCsv() {'''
)

# Expose the single account-maintenance mutation owner and mark the ledger capabilities.
ledger = Path("assets/js/account-ledger.js").read_text()
old_export = '''  window.FinanceAccountLedger = {
    version:LEDGER_VERSION,
    releaseVersion:"13.0.13",
    capabilities:{ accountSpending:true, verifiedSpendSubmit:true, persistentSpendActions:true, transactionalSpend:true, isolatedSpendAction:true, accountReconciliationOwner:true, transactionalAccountCorrection:true, profileVerifiedAccountCorrection:true },'''
new_export = '''  window.FinanceAccountMutations = {
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
    capabilities:{ accountSpending:true, verifiedSpendSubmit:true, persistentSpendActions:true, transactionalSpend:true, isolatedSpendAction:true, accountReconciliationOwner:true, transactionalAccountCorrection:true, profileVerifiedAccountCorrection:true, singleAccountMutationOwner:true, accountMutationInvariants:true },'''
if old_export not in ledger:
    raise SystemExit("FinanceAccountLedger export block not found")
Path("assets/js/account-ledger.js").write_text(ledger.replace(old_export, new_export, 1))

# Legacy form handlers become delegates only. They are safe fallbacks if the capture
# handler order changes, and they fail closed if the ledger mutation owner is missing.
index_path = Path("index.html")
index = index_path.read_text()
account_delegate = '''    document.getElementById("accountForm").addEventListener("submit", event => {
      event.preventDefault();
      if (document.getElementById("accountDialog")?.dataset.accountMode === "spend") return;
      const mutations = window.FinanceAccountMutations;
      if (!mutations?.submitAccountForm) {
        showToast("Account maintenance is unavailable. Reload Talaan before changing account balances.", "warning");
        return;
      }
      mutations.submitAccountForm();
    });

    document.getElementById("expenseForm")'''
index, count = re.subn(
    r'''    document\.getElementById\("accountForm"\)\.addEventListener\("submit", event => \{[\s\S]*?\n    \}\);\n\n    document\.getElementById\("expenseForm"\)''',
    account_delegate,
    index,
    count=1
)
if count != 1:
    raise SystemExit(f"Legacy accountForm handler replacement count: {count}")
accounts_delegate = '''    document.getElementById("accountsForm").addEventListener("submit", event => {
      event.preventDefault();
      const mutations = window.FinanceAccountMutations;
      if (!mutations?.submitAccountsReconciliationForm) {
        showToast("Account maintenance is unavailable. Reload Talaan before changing account balances.", "warning");
        return;
      }
      mutations.submitAccountsReconciliationForm();
    });

    document.getElementById("exportBackup")'''
index, count = re.subn(
    r'''    document\.getElementById\("accountsForm"\)\.addEventListener\("submit", event => \{[\s\S]*?saveData\("Account balances and types updated"\);\n    \}\);\n\n    document\.getElementById\("exportBackup"\)''',
    accounts_delegate,
    index,
    count=1
)
if count != 1:
    raise SystemExit(f"Legacy accountsForm handler replacement count: {count}")
index_path.write_text(index)

# Source PWA updater uses stable placeholders. prepare-runtime computes and injects
# the content-derived revision so future finance-critical changes cannot forget a bump.
pwa_path = Path("assets/js/pwa-update.js")
pwa = pwa_path.read_text()
pwa = re.sub(r'const ACCOUNT_INTEGRITY_REFRESH_KEY = "[^"]+";', 'const ACCOUNT_INTEGRITY_REFRESH_KEY = "finance-account-integrity-runtime";', pwa, count=1)
if 'const ACCOUNT_INTEGRITY_ASSET_QUERY' not in pwa:
    pwa = pwa.replace('const ACCOUNT_INTEGRITY_REFRESH_KEY = "finance-account-integrity-runtime";', 'const ACCOUNT_INTEGRITY_REFRESH_KEY = "finance-account-integrity-runtime";\n  const ACCOUNT_INTEGRITY_ASSET_QUERY = "2.5.0-account-runtime";', 1)
pwa = re.sub(r'await import\("\.\/account-submit-compat\.js\?v=[^"]+"\);', 'await import(`./account-submit-compat.js?v=${ACCOUNT_INTEGRITY_ASSET_QUERY}`);', pwa, count=1)
pwa = pwa.replace('financeCachePattern:FINANCE_CACHE_PATTERN,', 'financeCachePattern:FINANCE_CACHE_PATTERN,\n    accountIntegrityRefreshKey:ACCOUNT_INTEGRITY_REFRESH_KEY,\n    accountIntegrityAssetQuery:ACCOUNT_INTEGRITY_ASSET_QUERY,', 1)
pwa_path.write_text(pwa)

# Derive account runtime URLs from the actual critical source contents.
prep_path = Path("scripts/prepare-runtime.mjs")
prep = prep_path.read_text()
if 'node:crypto' not in prep:
    prep = prep.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport crypto from "node:crypto";', 1)
prep = re.sub(r'const ACCOUNT_INTEGRITY_ASSET_QUERY = "[^"]+";\n', '', prep, count=1)
marker = 'const CURRENT_VERSION_HISTORY = Object.freeze([{' 
hash_block = '''const ACCOUNT_INTEGRITY_SOURCES = Object.freeze([
  "assets/js/account-ledger.js",
  "assets/js/account-submit-compat.js",
  "assets/js/cloud-sync.js",
  "assets/js/cloud-sync-lifecycle.js"
]);
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of ACCOUNT_INTEGRITY_SOURCES) {
  accountIntegrityHash.update(`${file}\\0`);
  accountIntegrityHash.update(fs.readFileSync(path.join(root, file)));
}
const ACCOUNT_INTEGRITY_REVISION = accountIntegrityHash.digest("hex").slice(0, 12);
const ACCOUNT_INTEGRITY_ASSET_QUERY = `2.5.0-account-${ACCOUNT_INTEGRITY_REVISION}`;
const ACCOUNT_INTEGRITY_REFRESH_KEY = `finance-account-integrity-${ACCOUNT_INTEGRITY_REVISION}`;

'''
if 'const ACCOUNT_INTEGRITY_SOURCES' not in prep:
    if marker not in prep:
        raise SystemExit("prepare-runtime history marker not found")
    prep = prep.replace(marker, hash_block + marker, 1)
old_pwa_patch = '''patchTextFile("pwa-update.js", source => source
  .replace(/const CURRENT_CACHE_VERSION = "finance-v[^"]+";/, `const CURRENT_CACHE_VERSION = "${RELEASE.cache}";`));'''
new_pwa_patch = '''patchTextFile("pwa-update.js", source => source
  .replace(/const CURRENT_CACHE_VERSION = "finance-v[^"]+";/, `const CURRENT_CACHE_VERSION = "${RELEASE.cache}";`)
  .replace(/const ACCOUNT_INTEGRITY_REFRESH_KEY = "[^"]+";/, `const ACCOUNT_INTEGRITY_REFRESH_KEY = "${ACCOUNT_INTEGRITY_REFRESH_KEY}";`)
  .replace(/const ACCOUNT_INTEGRITY_ASSET_QUERY = "[^"]+";/, `const ACCOUNT_INTEGRITY_ASSET_QUERY = "${ACCOUNT_INTEGRITY_ASSET_QUERY}";`));'''
if old_pwa_patch not in prep:
    raise SystemExit("prepare-runtime PWA patch block not found")
prep = prep.replace(old_pwa_patch, new_pwa_patch, 1)
prep_path.write_text(prep)

# Browser regression computes the same content-derived query and now requires the
# single mutation owner in the real service-worker-controlled PWA.
browser_path = Path("tests/browser/account-balance-persistence.spec.mjs")
browser = browser_path.read_text()
if 'node:crypto' not in browser:
    browser = browser.replace('import { expect, test } from "@playwright/test";', 'import { expect, test } from "@playwright/test";\nimport crypto from "node:crypto";\nimport fs from "node:fs";', 1)
browser = re.sub(r'const ACCOUNT_REFRESH_KEY = "[^"]+";', '''const ACCOUNT_INTEGRITY_SOURCES = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of ACCOUNT_INTEGRITY_SOURCES) {
  accountIntegrityHash.update(`${file}\\0`);
  accountIntegrityHash.update(fs.readFileSync(file));
}
const ACCOUNT_INTEGRITY_REVISION = accountIntegrityHash.digest("hex").slice(0, 12);
const ACCOUNT_REFRESH_KEY = `finance-account-integrity-${ACCOUNT_INTEGRITY_REVISION}`;
const ACCOUNT_ASSET_QUERY = `2.5.0-account-${ACCOUNT_INTEGRITY_REVISION}`;''', browser, count=1)
browser = browser.replace('window.FinanceAccountLedger?.capabilities?.accountReconciliationOwner\n    && window.FinanceAccountSubmitCompat?.ledgerGuard', 'window.FinanceAccountLedger?.capabilities?.accountReconciliationOwner\n    && window.FinanceAccountMutations?.capabilities?.singleOwner\n    && window.FinanceAccountSubmitCompat?.ledgerGuard', 1)
browser = browser.replace('entry.name.includes("account-ledger.js?v=2.5.0-account-integrity2")', 'entry.name.includes(`account-ledger.js?v=${ACCOUNT_ASSET_QUERY}`)', 1)
# Add invariant and owner assertions to the persisted state reader.
browser = browser.replace('ledgerAmount:Number(ledgerEntry?.amount || 0),\n      controlled:', 'ledgerAmount:Number(ledgerEntry?.amount || 0),\n      mutationOwner:Boolean(window.FinanceAccountMutations?.capabilities?.singleOwner),\n      invariantsOk:Boolean(window.FinanceAccountMutations?.invariantReport?.([{ account, target }])?.ok),\n      controlled:', 1)
browser = browser.replace('expect(saved.ledgerAmount).toBeCloseTo(setup.target - setup.original, 2);\n    expect(saved.controlled)', 'expect(saved.ledgerAmount).toBeCloseTo(setup.target - setup.original, 2);\n    expect(saved.mutationOwner).toBe(true);\n    expect(saved.invariantsOk).toBe(true);\n    expect(saved.controlled)', 1)
browser_path.write_text(browser)

# PWA validator derives the same query from canonical finance-critical sources.
pwa_test_path = Path("tests/regression/validate-pwa-runtime.mjs")
pwa_test = pwa_test_path.read_text()
if 'node:crypto' not in pwa_test:
    pwa_test = pwa_test.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport crypto from "node:crypto";', 1)
pwa_test = re.sub(r'const accountIntegrityQuery = "[^"]+";', '''const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of accountIntegritySources) { accountIntegrityHash.update(`${file}\\0`); accountIntegrityHash.update(fs.readFileSync(file)); }
const accountIntegrityRevision = accountIntegrityHash.digest("hex").slice(0, 12);
const accountIntegrityQuery = `2.5.0-account-${accountIntegrityRevision}`;
const accountIntegrityRefreshKey = `finance-account-integrity-${accountIntegrityRevision}`;''', pwa_test, count=1)
pwa_test = re.sub(r'assert\.match\(updater, /const ACCOUNT_INTEGRITY_REFRESH_KEY = \\"[^\n]+?;\);', 'assert.ok(updater.includes(`const ACCOUNT_INTEGRITY_REFRESH_KEY = "${accountIntegrityRefreshKey}";`));', pwa_test, count=1)
# If the exact regex replacement above did not match due escaping, replace the literal source line.
pwa_test = pwa_test.replace('assert.match(updater, /const ACCOUNT_INTEGRITY_REFRESH_KEY = "finance-account-integrity-v2-5-0-talaan2";/);', 'assert.ok(updater.includes(`const ACCOUNT_INTEGRITY_REFRESH_KEY = "${accountIntegrityRefreshKey}";`));')
pwa_test = pwa_test.replace('assert.match(index, /Account ledger is updating\\. Reload Talaan before changing account balances\\./, "ledger-backed legacy balance writes must fail closed");', 'assert.match(index, /Account maintenance is unavailable\\. Reload Talaan before changing account balances\\./, "legacy account forms must delegate to the mutation owner and fail closed if it is unavailable");')
pwa_test = pwa_test.replace('assert.match(accountLedger, /profileVerifiedAccountCorrection:true/);', 'assert.match(accountLedger, /profileVerifiedAccountCorrection:true/);\nassert.match(accountLedger, /singleAccountMutationOwner:true/);\nassert.match(accountLedger, /accountMutationInvariants:true/);\nassert.match(accountLedger, /window\\.FinanceAccountMutations =/);\nassert.match(accountLedger, /function runAccountMutation\\(/);\nassert.match(accountLedger, /function accountMutationInvariantReport\\(/);')
pwa_test_path.write_text(pwa_test)

# Finance source validator checks the dynamic runtime pin and forbids direct account
# writes inside the two legacy maintenance handlers.
finance_test_path = Path("tests/finance/validate-finance-ui-source.mjs")
finance_test = finance_test_path.read_text()
if 'node:crypto' not in finance_test:
    finance_test = finance_test.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport crypto from "node:crypto";', 1)
finance_test = re.sub(r'const accountIntegrityQuery = "[^"]+";', '''const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of accountIntegritySources) { accountIntegrityHash.update(`${file}\\0`); accountIntegrityHash.update(fs.readFileSync(file)); }
const accountIntegrityQuery = `2.5.0-account-${accountIntegrityHash.digest("hex").slice(0, 12)}`;''', finance_test, count=1)
insert_marker = 'assert.match(ledger, /const saved = saveData\\(/s, "Record spending must persist before final UI refresh");'
ownership_checks = '''const legacyAccountHandler = index.match(/document\\.getElementById\\("accountForm"\\)\\.addEventListener\\("submit"[\\s\\S]*?document\\.getElementById\\("expenseForm"\\)/)?.[0] || "";
const legacyAccountsHandler = index.match(/document\\.getElementById\\("accountsForm"\\)\\.addEventListener\\("submit"[\\s\\S]*?document\\.getElementById\\("exportBackup"\\)/)?.[0] || "";
assert.match(legacyAccountHandler, /FinanceAccountMutations/, "Edit/Add account fallback must delegate to the single mutation owner");
assert.match(legacyAccountsHandler, /FinanceAccountMutations/, "Settings account fallback must delegate to the single mutation owner");
assert.doesNotMatch(legacyAccountHandler, /data\\.accounts\\[/, "legacy Edit/Add account handler must not write balances directly");
assert.doesNotMatch(legacyAccountsHandler, /data\\.accounts\\[/, "legacy Settings account handler must not write balances directly");
assert.match(ledger, /window\\.FinanceAccountMutations =/, "Account Ledger must expose the single maintenance mutation owner");
assert.match(ledger, /function accountMutationInvariantReport\\(/, "Account mutations must enforce ledger and reconciliation invariants");
assert.match(ledger, /function runAccountMutation\\(/, "Account maintenance must use one transaction runner");
'''
if ownership_checks not in finance_test:
    if insert_marker not in finance_test:
        raise SystemExit("Finance source validator insertion marker not found")
    finance_test = finance_test.replace(insert_marker, ownership_checks + insert_marker, 1)
finance_test_path.write_text(finance_test)

print("Phase 1 account mutation hardening patch staged.")
