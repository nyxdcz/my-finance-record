import fs from "node:fs";

const VERSION = "15.2.4";
const RELEASE_DATE = "2026-08-18";
const RELEASE_DATE_LONG = "August 18, 2026";
const RELEASE_NAME = "Finance UI & Header Refinement";
const CACHE_VERSION = "finance-v15-20260818-ui-refinement-r39";
const PREVIOUS_VERSION = "15.2.3";
const PREVIOUS_CACHE_VERSION = "finance-v15-20260817-sync-status-r38";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content);
}

function replaceExact(file, from, to) {
  const source = read(file);
  if (!source.includes(from)) {
    throw new Error(`${file}: expected text not found: ${from.slice(0, 140)}`);
  }
  write(file, source.replace(from, to));
}

function replaceIfPresent(file, from, to) {
  const source = read(file);
  if (!source.includes(from)) return false;
  write(file, source.replaceAll(from, to));
  return true;
}

// README: promote the release and summarize every user-facing change merged after V15.2.3.
{
  const file = "README.md";
  let source = read(file);
  source = source.replace(`# My Finance Records · V${PREVIOUS_VERSION}`, `# My Finance Records · V${VERSION}`);
  const marker = "## Recent updates\n\n";
  if (!source.includes(marker)) throw new Error("README.md: Recent updates marker not found");
  const releaseLine = `- **V15.2.4 · Finance UI & Header Refinement** — Consolidates all post-V15.2.3 interface updates: exact supplied light/dark **More tools** icons; revised Finance monthly-save artwork with press feedback and reduced-motion support; scalloped Finance legend markers; supplied Spend receipt icons; clean theme-aware heart-smile completion artwork for First half, First-half difference, and zero Other expenses; compact **Auto / Light / Dark** Appearance controls; a flat 38px desktop month selector matching More tools; and retry-safe GitHub Pages/PWA delivery. Finance Schema 12, Cloud Schema V3, records, calculations, account balances, conflict resolution, and the five-minute sync cadence are unchanged.\n`;
  if (!source.includes("**V15.2.4 · Finance UI & Header Refinement**")) {
    source = source.replace(marker, marker + releaseLine);
  }
  write(file, source);
}

// CHANGELOG: preserve the historical V15.2.3 entry and prepend a complete V15.2.4 release summary.
{
  const file = "CHANGELOG.md";
  let source = read(file);
  const heading = "## 15.2.4 · 2026-08-18";
  if (!source.startsWith(heading)) {
    const section = `${heading}\n- Replaced the More tools presentation with the exact supplied light/dark PNG artwork and finalized Appearance as a compact 38px, left-aligned **Auto / Light / Dark** control with the existing 20px icon and theme behavior.\n- Refined Finance visuals with the revised monthly-save toggle artwork and press feedback, scalloped Available/First-half/Second-half/Other-expenses legend markers, supplied receipt artwork for Spend, and clean theme-aware heart-smile completion icons for First half, First-half difference, and zero Other expenses.\n- Flattened the desktop month selector into the same compact visual language as More tools: one 38px segmented month control with subtle separators, no glass blur/double-border treatment, and a separate aligned **Current** control.\n- Hardened GitHub Pages/PWA delivery with run-attempt-specific artifacts, automatic deployment retries, network-first final Appearance geometry, and expanded browser regression coverage for the new icon, theme, and month-selector states.\n- Released the consolidated interface update as V15.2.4 with cache \`${CACHE_VERSION}\`. Finance Schema 12, Cloud Schema V3, finance records, calculations, account balances, conflict-resolution behavior, and the five-minute routine sync cadence are unchanged.\n\n`;
    source = section + source;
  }
  write(file, source);
}

// Structured release metadata.
{
  const file = "version.json";
  const json = JSON.parse(read(file));
  if (json.version !== PREVIOUS_VERSION) throw new Error(`version.json: expected ${PREVIOUS_VERSION}, got ${json.version}`);
  json.version = VERSION;
  json.cacheVersion = CACHE_VERSION;
  json.released = RELEASE_DATE;
  json.name = RELEASE_NAME;
  json.notes = "V15.2.4 consolidates the post-V15.2.3 interface refinements: exact supplied More tools icons, revised Finance save/spend/legend/completion artwork, compact Auto/Light/Dark appearance controls, the flat 38px desktop month selector, and retry-safe PWA/Pages delivery. Finance Schema 12, Cloud Schema V3, finance records, calculations, account balances, conflict resolution, and the five-minute sync cadence are unchanged.";
  write(file, `${JSON.stringify(json, null, 2)}\n`);
}

// npm package metadata.
{
  const file = "package.json";
  const json = JSON.parse(read(file));
  if (json.version !== PREVIOUS_VERSION) throw new Error(`package.json: expected ${PREVIOUS_VERSION}, got ${json.version}`);
  json.version = VERSION;
  write(file, `${JSON.stringify(json, null, 2)}\n`);
}
{
  const file = "package-lock.json";
  const json = JSON.parse(read(file));
  if (json.version !== PREVIOUS_VERSION) throw new Error(`package-lock.json: expected ${PREVIOUS_VERSION}, got ${json.version}`);
  json.version = VERSION;
  if (json.packages?.[""]?.version === PREVIOUS_VERSION) json.packages[""].version = VERSION;
  write(file, `${JSON.stringify(json, null, 2)}\n`);
}

// Runtime release identity and cache-busting.
replaceExact("index.html", `<title>My Finance Records · V${PREVIOUS_VERSION}</title>`, `<title>My Finance Records · V${VERSION}</title>`);
replaceExact("index.html", `const APP_VERSION = "${PREVIOUS_VERSION}";`, `const APP_VERSION = "${VERSION}";`);
replaceExact("index.html", `const APP_RELEASE_NAME = "Mobile UI & UX";`, `const APP_RELEASE_NAME = "${RELEASE_NAME}";`);
replaceExact("index.html", `const APP_RELEASE_DATE = "August 16, 2026";`, `const APP_RELEASE_DATE = "${RELEASE_DATE_LONG}";`);
replaceExact("index.html", `const APP_CACHE_VERSION = "${PREVIOUS_CACHE_VERSION}";`, `const APP_CACHE_VERSION = "${CACHE_VERSION}";`);
replaceIfPresent("index.html", `<small id="buildBadge" title="V15.2.2 · Mobile UI &amp; UX · August 16, 2026">V15.2.2</small>`, `<small id="buildBadge" title="V15.2.4 · Finance UI &amp; Header Refinement · August 18, 2026">V15.2.4</small>`);
replaceIfPresent("index.html", `./ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3`, `./ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1`);
replaceIfPresent("index.html", `./desktop-ux-v15-2-0.css?v=15.2.1`, `./desktop-ux-v15-2-0.css?v=15.2.4-header1`);
replaceIfPresent("index.html", `./pwa-update-v15-0-5.js?v=15.1.0`, `./pwa-update-v15-0-5.js?v=15.2.4-release1`);
replaceIfPresent("index.html", `./sync-config.js?v=15.2.3-sync1`, `./sync-config.js?v=15.2.4-release1`);

replaceExact("sw.js", `const APP_VERSION = "${PREVIOUS_VERSION}";`, `const APP_VERSION = "${VERSION}";`);
replaceExact("sw.js", `const CACHE_VERSION = "${PREVIOUS_CACHE_VERSION}";`, `const CACHE_VERSION = "${CACHE_VERSION}";`);
replaceIfPresent("sw.js", `// V15.2.3 hotfix: keep the More tools icon-alignment stylesheet network-first so installed apps receive refreshed artwork.`, `// V15.2.3 hotfix: keep the More tools icon-alignment stylesheet network-first so installed apps receive refreshed artwork.\n// V15.2.4 consolidated UI refinement: exact Finance/More-tools artwork, compact Appearance, flat month selector, and retry-safe live delivery.`);
replaceIfPresent("sw.js", `./ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3`, `./ui-icon-alignment-v15-0-5.css?v=15.2.4-ui1`);
replaceIfPresent("sw.js", `./desktop-ux-v15-2-0.css?v=15.2.1`, `./desktop-ux-v15-2-0.css?v=15.2.4-header1`);
replaceIfPresent("sw.js", `./pwa-update-v15-0-5.js?v=15.1.0`, `./pwa-update-v15-0-5.js?v=15.2.4-release1`);
replaceIfPresent("sw.js", `./sync-config.js?v=15.2.3-sync1`, `./sync-config.js?v=15.2.4-release1`);

replaceExact("pwa-update-v15-0-5.js", `const CURRENT_CACHE_VERSION = "${PREVIOUS_CACHE_VERSION}";`, `const CURRENT_CACHE_VERSION = "${CACHE_VERSION}";`);

replaceExact("sync-config.js", `const VERSION = "${PREVIOUS_VERSION}";`, `const VERSION = "${VERSION}";`);
replaceExact("sync-config.js", `const RELEASE_NAME = "Sync Status Icons";`, `const RELEASE_NAME = "${RELEASE_NAME}";`);
replaceExact("sync-config.js", `const RELEASE_DATE = "August 17, 2026";`, `const RELEASE_DATE = "${RELEASE_DATE_LONG}";`);
replaceExact("sync-config.js", `released:"2026-08-17"`, `released:"${RELEASE_DATE}"`);

console.log(`Applied V${VERSION} release metadata and consolidated release notes.`);
