#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT = Path('.')
OLD_VERSION = '15.1.0'
NEW_VERSION = '15.2.0'
OLD_CACHE = 'finance-v15-20260815-desktop-ui-phase1-r28'
NEW_CACHE = 'finance-v15-20260816-desktop-ux-r29'


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)

def sub_once(text, pattern, repl, label, flags=0):
    new_text, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 regex match, found {count}')
    return new_text

# Find the active Cloud Sync V3 implementation without assuming its filename.
cloud_path = None
for candidate in ROOT.glob('*.js'):
    body = read(candidate)
    if 'financeCloudSyncV3Bootstrap' in body and 'function updateTopSyncUi' in body:
        cloud_path = candidate
        break
if not cloud_path:
    raise SystemExit('Could not locate Cloud Sync V3 implementation')

# --- index.html: desktop UX behavior + release identity ---
index = read('index.html')
index = replace_once(index, '<title>My Finance Records · V15.1.0</title>', '<title>My Finance Records · V15.2.0</title>', 'page title version')
index = sub_once(index, r'(<small id="buildBadge"[^>]*>)(V15\.1\.0)(</small>)', r'\1V15.2.0\3', 'build badge')
index = sub_once(index, r'const APP_VERSION = "15\.1\.0";', 'const APP_VERSION = "15.2.0";', 'index app version')
index = index.replace(OLD_CACHE, NEW_CACHE)
index = index.replace('Version 15.1.0', 'Version 15.2.0')
index = replace_once(index, '<link rel="stylesheet" href="./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1">', '<link rel="stylesheet" href="./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1">\n  <link rel="stylesheet" href="./desktop-ux-v15-2-0.css?v=15.2.0">', 'desktop UX stylesheet link')
index = replace_once(index, '<p id="cloudToolbarDetail">Cloud sync is not configured on this device.</p>', '<p id="cloudToolbarDetail">Cloud sync is not configured on this device.</p><details class="cloud-sync-technical-details" id="cloudToolbarTechnicalDetails" hidden><summary>Technical details</summary><code id="cloudToolbarTechnicalError"></code></details>', 'cloud technical details markup')
index = replace_once(index, '<span><strong>Search</strong><small>Find finance records</small></span>', '<span><strong>Search</strong><small>Find finance records · ⌘/Ctrl K or /</small></span>', 'search shortcut hint')

# Keep month navigation behavior compatible, but communicate that recurring items are checked/prepared.
index = replace_once(index, 'else showToast(`Month changed to ${monthLabel(month)}`, "info");', 'else showToast(`Month changed to ${monthLabel(month)} · recurring items checked`, "info");', 'month navigation feedback')

# Make selection loss explicit only when there is actually a selection.
index = replace_once(index, '\n\n    function applySelectedMonth(month, notify = true) {', '\n    function clearExpenseSelectionForFilterChange(){const count=selectedExpenseIds.size;if(!count)return;selectedExpenseIds.clear();showToast(`${count} selected expense${count===1?"":"s"} cleared because filters changed`,"info");}\n    function applySelectedMonth(month, notify = true) {', 'expense filter selection helper')
index = replace_once(index, 'document.getElementById("expenseSearch").addEventListener("input", () => { selectedExpenseIds.clear(); renderMoneyPage(); });', 'document.getElementById("expenseSearch").addEventListener("input", () => { clearExpenseSelectionForFilterChange(); renderMoneyPage(); });', 'expense search selection feedback')
index = replace_once(index, 'document.getElementById("expenseDateFilter").addEventListener("change", () => { selectedExpenseIds.clear(); renderMoneyPage(); });', 'document.getElementById("expenseDateFilter").addEventListener("change", () => { clearExpenseSelectionForFilterChange(); renderMoneyPage(); });', 'expense date selection feedback')
index = replace_once(index, 'document.getElementById("expenseCategoryFilter").addEventListener("change", () => { selectedExpenseIds.clear(); renderMoneyPage(); });', 'document.getElementById("expenseCategoryFilter").addEventListener("change", () => { clearExpenseSelectionForFilterChange(); renderMoneyPage(); });', 'expense category selection feedback')
index = index.replace('      showToast("Expense filters cleared", "info");\n', '')
index = index.replace('      showToast("Paid expense filters cleared", "info");\n', '')

# Align form validation with the Expense form: inline error + focus first invalid field.
old_income_required = 'if(!record.name || !record.date || !record.account) return showToast("Complete all required income fields", "warning");'
new_income_required = 'if(!record.name){const field=document.getElementById("incomeName");setFieldError(field,"Enter an income name.");field.focus();return;}if(!record.date){const field=document.getElementById("incomeDate");setFieldError(field,"Choose the date received.");field.focus();return;}if(!record.account){const field=document.getElementById("incomeAccount");setFieldError(field,"Choose the account that received this income.");field.focus();return;}'
index = replace_once(index, old_income_required, new_income_required, 'income required fields')
index = replace_once(index, '      if (!newName) return;\n', '      if (!newName) { const field=document.getElementById("accountName"); setFieldError(field,"Enter an account name."); field.focus(); return; }\n', 'account name validation')

# Per-action async busy state for Settings operations, without blocking the whole app.
index = replace_once(index, '\n\n    function setupV12EventHandlers() {', '\n    async function runButtonTask(buttonId,busyLabel,task){const button=document.getElementById(buttonId);if(!button||button.disabled)return;const original=button.textContent;button.disabled=true;button.setAttribute("aria-busy","true");if(busyLabel)button.textContent=busyLabel;try{return await task();}finally{button.disabled=false;button.removeAttribute("aria-busy");button.textContent=original;}}\n    function setupV12EventHandlers() {', 'busy button helper')
replacements = {
'document.getElementById("createAccountSnapshotButton").addEventListener("click", () => createVerifiedAccountSnapshot().catch(() => showToast("Could not save the snapshot", "warning")));': 'document.getElementById("createAccountSnapshotButton").addEventListener("click", () => runButtonTask("createAccountSnapshotButton","Saving…",()=>createVerifiedAccountSnapshot()).catch(() => showToast("Could not save the snapshot", "warning")));',
'document.getElementById("downloadLatestSnapshotButton").addEventListener("click", () => downloadSnapshot().catch(() => showToast("Could not download the snapshot", "warning")));': 'document.getElementById("downloadLatestSnapshotButton").addEventListener("click", () => runButtonTask("downloadLatestSnapshotButton","Preparing…",()=>downloadSnapshot()).catch(() => showToast("Could not download the snapshot", "warning")));',
'document.getElementById("addPdfPackButton").addEventListener("click", () => addPdfPack().catch(() => showToast("Could not save the PDF pack", "warning")));': 'document.getElementById("addPdfPackButton").addEventListener("click", () => runButtonTask("addPdfPackButton","Saving…",()=>addPdfPack()).catch(() => showToast("Could not save the PDF pack", "warning")));',
'document.getElementById("requestPersistenceButton").addEventListener("click", () => requestPersistentStorage().catch(() => showToast("Persistent storage request failed", "warning")));': 'document.getElementById("requestPersistenceButton").addEventListener("click", () => runButtonTask("requestPersistenceButton","Requesting…",()=>requestPersistentStorage()).catch(() => showToast("Persistent storage request failed", "warning")));',
'document.getElementById("clearOfflinePacksButton").addEventListener("click", () => clearOptionalPdfPacks().catch(() => showToast("Could not clear PDF packs", "warning")));': 'document.getElementById("clearOfflinePacksButton").addEventListener("click", () => runButtonTask("clearOfflinePacksButton","Clearing…",()=>clearOptionalPdfPacks()).catch(() => showToast("Could not clear PDF packs", "warning")));',
'document.getElementById("repairPwaButton").addEventListener("click", () => repairPwa().catch(() => showToast("Could not repair the app", "warning")));': 'document.getElementById("repairPwaButton").addEventListener("click", () => runButtonTask("repairPwaButton","Repairing…",()=>repairPwa()).catch(() => showToast("Could not repair the app", "warning")));'
}
for old, new in replacements.items():
    index = replace_once(index, old, new, f'async busy state: {old[:48]}')

# Add the V15.2.0 release to in-app version history without rewriting prior history.
index = replace_once(index, 'const VERSION_HISTORY = [', 'const VERSION_HISTORY = [{"version":"V15.2.0","title":"Desktop UX Consistency","changes":["Clarifies month navigation and selection-reset feedback so navigation and filters do not silently change working state.","Standardizes form validation, destructive confirmations, Settings busy states, Search shortcut discovery, and Cloud Sync recovery messaging.","Preserves Finance Schema 12, Cloud Schema V3, saved records, calculations, account balances, budgets, projects, and phone layout."]}, ', 'version history V15.2')

# Cache-bust the two changed first-party behavior modules.
index = re.sub(r'(productivity-tools\.js\?v=)[^"\']+', r'\g<1>15.2.0-ux1', index)
cloud_name = cloud_path.name
index = re.sub(rf'({re.escape(cloud_name)}\?v=)[^"\']+', r'\g<1>15.2.0-ux1', index)
write('index.html', index)

# --- Productivity: shared app confirmation + accessible text prompt ---
prod = read('productivity-tools.js')
prod = prod.replace('Cloud Sync V2', 'Cloud Sync')
prompt_helper = r'''
  async function confirmProductivityAction(options) {
    if (typeof openAppConfirmation === "function") return openAppConfirmation(options);
    return window.confirm(`${options.title || "Confirm"}\n\n${options.message || ""}`);
  }

  function requestProductivityText({ title, label, value = "", confirmLabel = "Save" }) {
    return new Promise(resolve => {
      const returnFocus = document.activeElement;
      const dialog = document.createElement("dialog");
      dialog.className = "modal app-dialog productivity-text-dialog";
      dialog.innerHTML = `<form method="dialog"><div class="modal-header"><h3>${esc(title)}</h3><button class="button button-secondary button-small" type="button" data-productivity-prompt-cancel>Cancel</button></div><div class="modal-body"><label class="field"><span>${esc(label)}</span><input class="input" data-productivity-prompt-input maxlength="80" autocomplete="off"></label><p class="field-error" data-productivity-prompt-error hidden></p></div><div class="modal-footer"><button class="button button-secondary" type="button" data-productivity-prompt-cancel>Cancel</button><button class="button button-primary" type="submit">${esc(confirmLabel)}</button></div></form>`;
      document.body.appendChild(dialog);
      const input = dialog.querySelector("[data-productivity-prompt-input]");
      const error = dialog.querySelector("[data-productivity-prompt-error]");
      input.value = String(value || "");
      let settled = false;
      const finish = result => { if (settled) return; settled = true; if (dialog.open) dialog.close(); dialog.remove(); returnFocus?.focus?.(); resolve(result); };
      dialog.querySelectorAll("[data-productivity-prompt-cancel]").forEach(button => button.addEventListener("click", () => finish(null)));
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(null); });
      dialog.querySelector("form").addEventListener("submit", event => { event.preventDefault(); const next=input.value.trim(); if(!next){error.hidden=false;error.textContent=`Enter ${String(label || "a value").toLowerCase()}.`;input.focus();return;} finish(next); });
      dialog.showModal();
      requestAnimationFrame(() => { input.focus(); input.select(); });
    });
  }
'''.strip('\n')
anchor = '  function normalizeTemplate(item) {'
prod = replace_once(prod, anchor, prompt_helper + '\n\n' + anchor, 'productivity shared prompt helper')
prod = prod.replace('  function saveTemplateFromDialog() {', '  async function saveTemplateFromDialog() {')
prod = replace_once(prod, '    const name = prompt("Template name", template.expenseName);\n    if (!name?.trim()) return;\n', '    const name = await requestProductivityText({title:"Save expense template",label:"Template name",value:template.expenseName,confirmLabel:"Save template"});\n    if (!name) return;\n', 'save template prompt')
prod = prod.replace('  function updateTemplate(templateId) {', '  async function updateTemplate(templateId) {')
prod = replace_once(prod, '    const name = prompt("Template name", existing.name);\n    if (!name?.trim()) return;\n', '    const name = await requestProductivityText({title:"Rename expense template",label:"Template name",value:existing.name,confirmLabel:"Rename"});\n    if (!name) return;\n', 'rename template prompt')
prod = prod.replace('  function deleteTemplate(templateId) {', '  async function deleteTemplate(templateId) {')
prod = replace_once(prod, '    if (!existing || !confirm(`Delete the “${existing.name}” expense template?`)) return;\n', '    if (!existing) return;\n    const confirmed=await confirmProductivityAction({title:"Delete expense template?",message:`Delete “${existing.name}”?`,details:"This removes the saved template only. Existing expenses are unchanged.",confirmLabel:"Delete template",danger:true});\n    if(!confirmed)return;\n', 'delete template confirmation')
prod = prod.replace('  function restoreUndoSnapshot(snapshotId) {', '  async function restoreUndoSnapshot(snapshotId) {')
prod = sub_once(prod, r'    if \(!snapshot \|\| !confirm\(`Restore the snapshot saved before “\$\{snapshot\.label\}”\?[\s\S]*?`\)\) return;', '    if (!snapshot) return;\n    const confirmed=await confirmProductivityAction({title:"Restore this undo snapshot?",message:`Restore the snapshot saved before “${snapshot.label}”?`,details:"Your current records will first become a new undo point.",confirmLabel:"Restore snapshot",danger:true});\n    if(!confirmed)return;', 'undo snapshot confirmation')
prod = replace_once(prod, 'if (event.target.closest("#clearProductivityActivity")) { if (confirm("Clear recently edited history on this device?")) { activity=[]; writeJson(ACTIVITY_KEY,activity); renderProductivityPanels(); } return; }', 'if (event.target.closest("#clearProductivityActivity")) { confirmProductivityAction({title:"Clear recent history?",message:"Clear recently edited history on this device?",details:"Finance records are not deleted.",confirmLabel:"Clear history",danger:true}).then(ok=>{if(ok){activity=[];writeJson(ACTIVITY_KEY,activity);renderProductivityPanels();}}); return; }', 'clear activity confirmation')
prod = replace_once(prod, 'if (event.target.closest("#clearProductivityUndo")) { if (confirm("Clear the multi-step undo history on this device?")) { undoHistory=[]; writeJson(UNDO_HISTORY_KEY,undoHistory); renderProductivityPanels(); } return; }', 'if (event.target.closest("#clearProductivityUndo")) { confirmProductivityAction({title:"Clear undo history?",message:"Clear the multi-step undo history on this device?",details:"Your current finance records stay unchanged, but these older restore points will be removed.",confirmLabel:"Clear undo history",danger:true}).then(ok=>{if(ok){undoHistory=[];writeJson(UNDO_HISTORY_KEY,undoHistory);renderProductivityPanels();}}); return; }', 'clear undo confirmation')
write('productivity-tools.js', prod)

# --- Cloud Sync: plain-language recovery copy + optional technical details ---
cloud = read(cloud_path)
cloud = cloud.replace('const APP_VERSION_FALLBACK = "15.1.0";', 'const APP_VERSION_FALLBACK = "15.2.0";')
cloud = replace_once(cloud, 'else if (state.lastError) activeDetail = `Sync issue: ${state.lastError}`;', 'else if (state.lastError) activeDetail = "Cloud Sync could not finish. Your local changes are safe. Check your connection, then try Sync now or review the issue.";', 'cloud error copy')
cloud = replace_once(cloud, '    if (detailNode) detailNode.textContent=activeDetail;\n', '    if (detailNode) detailNode.textContent=activeDetail;\n    const technicalDetails=document.getElementById("cloudToolbarTechnicalDetails"),technicalError=document.getElementById("cloudToolbarTechnicalError"); if(technicalDetails){technicalDetails.hidden=!state.lastError;if(technicalError)technicalError.textContent=state.lastError||"";}\n', 'cloud technical detail binding')
write(cloud_path, cloud)

# --- Desktop-only UX styling ---
css = '''/* My Finance Records · V15.2.0 desktop UX consistency */
@media (min-width:851px){
  .cloud-sync-technical-details{margin-top:8px;padding-top:8px;border-top:1px solid var(--line);font-size:.72rem;color:var(--muted)}
  .cloud-sync-technical-details summary{cursor:pointer;font-weight:700;color:var(--text)}
  .cloud-sync-technical-details code{display:block;margin-top:6px;max-height:88px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}
  button[aria-busy="true"]{cursor:progress}
  .productivity-text-dialog{width:min(440px,calc(100vw - 48px))}
}
'''
write('desktop-ux-v15-2-0.css', css)

# --- Release metadata ---
version = json.loads(read('version.json'))
version['version'] = NEW_VERSION
version['cacheVersion'] = NEW_CACHE
version['released'] = '2026-08-16'
version['name'] = 'Desktop UX Consistency'
version['notes'] = 'V15.2.0 desktop UX consistency: clearer month-navigation and filter-selection feedback, inline form validation, unified destructive confirmations, per-action Settings busy states, discoverable Search shortcuts, and plain-language Cloud Sync recovery messaging. Finance Schema 12, Cloud Schema V3, saved records, calculations, account balances, budgets, projects, five-minute sync cadence, and phone layout remain unchanged.'
write('version.json', json.dumps(version, indent=2) + '\n')

package = json.loads(read('package.json'))
package['version'] = NEW_VERSION
old_test = package['scripts']['test']
package['scripts']['test'] = old_test.replace(' && node tests/validate-v15-1-0.mjs', '') + ' && node tests/validate-v15-2-0-desktop-ux.mjs'
write('package.json', json.dumps(package, indent=2) + '\n')

lock = json.loads(read('package-lock.json'))
lock['version'] = NEW_VERSION
if '' in lock.get('packages', {}): lock['packages']['']['version'] = NEW_VERSION
write('package-lock.json', json.dumps(lock, indent=2) + '\n')

sw = read('sw.js')
sw = replace_once(sw, 'const APP_VERSION = "15.1.0";', 'const APP_VERSION = "15.2.0";', 'service worker app version')
sw = sw.replace(OLD_CACHE, NEW_CACHE)
sw = sw.replace('// V15.1.0 desktop UI phase 1 delivery refresh · ships the desktop-only hierarchy layer without changing finance, sync, or phone behavior.', '// V15.2.0 desktop UX delivery · improves desktop interaction consistency without changing finance schemas, saved data, sync cadence, or phone layout.')
sw = replace_once(sw, '  asset("./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1"),', '  asset("./desktop-ui-phase1-v15-1-0.css?v=15.1.0-phase1"),\n  asset("./desktop-ux-v15-2-0.css?v=15.2.0"),', 'service worker desktop UX CSS')
sw = re.sub(r'(productivity-tools\.js\?v=)[^"\']+', r'\g<1>15.2.0-ux1', sw)
sw = re.sub(rf'({re.escape(cloud_name)}\?v=)[^"\']+', r'\g<1>15.2.0-ux1', sw)
write('sw.js', sw)

readme = read('README.md')
readme = replace_once(readme, '# My Finance Records · V15.1.0', '# My Finance Records · V15.2.0', 'README heading')
readme = replace_once(readme, '## Recent updates\n\n', '## Recent updates\n\n- **V15.2.0 · Desktop UX Consistency** — Clarifies month and filter state changes, standardizes validation and destructive confirmations, adds per-action busy feedback, improves Search shortcut discovery, and makes Cloud Sync errors easier to recover from while preserving phone layout and finance/sync behavior.\n', 'README V15.2 update')
write('README.md', readme)

changelog = read('CHANGELOG.md')
entry = '''## 15.2.0 · 2026-08-16
- Desktop UX consistency: month changes now explicitly report recurring-item checks, filter changes clearly report when an active expense selection is reset, Income/Account forms focus and explain the first invalid field, and harmless filter clears no longer create extra toasts.
- Replaced native Productivity destructive confirmations and text prompts with app dialogs, added per-action busy states for long Settings operations, exposed Search keyboard shortcuts, and simplified Cloud Sync error copy with optional technical details.
- Released as V15.2.0 with PWA cache `finance-v15-20260816-desktop-ux-r29`. Finance Schema 12, Cloud Schema V3, saved records, calculations, account balances, budgets, projects, five-minute Cloud Sync cadence, and phone layout remain unchanged.

'''
write('CHANGELOG.md', entry + changelog)

# --- Static validation ---
validator = r'''import fs from "node:fs";
const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const pkg = JSON.parse(read("package.json"));
const prod = read("productivity-tools.js");
const cloudFile = fs.readdirSync(".").find(name => name.endsWith(".js") && read(name).includes("financeCloudSyncV3Bootstrap"));
if (!cloudFile) throw new Error("Cloud Sync V3 file missing");
const cloud = read(cloudFile);
const required = [
  [version.version === "15.2.0", "version.json is V15.2.0"],
  [pkg.version === "15.2.0", "package.json is V15.2.0"],
  [version.schemaVersion === 12 && version.cloudSchemaVersion === 3, "schemas remain 12/3"],
  [version.cacheVersion === "finance-v15-20260816-desktop-ux-r29", "r29 cache is declared"],
  [index.includes("My Finance Records · V15.2.0"), "page title is V15.2.0"],
  [index.includes("recurring items checked"), "month navigation explains recurring preparation"],
  [index.includes("cleared because filters changed"), "selection reset is announced"],
  [index.includes("Enter an account name."), "account name has inline validation"],
  [index.includes("Enter an income name."), "income has inline validation"],
  [index.includes("⌘/Ctrl K or /"), "Search shortcut is discoverable"],
  [index.includes("runButtonTask("), "Settings async actions use scoped busy state"],
  [prod.includes("requestProductivityText") && !prod.includes('prompt("Template name"'), "Productivity text prompts use app dialog"],
  [prod.includes("confirmProductivityAction"), "Productivity destructive actions use shared confirmation"],
  [prod.includes("synchronize through Cloud Sync") && !prod.includes("Cloud Sync V2"), "Cloud terminology is current"],
  [cloud.includes("Your local changes are safe"), "Cloud error copy is plain-language"],
  [index.includes("cloudToolbarTechnicalDetails") && cloud.includes("cloudToolbarTechnicalError"), "Cloud technical details are optional"],
  [sw.includes('const APP_VERSION = "15.2.0"') && sw.includes(version.cacheVersion), "service worker delivery matches release"],
  [sw.includes("desktop-ux-v15-2-0.css?v=15.2.0"), "desktop UX CSS is precached"],
  [read("mobile-v14-0-23.css").length > 0, "mobile stylesheet remains present"]
];
for (const [ok, message] of required) { if (!ok) throw new Error(message); }
console.log("V15.2.0 desktop UX source contract passed");
'''
write('tests/validate-v15-2-0-desktop-ux.mjs', validator)

spec = r'''import { test, expect } from "@playwright/test";

const widths = [1024, 1280, 1366, 1440, 1920];
for (const width of widths) {
  test(`V15.2.0 desktop UX affordances remain stable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<!doctype html><html data-theme="light"><head><link rel="stylesheet" href="http://127.0.0.1:3000/app.css?v=15.1.0-desktop3"><link rel="stylesheet" href="http://127.0.0.1:3000/desktop-ux-v15-2-0.css?v=15.2.0"></head><body><button id="busy" aria-busy="true">Saving…</button><details class="cloud-sync-technical-details" id="technical"><summary>Technical details</summary><code>network timeout</code></details><dialog class="modal app-dialog productivity-text-dialog" id="prompt"><form><div class="modal-body"><input class="input"></div></form></dialog></body></html>`, { waitUntil:"networkidle" });
    const metrics = await page.evaluate(() => ({
      busy:getComputedStyle(document.querySelector("#busy")).cursor,
      detailsFont:getComputedStyle(document.querySelector("#technical")).fontSize,
      promptWidth:document.querySelector("#prompt").getBoundingClientRect().width,
      overflow:document.documentElement.scrollWidth > innerWidth + 1
    }));
    expect(metrics.busy).toBe("progress");
    expect(parseFloat(metrics.detailsFont)).toBeGreaterThan(0);
    expect(metrics.promptWidth).toBeLessThanOrEqual(Math.min(440, width - 48) + 1);
    expect(metrics.overflow).toBe(false);
  });
}

test("V15.2.0 desktop UX stylesheet does not intentionally restyle phone controls", async ({ page }) => {
  await page.setViewportSize({ width:700, height:900 });
  await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="http://127.0.0.1:3000/desktop-ux-v15-2-0.css?v=15.2.0"></head><body><button id="busy" aria-busy="true">Saving</button><details class="cloud-sync-technical-details" id="technical"><summary>Technical details</summary><code>x</code></details></body></html>`, { waitUntil:"networkidle" });
  const metrics = await page.evaluate(() => ({ busy:getComputedStyle(document.querySelector("#busy")).cursor, detailsMargin:getComputedStyle(document.querySelector("#technical")).marginTop }));
  expect(metrics.busy).not.toBe("progress");
  expect(metrics.detailsMargin).toBe("0px");
});
'''
write('tests/v15-2-0-desktop-ux.spec.mjs', spec)

# Migrate only test expectations that pin the old release identity/cache, not historical filenames.
for test_path in Path('tests').glob('*.mjs'):
    if test_path.name in {'validate-v15-2-0-desktop-ux.mjs', 'v15-2-0-desktop-ux.spec.mjs'}:
        continue
    text = read(test_path)
    changed = text.replace(OLD_CACHE, NEW_CACHE)
    if test_path.name == 'validate-v15-1-0.mjs':
        continue
    if changed != text:
        write(test_path, changed)

# Keep index under its existing maintainability guard.
line_count = len(read('index.html').splitlines())
if line_count > 9500:
    raise SystemExit(f'index.html line count {line_count} exceeds 9500')

print(f'Patched V15.2.0 desktop UX; Cloud Sync file: {cloud_path}; index lines: {line_count}')
