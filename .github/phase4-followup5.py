from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "tests/regression/validate-cloud-readiness.mjs"
source = path.read_text()
old = 'const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
new = 'const accountIntegritySources = ["assets/js/finance-integrity.js","assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
if source.count(old) != 1:
    raise SystemExit("cloud readiness Account Integrity hash source contract changed")
path.write_text(source.replace(old, new, 1))
print("Phase 4 cloud readiness runtime query expectations aligned.")
