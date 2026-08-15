from pathlib import Path

root = Path(__file__).resolve().parents[1]


def replace(path, old, new, count=None):
    file = root / path
    text = file.read_text()
    if old in text:
        text = text.replace(old, new, count if count is not None else -1)
        file.write_text(text)
        return True
    return new in text


# Release-facing documentation and static Settings version text.
replace("README.md", "# My Finance Records · V15.2.1", "# My Finance Records · V15.2.2", 1)
readme = root / "README.md"
text = readme.read_text()
mobile_update = "- **V15.2.2 · Mobile UI & UX** — Refines phone layouts across 320–428px, fixes sticky Finance tabs, standardizes key 44px touch targets, and makes mobile overflow actions safer without changing finance logic, sync cadence, or the completed desktop interface.\n"
if mobile_update not in text:
    anchor = "## Recent updates\n\n"
    if anchor not in text:
        raise SystemExit("README Recent updates heading is missing")
    text = text.replace(anchor, anchor + mobile_update, 1)
    readme.write_text(text)

replace("index.html", 'id="settingsOverviewAppStatus">Version 15.2.1</strong>', 'id="settingsOverviewAppStatus">Version 15.2.2</strong>', 1)

# Repository inspection must track the new semantic release. The first patcher may
# already have changed generic title strings, so these replacements are intentionally idempotent.
replace("tests/inspect-project.mjs", 'pkg.version !== "15.2.1"', 'pkg.version !== "15.2.2"')
replace("tests/inspect-project.mjs", "Expected current package version 15.2.1", "Expected current package version 15.2.2")
replace("tests/inspect-project.mjs", '# My Finance Records · V15.2.1', '# My Finance Records · V15.2.2')
replace("tests/inspect-project.mjs", "README release heading is not V15.2.1", "README release heading is not V15.2.2")
replace("tests/inspect-project.mjs", "## 15.2.1 · 2026-08-16", "## 15.2.2 · 2026-08-16")
replace("tests/inspect-project.mjs", "CHANGELOG latest entry is not V15.2.1", "CHANGELOG latest entry is not V15.2.2")
replace("tests/inspect-project.mjs", "Repository inspection passed: V15.2.1 release files", "Repository inspection passed: V15.2.2 release files")

# Preserve the desktop UX contract while allowing the V15.2.2 release wrapper/cache.
replace("tests/validate-v15-2-0-desktop-ux.mjs", 'sw.includes(\'const APP_VERSION = "15.2.1"\')', 'sw.includes(\'const APP_VERSION = "15.2.2"\')')
replace("tests/validate-v15-2-0-desktop-ux.mjs", 'read("sync-config.js").includes(\'const VERSION = "15.2.1"\')', 'read("sync-config.js").includes(\'const VERSION = "15.2.2"\')')
replace("tests/validate-v15-2-0-desktop-ux.mjs", 'read("sync-config.js").includes(\'const RELEASE_NAME = "Desktop UX Quick Wins"\')', 'read("sync-config.js").includes(\'const RELEASE_NAME = "Mobile UI & UX"\')')
replace("tests/validate-v15-2-0-desktop-ux.mjs", "release override matches V15.2.1", "release override matches V15.2.2")
replace("tests/validate-v15-2-0-desktop-ux.mjs", 'console.log("V15.2.1 desktop UX source contract passed");', 'console.log("V15.2.2 release preserves the desktop UX source contract");')

# Static release text that deliberately changed, while keeping V15.2.1 asset pins intact.
replace("tests/validate-desktop-ui-phase1-v15-1-0.mjs", 'id="settingsOverviewAppStatus">Version 15.2.1</strong>', 'id="settingsOverviewAppStatus">Version 15.2.2</strong>')
replace("tests/v15-2-1-desktop-ux-quick-wins.spec.mjs", 'expect(index).toContain("V15.2.1");', 'expect(index).toContain("V15.2.2");')
replace("tests/validate-pwa-updater-v15-0-5.mjs", 'assert.match(worker, /const APP_VERSION = "15\\.2\\.1";/);', 'assert.match(worker, /const APP_VERSION = "15\\.2\\.2";/);')

# The browser fixture should exercise a real top-layer dialog. A bare <dialog open>
# stays at its document position and gives misleading short-viewport geometry.
browser = "tests/v15-2-2-mobile-ui-ux.spec.mjs"
replace(browser, '<dialog class="app-dialog" open>', '<dialog class="app-dialog">')
replace(browser, '`, { waitUntil:"networkidle" });\n}', '`, { waitUntil:"networkidle" });\n  await page.evaluate(() => document.querySelector(".app-dialog")?.showModal());\n}', 1)
replace(browser, 'overflow:document.documentElement.scrollWidth > innerWidth + 1\n  }));', 'dialogInside:document.querySelector(".app-dialog").getBoundingClientRect().right <= innerWidth + 1\n  }));', 1)
replace(browser, 'expect(metrics.overflow).toBe(false);\n});\n\ntest("V15.2.2 short portrait', 'expect(metrics.dialogInside).toBe(true);\n});\n\ntest("V15.2.2 short portrait', 1)

# Verify the critical release-facing expectations now exist.
checks = {
    "README.md": "# My Finance Records · V15.2.2",
    "index.html": 'id="settingsOverviewAppStatus">Version 15.2.2</strong>',
    "tests/inspect-project.mjs": 'pkg.version !== "15.2.2"',
    "tests/validate-v15-2-0-desktop-ux.mjs": 'const RELEASE_NAME = "Mobile UI & UX"',
    "tests/validate-desktop-ui-phase1-v15-1-0.mjs": 'Version 15.2.2</strong>',
    "tests/validate-pwa-updater-v15-0-5.mjs": 'APP_VERSION = "15\\.2\\.2"',
    browser: 'showModal()',
}
for path, token in checks.items():
    if token not in (root / path).read_text():
        raise SystemExit(f"V15.2.2 alignment check failed for {path}: {token}")

print("Aligned V15.2.2 release documentation and regression pins")
