from pathlib import Path

root = Path(__file__).resolve().parents[1]

# Controlled-PWA account test must hash the same critical runtime source set as prepare-runtime.
path = root / "tests/browser/account-balance-persistence.spec.mjs"
source = path.read_text()
old = 'const ACCOUNT_INTEGRITY_SOURCES = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
new = 'const ACCOUNT_INTEGRITY_SOURCES = ["assets/js/finance-integrity.js","assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
if source.count(old) != 1:
    raise SystemExit("account balance PWA integrity hash source contract changed")
path.write_text(source.replace(old, new, 1))

# Financial Integrity is private profile data. Authenticate the browser fixture before opening Profile & Security.
path = root / "tests/browser/finance-integrity-recovery.spec.mjs"
source = path.read_text()
old = '''async function stable(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Boolean(window.FinanceIntegrity?.scan && window.FinanceLedgerTransactions?.repairSafeIntegrity));
}
'''
new = '''async function stable(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => Boolean(window.FinanceIntegrity?.scan && window.FinanceLedgerTransactions?.repairSafeIntegrity));
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.waitForFunction(() => !document.body.classList.contains("finance-auth-pending"));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => document.body.classList.contains("finance-signed-in"));
}
'''
if source.count(old) != 1:
    raise SystemExit("integrity browser stable fixture changed")
source = source.replace(old, new, 1)

old = '''  await page.goto(appUrl, { waitUntil:"networkidle" });
  await stable(page);
  const before = await page.evaluate(() => JSON.stringify(data));
  await expect(page.locator("#runIntegrityCheckButton")).toBeVisible();
'''
new = '''  await page.goto(appUrl, { waitUntil:"networkidle" });
  await stable(page);
  await page.evaluate(() => window.activateSettingsPanel?.("profiles", false));
  await expect(page.locator("#settings-panel-profiles")).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(data));
  await expect(page.locator("#runIntegrityCheckButton")).toBeVisible();
'''
if source.count(old) != 1:
    raise SystemExit("integrity UI browser setup changed")
source = source.replace(old, new, 1)

# A fresh default profile may exist only in memory. Seed the actual active profile into metadata before changing its role.
old = '''  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem("simple-finance-profiles-v1") || "{}");
    const active = meta.profiles?.find(item => item.id === meta.activeProfileId);
    if (active) active.role = "viewer";
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify(meta));
  });
  await page.reload({ waitUntil:"networkidle" });
  await stable(page);
  const viewerResult = await page.evaluate(() => window.FinanceLedgerTransactions.repairSafeIntegrity());
'''
new = '''  await page.evaluate(() => {
    const architecture = window.FinanceProfileArchitecture;
    const runtimeActive = architecture?.activeProfile?.() || { id:"profile-personal", name:"My Finances", type:"personal", role:"owner", cloudProfileId:"", encryption:{ enabled:false } };
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem("simple-finance-profiles-v1") || "null"); } catch (error) {}
    if (!Array.isArray(meta?.profiles) || !meta.profiles.length) {
      meta = { version:1, activeProfileId:runtimeActive.id || "profile-personal", profiles:[structuredClone(runtimeActive)] };
    }
    if (!meta.activeProfileId) meta.activeProfileId = runtimeActive.id || meta.profiles[0].id;
    const active = meta.profiles.find(item => item.id === meta.activeProfileId) || meta.profiles[0];
    active.role = "viewer";
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify(meta));
  });
  await page.reload({ waitUntil:"networkidle" });
  await stable(page);
  await page.waitForFunction(() => window.FinanceProfileArchitecture?.canWrite?.() === false);
  const viewerResult = await page.evaluate(() => window.FinanceLedgerTransactions.repairSafeIntegrity());
'''
if source.count(old) != 1:
    raise SystemExit("integrity Viewer fixture changed")
source = source.replace(old, new, 1)

# The guarded import handler is asynchronous. Wait for its busy cycle to finish before asserting rollback state.
old = '''  await expect(page.locator("#syncReviewDialog")).toBeVisible();
  await page.locator("#mergeUseIncomingButton").click();
  await expect.poll(() => page.evaluate(name => Object.prototype.hasOwnProperty.call(data.accounts || {}, name), importedName), { timeout:10000 }).toBe(false);
  const after = await page.evaluate(() => JSON.stringify(data));
'''
new = '''  await expect(page.locator("#syncReviewDialog")).toBeVisible();
  const mergeButton = page.locator("#mergeUseIncomingButton");
  await mergeButton.click();
  await expect(mergeButton).toBeDisabled();
  await expect(mergeButton).toBeEnabled({ timeout:10000 });
  await expect.poll(() => page.evaluate(name => Object.prototype.hasOwnProperty.call(data.accounts || {}, name), importedName), { timeout:10000 }).toBe(false);
  const after = await page.evaluate(() => JSON.stringify(data));
'''
if source.count(old) != 1:
    raise SystemExit("integrity rollback browser synchronization changed")
path.write_text(source.replace(old, new, 1))

# Failed import rollback must restore the recovery snapshot's account set exactly.
path = root / "assets/js/privacy-lock.js"
source = path.read_text()
old = '''    if(typeof data!=="undefined") data=typeof normalizeData==="function" ? normalizeData(source) : source;
    if(typeof persistFinanceDataRaw==="function"){
'''
new = '''    if(typeof data!=="undefined") {
      const restored=typeof normalizeData==="function" ? normalizeData(source) : source;
      restored.accounts=cloneValue(source.accounts || {});
      restored.accountTypes=cloneValue(source.accountTypes || {});
      restored.accountOrder=cloneValue(source.accountOrder || Object.keys(source.accounts || {}));
      restored.accountIcons=cloneValue(source.accountIcons || {});
      data=restored;
    }
    if(typeof persistFinanceDataRaw==="function"){
'''
if source.count(old) != 1:
    raise SystemExit("recovery snapshot restore assignment changed")
path.write_text(source.replace(old, new, 1))

print("Phase 4 browser hash, authenticated integrity UI, Viewer metadata, synchronized rollback, and exact account restore hardened.")
