from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "tests/sync/validate-payees-rules-sync.mjs"
source = path.read_text()
old = 'assert.match(profiles, /normalizeData\\(payload\\.data\\)/);'
new = 'assert.match(profiles, /applyGuardedFinanceReplacement\\(payload\\.data, "Encrypted backup restored"\\)/);\nassert.match(profiles, /const next = typeof normalizeData === "function" \\? normalizeData\\(clone\\(source\\)\\)/);'
if source.count(old) != 1:
    raise SystemExit("backup restore contract assertion changed")
path.write_text(source.replace(old, new, 1))
print("Phase 4 guarded backup restore contract aligned.")
