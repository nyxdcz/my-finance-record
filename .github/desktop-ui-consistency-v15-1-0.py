from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_required(path, old, new, expected=1):
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s) of {old!r}, found {count}")
    write(path, text.replace(old, new, expected))


def sub_required(path, pattern, replacement, expected=1, flags=re.S):
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=expected, flags=flags)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} regex replacement(s) for {pattern!r}, found {count}")
    write(path, updated)


def replace_all_text(old, new):
    changed = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts or "node_modules" in path.parts:
            continue
        if path.suffix.lower() not in {".html", ".js", ".mjs", ".json", ".css", ".md", ".yml", ".yaml", ".command"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if old in text:
            path.write_text(text.replace(old, new), encoding="utf-8")
            changed += 1
    if not changed:
        raise SystemExit(f"global replacement found no files for {old!r}")
    return changed


# --- app.css: make the existing workspace contract the desktop geometry owner. ---
replace_required(
    "app.css",
    "      --workspace-control-height: 38px;\n      --workspace-soft-shadow:",
    "      --workspace-control-height: 38px;\n      --workspace-compact-control-height: 35px;\n      --workspace-soft-shadow:",
)
replace_required(
    "app.css",
    "    .dashboard-view .topbar { min-height: 64px; padding-top: 8px; padding-bottom: 8px; }\n    .dashboard-view .content { padding: 16px 20px 22px; }",
    "    .dashboard-view .topbar { min-height: 72px; padding-top: 12px; padding-bottom: 12px; }\n    .dashboard-view .content { padding: 18px 22px 34px; }",
)
sub_required(
    "app.css",
    r"(#dashboard \.card \{\s*)padding:\s*12px;\s*border-radius:\s*12px;\s*box-shadow:\s*0 5px 18px rgba\(16, 24, 40, 0\.05\);",
    r"\1padding: var(--workspace-card-padding);\n      border-radius: var(--workspace-card-radius);\n      box-shadow: var(--workspace-soft-shadow);",
)
sub_required(
    "app.css",
    r"(#reports \.kpi-grid \.card \{\s*)padding:\s*10px 11px;\s*border-radius:\s*11px;\s*box-shadow:\s*0 5px 14px rgba\(16, 24, 40, 0\.05\);",
    r"\1padding: var(--workspace-card-padding);\n      border-radius: var(--workspace-card-radius);\n      box-shadow: var(--workspace-soft-shadow);",
)
replace_required(
    "app.css",
    "      min-height:76px;\n      padding:10px 11px;",
    "      min-height:70px;\n      padding:10px 11px;",
)
replace_required(
    "app.css",
    "    #projects .project-summary-strip > * { min-height:62px; padding:9px 10px; }\n    #payments .kpi-grid { gap:8px; }\n    #payments .kpi-card { min-height:72px; padding:9px 10px; }",
    "    #projects .project-summary-strip > * { min-height:70px; padding:9px 10px; }\n    #payments .kpi-grid { gap:8px; }\n    #payments .kpi-card { min-height:70px; padding:9px 10px; }",
)
replace_required(
    "app.css",
    "      min-height:40px;\n      padding:8px 10px;\n      text-align:left;",
    "      min-height:38px;\n      padding:8px 10px;\n      text-align:left;",
)
replace_required(
    "app.css",
    ".settings-search-field .input { min-height:40px; padding:7px 0; border:0; background:transparent; box-shadow:none; }",
    ".settings-search-field .input { min-height:38px; padding:7px 0; border:0; background:transparent; box-shadow:none; }",
)
replace_required(
    "app.css",
    "      .sidebar-close-button { top:10px; left:10px; right:auto; width:44px; height:42px; border-color:transparent; background:transparent; }",
    "      .sidebar-close-button { top:10px; left:10px; right:auto; width:44px; height:44px; border-color:transparent; background:transparent; }",
)
replace_required(
    "app.css",
    "    #money { --expense-filter-height: 35px; }",
    "    #money { --expense-filter-height: var(--workspace-compact-control-height); }",
)
sub_required(
    "app.css",
    r"(\.expense-toolbar-compact \.input,\s*\.expense-toolbar-compact \.select,\s*\.paid-toolbar-compact \.input,\s*\.paid-toolbar-compact \.select,\s*\.project-toolbar-compact \.input,\s*\.project-toolbar-compact \.select \{\s*)min-height:35px;\s*height:35px;",
    r"\1min-height:var(--workspace-compact-control-height);\n      height:var(--workspace-compact-control-height);",
)
sub_required(
    "app.css",
    r"(\.expense-toolbar-compact \.expense-view-toggle \{\s*)min-height:35px;\s*height:35px;",
    r"\1min-height:var(--workspace-compact-control-height);\n      height:var(--workspace-compact-control-height);",
)
sub_required(
    "app.css",
    r"(\.expense-clear-filters,\s*\.paid-clear-filters,\s*\.project-clear-filters \{\s*)min-height:35px;\s*height:35px;",
    r"\1min-height:var(--workspace-compact-control-height);\n      height:var(--workspace-compact-control-height);",
)
replace_required(
    "app.css",
    "    #reports .report-section-nav button { min-height:34px; padding:5px 9px; }",
    "    #reports .report-section-nav button { min-height:35px; padding:5px 9px; }",
)

# Replace legacy light-only component surfaces with the active palette surfaces.
for pattern, replacement in [
    (r"(\.monthly-check-item \{[^}]*?)background:\s*#fff;", r"\1background: var(--surface);"),
    (r"(\.monthly-check-item\.is-done \{[^}]*?)background:\s*#f5faf7;", r"\1background: var(--surface-soft);"),
    (r"(\.record-header \{[^}]*?)background:\s*#fafbfc;", r"\1background: var(--surface-soft);"),
    (r"(\.expense-view-toggle \{[^}]*?)background:\s*#f7f8fa;", r"\1background: var(--surface-soft);"),
    (r"(\.expense-view-toggle \.button\.active \{[^}]*?)background:\s*#fff;", r"\1background: var(--surface);"),
    (r"(\.bulk-expense-bar \{[^}]*?)background:\s*#f6f9fd;", r"\1background: var(--surface-soft);"),
    (r"(\.bulk-select-label \{[^}]*?)color:\s*#344054;", r"\1color: var(--text);"),
    (r"(\.collapse-toggle \{[^}]*?)background:\s*#fff;", r"\1background: var(--surface);"),
    (r"(\.collapse-toggle:hover \{[^}]*?)background:\s*#f2f4f7;", r"\1background: var(--surface-soft);"),
]:
    sub_required("app.css", pattern, replacement)
sub_required(
    "app.css",
    r"(\.input, \.select, \.textarea \{[^}]*?)border:\s*1px solid #d0d5dd;([^}]*?)background:\s*#fff;",
    r"\1border: 1px solid var(--line);\2background: var(--surface);",
)

# --- Reports: use the existing compact-control tier. ---
replace_required(
    "reports-insights.css",
    ".report-insights-filters .input,.report-insights-filters .select { min-height:37px; height:37px; font-size:.72rem; }\n.report-insights-filter-actions { display:flex; gap:6px; }\n.report-insights-filter-actions .button { min-height:37px; }",
    ".report-insights-filters .input,.report-insights-filters .select { min-height:35px; height:35px; font-size:.72rem; }\n.report-insights-filter-actions { display:flex; gap:6px; }\n.report-insights-filter-actions .button { min-height:35px; }",
)
replace_required(
    "reports-insights.css",
    ".report-insights-kpis > div { min-width:0; padding:9px 10px; border:1px solid var(--line); border-radius:9px; background:var(--surface-soft); }",
    ".report-insights-kpis > div { min-width:0; padding:9px 10px; border:1px solid var(--line); border-radius:8px; background:var(--surface-soft); }",
)
replace_required(
    "reports-insights.css",
    ".report-insight-panel { min-width:0; padding:11px; border:1px solid var(--line); border-radius:10px; background:var(--surface); }",
    ".report-insight-panel { min-width:0; padding:11px; border:1px solid var(--line); border-radius:9px; background:var(--surface); }",
)

# --- Monthly Budget Plan: align expanded top summaries; preserve collapsed/mobile overrides. ---
replace_required(
    "budget-planning.css",
    ".budget-plan-kpi { padding:8px 9px; border-radius:8px; min-height:66px; }",
    ".budget-plan-kpi { padding:8px 9px; border-radius:8px; min-height:70px; }",
)

# --- Work calendar: nested card/action tier. ---
replace_required(
    "projects-calendar-v13.0.20.css",
    "border-radius:7px; background:var(--surface); }\n.pc-event-main",
    "border-radius:8px; background:var(--surface); }\n.pc-event-main",
)
replace_required(
    "projects-calendar-v13.0.20.css",
    ".pc-event-actions .button { min-height:24px; padding:2px 6px; font-size:.66rem; }",
    ".pc-event-actions .button { min-height:32px; padding:4px 6px; font-size:.66rem; }",
)

# --- Settings/security: map legacy chips/nested rows onto shared compact tiers. ---
replace_required(
    "security-profiles.css",
    ".v13-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800;text-transform:capitalize;background:var(--surface-soft);border:1px solid var(--line);color:var(--muted)}",
    ".v13-chip{display:inline-flex;align-items:center;gap:5px;min-height:23px;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:800;text-transform:capitalize;background:var(--surface-soft);border:1px solid var(--line);color:var(--muted)}",
)
replace_required("security-profiles.css", "profile-status-grid>div{border:1px solid var(--line);border-radius:12px;", "profile-status-grid>div{border:1px solid var(--line);border-radius:8px;")
replace_required("security-profiles.css", "profile-cloud-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:10px;", "profile-cloud-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:8px;")
replace_required("security-profiles.css", "profile-restore-row,.profile-security-row,.profile-audit-list>div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:10px;", "profile-restore-row,.profile-security-row,.profile-audit-list>div{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:8px;")
replace_required("security-profiles.css", ".v13-empty{color:var(--muted);font-size:12px;padding:9px;border:1px dashed var(--line);border-radius:10px}", ".v13-empty{color:var(--muted);font-size:12px;padding:12px;border:1px dashed var(--line);border-radius:8px;text-align:center}")

# --- Liquid Glass: material owns appearance, workspace CSS owns shell geometry. ---
replace_required(
    "liquid-glass-v15.css",
    ".workspace-switcher,\n.workspace-switcher button,\n.finance-workspace-marquee-row>.workspace-switcher,",
    ".workspace-switcher button,\n.finance-workspace-marquee-row>.workspace-switcher,",
)
replace_required(
    "liquid-glass-v15.css",
    "@media (prefers-reduced-transparency:reduce) {\n  :root {\n    --liquid-glass-surface:rgba(248,251,255,.96);\n    --liquid-glass-surface-strong:rgba(248,251,255,.99);\n    --liquid-glass-surface-soft:rgba(248,251,255,.94);\n  }\n  html[data-theme=\"dark\"] {\n    --liquid-glass-surface:rgba(14,28,43,.97);\n    --liquid-glass-surface-strong:rgba(14,28,43,.995);\n    --liquid-glass-surface-soft:rgba(24,40,56,.96);\n  }",
    "@media (prefers-reduced-transparency:reduce) {\n  :root,\n  html[data-theme=\"light\"],\n  html[data-theme=\"dark\"] {\n    --liquid-glass-surface:rgba(4,8,14,.97);\n    --liquid-glass-surface-strong:rgba(7,12,20,.995);\n    --liquid-glass-surface-soft:rgba(18,27,41,.96);\n  }",
)

# --- Move final desktop Dashboard geometry out of runtime JS and into the static stylesheet. ---
sub_required(
    "dashboard-interactions.css",
    r"@media\(min-width:701px\)\{\n  #dashboard\.page\.active\{.*?\n\}\n\n/\* V14\.0\.24 · Add labels without plus signs, currentColor sparkle masks, and compact Customize\. \*/",
    """/* V15.1.0 · desktop Dashboard/workspace geometry owned by static CSS. */\n.finance-workspace-marquee-row>.project-workspace-switcher{position:static;top:auto;flex:0 0 auto;height:43px;min-height:43px;max-height:43px;box-sizing:border-box;margin:0}\n#customizeDashboardButton[data-dashboard-toolbar-action]{align-self:center;white-space:nowrap}\n@media(min-width:701px){\n  #dashboard.page.active{display:block!important}\n  #dashboard>.page-heading{display:none!important}\n  #dashboard>#dashboardWeekMarquee{display:grid!important;width:100%!important;height:43px!important;min-height:43px!important;max-height:43px!important;margin:0 0 10px!important}\n}\n\n/* V14.0.24 · Add labels without plus signs, currentColor sparkle masks, and compact Customize. */""",
)
replace_required(
    "sync-config.js",
    "      .finance-workspace-marquee-row>.project-workspace-switcher{position:static;top:auto;flex:0 0 auto;height:43px;min-height:43px;max-height:43px;box-sizing:border-box;margin:0}\n      #customizeDashboardButton[data-dashboard-toolbar-action]{align-self:center;white-space:nowrap}\n      @media(min-width:701px){#dashboard.page.active{display:block!important}#dashboard>.page-heading{display:none!important}#dashboard>#dashboardWeekMarquee{display:grid!important;width:100%!important;height:43px!important;min-height:43px!important;max-height:43px!important;margin:0 0 10px!important}}\n",
    "",
)
replace_required(
    "sync-config.js",
    "link.href = `./liquid-glass-v15.css?v=${VERSION}`;",
    "link.href = `./liquid-glass-v15.css?v=${VERSION}-desktop1`;",
)

# --- Fresh PWA delivery for changed desktop assets, without changing semantic version or schemas. ---
replace_all_text("finance-v15-20260815-period-radius-r21", "finance-v15-20260815-desktop-consistency-r22")
asset_pins = {
    "app.css?v=14.0.23": "app.css?v=15.1.0-desktop1",
    "dashboard-interactions.css?v=14.0.23": "dashboard-interactions.css?v=15.1.0-desktop1",
    "security-profiles.css?v=14.0.23": "security-profiles.css?v=15.1.0-desktop1",
    "reports-insights.css?v=14.0.23": "reports-insights.css?v=15.1.0-desktop1",
    "budget-planning.css?v=14.0.23": "budget-planning.css?v=15.1.0-desktop1",
    "projects-calendar-v13.0.20.css?v=14.0.23": "projects-calendar-v13.0.20.css?v=15.1.0-desktop1",
    "sync-config.js?v=15.1.0": "sync-config.js?v=15.1.0-desktop1",
    "liquid-glass-v15.css?v=15.1.0\")": "liquid-glass-v15.css?v=15.1.0-desktop1\")",
}
for old, new in asset_pins.items():
    replace_all_text(old, new)

# Update release notes while preserving V15.1.0 and schema identities.
version_path = ROOT / "version.json"
version = json.loads(version_path.read_text(encoding="utf-8"))
assert version["version"] == "15.1.0"
assert version["schemaVersion"] == 12
assert version["cloudSchemaVersion"] == 3
version["cacheVersion"] = "finance-v15-20260815-desktop-consistency-r22"
version["notes"] = (
    "Black Canvas UI desktop consistency pass: normalizes desktop page framing, card/control geometry, "
    "Finance/Reports/Work/Settings component tiers, Black Canvas surfaces, and static Dashboard layout ownership "
    "across 1024–1920px while preserving mobile behavior, Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."
)
version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")

# Add structural regression validation.
validator = r'''import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const app = read("app.css");
const reports = read("reports-insights.css");
const budget = read("budget-planning.css");
const calendar = read("projects-calendar-v13.0.20.css");
const security = read("security-profiles.css");
const liquid = read("liquid-glass-v15.css");
const dashboard = read("dashboard-interactions.css");
const sync = read("sync-config.js");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));

assert.equal(version.version, "15.1.0");
assert.equal(version.schemaVersion, 12);
assert.equal(version.cloudSchemaVersion, 3);
assert.equal(version.cacheVersion, "finance-v15-20260815-desktop-consistency-r22");
assert.match(app, /--workspace-card-radius:\s*9px/);
assert.match(app, /--workspace-control-height:\s*38px/);
assert.match(app, /--workspace-compact-control-height:\s*35px/);
assert.match(app, /\.dashboard-view \.topbar \{ min-height: 72px;/);
assert.match(app, /\.dashboard-view \.content \{ padding: 18px 22px 34px; \}/);
assert.doesNotMatch(app, /\.dashboard-view \.topbar \{ min-height: 64px/);
assert.match(app, /#projects \.project-summary-strip > \* \{ min-height:70px/);
assert.match(app, /#payments \.kpi-card \{ min-height:70px/);
assert.match(app, /#reports \.report-section-nav button \{ min-height:35px/);
assert.match(app, /\.sidebar-close-button \{[^}]*width:44px; height:44px;/s);
assert.match(app, /\.record-header \{[^}]*background: var\(--surface-soft\)/s);
assert.match(app, /\.input, \.select, \.textarea \{[^}]*background: var\(--surface\)/s);
assert.match(reports, /report-insights-filters \.input,.report-insights-filters \.select \{ min-height:35px; height:35px/);
assert.match(budget, /\.budget-plan-kpi \{ padding:8px 9px; border-radius:8px; min-height:70px; \}/);
assert.match(calendar, /\.pc-event-card \{[^}]*border-radius:8px/s);
assert.match(calendar, /\.pc-event-actions \.button \{ min-height:32px;/);
assert.match(security, /\.v13-chip\{[^}]*min-height:23px/);
assert.match(security, /profile-status-grid>div\{[^}]*border-radius:8px/);
assert.doesNotMatch(liquid, /\.workspace-switcher,\n\.workspace-switcher button,/);
assert.match(liquid, /prefers-reduced-transparency:reduce[\s\S]*html\[data-theme="light"\][\s\S]*rgba\(4,8,14,.97\)/);
assert.match(dashboard, /V15\.1\.0 · desktop Dashboard\/workspace geometry owned by static CSS/);
assert.doesNotMatch(sync, /@media\(min-width:701px\)\{#dashboard\.page\.active/);
for (const pin of [
  "app.css?v=15.1.0-desktop1",
  "dashboard-interactions.css?v=15.1.0-desktop1",
  "security-profiles.css?v=15.1.0-desktop1",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop1",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop1",
  "sync-config.js?v=15.1.0-desktop1"
]) assert.ok(index.includes(pin), `index missing ${pin}`);
assert.ok(sw.includes("finance-v15-20260815-desktop-consistency-r22"));
for (const pin of [
  "app.css?v=15.1.0-desktop1",
  "dashboard-interactions.css?v=15.1.0-desktop1",
  "security-profiles.css?v=15.1.0-desktop1",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop1",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop1",
  "sync-config.js?v=15.1.0-desktop1",
  "liquid-glass-v15.css?v=15.1.0-desktop1"
]) assert.ok(sw.includes(pin), `service worker missing ${pin}`);
console.log("V15.1.0 desktop UI consistency validation passed.");
'''
(ROOT / "tests/validate-desktop-ui-consistency-v15-1-0.mjs").write_text(validator, encoding="utf-8")

browser_test = r'''import { test, expect } from "@playwright/test";

const widths = [1024, 1280, 1366, 1440, 1920];
const css = [
  "app.css?v=15.1.0-desktop1",
  "reports-insights.css?v=15.1.0-desktop1",
  "budget-planning.css?v=15.1.0-desktop1",
  "security-profiles.css?v=15.1.0-desktop1",
  "projects-calendar-v13.0.20.css?v=15.1.0-desktop1",
  "dashboard-interactions.css?v=15.1.0-desktop1",
  "liquid-glass-v15.css?v=15.1.0-desktop1",
  "black-canvas-v15-1-0.css?v=15.1.0-periodradius1"
];

async function fixture(page, width, theme) {
  await page.setViewportSize({ width, height:900 });
  await page.setContent(`<!doctype html><html data-theme="${theme}"><head>${css.map(href => `<link rel="stylesheet" href="http://127.0.0.1:3000/${href}">`).join("")}</head><body class="dashboard-view"><header class="topbar"><div class="topbar-actions"><button class="button">Action</button></div></header><main class="main"><div class="content"><section class="page-heading"><div><h2>Heading</h2><p>Copy</p></div></section><article class="card" id="card">Card</article><div class="workspace-switcher"><button class="workspace-switcher-button">Tab</button></div><div class="expense-toolbar-compact"><input class="input" id="compactFilter"><div class="expense-view-toggle"><button class="button">View</button></div></div><div class="record-header" id="recordHeader">Header</div><section id="reports"><nav class="report-section-nav"><button id="reportTab">Report</button></nav></section><div class="report-insights-filters"><input class="input" id="reportFilter"></div><div class="budget-plan-kpi" id="budgetKpi">Budget</div><div class="project-summary-strip"><div id="projectSummary">Project</div></div><section id="settings"><div class="settings-tablist"><button id="settingsTab">Settings</button></div></section><button class="sidebar-close-button" id="sidebarPin">Pin</button><span class="v13-chip" id="profileChip">Private</span><div class="pc-event-card" id="calendarCard"><div class="pc-event-actions"><button class="button" id="calendarAction">Edit</button></div></div></div></main></body></html>`, { waitUntil:"load" });
  await page.waitForFunction(() => document.styleSheets.length >= 8);
}

for (const width of widths) {
  test(`desktop geometry is consistent at ${width}px`, async ({ page }) => {
    await fixture(page, width, "light");
    const metrics = await page.evaluate(() => {
      const value = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
      return {
        topbarMin:value(".topbar", "minHeight"),
        contentTop:value(".content", "paddingTop"),
        contentRight:value(".content", "paddingRight"),
        contentBottom:value(".content", "paddingBottom"),
        cardRadius:value("#card", "borderRadius"),
        buttonMin:value(".topbar .button", "minHeight"),
        compactHeight:value("#compactFilter", "height"),
        workspaceRadius:value(".workspace-switcher", "borderRadius"),
        workspaceButton:value(".workspace-switcher-button", "minHeight"),
        reportTab:value("#reportTab", "minHeight"),
        reportFilter:value("#reportFilter", "height"),
        settingsTab:value("#settingsTab", "minHeight"),
        sidebarPin:value("#sidebarPin", "height"),
        budgetKpi:value("#budgetKpi", "minHeight"),
        profileChip:value("#profileChip", "minHeight"),
        calendarRadius:value("#calendarCard", "borderRadius"),
        calendarAction:value("#calendarAction", "minHeight"),
        recordBackground:value("#recordHeader", "backgroundColor"),
        inputBackground:value("#compactFilter", "backgroundColor")
      };
    });
    expect(metrics).toEqual({
      topbarMin:"72px",
      contentTop:"18px",
      contentRight:"22px",
      contentBottom:"34px",
      cardRadius:"9px",
      buttonMin:"38px",
      compactHeight:"35px",
      workspaceRadius:"8px",
      workspaceButton:"35px",
      reportTab:"35px",
      reportFilter:"35px",
      settingsTab:"38px",
      sidebarPin:"44px",
      budgetKpi:"70px",
      profileChip:"23px",
      calendarRadius:"8px",
      calendarAction:"32px",
      recordBackground:"rgb(14, 19, 27)",
      inputBackground:"rgb(8, 11, 16)"
    });
  });
}

test("Black Canvas component surfaces stay dark in both appearance attributes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await fixture(page, 1440, theme);
    const colors = await page.evaluate(() => ({
      record:getComputedStyle(document.querySelector("#recordHeader")).backgroundColor,
      input:getComputedStyle(document.querySelector("#compactFilter")).backgroundColor
    }));
    expect(colors.record).toBe("rgb(14, 19, 27)");
    expect(colors.input).toBe("rgb(8, 11, 16)");
  }
});
'''
(ROOT / "tests/desktop-ui-consistency.spec.mjs").write_text(browser_test, encoding="utf-8")

# Put the structural validator first in npm test.
package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
current_test = package["scripts"]["test"]
validator_cmd = "node tests/validate-desktop-ui-consistency-v15-1-0.mjs"
if validator_cmd not in current_test:
    package["scripts"]["test"] = validator_cmd + " && " + current_test
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

print("Desktop UI consistency patch staged.")
