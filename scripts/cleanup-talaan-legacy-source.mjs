import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const CURRENT_QUERY = "2.0.1-talaan1";
const TEXT_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".css", ".html", ".md", ".json", ".yml", ".yaml", ".sh", ".command", ".sql", ".txt", ".webmanifest"]);
const ignoredDirectories = new Set([".git", "node_modules", "vendor", "test-results"]);

function walk(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile()) visit(full);
  }
}

function replaceInTextFiles(replacements = []) {
  walk(root, file => {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) return;
    let source = fs.readFileSync(file, "utf8");
    const original = source;
    for (const [from, to] of replacements) {
      source = typeof from === "string" ? source.replaceAll(from, to) : source.replace(from, to);
    }
    source = source.replace(/\?v=(?:12|13|14|15)(?:[.\-][A-Za-z0-9]+)+/g, `?v=${CURRENT_QUERY}`);
    if (source !== original) fs.writeFileSync(file, source);
  });
}

function neutralizeSyncRuntime(file) {
  if (!fs.existsSync(file)) return;
  let source = fs.readFileSync(file, "utf8");
  source = source
    .replaceAll("applyV15ReleaseLayer", "applyTalaanReleaseLayer")
    .replaceAll("synchronizeV15ReleaseDisplay", "synchronizeTalaanReleaseDisplay")
    .replaceAll("v15ObserveBound", "releaseObserveBound")
    .replace('const VERSION = "15.2.23";', 'const VERSION = "2.0.1";')
    .replace('const RELEASE_NAME = "Monthly Repeat Icon Footer";', 'const RELEASE_NAME = "Talaan";')
    .replace('const RELEASE_DATE = "August 21, 2026";', 'const RELEASE_DATE = "August 22, 2026";')
    .replace('released:"2026-08-21"', 'released:"2026-08-22"')
    .replace('link.href = `./liquid-glass-v15.css?v=${VERSION}-light1`;', `link.href = "./liquid-glass.css?v=${CURRENT_QUERY}";`)
    .replace('document.title = `My Finance Records · V${VERSION}`;', 'document.title = `Talaan · V${VERSION}`;')
    .replace("/* V15.2.3 · supplied Cloud Sync status artwork */", "/* Talaan Cloud Sync status artwork */")
    .replace("// Legacy validation marker for the unchanged detector test contract:", "// Detector validation marker:")
    .replace(/\?v=15\.0\.3/g, `?v=${CURRENT_QUERY}`);
  fs.writeFileSync(file, source);
}

function versionTuple(name) {
  const match = name.match(/-v(1[2-5])(?:[-.](\d+))?(?:[-.](\d+))?/i);
  return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : [0,0,0];
}
function compareTuple(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const delta = (a[i] || 0) - (b[i] || 0);
    if (delta) return delta;
  }
  return 0;
}
function neutralIconName(name) {
  return name.replace(/-v1[2-5](?:(?:-|\.)\d+){0,3}(?=-(?:r\d+)|\.[^.]+$)/i, "")
    .replace(/-v1[2-5](?:(?:-|\.)\d+){0,3}(?=\.[^.]+$)/i, "");
}

function renameVersionedIcons() {
  const iconsDir = path.join(root, "icons");
  const files = fs.readdirSync(iconsDir).filter(name => /-v1[2-5](?:[-.]\d+)*/i.test(name));
  const groups = new Map();
  for (const name of files) {
    const target = neutralIconName(name);
    if (!groups.has(target)) groups.set(target, []);
    groups.get(target).push(name);
  }
  const mapping = new Map();
  for (const [target, names] of groups) {
    names.sort((a,b) => compareTuple(versionTuple(b), versionTuple(a)));
    names.forEach((name, index) => {
      let resolved = target;
      if (index > 0) {
        const ext = path.extname(target);
        resolved = `${target.slice(0, -ext.length)}-alternate${index > 1 ? index : ""}${ext}`;
      }
      let suffix = 2;
      while (fs.existsSync(path.join(iconsDir, resolved)) && !names.includes(resolved)) {
        const ext = path.extname(resolved);
        resolved = `${resolved.slice(0, -ext.length)}-${suffix}${ext}`;
        suffix += 1;
      }
      mapping.set(name, resolved);
    });
  }

  const referenceReplacements = [...mapping.entries()].map(([oldName, newName]) => [oldName, newName]);
  replaceInTextFiles(referenceReplacements);

  for (const [oldName, newName] of mapping) {
    const from = path.join(iconsDir, oldName);
    const to = path.join(iconsDir, newName);
    if (!fs.existsSync(from)) continue;
    if (fs.existsSync(to)) {
      const same = fs.readFileSync(from).equals(fs.readFileSync(to));
      if (!same) throw new Error(`Icon rename collision: ${oldName} -> ${newName}`);
      fs.rmSync(from);
    } else {
      fs.renameSync(from, to);
    }
  }
  return mapping;
}

const syncSources = [
  path.join(root, "assets/js/ui/sync-runtime-compat.js"),
  path.join(root, "sync-runtime-compat.js")
];
syncSources.forEach(neutralizeSyncRuntime);

replaceInTextFiles([
  ["applyV15ReleaseLayer", "applyTalaanReleaseLayer"],
  ["synchronizeV15ReleaseDisplay", "synchronizeTalaanReleaseDisplay"],
  ["V15.2.2 cloud authority guard", "Talaan cloud authority guard"],
  ["v15ObserveBound", "releaseObserveBound"]
]);

const iconMapping = renameVersionedIcons();
console.log(`Neutralized ${iconMapping.size} versioned icon filenames.`);

const prep = spawnSync(process.execPath, [path.join(root, "scripts/prepare-runtime.mjs")], { cwd:root, stdio:"inherit" });
if (prep.status !== 0) process.exit(prep.status || 1);

const staleRootRuntime = [
  "shell-ui-v15-2-11.css",
  "black-canvas-v15-1-0.css",
  "dashboard-interactions-core-v14-0-23.css",
  "desktop-ui-phase1-v15-1-0.css",
  "desktop-ux-v15-2-0.css",
  "liquid-glass-v15.css",
  "mobile-v14-0-23.css",
  "production-ui-audit-v15-2-13.css",
  "projects-calendar-v13.0.20.css",
  "projects-calendar-v13.0.20.js",
  "ui-icon-alignment-v15-0-5.css",
  "pwa-update-v15-0-5.js",
  "summary-mascots-v15-2-25.css",
  "summary-mascots-v15-2-25.js"
];
for (const file of staleRootRuntime) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) fs.rmSync(target);
}

// This migration is intentionally self-removing after it updates the branch.
for (const file of [
  path.join(root, "scripts/cleanup-talaan-legacy-source.mjs"),
  path.join(root, ".github/workflows/talaan-legacy-source-cleanup.yml")
]) if (fs.existsSync(file)) fs.rmSync(file);

console.log("Talaan V2.0.1 legacy source cleanup completed.");
