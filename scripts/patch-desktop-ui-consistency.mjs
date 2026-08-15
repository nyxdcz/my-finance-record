import fs from "node:fs";
import path from "node:path";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, text) => fs.writeFileSync(file, text);

function replaceLiteral(file, from, to, expected = 1) {
  const text = read(file);
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`${file}: expected ${expected} occurrence(s) of ${JSON.stringify(from.slice(0, 80))}, found ${count}`);
  write(file, text.split(from).join(to));
}

function replaceRegex(file, regex, replacer, expected = 1) {
  const text = read(file);
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`))];
  if (matches.length !== expected) throw new Error(`${file}: expected ${expected} match(es) for ${regex}, found ${matches.length}`);
  write(file, text.replace(regex, replacer));
}

const app = "app.css";
replaceLiteral(app,
`      --shadow: 0 10px 30px rgba(16, 24, 40, 0.07);\n      --radius: 16px;\n      --sidebar-width: 245px;`,
`      --shadow: 0 10px 30px rgba(16, 24, 40, 0.07);\n      --radius: 12px;\n      --sidebar-width: 245px;\n      --desktop-header-height: 72px;\n      --desktop-page-gutter: 24px;\n      --desktop-card-padding: 16px;\n      --desktop-compact-card-padding: 12px;\n      --desktop-panel-radius: 9px;\n      --desktop-inner-radius: 8px;\n      --desktop-control-height: 40px;\n      --desktop-control-compact-height: 34px;\n      --desktop-control-icon-height: 32px;\n      --desktop-section-gap: 16px;\n      --desktop-workspace-gap: 10px;`);
replaceRegex(app, /(\.topbar\s*\{[\s\S]*?min-height:\s*)72px;/, "$1var(--desktop-header-height);");
replaceLiteral(app, "    .content { padding: 24px 26px 42px; }", "    .content { padding: 20px var(--desktop-page-gutter) 42px; }");
replaceLiteral(app, "    .page-heading h2 { margin: 0 0 4px; font-size: 1.55rem; letter-spacing: -0.03em; }", "    .page-heading h2 { margin: 0 0 4px; font-size: 1.28rem; letter-spacing: -0.03em; }");
replaceRegex(app, /(\.button\s*\{[\s\S]*?min-height:\s*)40px;/, "$1var(--desktop-control-height);");
replaceLiteral(app, "    .button-small { min-height: 32px; padding: 6px 9px; font-size: 0.76rem; }", "    .button-small { min-height: var(--desktop-control-icon-height); padding: 6px 9px; font-size: 0.76rem; }");
replaceRegex(app, /(\.card\s*\{[\s\S]*?padding:\s*)18px;/, "$1var(--desktop-card-padding);");
replaceLiteral(app, "    .card-header h3 { margin: 0; font-size: 0.98rem; }", "    .card-header h3 { margin: 0; font-size: 0.88rem; }");
replaceLiteral(app, "    .dashboard-view .content { padding: 18px 22px 34px; }", "    .dashboard-view .content { padding: 18px var(--desktop-page-gutter) 34px; }");
replaceRegex(app, /(\.dashboard-customize-toolbar\s*\{[\s\S]*?top:)68px;/, "$1var(--desktop-header-height);");
replaceLiteral(app, "    #money.expense-view-compact .record-actions .button { min-height: 27px; padding: 3px 6px; font-size: .66rem; }", "    #money.expense-view-compact .record-actions .button { min-height: var(--desktop-control-icon-height); padding: 4px 7px; font-size: .66rem; }");
replaceLiteral(app, "    #money.expense-view-compact .button-saved { width: 29px; height: 27px; min-height: 27px; }", "    #money.expense-view-compact .button-saved { width: var(--desktop-control-icon-height); height: var(--desktop-control-icon-height); min-height: var(--desktop-control-icon-height); }");
replaceLiteral(app, "      border:1px solid #c7ded7;", "      border:1px solid var(--line);");
replaceLiteral(app, "      background:#f2faf7;", "      background:var(--surface-soft);");
replaceLiteral(app, "    .calendar-status.ready { background:#eaf7ed; color:#28723b; }", "    .calendar-status.ready { background:var(--green-soft); color:var(--green); }");
replaceLiteral(app, "    .calendar-status.update { background:#fff3d6; color:#8a4b00; }", "    .calendar-status.update { background:var(--orange-soft); color:var(--orange); }");
replaceLiteral(app, "    .calendar-status.none { background:#f2f4f7; color:#667085; }", "    .calendar-status.none { background:var(--surface-soft); color:var(--muted); }");
replaceLiteral(app, "    .calendar-status.missing { background:#eef4ff; color:#315ea8; }", "    .calendar-status.missing { background:var(--blue-soft); color:var(--blue); }");
replaceLiteral(app, "      background: #f2f4f7;\n      color: #344054;\n      border: 1px solid #e4e7ec;", "      background: var(--surface-soft);\n      color: var(--text);\n      border: 1px solid var(--line);");
replaceLiteral(app, "    .v12-chip.success { background: var(--green-soft); color: #28723b; border-color: #cdebd4; }", "    .v12-chip.success { background: var(--green-soft); color: var(--green); border-color: color-mix(in srgb,var(--green) 34%,var(--line)); }");
replaceLiteral(app, "    .v12-chip.warning { background: #fff8df; color: #9a6700; border-color: #f4df9c; }", "    .v12-chip.warning { background: var(--orange-soft); color: var(--orange); border-color: color-mix(in srgb,var(--orange) 34%,var(--line)); }");
replaceLiteral(app, "    .v12-chip.danger { background: var(--red-soft); color: var(--danger); border-color: #ffd0ca; }", "    .v12-chip.danger { background: var(--red-soft); color: var(--danger); border-color: color-mix(in srgb,var(--red) 34%,var(--line)); }");
replaceLiteral(app, "    .v12-chip.info { background: var(--blue-soft); color: #2858a8; border-color: #cfddfa; }", "    .v12-chip.info { background: var(--blue-soft); color: var(--blue); border-color: color-mix(in srgb,var(--blue) 34%,var(--line)); }");
replaceLiteral(app, "    .v12-table th { position: sticky; top: 0; background: #f8fafc;", "    .v12-table th { position: sticky; top: 0; background: var(--surface-soft);");
replaceLiteral(app, "    .expense-total-choice.is-excluded { border-color: #e7c66b; background: #fff9e8; }", "    .expense-total-choice.is-excluded { border-color:color-mix(in srgb,var(--orange) 42%,var(--line)); background:var(--orange-soft); }");
replaceLiteral(app, "    .v12-warning-box { padding: 10px; border-radius: 10px; background: #fff8df; border: 1px solid #f4df9c; color: #7a5100; font-size: .73rem; }", "    .v12-warning-box { padding:10px; border-radius:10px; background:var(--orange-soft); border:1px solid color-mix(in srgb,var(--orange) 34%,var(--line)); color:var(--orange); font-size:.73rem; }");

const interactions = "dashboard-interactions.css";
replaceRegex(interactions, /(\.dashboard-week-marquee\{[^\n]*?border-radius:)7px;/, "$18px;");
replaceLiteral(interactions, ".finance-workspace-marquee-row{position:sticky;top:71px;z-index:23;display:flex;align-items:stretch;gap:8px;margin-bottom:10px}", ".finance-workspace-marquee-row{position:sticky;top:var(--desktop-header-height,72px);z-index:23;display:flex;align-items:stretch;gap:8px;margin-bottom:10px}");
replaceRegex(interactions, /\.sidebar \.insights-nav-button::before\{[\s\S]*?\}\n\.sidebar \.insights-nav-button\.active::before\{[^}]*\}\n/, "");
replaceLiteral(interactions, ".sidebar.desktop-open .insights-nav-button,.sidebar.sidebar-pinned .insights-nav-button{padding-inline-start:10px!important}", ".sidebar.desktop-open .insights-nav-button,.sidebar.sidebar-pinned .insights-nav-button{padding-inline-start:46px!important}");
replaceLiteral(interactions, ".sidebar.open .insights-nav-button{padding-inline-start:12px!important}", ".sidebar.open .insights-nav-button{padding-inline-start:46px!important}");
replaceRegex(interactions, /#customizeDashboardButton\[data-dashboard-toolbar-action\]\{[\s\S]*?\n\}/, block => {
  const n = (block.match(/38px/g) || []).length;
  if (n < 5) throw new Error(`customize desktop block: expected at least 5 38px values, found ${n}`);
  return block.replaceAll("38px", "32px");
});

const budget = "budget-planning.css";
replaceLiteral(budget, ".budget-panel-collapse { width:40px; min-width:40px; height:40px; min-height:40px; border-radius:7px; }", ".budget-panel-collapse { width:32px; min-width:32px; height:32px; min-height:32px; border-radius:8px; }");

const projects = "projects-calendar-v13.0.20.css";
replaceLiteral(projects, ".pc-count { padding:3px 7px; border:1px solid var(--line); border-radius:999px; color:var(--muted); font-size:.6rem; font-weight:750; }", ".pc-count { min-height:23px; padding:3px 8px; display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; color:var(--muted); font-size:.64rem; font-weight:750; }");
replaceLiteral(projects, ".pc-event-type { color:var(--primary); font-size:.55rem; font-weight:850; text-transform:uppercase; letter-spacing:.04em; }", ".pc-event-type { color:var(--primary); font-size:.6rem; font-weight:850; text-transform:uppercase; letter-spacing:.04em; }");
replaceLiteral(projects, ".pc-event-date-state { padding:1px 5px; border-radius:999px; background:var(--surface-soft); color:var(--muted); font-size:.52rem; font-weight:800; }", ".pc-event-date-state { min-height:23px; padding:2px 7px; display:inline-flex; align-items:center; border-radius:999px; background:var(--surface-soft); color:var(--muted); font-size:.6rem; font-weight:800; }");
replaceLiteral(projects, ".pc-event-card h4,.pc-event-title { display:block; margin:2px 0 1px; font-size:.7rem; font-weight:800; }", ".pc-event-card h4,.pc-event-title { display:block; margin:2px 0 1px; font-size:.72rem; font-weight:800; }");
replaceLiteral(projects, ".pc-event-card p,.pc-event-meta { display:block; margin:0; color:var(--muted); font-size:.59rem; }", ".pc-event-card p,.pc-event-meta { display:block; margin:0; color:var(--muted); font-size:.64rem; }");
replaceLiteral(projects, ".pc-event-card small { display:block; margin-top:2px; color:var(--muted); font-size:.55rem; overflow-wrap:anywhere; }", ".pc-event-card small { display:block; margin-top:2px; color:var(--muted); font-size:.6rem; overflow-wrap:anywhere; }");

const security = "security-profiles.css";
for (const [from, to] of [["font-size:11px","font-size:.68rem"],["font-size:13px","font-size:.82rem"],["font-size:12px","font-size:.75rem"],["font-size:10px","font-size:.64rem"]]) {
  const text = read(security);
  const count = text.split(from).length - 1;
  if (count < 1) throw new Error(`${security}: expected at least one ${from}`);
  write(security, text.split(from).join(to));
}
replaceLiteral(security, ".v13-chip.warning{background:#fff7e6;color:#a15c00}", ".v13-chip.warning{background:var(--orange-soft);color:var(--orange)}");
replaceLiteral(security, ".v13-chip.info{background:#eef4ff;color:var(--primary)}", ".v13-chip.info{background:var(--blue-soft);color:var(--blue)}");
replaceLiteral(security, ".v13-chip.private{background:#eef4ff;color:var(--primary)}", ".v13-chip.private{background:var(--blue-soft);color:var(--blue)}");
replaceRegex(security, /\.v13-warning\{border:1px solid #f6c85f;background:#fff8e7;color:#7a4b00;/, ".v13-warning{border:1px solid color-mix(in srgb,var(--orange) 34%,var(--line));background:var(--orange-soft);color:var(--orange);");

const changedAssets = [
  ["index.html", "./budget-planning.css?v=15.1.0-desktop1", "./budget-planning.css?v=15.1.0-desktop2"],
  ["index.html", "./security-profiles.css?v=15.1.0-desktop1", "./security-profiles.css?v=15.1.0-desktop2"],
  ["index.html", "./projects-calendar-v13.0.20.css?v=15.1.0-desktop1", "./projects-calendar-v13.0.20.css?v=15.1.0-desktop2"],
  ["index.html", "./app.css?v=15.1.0-desktop1", "./app.css?v=15.1.0-desktop2"],
  ["index.html", "./dashboard-interactions.css?v=15.1.0-desktop1", "./dashboard-interactions.css?v=15.1.0-desktop2"],
  ["index.html", "./black-canvas-v15-1-0.css?v=15.1.0-periodradius1", "./black-canvas-v15-1-0.css?v=15.1.0-desktop2"],
  ["sw.js", "./app.css?v=15.1.0-desktop1", "./app.css?v=15.1.0-desktop2"],
  ["sw.js", "./dashboard-interactions.css?v=15.1.0-desktop1", "./dashboard-interactions.css?v=15.1.0-desktop2"],
  ["sw.js", "./black-canvas-v15-1-0.css?v=15.1.0-periodradius1", "./black-canvas-v15-1-0.css?v=15.1.0-desktop2"],
  ["sw.js", "./security-profiles.css?v=15.1.0-desktop1", "./security-profiles.css?v=15.1.0-desktop2"],
  ["sw.js", "./budget-planning.css?v=15.1.0-desktop1", "./budget-planning.css?v=15.1.0-desktop2"],
  ["sw.js", "./projects-calendar-v13.0.20.css?v=15.1.0-desktop1", "./projects-calendar-v13.0.20.css?v=15.1.0-desktop2"]
];
for (const [file, from, to] of changedAssets) replaceLiteral(file, from, to);

const oldCache = "finance-v15-20260815-finance-marquee-r24";
const newCache = "finance-v15-20260815-desktop-ui-r25";
replaceLiteral("sw.js", oldCache, newCache);
replaceLiteral("version.json", oldCache, newCache);
replaceRegex("version.json", /"notes":\s*"[^"]*"/, '"notes": "Desktop UI consistency refresh with shared desktop geometry, consistent 72px sticky offsets and controls, restored light mode with #efefef background, dark-safe semantic surfaces, and preserved Finance Schema 12, Cloud Schema V3, records, calculations, sync behavior, and phone layout."');

const testReplacements = [
  [oldCache, newCache],
  ["app.css?v=15.1.0-desktop1", "app.css?v=15.1.0-desktop2"],
  ["dashboard-interactions.css?v=15.1.0-desktop1", "dashboard-interactions.css?v=15.1.0-desktop2"],
  ["budget-planning.css?v=15.1.0-desktop1", "budget-planning.css?v=15.1.0-desktop2"],
  ["security-profiles.css?v=15.1.0-desktop1", "security-profiles.css?v=15.1.0-desktop2"],
  ["projects-calendar-v13.0.20.css?v=15.1.0-desktop1", "projects-calendar-v13.0.20.css?v=15.1.0-desktop2"],
  ["black-canvas-v15-1-0.css?v=15.1.0-periodradius1", "black-canvas-v15-1-0.css?v=15.1.0-desktop2"]
];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk("tests")) {
  if (!/\.(?:mjs|js|json|html|css)$/.test(file)) continue;
  let text = read(file);
  let next = text;
  for (const [from, to] of testReplacements) next = next.split(from).join(to);
  if (next !== text) write(file, next);
}

const browserTest = `import { expect, test } from "@playwright/test";\n\nconst APP_URL = "http://127.0.0.1:3000/";\nconst DESKTOP_WIDTHS = [1024, 1280, 1366, 1440, 1920];\n\nfor (const width of DESKTOP_WIDTHS) {\n  test(\`desktop UI contract at \${width}px\`, async ({ page }) => {\n    await page.addInitScript(() => localStorage.setItem("simple-finance-theme-v1", "light"));\n    await page.setViewportSize({ width, height: 900 });\n    await page.goto(APP_URL, { waitUntil:"domcontentloaded" });\n\n    const contract = await page.evaluate(() => {\n      const content = getComputedStyle(document.querySelector(".content"));\n      const topbar = getComputedStyle(document.querySelector(".topbar"));\n      const card = getComputedStyle(document.querySelector(".card"));\n      const row = getComputedStyle(document.querySelector(".finance-workspace-marquee-row"));\n      const budgetToggle = getComputedStyle(document.querySelector(".budget-panel-collapse"));\n      const insights = document.querySelector(".insights-nav-button");\n      return {\n        theme: document.documentElement.dataset.theme,\n        background: getComputedStyle(document.body).backgroundColor,\n        paddingLeft: content.paddingLeft,\n        paddingRight: content.paddingRight,\n        topbarMinHeight: topbar.minHeight,\n        cardRadius: card.borderRadius,\n        cardPadding: card.paddingTop,\n        financeStickyTop: row.top,\n        budgetToggleWidth: budgetToggle.width,\n        insightsPseudoContent: getComputedStyle(insights, "::before").content,\n        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1\n      };\n    });\n\n    expect(contract.theme).toBe("light");\n    expect(contract.background).toBe("rgb(239, 239, 239)");\n    expect(contract.paddingLeft).toBe("24px");\n    expect(contract.paddingRight).toBe("24px");\n    expect(contract.topbarMinHeight).toBe("72px");\n    expect(contract.cardRadius).toBe("12px");\n    expect(contract.cardPadding).toBe("16px");\n    expect(contract.financeStickyTop).toBe("72px");\n    expect(contract.budgetToggleWidth).toBe("32px");\n    expect(contract.insightsPseudoContent).toBe("none");\n    expect(contract.hasHorizontalOverflow).toBe(false);\n  });\n}\n\ntest("dark mode keeps the Black Canvas background", async ({ page }) => {\n  await page.addInitScript(() => localStorage.setItem("simple-finance-theme-v1", "dark"));\n  await page.setViewportSize({ width:1440, height:900 });\n  await page.goto(APP_URL, { waitUntil:"domcontentloaded" });\n  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");\n});\n`;
write("tests/desktop-ui-consistency.spec.mjs", browserTest);

// Final source assertions.
const appFinal = read(app);
for (const required of ["--desktop-header-height: 72px", "--desktop-page-gutter: 24px", "padding: 20px var(--desktop-page-gutter) 42px", "font-size: 1.28rem"]) {
  if (!appFinal.includes(required)) throw new Error(`Missing app contract: ${required}`);
}
const black = read("black-canvas-v15-1-0.css");
if (!black.includes('html[data-theme="light"]') || !black.includes("--bg:#efefef")) throw new Error("Light theme #efefef contract missing");
if (!black.includes('html[data-theme="dark"]') || !black.includes("--bg:#000000")) throw new Error("Dark Black Canvas contract missing");
if (read(interactions).includes(".sidebar .insights-nav-button::before{")) throw new Error("Insights pseudo icon still present");
if (read("sw.js").includes(oldCache) || read("version.json").includes(oldCache)) throw new Error("Old r24 cache remains in release metadata");
for (const file of walk("tests")) {
  if (/\.(?:mjs|js)$/.test(file) && read(file).includes(oldCache)) throw new Error(`Old r24 cache remains in ${file}`);
}

console.log("Desktop UI consistency patch applied and source contracts validated.");
