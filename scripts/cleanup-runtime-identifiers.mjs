import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const replacements = new Map([
  ["exportV12Bundle", "exportFinanceBundle"],
  ["renderV12Settings", "renderFinanceSettings"],
  ["installV12Wrappers", "installFinanceWrappers"],
  ["setupV12EventHandlers", "setupFinanceEventHandlers"],
  ["downloadV11BackupButton", "downloadLegacyBackupButton"],
  ["restoreV11BackupButton", "restoreLegacyBackupButton"],
  ["downloadV11Backup", "downloadLegacyBackup"],
  ["restoreV11Backup", "restoreLegacyBackup"],
  ["v11BackupStatus", "legacyBackupStatus"],
  ["V12 App, Offline &amp; Recovery", "App, Offline &amp; Recovery"],
  ["Export V12 recovery bundle", "Export recovery bundle"],
  ["No V11 recovery copy is available", "No legacy recovery copy is available"],
  ["Restore the stored V11 data? V12 will create a recovery snapshot of the current records first.", "Restore the stored legacy data? Talaan will create a recovery snapshot of the current records first."],
  ["Before V11 rollback", "Before legacy rollback"],
  ["Restore V11 recovery copy", "Restore legacy recovery copy"],
  ["V11 recovery copy restored into V12", "Legacy recovery copy restored into Talaan"],
  ["The V11 recovery copy could not be restored", "The legacy recovery copy could not be restored"],
  ["/* V12 PWA, device, sync, storage, and recovery controls */", "/* App, device, sync, storage, and recovery controls */"],
  ["Compatibility cleanup only: remove caches created by pre-Talaan V12-V15 releases.", "Compatibility cleanup only: remove caches created by pre-Talaan releases."]
]);

const targets = [
  "index.html",
  "assets/css/app.css",
  "sw.js",
  "tests/helpers/inspect-project.mjs"
];

for (const relative of targets) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, "utf8");
  for (const [before, after] of replacements) source = source.replaceAll(before, after);

  if (relative === "index.html") {
    source = source
      .replaceAll('item.from || "V11"', 'item.from || "Legacy"')
      .replaceAll('item.to || "V12"', 'item.to || "Finance Schema 12"');
  }

  if (relative === "tests/helpers/inspect-project.mjs") {
    const guard = 'if (/\\bV(?:12|13|14|15)(?:\\.\\d+)*\\b/.test(html)) fail("Prepared index still contains legacy product-version terminology");';
    if (!source.includes("legacy product-version terminology")) {
      source = source.replace(
        'if (!html.includes(`const APP_VERSION = "${CURRENT_VERSION}";`)) fail(`Prepared index runtime must be ${DISPLAY_VERSION}`);',
        'if (!html.includes(`const APP_VERSION = "${CURRENT_VERSION}";`)) fail(`Prepared index runtime must be ${DISPLAY_VERSION}`);\n' + guard
      );
    }
  }

  fs.writeFileSync(file, source);
}

console.log("Recovery and runtime identifiers modernized without changing stored compatibility strings.");
