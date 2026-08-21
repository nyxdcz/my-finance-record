const fs = require('node:fs');
const path = require('node:path');

const VERSION = '15.2.22';
const OLD_VERSION = '15.2.21';
const CACHE = 'finance-v15-20260821-monthly-repeat-class-r58';
const OLD_CACHE = 'finance-v15-20260821-monthly-repeat-label-r57';
const RELEASE_NAME = 'Monthly Repeat Label Isolation';
const OLD_RELEASE_NAME = 'Visible Monthly Recurrence';
const HOTFIX = 'finance-ui-hotfix-v15-2-22-monthly-repeat1';
const OLD_HOTFIX = 'finance-ui-hotfix-v15-2-21-monthly-repeat1';
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
  value.notes = 'V15.2.22 isolates the desktop Repeat monthly / Repeats monthly label from legacy saved-button icon-only CSS by using a dedicated monthly-repeat-label class, while preserving the 82px by 30px recurrence control, recurrence behavior, Mark paid/Edit ordering, phone touch layouts, Finance Schema 12, Cloud Schema V3, calculations, balances, and sync behavior.';
});

let readme = read('README.md');
readme = readme
  .replace('# My Finance Records · V15.2.21', '# My Finance Records · V15.2.22')
  .replace('version-V15.2.21-2563eb', 'version-V15.2.22-2563eb')
  .replace('| **V15.2.21** · Visible Monthly Recurrence | **12** | **V3** | **5 minutes** |', '| **V15.2.22** · Monthly Repeat Label Isolation | **12** | **V3** | **5 minutes** |')
  .replace(/^The current release .*$/m, 'The current release keeps the compact First half, Second half, and Other expense-card layout while isolating Repeat monthly / Repeats monthly from the legacy icon-only saved-button CSS. The desktop recurrence label is real text inside an 82px by 30px non-shrinking control directly before Mark paid; Finance calculations, recurrence behavior, schemas, balances, filters, payments, phone touch layouts, and sync behavior remain protected.');
write('README.md', readme);

let changelog = read('CHANGELOG.md').replace(/^\uFEFF/, '').replace(/^\s+/, '');
if (!changelog.startsWith('## 15.2.22 · 2026-08-21')) {
  changelog = `## 15.2.22 · 2026-08-21\n- Isolated the desktop Repeat monthly / Repeats monthly label from legacy icon-only saved-button CSS with a dedicated monthly-repeat-label class.\n- Preserved the existing 82px by 30px non-shrinking recurrence control, recurrence behavior, Mark paid/Edit ordering, compact expense-card geometry, and phone touch layouts.\n- Strengthened browser coverage to measure the actual recurrence-label bounding box and rotated the PWA cache to \`${CACHE}\` without changing Finance Schema 12, Cloud Schema V3, calculations, balances, payments, or sync behavior.\n\n${changelog}`;
}
write('CHANGELOG.md', changelog);

const cssFile = 'assets/css/production-ui-audit-v15-2-13.css';
let css = read(cssFile);
if (!css.includes('V15.2.22 · Monthly repeat label isolation')) {
  css += `\n\n/* V15.2.22 · Monthly repeat label isolation: bypass legacy .saved-button-text icon-only rules. */\n@media (min-width: 851px) {\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] {\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    flex:0 0 82px !important;\n    flex-shrink:0 !important;\n    width:82px !important;\n    min-width:82px !important;\n    max-width:82px !important;\n    height:30px !important;\n    min-height:30px !important;\n    padding:4px 7px !important;\n    box-sizing:border-box !important;\n    transform:none !important;\n    white-space:nowrap !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] .saved-icon-container {\n    display:none !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] > .monthly-repeat-label {\n    display:inline-flex !important;\n    align-items:center !important;\n    justify-content:center !important;\n    flex:0 0 auto !important;\n    width:auto !important;\n    min-width:0 !important;\n    max-width:none !important;\n    height:auto !important;\n    color:var(--text) !important;\n    font-size:.65rem !important;\n    font-weight:700 !important;\n    line-height:1 !important;\n    opacity:1 !important;\n    visibility:visible !important;\n    transform:none !important;\n    white-space:nowrap !important;\n    overflow:visible !important;\n  }\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] > .monthly-repeat-label::before,\n  html body #money .record-row[data-expense-row] > .desktop-record-actions > [data-toggle-saved] > .monthly-repeat-label::after {\n    content:none !important;\n    display:none !important;\n  }\n}\n`;
}
write(cssFile, css);

for (const runtime of ['assets/js/ui/sync-runtime-compat.js', 'sync-runtime-compat.js']) {
  replaceRequired(runtime, 'const VERSION = "15.2.21";', 'const VERSION = "15.2.22";');
  replaceRequired(runtime, `const RELEASE_NAME = "${OLD_RELEASE_NAME}";`, `const RELEASE_NAME = "${RELEASE_NAME}";`);
}
replaceRequired('assets/js/pwa-update-v15-0-5.js', `const CURRENT_CACHE_VERSION = "${OLD_CACHE}";`, `const CURRENT_CACHE_VERSION = "${CACHE}";`);
replaceRequired('assets/js/pwa-update-v15-0-5.js', `const UI_HOTFIX_REFRESH_KEY = "${OLD_HOTFIX}";`, `const UI_HOTFIX_REFRESH_KEY = "${HOTFIX}";`);

replaceRequired('sw.js', 'const APP_VERSION = "15.2.21";', 'const APP_VERSION = "15.2.22";');
replaceRequired('sw.js', `const CACHE_VERSION = "${OLD_CACHE}";`, `const CACHE_VERSION = "${CACHE}";`);
replaceRequired('sw.js', 'production-ui-audit-v15-2-13.css?v=15.2.21-repeat1', 'production-ui-audit-v15-2-13.css?v=15.2.22-repeat2');
replaceRequired('sw.js', 'pwa-update-v15-0-5.js?v=15.2.21-release3', 'pwa-update-v15-0-5.js?v=15.2.22-release4');
replaceRequired('sw.js', 'sync-runtime-compat.js?v=15.2.21-release11', 'sync-runtime-compat.js?v=15.2.22-release12');

let index = read('index.html');
const oldLabel = '<span class="saved-button-text" style="display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;color:var(--text)!important;font-size:.65rem!important;font-weight:700!important;line-height:1!important;opacity:1!important;visibility:visible!important;white-space:nowrap!important">${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>';
const newLabel = '<span class="monthly-repeat-label" style="display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:auto!important;color:var(--text)!important;font-size:.65rem!important;font-weight:700!important;line-height:1!important;opacity:1!important;visibility:visible!important;transform:none!important;white-space:nowrap!important;overflow:visible!important">${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>';
const labelCount = index.split(oldLabel).length - 1;
if (labelCount < 2) throw new Error(`index.html expected at least two V15.2.21 recurrence labels, found ${labelCount}`);
index = index
  .split(oldLabel).join(newLabel)
  .replaceAll('My Finance Records · V15.2.21', 'My Finance Records · V15.2.22')
  .replaceAll('const APP_VERSION = "15.2.21";', 'const APP_VERSION = "15.2.22";')
  .replaceAll(`const APP_RELEASE_NAME = "${OLD_RELEASE_NAME}";`, `const APP_RELEASE_NAME = "${RELEASE_NAME}";`)
  .replaceAll(OLD_CACHE, CACHE)
  .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.21-repeat1', 'production-ui-audit-v15-2-13.css?v=15.2.22-repeat2')
  .replaceAll('pwa-update-v15-0-5.js?v=15.2.21-release3', 'pwa-update-v15-0-5.js?v=15.2.22-release4')
  .replaceAll('sync-runtime-compat.js?v=15.2.21-release11', 'sync-runtime-compat.js?v=15.2.22-release12');
for (const marker of ['My Finance Records · V15.2.22', 'monthly-repeat-label', CACHE, 'production-ui-audit-v15-2-13.css?v=15.2.22-repeat2', 'pwa-update-v15-0-5.js?v=15.2.22-release4', 'sync-runtime-compat.js?v=15.2.22-release12']) {
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
    .replaceAll('pwa-update-v15-0-5.js?v=15.2.21-release3', 'pwa-update-v15-0-5.js?v=15.2.22-release4')
    .replaceAll('pwa-update-v15-0-5\\.js\\?v=15\\.2\\.21-release3', 'pwa-update-v15-0-5\\.js\\?v=15\\.2\\.22-release4')
    .replaceAll('production-ui-audit-v15-2-13.css?v=15.2.21-repeat1', 'production-ui-audit-v15-2-13.css?v=15.2.22-repeat2')
    .replaceAll('production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.21-repeat1', 'production-ui-audit-v15-2-13\\.css\\?v=15\\.2\\.22-repeat2')
    .replaceAll('sync-runtime-compat.js?v=15.2.21-release11', 'sync-runtime-compat.js?v=15.2.22-release12')
    .replaceAll('sync-runtime-compat\\.js\\?v=15\\.2\\.21-release11', 'sync-runtime-compat\\.js\\?v=15\\.2\\.22-release12')
    .replaceAll(OLD_RELEASE_NAME, RELEASE_NAME)
    .replaceAll('## 15.2.21 · 2026-08-21', '## 15.2.22 · 2026-08-21')
    .replaceAll('"15.2.21"', '"15.2.22"')
    .replaceAll("'15.2.21'", "'15.2.22'")
    .replaceAll('15\\.2\\.21', '15\\.2\\.22')
    .replaceAll('V15.2.21', 'V15.2.22');

  if (file.endsWith('tests/browser/production-ui-audit-v15-2-13.spec.mjs')) {
    next = next
      .replace('const savedText = saved?.querySelector(".saved-button-text");', 'const savedText = saved?.querySelector(".monthly-repeat-label");')
      .replace('savedTextDisplay:savedText ? getComputedStyle(savedText).display : "",', 'savedTextDisplay:savedText ? getComputedStyle(savedText).display : "",\n      savedTextWidth:savedText?.getBoundingClientRect().width || 0,\n      savedTextOpacity:savedText ? parseFloat(getComputedStyle(savedText).opacity) : 0,')
      .replace('expect(metrics.savedTextFontSize).toBeGreaterThan(0);', 'expect(metrics.savedTextFontSize).toBeGreaterThan(0);\n  expect(metrics.savedTextWidth).toBeGreaterThan(45);\n  expect(metrics.savedTextOpacity).toBe(1);');
  }

  if (file.endsWith('tests/regression/validate-production-ui-audit-v15-2-13.mjs')) {
    next = next
      .replace(/assert\.match\(css, \/V15\\\.2\\\.21 · Real monthly recurrence label[^\n]+\n?/g, '')
      .replace(/assert\.match\(index, \/saved-button-text[^\n]+\n?/g, '');
    const anchor = 'assert.match(css, /V15\\.2\\.20 · Expense-card compactness[\\s\\S]*max-height:\\s*56px !important;/);';
    if (next.includes(anchor) && !next.includes('Monthly repeat label isolation')) {
      next = next.replace(anchor, `${anchor}\nassert.match(css, /V15\\.2\\.22 · Monthly repeat label isolation[\\s\\S]*monthly-repeat-label[\\s\\S]*width:\\s*auto !important;[\\s\\S]*opacity:\\s*1 !important;[\\s\\S]*transform:\\s*none !important;/);\nassert.match(index, /class="monthly-repeat-label"[^>]*>\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);`);
    }
  }

  if (next !== source) write(file, next);
}

const browserAudit = read('tests/browser/production-ui-audit-v15-2-13.spec.mjs');
if (!browserAudit.includes('querySelector(".monthly-repeat-label")')) throw new Error('browser audit does not target the isolated recurrence label');
if (!browserAudit.includes('savedTextWidth')) throw new Error('browser audit does not measure recurrence-label width');
const sourceAudit = read('tests/regression/validate-production-ui-audit-v15-2-13.mjs');
if (!sourceAudit.includes('Monthly repeat label isolation')) throw new Error('source regression does not lock the isolated recurrence label');

const required = {
  'package.json': '"version": "15.2.22"',
  'README.md': '# My Finance Records · V15.2.22',
  'CHANGELOG.md': '## 15.2.22 · 2026-08-21',
  'version.json': `"cacheVersion": "${CACHE}"`,
  'assets/css/production-ui-audit-v15-2-13.css': 'V15.2.22 · Monthly repeat label isolation',
  'assets/js/ui/sync-runtime-compat.js': 'const VERSION = "15.2.22";',
  'sync-runtime-compat.js': 'const VERSION = "15.2.22";',
  'sw.js': 'const APP_VERSION = "15.2.22";',
  'index.html': 'class="monthly-repeat-label"'
};
for (const [file, marker] of Object.entries(required)) {
  if (!read(file).includes(marker)) throw new Error(`${file}: missing ${marker}`);
}
if (!read('CHANGELOG.md').startsWith('## 15.2.22 · 2026-08-21')) throw new Error('CHANGELOG does not start with V15.2.22');
console.log(`V${VERSION} monthly-repeat label isolation applied to ${tests.length} test modules.`);
