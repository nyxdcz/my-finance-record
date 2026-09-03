from pathlib import Path

root = Path(__file__).resolve().parents[1]

# Viewer/read-only profiles must be rejected before planning or returning a no-op success.
path = root / "assets/js/account-ledger.js"
source = path.read_text()
old = '''  function commitSafeIntegrityRepair({ message = "Safe financial integrity repairs applied" } = {}) {
    const service = window.FinanceIntegrity;
    if (!service?.repairSafe || !service?.scan) return { ok:false, reason:"integrity-service-unavailable" };
    const planned = service.repairSafe(data);
'''
new = '''  function commitSafeIntegrityRepair({ message = "Safe financial integrity repairs applied" } = {}) {
    const architecture = window.FinanceProfileArchitecture;
    if (architecture?.canWrite?.() === false) return { ok:false, reason:"read-only", count:0 };
    const service = window.FinanceIntegrity;
    if (!service?.repairSafe || !service?.scan) return { ok:false, reason:"integrity-service-unavailable" };
    const planned = service.repairSafe(data);
'''
if source.count(old) != 1:
    raise SystemExit("safe integrity repair owner contract changed")
path.write_text(source.replace(old, new, 1))

# Lock the Viewer guard into the normal source regression suite.
path = root / "tests/sync/validate-integrity-recovery-gates.mjs"
source = path.read_text()
old = '''const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const security = fs.readFileSync("assets/js/security-profiles.js", "utf8");
'''
new = '''const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const security = fs.readFileSync("assets/js/security-profiles.js", "utf8");
const ledger = fs.readFileSync("assets/js/account-ledger.js", "utf8");
'''
if source.count(old) != 1:
    raise SystemExit("integrity recovery source imports changed")
source = source.replace(old, new, 1)
anchor = '''for (const token of [
  "function applyGuardedFinanceReplacement(",
'''
guard = '''assert.ok(
  ledger.includes('if (architecture?.canWrite?.() === false) return { ok:false, reason:"read-only", count:0 };'),
  "Viewer profiles must be rejected before safe integrity repair planning or no-op success"
);

'''
if source.count(anchor) != 1:
    raise SystemExit("integrity recovery security guard anchor changed")
source = source.replace(anchor, guard + anchor, 1)
path.write_text(source)

print("Phase 4 Viewer integrity repair guard staged and regression-locked.")
