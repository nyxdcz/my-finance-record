from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "tests/finance/validate-finance-ui-source.mjs"
source = path.read_text()
old = 'const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
new = 'const accountIntegritySources = ["assets/js/finance-integrity.js","assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
if source.count(old) != 1:
    raise SystemExit("finance UI Account Integrity hash source contract changed")
source = source.replace(old, new, 1)
marker = 'assert.ok(index.includes(`./account-ledger.js?v=${accountIntegrityQuery}`), "index must load account-ledger.js with the Account Integrity query");'
insert = 'assert.ok(index.includes(`./finance-integrity.js?v=${accountIntegrityQuery}`), "index must load finance-integrity.js with the Account Integrity query");\nassert.ok(worker.includes(`./finance-integrity.js?v=${accountIntegrityQuery}`), "service worker must precache finance-integrity.js with the Account Integrity query");\n' + marker
if source.count(marker) != 1:
    raise SystemExit("finance UI account-ledger query assertion changed")
source = source.replace(marker, insert, 1)
path.write_text(source)
print("Phase 4 finance UI runtime query expectations aligned.")
