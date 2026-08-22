import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git', 'node_modules', '_site', 'coverage', 'test-results']);
const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.otf']);
const oldColor = /#173b67/gi;
const newColor = '#356FD1';
const replacements = [
  [/finance-v2-20260822-talaan-r1/g, 'finance-v2-20260822-talaan-r2'],
  [/2\.0\.1-talaan1/g, '2.0.1-talaan2']
];

let colorCount = 0;
let cacheCount = 0;
let changedFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || binaryExts.has(path.extname(entry.name).toLowerCase())) continue;

    let input;
    try {
      input = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    if (input.includes('\u0000')) continue;

    let output = input;
    const matches = output.match(oldColor);
    if (matches) {
      colorCount += matches.length;
      output = output.replace(oldColor, newColor);
    }
    for (const [pattern, replacement] of replacements) {
      const found = output.match(pattern);
      if (found) {
        cacheCount += found.length;
        output = output.replace(pattern, replacement);
      }
    }

    if (output !== input) {
      fs.writeFileSync(full, output);
      changedFiles += 1;
    }
  }
}

walk(root);

let remaining = [];
function verify(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      verify(full);
      continue;
    }
    if (!entry.isFile() || binaryExts.has(path.extname(entry.name).toLowerCase())) continue;
    let text;
    try {
      text = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    if (text.includes('\u0000')) continue;
    if (/#173b67/i.test(text)) remaining.push(path.relative(root, full));
  }
}
verify(root);

if (remaining.length) {
  console.error('Old primary color still exists in:', remaining.join(', '));
  process.exit(1);
}

console.log(`Primary blue migration complete: ${colorCount} color replacements, ${cacheCount} cache-token replacements across ${changedFiles} files.`);
