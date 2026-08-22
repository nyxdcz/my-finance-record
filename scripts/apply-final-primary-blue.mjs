import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git', 'node_modules', '_site', 'coverage', 'test-results']);
const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.otf']);
const oldColors = [/#173b67/gi, /#173e76/gi, /#173a63/gi, /#102c4d/gi];
const oldColorCheck = /#(?:173b67|173e76|173a63|102c4d)/i;
const newColor = '#356FD1';

let colorCount = 0;
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
    try { input = fs.readFileSync(full, 'utf8'); } catch { continue; }
    if (input.includes('\u0000')) continue;

    let output = input;
    for (const oldColor of oldColors) {
      const matches = output.match(oldColor);
      if (matches) {
        colorCount += matches.length;
        output = output.replace(oldColor, newColor);
      }
    }
    if (output !== input) {
      fs.writeFileSync(full, output);
      changedFiles += 1;
    }
  }
}

walk(root);

const remaining = [];
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
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue;
    if (oldColorCheck.test(text)) remaining.push(path.relative(root, full));
  }
}
verify(root);

if (remaining.length) {
  console.error('Legacy primary blues still exist in:', remaining.join(', '));
  process.exit(1);
}

console.log(`Final primary blue pass complete: ${colorCount} replacements across ${changedFiles} files.`);
