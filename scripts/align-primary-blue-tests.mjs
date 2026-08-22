import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'tests', 'browser');
const replacements = new Map([
  ['rgb(23, 59, 103)', 'rgb(53, 111, 209)'],
  ['rgb(23, 62, 118)', 'rgb(53, 111, 209)'],
  ['rgb(23, 58, 99)', 'rgb(53, 111, 209)']
]);
let changed = 0;
for (const name of fs.readdirSync(root)) {
  if (!name.endsWith('.mjs')) continue;
  const file = path.join(root, name);
  const input = fs.readFileSync(file, 'utf8');
  let output = input;
  for (const [from, to] of replacements) output = output.split(from).join(to);
  if (output !== input) {
    fs.writeFileSync(file, output);
    changed += 1;
  }
}
console.log(`Aligned primary-blue browser assertions in ${changed} test files.`);
