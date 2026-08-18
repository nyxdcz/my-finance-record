from pathlib import Path
import json

OLD_CACHE = "finance-v15-20260818-ui-refinement-r39"
NEW_CACHE = "finance-v15-20260818-disclosure-alignment-r40"


def replace(path, old, new, expected_min=1):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count < expected_min:
        raise SystemExit(f"{path}: expected {old!r}, found {count}")
    p.write_text(text.replace(old, new))
    print(f"{path}: {count} replacement(s)")


replace("index.html", "<title>My Finance Records · V15.2.4</title>", "<title>My Finance Records · V15.2.5</title>")
replace("index.html", "desktop-ux-v15-2-0.css?v=15.2.4-header1", "desktop-ux-v15-2-0.css?v=15.2.5-disclosure1")
replace("index.html", "pwa-update-v15-0-5.js?v=15.2.4-release1", "pwa-update-v15-0-5.js?v=15.2.5-release1")
replace("index.html", 'title="V15.2.4 · Finance UI &amp; Header Refinement · August 18, 2026">V15.2.4</small>', 'title="V15.2.5 · Finance Disclosure Alignment · August 18, 2026">V15.2.5</small>')
replace("index.html", 'const APP_VERSION = "15.2.4";', 'const APP_VERSION = "15.2.5";')
replace("index.html", 'const APP_RELEASE_NAME = "Finance UI & Header Refinement";', 'const APP_RELEASE_NAME = "Finance Disclosure Alignment";')
replace("index.html", 'const APP_CACHE_VERSION = "finance-v15-20260818-ui-refinement-r39";', 'const APP_CACHE_VERSION = "finance-v15-20260818-disclosure-alignment-r40";')
replace("index.html", "sync-config.js?v=15.2.4-release1", "sync-config.js?v=15.2.5-release1")

replace("sw.js", 'const CACHE_NAME = "finance-v15-20260818-ui-refinement-r39";', 'const CACHE_NAME = "finance-v15-20260818-disclosure-alignment-r40";')
replace("sw.js", 'const APP_VERSION = "15.2.4";', 'const APP_VERSION = "15.2.5";')
replace("sw.js", "desktop-ux-v15-2-0.css?v=15.2.4-header1", "desktop-ux-v15-2-0.css?v=15.2.5-disclosure1")
replace("sw.js", "pwa-update-v15-0-5.js?v=15.2.4-release1", "pwa-update-v15-0-5.js?v=15.2.5-release1")
replace("sw.js", "sync-config.js?v=15.2.4-release1", "sync-config.js?v=15.2.5-release1")

replace("pwa-update-v15-0-5.js", 'const CURRENT_CACHE_VERSION = "finance-v15-20260818-ui-refinement-r39";', 'const CURRENT_CACHE_VERSION = "finance-v15-20260818-disclosure-alignment-r40";')
replace("sync-config.js", 'const VERSION = "15.2.4";', 'const VERSION = "15.2.5";')
replace("sync-config.js", 'const RELEASE_NAME = "Finance UI & Header Refinement";', 'const RELEASE_NAME = "Finance Disclosure Alignment";')

readme = Path("README.md")
text = readme.read_text()
if not text.startswith("# My Finance Records · V15.2.4"):
    raise SystemExit("README top V15.2.4 heading missing")
text = text.replace("# My Finance Records · V15.2.4", "# My Finance Records · V15.2.5", 1)
anchor = "## V15.2.4 · Finance UI & Header Refinement"
if anchor not in text:
    raise SystemExit("README V15.2.4 history anchor missing")
section = """## V15.2.5 · Finance Disclosure Alignment

Released **August 18, 2026** with PWA cache `finance-v15-20260818-disclosure-alignment-r40`.

### New updates since V15.2.4

- **Budget disclosure alignment** — Aligns Monthly budget plan, Available money, First half, Second half, and Other expenses disclosure controls to a shared **40px** desktop size and the exact **17px** right inset established by First half.
- **Responsive preservation** — Keeps the existing **44px** mobile touch targets and phone layouts unchanged.
- **Delivery refresh** — Cache-busts the disclosure stylesheet, service worker, and release layer so GitHub Pages and installed PWA clients receive the fix.
- **Regression coverage** — Updates current-release source contracts for V15.2.5 while preserving older feature-specific asset versions.

### Preserved in V15.2.5

Finance Schema **12**, Cloud Schema **V3**, finance records, calculations, account balances, conflict-resolution behavior, and the routine **five-minute sync cadence** are unchanged.

"""
readme.write_text(text.replace(anchor, section + anchor, 1))

lock_path = Path("package-lock.json")
lock = json.loads(lock_path.read_text())
lock["version"] = "15.2.5"
lock["packages"][""]["version"] = "15.2.5"
lock_path.write_text(json.dumps(lock, indent=2) + "\n")

p = Path("tests/validate-pwa-updater-v15-0-5.mjs")
text = p.read_text()
text = text.replace('assert.equal(version.version, "15.2.4");', 'assert.equal(version.version, "15.2.5");')
text = text.replace(OLD_CACHE, NEW_CACHE)
text = text.replace('const APP_VERSION = "15\\.2\\.4";', 'const APP_VERSION = "15\\.2\\.5";')
text = text.replace('pwa-update-v15-0-5\\.js\\?v=15\\.2\\.4-release1', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.5-release1')
text = text.replace('console.log("V15.2.4 PWA updater regression passed with sync-status cache refresh.");', 'console.log("V15.2.5 PWA updater regression passed with disclosure-alignment cache refresh.");')
p.write_text(text)

p = Path("tests/validate-v15-2-2-mobile-ui.mjs")
text = p.read_text()
text = text.replace('assert.equal(version.version, "15.2.4");', 'assert.equal(version.version, "15.2.5");')
text = text.replace('assert.equal(pkg.version, "15.2.4");', 'assert.equal(pkg.version, "15.2.5");')
text = text.replace(OLD_CACHE, NEW_CACHE)
text = text.replace('My Finance Records · V15\\.2\\.4', 'My Finance Records · V15\\.2\\.5')
text = text.replace('sync-config\\.js\\?v=15\\.2\\.4-release1', 'sync-config\\.js\\?v=15\\.2\\.5-release1')
text = text.replace('const APP_VERSION = "15\\.2\\.4";', 'const APP_VERSION = "15\\.2\\.5";')
text = text.replace('const VERSION = "15\\.2\\.4";', 'const VERSION = "15\\.2\\.5";')
text = text.replace('const RELEASE_NAME = "Finance UI & Header Refinement";', 'const RELEASE_NAME = "Finance Disclosure Alignment";')
text = text.replace('console.log("V15.2.4 release preserves V15.2.2 mobile UI/UX and compact Finance source regression.");', 'console.log("V15.2.5 release preserves V15.2.2 mobile UI/UX and compact Finance source regression.");')
p.write_text(text)
