import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");
const write = (path, value) => fs.writeFileSync(path, value);
const replaceExact = (value, from, to, label) => {
  if (value.includes(to)) return value;
  if (!value.includes(from)) throw new Error(`Missing ${label}: ${from}`);
  return value.replace(from, to);
};

let index = read("index.html");
index = replaceExact(index,
  "<title>My Finance Records · V14.0.23</title>",
  "<title>My Finance Records · V15.0.0</title>",
  "V15 browser title"
);
index = replaceExact(index,
  '<small id="buildBadge" title="V14.0.23 · Phone UI &amp; Sync Conflict Recovery · August 13, 2026">V14.0.23</small>',
  '<small id="buildBadge" title="V15.0.0 · Liquid Glass Interface · August 15, 2026">V15.0.0</small>',
  "V15 build badge"
);
index = replaceExact(index,
  '<strong id="settingsOverviewAppStatus">Version 14.0.23</strong>',
  '<strong id="settingsOverviewAppStatus">Version 15.0.0</strong>',
  "V15 Settings overview version"
);
index = replaceExact(index,
  'const APP_VERSION = "14.0.23";\n    const APP_RELEASE_NAME = "Phone UI & Sync Conflict Recovery";\n    const APP_RELEASE_DATE = "August 13, 2026";',
  'const APP_VERSION = "15.0.0";\n    const APP_RELEASE_NAME = "Liquid Glass Interface";\n    const APP_RELEASE_DATE = "August 15, 2026";',
  "V15 runtime release constants"
);
const historyNeedle = 'VERSION_HISTORY.unshift({"version":"V14.0.23"';
if (!index.includes('"version":"V15.0.0","title":"Liquid Glass Interface"')) {
  if (!index.includes(historyNeedle)) throw new Error("V14 version history insertion point was not found.");
  const v15 = '{"version":"V15.0.0","title":"Liquid Glass Interface","changes":["Adds adaptive Liquid Glass material to navigation, toolbar controls, workspace switchers, menus, popovers, modal chrome, and Toast feedback.","Keeps finance cards, tables, charts, forms, and weekly marquee content opaque for clear hierarchy and contrast.","Adds reduced-transparency, reduced-motion, unsupported-backdrop, and forced-colors fallbacks while preserving Finance Schema 12 and Cloud Schema V3."]},';
  index = index.replace("VERSION_HISTORY.unshift(", `VERSION_HISTORY.unshift(${v15}`);
}
write("index.html", index);

let cloud = read("cloud-sync.js");
cloud = replaceExact(cloud,
  'const APP_VERSION_FALLBACK = "14.0.23";',
  'const APP_VERSION_FALLBACK = "15.0.0";',
  "Cloud Sync V15 fallback"
);
cloud = replaceExact(cloud,
  'return typeof APP_VERSION !== "undefined" ? APP_VERSION : APP_VERSION_FALLBACK;',
  'return window.FINANCE_APP_VERSION_OVERRIDE || (typeof APP_VERSION !== "undefined" ? APP_VERSION : APP_VERSION_FALLBACK);',
  "Cloud Sync V15 runtime version preference"
);
write("cloud-sync.js", cloud);

let changelog = read("CHANGELOG.md");
if (!changelog.startsWith("## 15.0.0 · 2026-08-15")) {
  const entry = `## 15.0.0 · 2026-08-15\n\n### Changed\n- Introduced an adaptive Liquid Glass control layer across navigation, toolbar controls, workspace switchers, floating menus and popovers, modal chrome, and Toast feedback.\n- Kept finance content surfaces opaque so KPI cards, tables, charts, forms, and weekly marquee content retain contrast and hierarchy.\n- Updated the browser/runtime release identity and PWA cache generation to V15.0.0.\n\n### Accessibility\n- Added solid or near-opaque fallbacks for unsupported backdrop filters, reduced transparency, reduced motion, and forced-colors environments.\n- Preserved visible keyboard focus, the 43px Finance and Work strip geometry, and existing 44px phone touch targets.\n\n### Preserved\n- Finance Schema 12, Cloud Schema V3, encryption, finance records, calculations, five-minute synchronization, uploaded utility icons, and saved interface preferences remain unchanged.\n\n`;
  changelog = entry + changelog;
  write("CHANGELOG.md", changelog);
}

const installerSource = read("Install_V14_0_23.command");
let installer = installerSource
  .replaceAll("V14.0.23", "V15.0.0")
  .replaceAll("full V15.0.0 quality validation", "full V15.0.0 quality validation");
write("Install_V15_0_0.command", installer);
fs.chmodSync("Install_V15_0_0.command", 0o755);

console.log("V15.0.0 release transform complete.");
