from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected one match in {path}, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


ledger = Path("assets/js/account-ledger.js")
text = ledger.read_text()
old = '''    try {\n      const saved = saveData(message);\n      if (saved === false) return restoreAccountMutation(snapshot, "Account changes were not saved. Check profile permissions and try again.");\n    } catch (error) {\n      console.error("Account changes could not be persisted.", error);\n      return restoreAccountMutation(snapshot, "Account changes could not be saved on this device.");\n    }'''
new = '''    try {\n      if (typeof persistFinanceDataRaw !== "function") throw new Error("Finance persistence is unavailable.");\n      const saved = persistFinanceDataRaw(message);\n      if (saved === false) return restoreAccountMutation(snapshot, "Account changes were not saved. Check profile permissions and try again.");\n    } catch (error) {\n      console.error("Account changes could not be persisted.", error);\n      return restoreAccountMutation(snapshot, "Account changes could not be saved on this device.");\n    }'''
if old not in text:
    raise SystemExit("Account persistence block not found")
text = text.replace(old, new, 1)
old_return = '''    if (!profileBalancesMatch(expectedBalances)) {\n      const architecture = window.FinanceProfileArchitecture;\n      let repaired = false;\n      try { repaired = architecture?.persistCurrentData?.(data, message) !== false; } catch (error) { console.error("Could not repair profile-scoped account persistence.", error); }\n      if (!repaired || !profileBalancesMatch(expectedBalances)) {\n        return restoreAccountMutation(snapshot, "The account update could not be stored in the active profile.");\n      }\n    }\n    return true;'''
new_return = '''    if (!profileBalancesMatch(expectedBalances)) {\n      const architecture = window.FinanceProfileArchitecture;\n      let repaired = false;\n      try { repaired = architecture?.persistCurrentData?.(data, message) !== false; } catch (error) { console.error("Could not repair profile-scoped account persistence.", error); }\n      if (!repaired || !profileBalancesMatch(expectedBalances)) {\n        return restoreAccountMutation(snapshot, "The account update could not be stored in the active profile.");\n      }\n    }\n    showToast(message);\n    return true;'''
if old_return not in text:
    raise SystemExit("Account persistence success block not found")
text = text.replace(old_return, new_return, 1)
old_settings = '''    return persistAccountMutation(\n      snapshot,\n      `${changes.length} account balance${changes.length === 1 ? "" : "s"} reconciled`,\n      changes.map(item => ({ account:item.account, target:item.target }))\n    );'''
new_settings = '''    const saved = persistAccountMutation(\n      snapshot,\n      `${changes.length} account balance${changes.length === 1 ? "" : "s"} reconciled`,\n      changes.map(item => ({ account:item.account, target:item.target }))\n    );\n    if (saved) {\n      try { renderAll(false); } catch (error) { console.error("Account balances were saved but Settings refresh failed.", error); }\n    }\n    return saved;'''
if old_settings not in text:
    raise SystemExit("Settings reconciliation return block not found")
text = text.replace(old_settings, new_settings, 1)
ledger.write_text(text)

# Force installed clients to request the corrected runtime rather than the first account-integrity build.
for path in [Path("scripts/prepare-runtime.mjs"), Path("assets/js/pwa-update.js")]:
    source = path.read_text()
    source = source.replace("2.5.0-account-integrity1", "2.5.0-account-integrity2")
    source = source.replace("finance-account-integrity-v2-5-0-talaan1", "finance-account-integrity-v2-5-0-talaan2")
    path.write_text(source)

# Align all source/browser regressions with the corrected delivery key.
for root in [Path("tests")]:
    for path in root.rglob("*.mjs"):
        source = path.read_text()
        next_source = source.replace("2.5.0-account-integrity1", "2.5.0-account-integrity2")\
            .replace("finance-account-integrity-v2-5-0-talaan1", "finance-account-integrity-v2-5-0-talaan2")
        if next_source != source:
            path.write_text(next_source)

spec = Path("tests/browser/account-balance-persistence.spec.mjs")
source = spec.read_text()
marker = 'test("Settings account balance update is reconciled and profile-persisted", async ({ page }) => {'
regression = '''test("account correction remains saved when post-persistence rendering fails", async ({ page }) => {\n  await openControlledPwa(page, { width:1440, height:1000 });\n  const setup = await accountSetup(page, 4321.09);\n  expect(setup.account).not.toBe("");\n\n  const card = page.locator(`#moneyAccounts [data-account-card="${setup.account}"]`);\n  await card.locator("[data-edit-account]").click();\n  await page.locator("#accountBalance").fill(setup.target.toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 }));\n  await page.evaluate(() => {\n    window.__accountIntegrityOriginalRenderAll = window.renderAll;\n    window.renderAll = () => { throw new Error("simulated post-save render failure"); };\n  });\n\n  await page.locator("#accountPrimaryAction").click();\n  await expect(page.locator("#accountDialog")).not.toBeVisible();\n  await expect(page.getByText("Account changes could not be saved on this device.")).toHaveCount(0);\n\n  const saved = await readAccountState(page, setup);\n  expect(saved.runtime).toBe(setup.target);\n  expect(saved.persisted).toBe(setup.target);\n  expect(saved.profilePersisted).toBe(setup.target);\n  expect(saved.reconciliationId).not.toBe("");\n  expect(saved.ledgerEntryId).not.toBe("");\n\n  await page.evaluate(() => {\n    if (window.__accountIntegrityOriginalRenderAll) window.renderAll = window.__accountIntegrityOriginalRenderAll;\n    delete window.__accountIntegrityOriginalRenderAll;\n  });\n});\n\n'''
if regression not in source:
    if marker not in source:
        raise SystemExit("Browser regression insertion marker not found")
    source = source.replace(marker, regression + marker, 1)
    spec.write_text(source)

# Source validator: account corrections must use persistence-only write path so render errors cannot roll back a saved balance.
pwa = Path("tests/regression/validate-pwa-runtime.mjs")
source = pwa.read_text()
needle = 'assert.match(accountLedger, /function persistAccountMutation\\(/);\n'
extra = 'assert.match(accountLedger, /typeof persistFinanceDataRaw !== "function"/);\nassert.match(accountLedger, /const saved = persistFinanceDataRaw\\(message\\)/);\n'
if extra not in source:
    if needle not in source:
        raise SystemExit("PWA validator insertion marker not found")
    source = source.replace(needle, needle + extra, 1)
    pwa.write_text(source)

print("Account render/save hotfix applied.")
