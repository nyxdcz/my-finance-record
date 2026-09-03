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

# The integrity card lives in the Profile & Security settings panel. Open Settings and that panel through Talaan's controller.
path = root / "tests/browser/finance-integrity-recovery.spec.mjs"
source = path.read_text()
old = '''  await page.goto(appUrl, { waitUntil:"networkidle" });
  await stable(page);
  const before = await page.evaluate(() => JSON.stringify(data));
  await expect(page.locator("#runIntegrityCheckButton")).toBeVisible();
'''
new = '''  await page.goto(appUrl, { waitUntil:"networkidle" });
  await stable(page);
  await page.evaluate(() => {
    window.goToPage?.("settings", { historyMode:"none", smooth:false });
    window.activateSettingsPanel?.("profiles", false);
  });
  await expect(page.locator("#settings-panel-profiles")).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(data));
  await expect(page.locator("#runIntegrityCheckButton")).toBeVisible();
'''
if source.count(old) != 1:
    raise SystemExit("integrity UI browser setup changed")
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

print("Phase 4 browser hash, panel routing, and exact account rollback hardened.")
