from pathlib import Path

finance_path = Path("tests/finance/validate-finance-ui-source.mjs")
text = finance_path.read_text()
old = '''assert.match(ledger, /const saved = saveData\\(/s, "Record spending must persist before final UI refresh");
assert.match(ledger, /storedLedger\\.length !== 1/, "Record spending must verify one ledger debit");
'''
new = '''assert.match(ledger, /function runLedgerTransaction\\(/, "Money-changing features must use the unified ledger transaction runner");
assert.match(ledger, /const saved = persistFinanceDataRaw\\(message\\)/, "Unified money transactions must persist through the persistence-only path");
assert.match(ledger, /function quickSpendStateErrors\\(/, "Record spending must have a dedicated domain invariant check");
assert.match(ledger, /verify:quickSpendStateErrors/, "Record spending must verify its paid expense and ledger debit before success");
assert.match(ledger, /refreshReconciledAccountState\\(account, result\\.after\\)/, "Record spending may refresh the UI only after the transaction succeeds");
'''
if old not in text:
    raise SystemExit("Stale quick-spend source contract was not found after Phase 2 patch")
text = text.replace(old, new, 1)
text = text.replace('assert(accountLedger.includes("function runLedgerTransaction("), "unified ledger transaction runner is missing");', 'assert(ledger.includes("function runLedgerTransaction("), "unified ledger transaction runner is missing");')
text = text.replace('assert(accountLedger.includes("window.FinanceLedgerTransactions = Object.freeze"), "money mutation service is not exposed");', 'assert(ledger.includes("window.FinanceLedgerTransactions = Object.freeze"), "money mutation service is not exposed");')
text = text.replace('for (const capability of ["unifiedMoneyMutations:true","transactionalPersistence:true","domainInvariants:true","rollback:true"]) assert(accountLedger.includes(capability), `money mutation capability ${capability} is missing`);', 'for (const capability of ["unifiedMoneyMutations:true","transactionalPersistence:true","domainInvariants:true","rollback:true"]) assert(ledger.includes(capability), `money mutation capability ${capability} is missing`);')
finance_path.write_text(text)

pwa_path = Path("tests/regression/validate-pwa-runtime.mjs")
pwa = pwa_path.read_text()
pwa = pwa.replace('assert.match(accountLedger, /function persistAccountMutation\\(/);', 'assert.match(accountLedger, /function runLedgerTransaction\\(/);\nassert.match(accountLedger, /function moneyMutationInvariantReport\\(/);\nassert.match(accountLedger, /window\\.FinanceLedgerTransactions = Object\\.freeze/);')
pwa = pwa.replace('assert.match(accountLedger, /if \\(!accountMutationCanWrite\\(\\)\\) return false;/);', 'assert.match(accountLedger, /if \\(!moneyMutationCanWrite\\(\\)\\) return \\{ ok:false, reason:"read-only" \\};/);')
pwa_path.write_text(pwa)

browser_path = Path("tests/browser/money-mutation-integrity.spec.mjs")
browser = browser_path.read_text()
inline_snapshot = '''const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
    const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");'''
count = browser.count('const { persisted, profile } = storedSnapshot();')
if count != 3:
    raise SystemExit(f"Expected 3 browser-context storedSnapshot calls; found {count}")
browser = browser.replace('const { persisted, profile } = storedSnapshot();', inline_snapshot)
browser_path.write_text(browser)

print("Aligned finance/PWA contracts and fixed browser-context storage verification for Phase 2.")
