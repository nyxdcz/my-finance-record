const fs = require('node:fs');
const path = require('node:path');

const VERSION = '15.2.21';
const OLD_VERSION = '15.2.20';
const CACHE = 'finance-v15-20260821-monthly-repeat-label-r57';
const OLD_CACHE = 'finance-v15-20260821-compact-expense-stability-r56';
const RELEASE_NAME = 'Visible Monthly Recurrence';
const HOTFIX = 'finance-ui-hotfix-v15-2-21-monthly-repeat1';
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
  value.notes = 'V15.2.21 renders Repeat monthly / Repeats monthly as real visible desktop button text instead of pseudo-element content, preserving the 30px compact action geometry, recurrence behavior, Mark paid/Edit ordering, phone touch layouts, Finance Schema 12, Cloud Schema V3, calculations, balances, and sync behavior.';
});

let readme = read('README.md');
readme = readme
  .replace('# My Finance Records · V15.2.20', '# My Finance Records · V15.2.21')
  .replace('version-V15.2.20-2563eb', 'version-V15.2.21-2563eb')
  .replace('| **V15.2.20** · Compact Expense Cards Stability | **12** | **V3** | **5 minutes** |', '| **V15.2.21** · Visible Monthly Recurrence | **12** | **V3** | **5 minutes** |')
  .replace(/^The current release .*$/m, 'The current release keeps the compact First half, Second half, and Other expense-card layout while rendering Repeat monthly / Repeats monthly as real visible desktop button text directly before Mark paid. The button remains 30px tall and non-shrinking; Finance calculations, recurrence behavior, schemas, balances, filters, payments, phone touch layouts, and sync behavior remain protected.');
write('README.md', readme);

let changelog = read('CHANGELOG.md').replace(/^\uFEFF/, '').replace(/^\s+/, '');
if (!changelog.startsWith('## 15.2.21 · 2026-08-21')) {
  changelog = `## 15.2.21 · 2026-08-21\n- Replaced the desktop monthly-repeat pseudo-element label with real rendered Repeat monthly / Repeats monthly text so the control cannot appear as an empty button.\n- Preserved the 30px non-shrinking recurrence action directly before Mark paid, existing recurrence behavior, Edit ordering, compact expense-card geometry, and phone touch layouts.\n- Rotated the PWA cache to \`${CACHE}\` and synchronized release/runtime/regression metadata without changing Finance Schema 12, Cloud Schema V3, calculations, balances, payments, or sync behavior.\n\n${changelog}`;
}
write('CHANGELOG.md', changelog);

const cssFile = 'assets/css/production-ui-audit-v15-2-13.css';
let css = read(cssFile);
if (!css.includes('V15.2.21 · Real monthly recurrence label')) {
  css += `\n\n/* V15.2.21 · Real monthly recurrence label: do not rely on generated pseudo-content. */\n@media (min-width: 851px) {\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] {\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    flex:0 0 auto !important;\n    flex-shrink:0 !important;\n    width:auto !important;\n    min-width:82px !important;\n    max-width:none !important;\n    height:30px !important;\n    min-height:30px !important;\n    padding:4px 7px !important;\n    color:var(--text) !important;\n    opacity:1 !important;\n    visibility:visible !important;\n    white-space:nowrap !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-icon-container {\n    display:none !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-button-text {\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    min-width:0 !important;\n    color:var(--text) !important;\n    font-size:.65rem !important;\n    font-weight:700 !important;\n    line-height:1 !important;\n    opacity:1 !important;\n    visibility:visible !important;\n    white-space:nowrap !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-button-text::after {\n    content:none !important;\n    display:none !important;\n  }\n}\n`;
}
write(cssFile, css);

for (const runtime of ['assets/js/ui/sync-runtime-compat.js', 'sync-runtime-compat.js']) {
  replaceRequired(runtime, 'const VERSION = "15.2.20";', 'const VERSION = "15.2.21";');
  replaceRequired(runtime, 'const RELEASE_NAME = "Compact Expense Cards Stability";', `const RELEASE_NAME = "${RELEASE_NAME}";`);
}
replaceRequired('assets/js/pwa-update-v15-0-5.js', `const CURRENT_CACHE_VERSION = "${OLD_CACHE}";`, `const CURRENT_CACHE_VERSION = "${CACHE}";`);
replaceRequired('assets/js/pwa-update-v15-0-5.js', 'const UI_HOTFIX_REFRESH_KEY = "finance-ui-hotfix-v15-2-20-compact-expense2";', `const UI_HOTFIX_REFRESH_KEY = "${HOTFIX}";`);

replaceRequired('sw.js', 'const APP_VERSION = "15.2.20";', 'const APP_VERSION = "15.2.21";');
replaceRequired('sw.js', `const CACHE_VERSION = "${OLD_CACHE}";`, `const CACHE_VERSION = "${CACHE}";`);
replaceRequired('sw.js', 'production-ui-audit-v15-2-13.css?v=15.2.20-compact2', 'production-ui-audit-v15-2-13.css?v=15.2.21-repeat1');
replaceRequired('sw.js', 'pwa-update-v15-0-5.js?v=15.2.20-release2', 'pwa-update-v15-0-5.js?v=15.2.21-release3');
replaceRequired('sw.js', 'sync-runtime-compat.js?v=15.2.20-release10', 'sync-runtime-compat.js?v=15.2.21-release11');

let index = read('index.html');
const recurrenceMarkup = '${item.recurring === "Monthly" ? "Repeats" : "Repeat"}';
const recurrenceMarkupNew = '${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}';
const recurrenceCount = index.split(recurrenceMarkup).length - 1;
if (recurrenceCount < 2) throw new Error(`index.html expected at least two recurrence labels, found ${recurrenceCount}`);
index = index
  .split(recurrenceMarkup).join(recurrenceMarkupNew)
  .replaceAll('My Finance Records · V15.2.20', 'My Finance Records · V15.2.21')
  .replaceAll('const APP_VERSION = "15.2.20";', 'const APP_VERSION = "15.2.21";')
  .replaceAll('const APP_RELEASE_NAME = "Compact Expense Cards";', `const APP_RELEASE_NAME = "${RELEASE_NAME}";`)
  .replaceAll(OLD_CACHE, CACHE)
  .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.20-compact2', 'production-ui-audit-v15-2-13.css?v=15.2.21-repeat1')
  .replaceAll('pwa-update-v15-0-5.js?v=15.2.20-release2', 'pwa-update-v15-0-5.js?v=15.2.21-release3')
  .replaceAll('sync-runtime-compat.js?v=15.2.20-release10', 'sync-runtime-compat.js?v=15.2.21-release11');
for (const marker of ['My Finance Records · V15.2.21', recurrenceMarkupNew, CACHE, 'production-ui-audit-v15-2-13.css?v=15.2.21-repeat1', 'pwa-update-v15-0-5.js?v=15.2.21-release3', 'sync-runtime-compat.js?v=15.2.21-release11']) {
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
  let source = read(file);
  let next = source
    .replaceAll(OLD_CACHE, CACHE)
    .replaceAll('finance-ui-hotfix-v15-2-20-compact-expense2', HOTFIX)
    .replaceAll('pwa-update-v15-0-5.js?v=15.2.20-release2', 'pwa-update-v15-0-5.js?v=15.2.21-release3')
    .replaceAll('pwa-update-v15-0-5\\.js\\?v=15\\.2\\.20-release2', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.21-release3')
    .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.20-compact2', 'production-ui-audit-v15-2-13.css?v=15.2.21-repeat1')
    .replaceAll('production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.20-compact2', 'production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.21-repeat1')
    .replaceAll('sync-runtime-compat.js?v=15.2.20-release10', 'sync-runtime-compat.js?v=15.2.21-release11')
    .replaceAll('sync-runtime-compat\\.js\\?v=15\\.2\\.20-release10', 'sync-runtime-compat\\.js\\?v=15\\.2\\.21-release11')
    .replaceAll('Compact Expense Cards Stability', RELEASE_NAME)
    .replaceAll('## 15.2.20 · 2026-08-21', '## 15.2.21 · 2026-08-21')
    .replaceAll('"15.2.20"', '"15.2.21"')
    .replaceAll("'15.2.20'", "'15.2.21'")
    .replaceAll('15\\.2\\.20', '15\\.2\\.21')
    .replaceAll('V15.2.20', 'V15.2.21');
  if (file.endsWith('tests/browser/production-ui-audit-v15-2-13.spec.mjs')) {
    next = next
      .replace('savedLabel:getComputedStyle(savedText, "::after").content,', 'savedLabel:(savedText?.textContent || "").trim(),\n      savedTextFontSize:savedText ? parseFloat(getComputedStyle(savedText).fontSize) : 0,')
      .replace('expect(metrics.savedLabel).toMatch(/Repeat(?:s)? monthly/);', 'expect(metrics.savedLabel).toMatch(/^Repeat(?:s)? monthly$/);\n  expect(metrics.savedTextFontSize).toBeGreaterThan(0);');
  }
  if (file.endsWith('tests/regression/validate-production-ui-audit-v15-2-13.mjs')) {
    next = next
      .replace('assert.match(css, /Compact expense cards: static ownership[\\s\\S]*flex-shrink:\\s*0 !important;[\\s\\S]*width:\\s*max-content !important;[\\s\\S]*content:\\s*"Repeat monthly" !important;/);', 'assert.match(css, /V15\\.2\\.21 · Real monthly recurrence label[\\s\\S]*flex-shrink:\\s*0 !important;[\\s\\S]*min-width:\\s*82px !important;[\\s\\S]*font-size:\\s*\\.65rem !important;[\\s\\S]*content:\\s*none !important;/);\nassert.match(index, /saved-button-text">\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);');
  }
  if (next !== source) write(file, next);
}

const sourceAudit = read('tests/regression/validate-production-ui-audit-v15-2-13.mjs');
if (sourceAudit.includes('content:\\s*"Repeat monthly"')) throw new Error('source regression still requires pseudo monthly text');
const browserAudit = read('tests/browser/production-ui-audit-v15-2-13.spec.mjs');
if (!browserAudit.includes('savedLabel:(savedText?.textContent || "").trim()')) throw new Error('browser audit does not inspect real monthly text');
if (!browserAudit.includes('savedTextFontSize')) throw new Error('browser audit does not verify visible font size');

const required = {
  'package.json': '"version": "15.2.21"',
  'README.md': '# My Finance Records · V15.2.21',
  'CHANGELOG.md': '## 15.2.21 · 2026-08-21',
  'version.json': `"cacheVersion": "${CACHE}"`,
  'assets/css/production-ui-audit-v15-2-13.css': 'V15.2.21 · Real monthly recurrence label',
  'assets/js/ui/sync-runtime-compat.js': 'const VERSION = "15.2.21";',
  'sync-runtime-compat.js': 'const VERSION = "15.2.21";',
  'sw.js': 'const APP_VERSION = "15.2.21";'
};
for (const [file, marker] of Object.entries(required)) {
  if (!read(file).includes(marker)) throw new Error(`${file}: missing ${marker}`);
}
if (!read('CHANGELOG.md').startsWith('## 15.2.21 · 2026-08-21')) throw new Error('CHANGELOG does not start with V15.2.21');
if (read('assets/css/production-ui-audit-v15-2-13.css').includes('V15.2.21 · Real monthly recurrence label') && !read('assets/css/production-ui-audit-v15-2-13.css').includes('content:none !important')) throw new Error('pseudo recurrence content was not disabled');
console.log(`V${VERSION} monthly recurrence label repair applied to ${tests.length} test modules.`);
