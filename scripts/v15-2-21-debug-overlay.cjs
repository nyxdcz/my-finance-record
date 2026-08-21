const fs = require('node:fs');
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

const pwaFile = 'tests/browser/pwa-upgrade-v15-0-5.spec.mjs';
let pwa = read(pwaFile);
pwa = pwa.replace('.toContain("v=15.2.20")', '.toContain("v=15.2.21")');
write(pwaFile, pwa);

const auditFile = 'tests/browser/production-ui-audit-v15-2-13.spec.mjs';
let audit = read(auditFile);
const oldFields = 'recurrenceFlexShrink:saved ? getComputedStyle(saved).flexShrink : "",';
const newFields = `recurrenceFlexShrink:saved ? getComputedStyle(saved).flexShrink : "",\n      recurrenceComputedWidth:saved ? getComputedStyle(saved).width : "",\n      recurrenceMinWidth:saved ? getComputedStyle(saved).minWidth : "",\n      recurrenceMaxWidth:saved ? getComputedStyle(saved).maxWidth : "",\n      recurrenceDisplay:saved ? getComputedStyle(saved).display : "",\n      recurrenceBoxSizing:saved ? getComputedStyle(saved).boxSizing : "",`;
if (!audit.includes(oldFields)) throw new Error('browser audit metrics anchor not found');
audit = audit.replace(oldFields, newFields);
const assertionAnchor = 'expect(metrics.recurrenceButtonHeight).toBeCloseTo(30, 0);';
if (!audit.includes(assertionAnchor)) throw new Error('browser audit assertion anchor not found');
audit = audit.replace(assertionAnchor, `console.log("RECURRENCE_METRICS", JSON.stringify(metrics));\n  ${assertionAnchor}`);
write(auditFile, audit);
console.log('Applied PWA assertion alignment and recurrence computed-style diagnostics.');
