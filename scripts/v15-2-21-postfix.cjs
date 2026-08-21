const fs = require('node:fs');

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

let index = read('index.html');

const buttonNeedle = 'data-toggle-saved="${item.id}" title="${item.recurring === "Monthly" ? "Repeats monthly" : "Does not repeat monthly"}"';
const buttonReplacement = 'data-toggle-saved="${item.id}" style="display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 82px!important;flex-shrink:0!important;width:82px!important;min-width:82px!important;max-width:82px!important;height:30px!important;min-height:30px!important;padding:4px 7px!important;box-sizing:border-box!important;transform:none!important;white-space:nowrap!important;" title="${item.recurring === "Monthly" ? "Repeats monthly" : "Does not repeat monthly"}"';
const buttonCount = index.split(buttonNeedle).length - 1;
if (buttonCount < 2) throw new Error(`Expected at least two monthly recurrence buttons, found ${buttonCount}`);
index = index.split(buttonNeedle).join(buttonReplacement);

const iconNeedle = '<span class="saved-icon-container" aria-hidden="true"><span class="saved-icon">${item.recurring === "Monthly" ? "★" : "☆"}</span></span>';
const iconReplacement = '<span class="saved-icon-container" style="display:none!important" aria-hidden="true"><span class="saved-icon">${item.recurring === "Monthly" ? "★" : "☆"}</span></span>';
const iconCount = index.split(iconNeedle).length - 1;
if (iconCount < 2) throw new Error(`Expected at least two recurrence icon spans, found ${iconCount}`);
index = index.split(iconNeedle).join(iconReplacement);

const textNeedle = '<span class="saved-button-text">${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>';
const textReplacement = '<span class="saved-button-text" style="display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;color:var(--text)!important;font-size:.65rem!important;font-weight:700!important;line-height:1!important;opacity:1!important;visibility:visible!important;white-space:nowrap!important">${item.recurring === "Monthly" ? "Repeats monthly" : "Repeat monthly"}</span>';
const textCount = index.split(textNeedle).length - 1;
if (textCount < 2) throw new Error(`Expected at least two real recurrence text spans, found ${textCount}`);
index = index.split(textNeedle).join(textReplacement);
write('index.html', index);

const pwaTest = 'tests/browser/pwa-upgrade-v15-0-5.spec.mjs';
let pwa = read(pwaTest);
if (!pwa.includes('toContain("v=15.2.20")')) throw new Error('PWA test no longer contains the expected stale V15.2.20 worker assertion');
pwa = pwa.replaceAll('toContain("v=15.2.20")', 'toContain("v=15.2.21")');
write(pwaTest, pwa);

const browserTest = 'tests/browser/production-ui-audit-v15-2-13.spec.mjs';
let browser = read(browserTest);
if (!browser.includes('expect(metrics.recurrenceButtonWidth).toBeGreaterThan(65);')) throw new Error('Recurrence width regression assertion is missing');
if (!browser.includes('expect(metrics.savedTextFontSize).toBeGreaterThan(0);')) throw new Error('Real recurrence text visibility assertion is missing');
if (!browser.includes('savedLabel:(savedText?.textContent || "").trim()')) throw new Error('Browser test is not reading the real recurrence label');

const sourceTest = 'tests/regression/validate-production-ui-audit-v15-2-13.mjs';
let source = read(sourceTest);
const marker = 'assert.match(index, /saved-button-text">\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);';
if (source.includes(marker)) {
  source = source.replace(marker, 'assert.match(index, /data-toggle-saved="\\$\\{item\\.id\\}" style="[^"]*flex:0 0 82px!important;[^"]*width:82px!important;[^"]*min-width:82px!important;/);\nassert.match(index, /saved-button-text" style="[^"]*font-size:\\.65rem!important;[^"]*visibility:visible!important[^"]*">\\$\\{item\\.recurring === "Monthly" \\? "Repeats monthly" : "Repeat monthly"\\}<\\/span>/);');
  write(sourceTest, source);
}

for (const [file, needle] of [
  ['index.html', 'flex:0 0 82px!important'],
  ['index.html', 'Repeats monthly" : "Repeat monthly'],
  [pwaTest, 'toContain("v=15.2.21")']
]) {
  if (!read(file).includes(needle)) throw new Error(`${file} missing ${needle}`);
}

console.log('V15.2.21 recurrence markup hardening and PWA browser assertion alignment applied.');
