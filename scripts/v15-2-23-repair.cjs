const fs = require('node:fs');
const path = require('node:path');

const VERSION = '15.2.23';
const OLD_VERSION = '15.2.22';
const CACHE = 'finance-v15-20260821-monthly-repeat-icon-r59';
const OLD_CACHE = 'finance-v15-20260821-monthly-repeat-class-r58';
const RELEASE_NAME = 'Monthly Repeat Icon Footer';
const OLD_RELEASE_NAME = 'Monthly Repeat Label Isolation';
const HOTFIX = 'finance-ui-hotfix-v15-2-23-monthly-repeat-icon1';
const OLD_HOTFIX = 'finance-ui-hotfix-v15-2-22-monthly-repeat1';
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const replaceRequired = (file, from, to) => {
  const source = read(file);
  if (!source.includes(from)) throw new Error(`${file}: missing required text: ${from}`);
  write(file, source.split(from).join(to));
};
const json = (file, transform) => {
  const value = JSON.parse(read(file));
  transform(value);
  write(file, `${JSON.stringify(value, null, 2)}\n`);
};

json('package.json', value => { value.version = VERSION; });
json('package-lock.json', value => {
  value.version = VERSION;
  if (value.packages?.['']) value.packages[''].version = VERSION;
});
json('version.json', value => {
  value.version = VERSION;
  value.cacheVersion = CACHE;
  value.released = '2026-08-21';
  value.name = RELEASE_NAME;
  value.notes = 'V15.2.23 restores the existing icon-only monthly-repeat control in the desktop expense-card footer using finance-save-unsaved-v15-2-3-r2.png and finance-save-saved-v15-2-3-r2.png. The desktop footer follows the approved checkbox-left and repeat-icon / Mark paid / Edit-right arrangement while preserving recurrence behavior, phone layouts, Finance Schema 12, Cloud Schema V3, calculations, balances, and sync behavior.';
});

let readme = read('README.md');
readme = readme
  .replace('# My Finance Records · V15.2.22', '# My Finance Records · V15.2.23')
  .replace('version-V15.2.22-2563eb', 'version-V15.2.23-2563eb')
  .replace('| **V15.2.22** · Monthly Repeat Label Isolation | **12** | **V3** | **5 minutes** |', '| **V15.2.23** · Monthly Repeat Icon Footer | **12** | **V3** | **5 minutes** |')
  .replace(/^The current release .*$/m, 'The current release restores the existing monthly-repeat icon control in the compact expense-card footer. On desktop, each expense card keeps the selection checkbox at the lower-left while the existing repeat icon sits immediately before Mark paid and Edit at the lower-right; the unsaved/saved PNG artwork reflects recurrence state. Finance calculations, recurrence behavior, schemas, balances, filters, payments, phone touch layouts, and sync behavior remain protected.');
write('README.md', readme);

let changelog = read('CHANGELOG.md').replace(/^\uFEFF/, '').replace(/^\s+/, '');
if (!changelog.startsWith('## 15.2.23 · 2026-08-21')) {
  changelog = `## 15.2.23 · 2026-08-21\n- Restored the existing icon-only monthly-repeat control using \`icons/finance-save-unsaved-v15-2-3-r2.png\` and \`icons/finance-save-saved-v15-2-3-r2.png\`.\n- Matched the approved desktop expense-card footer arrangement: selection checkbox at the lower-left, then repeat icon, Mark paid, and Edit grouped at the lower-right.\n- Preserved recurrence behavior, compact expense-card content, phone touch layouts, Finance Schema 12, Cloud Schema V3, calculations, balances, payments, filters, and sync behavior while rotating the PWA cache to \`${CACHE}\`.\n\n${changelog}`;
}
write('CHANGELOG.md', changelog);

const cssFile = 'assets/css/production-ui-audit-v15-2-13.css';
let css = read(cssFile);
if (!css.includes('V15.2.23 · Monthly repeat icon footer')) {
  css += `\n\n/* V15.2.23 · Monthly repeat icon footer: approved checkbox-left / repeat-icon + Mark paid + Edit arrangement. */\n@media (min-width: 851px) {\n  html body #money .record-row[data-expense-row] {\n    position:relative !important;\n  }\n\n  html body #money .record-row[data-expense-row] .expense-record-title > .expense-select-footer {\n    position:absolute !important;\n    left:7px !important;\n    bottom:7px !important;\n    z-index:2 !important;\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    width:18px !important;\n    height:18px !important;\n    margin:0 !important;\n  }\n\n  html body #money .record-row[data-expense-row] .expense-record-title > .expense-select-footer > .expense-select-checkbox {\n    margin:0 !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions {\n    min-height:34px !important;\n    align-items:center !important;\n    justify-content:flex-end !important;\n    gap:4px !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > .button {\n    height:34px !important;\n    min-height:34px !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved],\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved]:hover,\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved]:focus-visible,\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved]:active,\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved].active,\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved].active:hover {\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    flex:0 0 34px !important;\n    flex-shrink:0 !important;\n    width:34px !important;\n    min-width:34px !important;\n    max-width:34px !important;\n    height:34px !important;\n    min-height:34px !important;\n    max-height:34px !important;\n    padding:0 !important;\n    border-color:transparent !important;\n    border-radius:8px !important;\n    background:transparent !important;\n    color:inherit !important;\n    box-shadow:none !important;\n    overflow:visible !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-icon-container {\n    display:block !important;\n    width:30px !important;\n    min-width:30px !important;\n    max-width:30px !important;\n    height:30px !important;\n    min-height:30px !important;\n    max-height:30px !important;\n    flex:0 0 30px !important;\n    border:0 !important;\n    border-radius:0 !important;\n    background-image:url(\"./icons/finance-save-unsaved-v15-2-3-r2.png\") !important;\n    background-repeat:no-repeat !important;\n    background-position:center !important;\n    background-size:30px 30px !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved].active .saved-icon-container {\n    background-image:url(\"./icons/finance-save-saved-v15-2-3-r2.png\") !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-icon {\n    opacity:0 !important;\n  }\n\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] > .monthly-repeat-label {\n    display:none !important;\n  }\n}\n`;
}
write(cssFile, css);

for (const runtime of ['assets/js/ui/sync-runtime-compat.js', 'sync-runtime-compat.js']) {
  replaceRequired(runtime, 'const VERSION = "15.2.22";', 'const VERSION = "15.2.23";');
  replaceRequired(runtime, `const RELEASE_NAME = "${OLD_RELEASE_NAME}";`, `const RELEASE_NAME = "${RELEASE_NAME}";`);
}
replaceRequired('assets/js/pwa-update-v15-0-5.js', `const CURRENT_CACHE_VERSION = "${OLD_CACHE}";`, `const CURRENT_CACHE_VERSION = "${CACHE}";`);
replaceRequired('assets/js/pwa-update-v15-0-5.js', `const UI_HOTFIX_REFRESH_KEY = "${OLD_HOTFIX}";`, `const UI_HOTFIX_REFRESH_KEY = "${HOTFIX}";`);

replaceRequired('sw.js', 'const APP_VERSION = "15.2.22";', 'const APP_VERSION = "15.2.23";');
replaceRequired('sw.js', `const CACHE_VERSION = "${OLD_CACHE}";`, `const CACHE_VERSION = "${CACHE}";`);
replaceRequired('sw.js', 'production-ui-audit-v15-2-13.css?v=15.2.22-repeat2', 'production-ui-audit-v15-2-13.css?v=15.2.23-repeat3');
replaceRequired('sw.js', 'pwa-update-v15-0-5.js?v=15.2.22-release4', 'pwa-update-v15-0-5.js?v=15.2.23-release5');
replaceRequired('sw.js', 'sync-runtime-compat.js?v=15.2.22-release12', 'sync-runtime-compat.js?v=15.2.23-release13');

let index = read('index.html');
const checkboxCount = index.split('<label><input class="expense-select-checkbox"').length - 1;
if (checkboxCount < 2) throw new Error(`index.html expected at least two expense checkbox templates, found ${checkboxCount}`);
index = index.split('<label><input class="expense-select-checkbox"').join('<label class="expense-select-footer"><input class="expense-select-checkbox"');

const recurrencePattern = /<button class="button button-saved button-small \$\{item\.recurring === "Monthly" \? "active" : ""\}" data-toggle-saved="\$\{item\.id\}" style="[^"]*" title="\$\{item\.recurring === "Monthly" \? "Repeats monthly" : "Does not repeat monthly"\}" aria-label="\$\{item\.recurring === "Monthly" \? "Monthly recurrence on\. Click to stop repeating" : "Repeat this expense monthly"\}">\s*<span class="saved-icon-container" style="display:none!important" aria-hidden="true"><span class="saved-icon">\$\{item\.recurring === "Monthly" \? "★" : "☆"\}<\/span><\/span>\s*<span class="monthly-repeat-label" style="[^"]*">\$\{item\.recurring === "Monthly" \? "Repeats monthly" : "Repeat monthly"\}<\/span>\s*<\/button>/g;
const matches = [...index.matchAll(recurrencePattern)].length;
if (matches < 4) throw new Error(`index.html expected four V15.2.22 recurrence buttons, found ${matches}`);
index = index.replace(recurrencePattern, `<button class="button button-saved button-small \${item.recurring === "Monthly" ? "active" : ""}" data-toggle-saved="\${item.id}" title="\${item.recurring === "Monthly" ? "Repeats monthly" : "Does not repeat monthly"}" aria-label="\${item.recurring === "Monthly" ? "Monthly recurrence on. Click to stop repeating" : "Repeat this expense monthly"}">\n              <span class="saved-icon-container" aria-hidden="true"><span class="saved-icon">\${item.recurring === "Monthly" ? "★" : "☆"}</span></span>\n              <span class="monthly-repeat-label">\${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>\n            </button>`);

index = index
  .replaceAll('My Finance Records · V15.2.22', 'My Finance Records · V15.2.23')
  .replaceAll('const APP_VERSION = "15.2.22";', 'const APP_VERSION = "15.2.23";')
  .replaceAll(`const APP_RELEASE_NAME = "${OLD_RELEASE_NAME}";`, `const APP_RELEASE_NAME = "${RELEASE_NAME}";`)
  .replaceAll(OLD_CACHE, CACHE)
  .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.22-repeat2', 'production-ui-audit-v15-2-13.css?v=15.2.23-repeat3')
  .replaceAll('pwa-update-v15-0-5.js?v=15.2.22-release4', 'pwa-update-v15-0-5.js?v=15.2.23-release5')
  .replaceAll('sync-runtime-compat.js?v=15.2.22-release12', 'sync-runtime-compat.js?v=15.2.23-release13');
for (const marker of ['My Finance Records · V15.2.23', 'expense-select-footer', 'saved-icon-container', CACHE, 'production-ui-audit-v15-2-13.css?v=15.2.23-repeat3', 'pwa-update-v15-0-5.js?v=15.2.23-release5', 'sync-runtime-compat.js?v=15.2.23-release13']) {
  if (!index.includes(marker)) throw new Error(`index.html missing ${marker}`);
}
write('index.html', index);

const tests = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).forEach(entry => {
  const file = path.join(dir, entry.name);
  if (entry.isDirectory()) walk(file);
  else if (entry.isFile() && entry.name.endsWith('.mjs')) tests.push(file);
});
walk('tests');
for (const file of tests) {
  const source = read(file);
  let next = source
    .replaceAll(OLD_CACHE, CACHE)
    .replaceAll(OLD_HOTFIX, HOTFIX)
    .replaceAll('pwa-update-v15-0-5.js?v=15.2.22-release4', 'pwa-update-v15-0-5.js?v=15.2.23-release5')
    .replaceAll('pwa-update-v15-0-5\\.js\\?v=15\\.2\\.22-release4', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.23-release5')
    .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.22-repeat2', 'production-ui-audit-v15-2-13.css?v=15.2.23-repeat3')
    .replaceAll('production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.22-repeat2', 'production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.23-repeat3')
    .replaceAll('sync-runtime-compat.js?v=15.2.22-release12', 'sync-runtime-compat.js?v=15.2.23-release13')
    .replaceAll('sync-runtime-compat\\.js\\?v=15\\.2\\.22-release12', 'sync-runtime-compat\\.js\\?v=15\\.2\\.23-release13')
    .replaceAll(OLD_RELEASE_NAME, RELEASE_NAME)
    .replaceAll('## 15.2.22 · 2026-08-21', '## 15.2.23 · 2026-08-21')
    .replaceAll('"15.2.22"', '"15.2.23"')
    .replaceAll("'15.2.22'", "'15.2.23'")
    .replaceAll('15\\.2\\.22', '15\\.2\\.23')
    .replaceAll('V15.2.22', 'V15.2.23');

  if (file.endsWith('tests/browser/production-ui-audit-v15-2-13.spec.mjs')) {
    next = next
      .replace('const savedText = saved?.querySelector(".monthly-repeat-label");', 'const savedText = saved?.querySelector(".monthly-repeat-label");\n    const savedIcon = saved?.querySelector(".saved-icon-container");\n    const checkboxLabel = firstRow?.querySelector(".expense-select-footer");')
      .replace('savedTextOpacity:savedText ? parseFloat(getComputedStyle(savedText).opacity) : 0,\n      savedIconDisplay:saved?.querySelector(".saved-icon-container") ? getComputedStyle(saved.querySelector(".saved-icon-container")).display : "",', 'savedTextOpacity:savedText ? parseFloat(getComputedStyle(savedText).opacity) : 0,\n      savedIconDisplay:savedIcon ? getComputedStyle(savedIcon).display : "",\n      savedIconWidth:savedIcon?.getBoundingClientRect().width || 0,\n      savedIconBackground:savedIcon ? getComputedStyle(savedIcon).backgroundImage : "",\n      checkboxPosition:checkboxLabel ? getComputedStyle(checkboxLabel).position : "",\n      checkboxLeft:checkboxLabel ? parseFloat(getComputedStyle(checkboxLabel).left) : -1,\n      checkboxBottom:checkboxLabel ? parseFloat(getComputedStyle(checkboxLabel).bottom) : -1,')
      .replace('expect(metrics.recurrenceButtonHeight).toBeCloseTo(30, 0);', 'expect(metrics.recurrenceButtonHeight).toBeCloseTo(34, 0);')
      .replace('expect(metrics.recurrenceButtonWidth).toBeGreaterThan(65);', 'expect(metrics.recurrenceButtonWidth).toBeCloseTo(34, 0);')
      .replace('expect(metrics.savedTextFontSize).toBeGreaterThan(0);\n  expect(metrics.savedTextWidth).toBeGreaterThan(45);\n  expect(metrics.savedTextOpacity).toBe(1);\n  expect(metrics.savedTextDisplay).not.toBe("none");\n  expect(metrics.savedIconDisplay).toBe("none");', 'expect(metrics.savedTextDisplay).toBe("none");\n  expect(metrics.savedTextWidth).toBe(0);\n  expect(metrics.savedIconDisplay).not.toBe("none");\n  expect(metrics.savedIconWidth).toBeCloseTo(30, 0);\n  expect(metrics.savedIconBackground).toMatch(/finance-save-(?:saved|unsaved)-v15-2-3-r2\\.png/);\n  expect(metrics.checkboxPosition).toBe("absolute");\n  expect(metrics.checkboxLeft).toBeCloseTo(7, 0);\n  expect(metrics.checkboxBottom).toBeCloseTo(7, 0);');
  }

  if (file.endsWith('tests/regression/validate-production-ui-audit-v15-2-13.mjs')) {
    next = next
      .replace('assert.match(index, /data-toggle-saved="\\$\\{item\\.id\\}" style="[^\"]*flex:0 0 82px!important;[^\"]*width:82px!important;[^\"]*min-width:82px!important;/);', 'assert.match(index, /data-toggle-saved="\\$\\{item\\.id\\}"[^>]*>[\\s\\S]*class="saved-icon-container"/);')
      .replace('assert.match(css, /V15\\.2\\.23 · Monthly repeat label isolation[\\s\\S]*monthly-repeat-label[\\s\\S]*width:\\s*auto !important;[\\s\\S]*opacity:\\s*1 !important;[\\s\\S]*transform:\\s*none !important;/);', 'assert.match(css, /V15\\.2\\.23 · Monthly repeat icon footer[\\s\\S]*expense-select-footer[\\s\\S]*bottom:7px !important;[\\s\\S]*flex:0 0 34px !important;[\\s\\S]*finance-save-unsaved-v15-2-3-r2\\.png[\\s\\S]*finance-save-saved-v15-2-3-r2\\.png[\\s\\S]*monthly-repeat-label[\\s\\S]*display:none !important;/);')
      .replace('assert.match(index, /class="monthly-repeat-label"[^>]*>\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);', 'assert.match(index, /class="expense-select-footer"><input class="expense-select-checkbox"/);\nassert.match(index, /class="saved-icon-container" aria-hidden="true">[\\s\\S]*class="monthly-repeat-label">\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);');
  }

  if (next !== source) write(file, next);
}

const browserAudit = read('tests/browser/production-ui-audit-v15-2-13.spec.mjs');
for (const marker of ['savedIconBackground', 'checkboxPosition', 'toBeCloseTo(34, 0)', 'finance-save-(?:saved|unsaved)-v15-2-3-r2']) {
  if (!browserAudit.includes(marker)) throw new Error(`browser audit missing ${marker}`);
}
const sourceAudit = read('tests/regression/validate-production-ui-audit-v15-2-13.mjs');
if (!sourceAudit.includes('Monthly repeat icon footer')) throw new Error('source regression does not lock monthly repeat icon footer');

const required = {
  'package.json': '"version": "15.2.23"',
  'README.md': '# My Finance Records · V15.2.23',
  'CHANGELOG.md': '## 15.2.23 · 2026-08-21',
  'version.json': `"cacheVersion": "${CACHE}"`,
  'assets/css/production-ui-audit-v15-2-13.css': 'V15.2.23 · Monthly repeat icon footer',
  'assets/js/ui/sync-runtime-compat.js': 'const VERSION = "15.2.23";',
  'sync-runtime-compat.js': 'const VERSION = "15.2.23";',
  'sw.js': 'const APP_VERSION = "15.2.23";',
  'index.html': 'My Finance Records · V15.2.23'
};
for (const [file, marker] of Object.entries(required)) {
  if (!read(file).includes(marker)) throw new Error(`${file}: missing final marker ${marker}`);
}

console.log(`V${VERSION} monthly-repeat icon footer applied to ${tests.length} test modules.`);
