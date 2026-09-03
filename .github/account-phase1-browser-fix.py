from pathlib import Path

path = Path("tests/browser/account-balance-persistence.spec.mjs")
text = path.read_text()

old = '''async function readAccountState(page, setup) {
  return page.evaluate(({ account, target }) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");'''
new = '''async function readAccountState(page, setup) {
  return page.evaluate(({ account, target, accountAssetQuery }) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");'''
if text.count(old) != 1:
    raise SystemExit(f"readAccountState opening match count: {text.count(old)}")
text = text.replace(old, new, 1)

old = '''ledgerAsset:[...performance.getEntriesByType("resource")].some(entry => entry.name.includes(`account-ledger.js?v=${ACCOUNT_ASSET_QUERY}`))'''
new = '''ledgerAsset:[...performance.getEntriesByType("resource")].some(entry => entry.name.includes(`account-ledger.js?v=${accountAssetQuery}`))'''
if text.count(old) != 1:
    raise SystemExit(f"ledgerAsset query match count: {text.count(old)}")
text = text.replace(old, new, 1)

start = text.index('async function readAccountState(page, setup) {')
end = text.index('\n}\n\nfor (const viewport', start)
segment = text[start:end]
old = '  }, setup);'
new = '  }, { ...setup, accountAssetQuery:ACCOUNT_ASSET_QUERY });'
if segment.count(old) != 1:
    raise SystemExit(f"readAccountState evaluate argument match count: {segment.count(old)}")
segment = segment.replace(old, new, 1)
text = text[:start] + segment + text[end:]

path.write_text(text)
print("Account Phase 1 browser harness fixed.")
