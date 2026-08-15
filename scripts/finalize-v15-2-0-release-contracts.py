#!/usr/bin/env python3
from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8")

def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# Release inspector: promote the current-release contract to V15.2.0.
path = Path("tests/inspect-project.mjs")
text = read(path)
text = text.replace('"desktop-ui-phase1-v15-1-0.css", "pwa-update-v15-0-5.js"', '"desktop-ui-phase1-v15-1-0.css", "desktop-ux-v15-2-0.css", "pwa-update-v15-0-5.js"')
text = text.replace('"Install_V15_1_0.command", "run_audit.sh"', '"Install_V15_2_0.command", "run_audit.sh"')
text = text.replace('"tests/validate-v15-1-0.mjs", "tests/validate-pwa-updater-v15-0-5.mjs"', '"tests/validate-v15-2-0-desktop-ux.mjs", "tests/validate-pwa-updater-v15-0-5.mjs"')
text = one(text, 'if (!deploySources.has("desktop-ui-phase1-v15-1-0.css")) fail("GitHub Pages must package desktop-ui-phase1-v15-1-0.css");', 'if (!deploySources.has("desktop-ui-phase1-v15-1-0.css")) fail("GitHub Pages must package desktop-ui-phase1-v15-1-0.css");\nif (!deploySources.has("desktop-ux-v15-2-0.css")) fail("GitHub Pages must package desktop-ux-v15-2-0.css");', 'Pages V15.2 CSS inspector')
text = one(text, 'if (pkg.version !== "15.1.0") fail(`Expected current package version 15.1.0, found ${pkg.version || "(missing)"}`);', 'if (pkg.version !== "15.2.0") fail(`Expected current package version 15.2.0, found ${pkg.version || "(missing)"}`);', 'package release inspector')
text = one(text, 'if (!read("README.md").startsWith("# My Finance Records · V15.1.0")) fail("README release heading is not V15.1.0");', 'if (!read("README.md").startsWith("# My Finance Records · V15.2.0")) fail("README release heading is not V15.2.0");', 'README release inspector')
text = one(text, 'if (!read("CHANGELOG.md").startsWith("## 15.1.0 · 2026-08-15")) fail("CHANGELOG latest entry is not V15.1.0");', 'if (!read("CHANGELOG.md").startsWith("## 15.2.0 · 2026-08-16")) fail("CHANGELOG latest entry is not V15.2.0");', 'CHANGELOG release inspector')
text = text.replace('["Install_V15_1_0.command", "run_audit.sh"]', '["Install_V15_2_0.command", "run_audit.sh"]')
text = text.replace('Repository inspection passed: V15.1.0 release files', 'Repository inspection passed: V15.2.0 release files')
write(path, text)

# Release layer: make the version override agree with the new release identity.
path = Path("sync-config.js")
text = read(path)
text = one(text, 'const VERSION = "15.1.0";', 'const VERSION = "15.2.0";', 'sync-config version')
text = one(text, 'const RELEASE_NAME = "Black Canvas UI";', 'const RELEASE_NAME = "Desktop UX Consistency";', 'sync-config release name')
text = one(text, 'const RELEASE_DATE = "August 15, 2026";', 'const RELEASE_DATE = "August 16, 2026";', 'sync-config release date')
text = one(text, 'released:"2026-08-15"', 'released:"2026-08-16"', 'sync-config release ISO date')
write(path, text)

# Static source identity and cache-busting for the changed release layer.
path = Path("index.html")
text = read(path)
text = text.replace('const APP_RELEASE_NAME = "Black Canvas UI";', 'const APP_RELEASE_NAME = "Desktop UX Consistency";')
text = text.replace('V15.1.0 · Black Canvas UI · August 15, 2026', 'V15.2.0 · Desktop UX Consistency · August 16, 2026')
text = text.replace('./sync-config.js?v=15.1.0-light1', './sync-config.js?v=15.2.0-ux1')
write(path, text)

path = Path("sw.js")
text = read(path)
text = text.replace('./sync-config.js?v=15.1.0-light1', './sync-config.js?v=15.2.0-ux1')
text = text.replace('./liquid-glass-v15.css?v=15.1.0-light1', './liquid-glass-v15.css?v=15.2.0-light1')
write(path, text)

# Keep the macOS audit entry point release-aligned.
old_installer = Path("Install_V15_1_0.command")
new_installer = Path("Install_V15_2_0.command")
installer = read(old_installer).replace("15.1.0", "15.2.0").replace("V15.1.0", "V15.2.0")
write(new_installer, installer)
new_installer.chmod(0o755)
old_installer.unlink()

# Extend the new V15.2 validator with release-layer checks.
path = Path("tests/validate-v15-2-0-desktop-ux.mjs")
text = read(path)
needle = '  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.0"), "desktop UX CSS is precached"],'
replacement = needle + '\n  [read("sync-config.js").includes(\'const VERSION = "15.2.0"\') && read("sync-config.js").includes(\'const RELEASE_NAME = "Desktop UX Consistency"\'), "release override matches V15.2.0"],\n  [index.includes("sync-config.js?v=15.2.0-ux1") && sw.includes("sync-config.js?v=15.2.0-ux1"), "release layer is cache-busted consistently"],'
text = one(text, needle, replacement, 'V15.2 release validator extension')
write(path, text)

print("Finalized V15.2.0 release contracts")
