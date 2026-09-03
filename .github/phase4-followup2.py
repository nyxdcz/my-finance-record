from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "tests/sync/validate-safe-multidevice-sync.mjs"
source = path.read_text()
old = 'const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
new = 'const accountIntegritySources = ["assets/js/finance-integrity.js","assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];'
if source.count(old) != 1:
    raise SystemExit("safe multi-device Account Integrity hash source contract changed")
source = source.replace(old, new, 1)
path.write_text(source)
print("Phase 4 safe multi-device runtime query expectations aligned.")
