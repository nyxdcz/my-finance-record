import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const textExtensions = new Set([".css", ".html", ".js", ".mjs", ".cjs", ".json", ".md", ".txt", ".yml", ".yaml", ".webmanifest", ".sql", ".svg", ".xml", ".toml", ".ini", ".env"]);

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

let replacements = 0;
for (const file of filesIn(root)) {
  if (!isTextFile(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  const count = before.match(/#325279/gi)?.length ?? 0;
  if (!count) continue;
  const after = before.replace(/#325279/gi, "#356FD1");
  fs.writeFileSync(file, after);
  replacements += count;
}

if (!replacements) throw new Error("No #325279 occurrences were found; refusing empty migration.");

execFileSync(process.execPath, ["scripts/prepare-runtime.mjs"], { stdio: "inherit" });

for (const file of filesIn(root)) {
  if (!isTextFile(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/#325279/i.test(text)) throw new Error(`Legacy #325279 remains in ${path.relative(root, file)}`);
}

console.log(`Replaced ${replacements} #325279 occurrence(s) with #356FD1.`);
