import fs from "node:fs";
import path from "node:path";

const roots = ["tests"];
const replacements = [
  ["pwa-update-v15-0-5.js", "pwa-update.js"],
  ["ui-icon-alignment-v15-0-5.css", "ui-icon-alignment.css"],
  ["mobile-v14-0-23.css", "mobile.css"],
  ["projects-calendar-v13.0.20.js", "projects-calendar.js"],
  ["projects-calendar-v13.0.20.css", "projects-calendar.css"],
  ["desktop-ux-v15-2-0.css", "desktop-ux.css"],
  ["shell-ui-v15-2-11.css", "shell-ui.css"],
  ["production-ui-audit-v15-2-13.css", "production-ui-audit.css"],
  ["dashboard-interactions-core-v14-0-23.css", "dashboard-interactions-core.css"],
  ["desktop-ui-phase1-v15-1-0.css", "desktop-ui-phase1.css"],
  ["black-canvas-v15-1-0.css", "black-canvas.css"],
  ["liquid-glass-v15.css", "liquid-glass.css"],
  ["finance-save-(?:saved|unsaved)-v15-2-3-r2\\.png", "finance-save-(?:saved|unsaved)-r2\\.png"],
  ["heart-smile-light-v15-2-4\\.png", "heart-smile-light\\.png"],
  ["heart-smile-dark-v15-2-4\\.png", "heart-smile-dark\\.png"],
  ["V15.2.4-r3 · Final network-first More tools Appearance geometry", "Final network-first More tools Appearance geometry"],
];

const labelPatterns = [
  /\bV15\.2\.19\b/g,
  /\bV15\.2\.4\b/g,
  /\bV15\.2\.2\b/g,
  /\bV15\.2\.1\b/g,
  /\bV15\.1\.0\b/g,
];

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

let changed = 0;
for (const root of roots) {
  for (const file of filesUnder(root)) {
    if (!/\.(?:mjs|js|css|md)$/.test(file)) continue;
    const original = fs.readFileSync(file, "utf8");
    let next = original;

    // Keep the deliberate negative assertion for the removed predecessor stylesheet semantic.
    next = next.replace(
      /expect\(styles\.some\(href => href\.includes\("ui-icon-alignment-v15-0-4\.css\?v=2\.0\.1-talaan1"\)\)\)\.toBe\(false\);/g,
      'expect(styles.filter(href => href.includes("ui-icon-alignment.css?v=2.0.1-talaan1"))).toHaveLength(1);'
    );

    for (const [from, to] of replacements) next = next.split(from).join(to);
    for (const pattern of labelPatterns) next = next.replace(pattern, "Talaan V2.0.1");

    if (next !== original) {
      fs.writeFileSync(file, next);
      changed += 1;
      console.log(`updated ${file}`);
    }
  }
}

// Remove this one-time migration after it has done its work.
fs.rmSync("scripts/cleanup-talaan-browser-tests.mjs", { force: true });
fs.rmSync(".github/workflows/talaan-browser-test-cleanup.yml", { force: true });
console.log(`Talaan browser-test cleanup updated ${changed} files.`);
