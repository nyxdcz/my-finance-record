from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "scripts/prepare-runtime.mjs"
source = path.read_text()
marker = '''  if (!next.includes('url.pathname.endsWith("account-ledger.js")')) {
    next = next.replace(
      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("interaction-patterns.js") ||',
      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("account-ledger.js") || url.pathname.endsWith("account-submit-compat.js") || url.pathname.endsWith("interaction-patterns.js") ||'
    );
  }
  return next;
'''
replacement = '''  if (!next.includes('url.pathname.endsWith("account-ledger.js")')) {
    next = next.replace(
      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("interaction-patterns.js") ||',
      'url.pathname.endsWith("cloud-sync-lifecycle.js") || url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("account-ledger.js") || url.pathname.endsWith("account-submit-compat.js") || url.pathname.endsWith("interaction-patterns.js") ||'
    );
  }
  if (!next.includes('url.pathname.endsWith("finance-integrity.js")')) {
    next = next.replace(
      'url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("account-ledger.js") ||',
      'url.pathname.endsWith("cloud-sync.js") || url.pathname.endsWith("finance-integrity.js") || url.pathname.endsWith("account-ledger.js") ||'
    );
  }
  return next;
'''
if source.count(marker) != 1:
    raise SystemExit("service-worker critical asset patch marker changed")
path.write_text(source.replace(marker, replacement, 1))
print("Phase 4 integrity runtime is enforced network-first.")
