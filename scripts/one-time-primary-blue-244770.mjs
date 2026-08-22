import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const textExtensions = new Set([
  ".css", ".html", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".yml", ".yaml",
  ".webmanifest", ".sql", ".svg", ".xml", ".toml", ".ini", ".env"
]);

function filesIn(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesIn(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function isTextFile(file) {
  const base = path.basename(file);
  if (["LICENSE", "Dockerfile", ".gitignore", ".gitattributes"].includes(base)) return true;
  return textExtensions.has(path.extname(file).toLowerCase());
}

let colorReplacements = 0;
let cacheTokenReplacements = 0;
const changed = [];
for (const file of filesIn(root)) {
  if (!isTextFile(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  const colorMatches = after.match(/#244770/gi)?.length ?? 0;
  if (colorMatches) {
    after = after.replace(/#244770/gi, "#356FD1");
    colorReplacements += colorMatches;
  }
  const cacheMatches = (after.match(/talaan-r2/g)?.length ?? 0) + (after.match(/talaan2/g)?.length ?? 0);
  if (cacheMatches) {
    after = after.replace(/talaan-r2/g, "talaan-r3").replace(/talaan2/g, "talaan3");
    cacheTokenReplacements += cacheMatches;
  }
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed.push(path.relative(root, file));
  }
}

if (!colorReplacements) {
  throw new Error("No #244770 occurrences were found; refusing to create an empty migration.");
}

execFileSync(process.execPath, ["scripts/prepare-runtime.mjs"], { stdio: "inherit" });

for (const file of filesIn(root)) {
  if (!isTextFile(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/#244770/i.test(text)) throw new Error(`Legacy #244770 remains in ${path.relative(root, file)}`);
}

console.log(`Replaced ${colorReplacements} #244770 occurrence(s) with #356FD1.`);
console.log(`Refreshed ${cacheTokenReplacements} Talaan cache/query token occurrence(s) to r3/talaan3.`);
console.log(`Touched ${changed.length} source file(s) before runtime regeneration.`);
