from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text()

def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)

def replace_once(path, old, new, label):
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match in {path}, found {count}")
    write(path, source.replace(old, new, 1))

# 1. Remove the obsolete release-enforcement wrapper from the canonical runtime source.
sync_path = "assets/js/ui/sync-runtime-compat.js"
sync = read(sync_path)
marker = "(function enhanceTalaanRuntimeUi() {"
if marker not in sync:
    raise SystemExit("sync runtime enhancement marker missing")
legacy_markers = [
    "FINANCE_APP_VERSION_OVERRIDE",
    "FINANCE_RELEASE_OVERRIDE",
    "financeLiquidGlassStyles",
    "ensureLiquidGlassStyles",
    "synchronizeTalaanReleaseDisplay",
    "releaseObserveBound",
]
for legacy in legacy_markers:
    if legacy not in sync:
        raise SystemExit(f"expected legacy release marker missing: {legacy}")
write(sync_path, sync[sync.index(marker):].rstrip() + "\n")

# Cloud Sync was the only runtime consumer of the old app-version override.
cloud_path = "assets/js/cloud-sync.js"
cloud = read(cloud_path)
if 'const APP_VERSION_FALLBACK = "15.2.1";' not in cloud:
    raise SystemExit("Cloud Sync legacy app-version fallback not found")
cloud = cloud.replace('const APP_VERSION_FALLBACK = "15.2.1";', 'const APP_VERSION_FALLBACK = "2.5.0";', 1)
old_version_reader = 'return window.FINANCE_APP_VERSION_OVERRIDE || (typeof APP_VERSION !== "undefined" ? APP_VERSION : APP_VERSION_FALLBACK);'
new_version_reader = 'return typeof APP_VERSION !== "undefined" ? APP_VERSION : APP_VERSION_FALLBACK;'
if old_version_reader not in cloud:
    raise SystemExit("Cloud Sync release override reader not found")
cloud = cloud.replace(old_version_reader, new_version_reader, 1)
write(cloud_path, cloud)

# 2. Keep phone runtime behavior dynamic, but move static Settings touch sizing to CSS.
phone_path = "assets/js/ui/phone-finance-compat.js"
phone = read(phone_path)
start = phone.find("  function installPhoneSettingsTouchContract() {")
end = phone.find("  function bindPhoneIconOnlyButton", start)
if start < 0 or end < 0:
    raise SystemExit("phone Settings touch-contract block not found")
phone = phone[:start] + phone[end:]
phone = phone.replace("    installPhoneSettingsTouchContract();\n", "")
if "phoneSettingsTouchContract" in phone or "installPhoneSettingsTouchContract" in phone:
    raise SystemExit("phone touch-contract runtime remnants remain")
write(phone_path, phone)

mobile_path = "assets/css/mobile.css"
mobile = read(mobile_path)
css_marker = "/* Phase 5A · canonical phone Settings touch targets */"
css_block = r'''

/* Phase 5A · canonical phone Settings touch targets */
@media (max-width: 700px) {
  html body #settings :is(button, summary, [role="tab"]) {
    box-sizing: border-box !important;
    min-width: 44px !important;
    min-height: 44px !important;
  }

  html body #settings .context-help-button.section-help-button {
    display: inline-grid !important;
    place-items: center !important;
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    height: 44px !important;
    min-height: 44px !important;
    max-height: 44px !important;
    padding: 0 !important;
    flex: 0 0 44px !important;
  }
}
'''
if css_marker in mobile:
    raise SystemExit("canonical phone Settings touch block already exists")
write(mobile_path, mobile.rstrip() + css_block)

# 3. Load liquid-glass.css statically from canonical HTML.
index_path = "index.html"
index = read(index_path)
liquid_tag = '<link rel="stylesheet" href="./liquid-glass.css?v=2.5.0-talaan1">'
if liquid_tag not in index:
    shell_tag = '<link rel="stylesheet" href="./shell-ui.css?v=2.5.0-talaan1">'
    if shell_tag not in index:
        raise SystemExit("shell-ui stylesheet anchor missing")
    index = index.replace(shell_tag, shell_tag + "\n  " + liquid_tag, 1)
write(index_path, index)

# 4. Remove prepare-runtime rewriting that belonged to the deleted release wrapper.
prepare_path = "scripts/prepare-runtime.mjs"
prepare = read(prepare_path)
pattern = re.compile(
    r'\npatchTextFile\("sync-runtime-compat\.js", source => source\n'
    r'  \.replace\(/const VERSION = .*?\n'
    r'  \.replace\(/link\\\.href[\s\S]*?\);\n',
    re.MULTILINE,
)
match = pattern.search(prepare)
if not match:
    block_start = prepare.find('\npatchTextFile("sync-runtime-compat.js", source => source')
    block_end = prepare.find('\n\npatchTextFile("pwa-update.js"', block_start)
    if block_start < 0 or block_end < 0:
        raise SystemExit("prepare-runtime sync release patch block not found")
    prepare = prepare[:block_start] + prepare[block_end:]
else:
    prepare = prepare[:match.start()] + "\n" + prepare[match.end():]
write(prepare_path, prepare)

# 5. Align existing regression tests with the single-owner runtime contract.
mobile_test_path = "tests/regression/validate-mobile-ui.mjs"
mobile_test = read(mobile_test_path)
old = '''assert.match(runtimeCompat, /const VERSION = "2\\.5\\.0";/);\nassert.match(runtimeCompat, /const RELEASE_NAME = "Talaan";/);\nassert.match(runtimeCompat, /document\\.title = "Talaan";/);'''
new = '''assert.ok(index.includes(`./liquid-glass.css?v=${query}`), "liquid-glass.css must be loaded statically by the document");\nassert.doesNotMatch(runtimeCompat, /FINANCE_APP_VERSION_OVERRIDE|FINANCE_RELEASE_OVERRIDE|financeLiquidGlassStyles|ensureLiquidGlassStyles|synchronizeTalaanReleaseDisplay|releaseObserveBound/, "runtime compatibility code must not own release metadata or stylesheet injection");\nassert.match(mobile, /html body #settings :is\\(button, summary, \\[role="tab"\\]\\)[\\s\\S]*min-height:\\s*44px/, "phone Settings touch targets must live in canonical mobile CSS");\nassert.match(mobile, /#settings \\.context-help-button\\.section-help-button[\\s\\S]*width:\\s*44px/, "phone Settings help targets must stay 44px in canonical CSS");\nassert.doesNotMatch(phoneFinance, /phoneSettingsTouchContract|installPhoneSettingsTouchContract/, "phone compatibility runtime must not inject the Settings touch contract");'''
if old not in mobile_test:
    raise SystemExit("validate-mobile-ui legacy runtime assertions not found")
write(mobile_test_path, mobile_test.replace(old, new, 1))

pwa_test_path = "tests/regression/validate-pwa-runtime.mjs"
pwa = read(pwa_test_path)
anchor = 'const phoneFinance = read("phone-finance-compat.js");\n'
if anchor not in pwa:
    raise SystemExit("validate-pwa-runtime phoneFinance anchor missing")
pwa = pwa.replace(anchor, anchor + 'const runtimeCompat = read("sync-runtime-compat.js");\nconst mobileSource = read("assets/css/mobile.css");\n', 1)
anchor2 = 'assert.match(phoneFinance, /function installPhoneFinanceCompactUi\\(\\)/);\n'
extra = '''assert.doesNotMatch(runtimeCompat, /FINANCE_APP_VERSION_OVERRIDE|FINANCE_RELEASE_OVERRIDE|financeLiquidGlassStyles|ensureLiquidGlassStyles|synchronizeTalaanReleaseDisplay|releaseObserveBound/, "release metadata must have one canonical owner");\nassert.ok(index.includes(`./liquid-glass.css?v=${query}`), "index must statically load liquid-glass.css");\nassert.ok(worker.includes(`./liquid-glass.css?v=${query}`), "service worker must precache static liquid-glass.css");\nassert.match(mobileSource, /html body #settings :is\\(button, summary, \\[role="tab"\\]\\)[\\s\\S]*min-width:\\s*44px/, "Settings phone touch contract must live in mobile.css");\nassert.doesNotMatch(phoneFinance, /phoneSettingsTouchContract|installPhoneSettingsTouchContract/, "phone runtime must keep the Settings touch contract out of JavaScript");\n'''
if anchor2 not in pwa:
    raise SystemExit("validate-pwa-runtime phone compact assertion anchor missing")
pwa = pwa.replace(anchor2, anchor2 + extra, 1)
write(pwa_test_path, pwa)

# Preserve the account correction safety shim and ensure no canonical release override consumers remain.
account_submit = read("assets/js/account-submit-compat.js")
for required in ["guardLedgerBackedAccountSubmit", "ledgerGuard:true", "submitCorrectionFromPrimaryAction"]:
    if required not in account_submit:
        raise SystemExit(f"account submit compatibility safety missing: {required}")

for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith("tests/") or rel.startswith(".github/"):
        continue
    if rel in {sync_path, "sync-runtime-compat.js"}:
        continue
    if path.suffix not in {".js", ".mjs", ".html"}:
        continue
    text = path.read_text(errors="ignore")
    if "FINANCE_APP_VERSION_OVERRIDE" in text or "FINANCE_RELEASE_OVERRIDE" in text:
        raise SystemExit(f"release override consumer remains outside removed shim: {rel}")

print("Phase 5A cleanup patch applied successfully.")
