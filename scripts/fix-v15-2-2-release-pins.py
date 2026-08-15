from pathlib import Path

root = Path(__file__).resolve().parents[1]


def replace(path, old, new, count=None, required=True):
    file = root / path
    text = file.read_text()
    if old in text:
        text = text.replace(old, new, count if count is not None else -1)
        file.write_text(text)
        return
    if new in text:
        return
    if required:
        raise SystemExit(f"Missing release contract in {path}: {old}")


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

# Repository inspection must track the new semantic release.
replace("tests/inspect-project.mjs", 'if (pkg.version !== "15.2.1") fail(`Expected current package version 15.2.1, found ${pkg.version || "(missing)"}`);', 'if (pkg.version !== "15.2.2") fail(`Expected current package version 15.2.2, found ${pkg.version || "(missing)"}`);', 1)
replace("tests/inspect-project.mjs", 'if (!read("README.md").startsWith("# My Finance Records · V15.2.1")) fail("README release heading is not V15.2.1");', 'if (!read("README.md").startsWith("# My Finance Records · V15.2.2")) fail("README release heading is not V15.2.2");', 1)
replace("tests/inspect-project.mjs", 'if (!read("CHANGELOG.md").startsWith("## 15.2.1 · 2026-08-16")) fail("CHANGELOG latest entry is not V15.2.1");', 'if (!read("CHANGELOG.md").startsWith("## 15.2.2 · 2026-08-16")) fail("CHANGELOG latest entry is not V15.2.2");', 1)
replace("tests/inspect-project.mjs", 'console.log("Repository inspection passed: V15.2.1 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");', 'console.log("Repository inspection passed: V15.2.2 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");', 1)

# Preserve the desktop UX contract while allowing the V15.2.2 release wrapper/cache.
replace("tests/validate-v15-2-0-desktop-ux.mjs", '[sw.includes(\'const APP_VERSION = "15.2.1"\') && sw.includes(version.cacheVersion), "service worker delivery matches release"]', '[sw.includes(\'const APP_VERSION = "15.2.2"\') && sw.includes(version.cacheVersion), "service worker delivery matches release"]', 1)
replace("tests/validate-v15-2-0-desktop-ux.mjs", '[read("sync-config.js").includes(\'const VERSION = "15.2.1"\') && read("sync-config.js").includes(\'const RELEASE_NAME = "Desktop UX Quick Wins"\'), "release override matches V15.2.1"]', '[read("sync-config.js").includes(\'const VERSION = "15.2.2"\') && read("sync-config.js").includes(\'const RELEASE_NAME = "Mobile UI & UX"\'), "release override matches V15.2.2"]', 1)
replace("tests/validate-v15-2-0-desktop-ux.mjs", 'console.log("V15.2.1 desktop UX source contract passed");', 'console.log("V15.2.2 release preserves the desktop UX source contract");', 1)

# Static release text that deliberately changed, while keeping V15.2.1 asset pins intact.
replace("tests/validate-desktop-ui-phase1-v15-1-0.mjs", 'id="settingsOverviewAppStatus">Version 15.2.1</strong>', 'id="settingsOverviewAppStatus">Version 15.2.2</strong>', 1)
replace("tests/v15-2-1-desktop-ux-quick-wins.spec.mjs", 'expect(index).toContain("V15.2.1");', 'expect(index).toContain("V15.2.2");', 1)

print("Aligned V15.2.2 release documentation and regression pins")
