import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function update(relative, transform) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, "utf8");
  const next = transform(source);
  if (next !== source) fs.writeFileSync(file, next);
}

update("index.html", source => source
  .replaceAll("V11 recovery copy", "Legacy recovery copy")
  .replaceAll("Download V11 copy", "Download legacy copy")
  .replaceAll("Restore V11 copy", "Restore legacy copy")
  .replaceAll("Reading V11 records", "Reading legacy records")
  .replaceAll("finance-v11-recovery-", "finance-legacy-recovery-")
  .replaceAll("V11 recovery copy downloaded", "Legacy recovery copy downloaded"));

update("scripts/prepare-runtime.mjs", source => source
  .replace(/\n\s*\.replace\(\/Version 15\\\\\.\\\\d\+\\\\\.\\\\d\+\/g, RELEASE\.displayVersion\);/, ";")
  .replace(/\n\s*\.replace\(\/Version 15\\\.\\d\+\\\.\\d\+\/g, RELEASE\.displayVersion\);/, ";"));

update("tests/helpers/inspect-project.mjs", source => source
  .replace(/\\bV\(\?:12\|13\|14\|15\)/g, "\\bV(?:11|12|13|14|15)")
  .replace(/\\bV\(\?:12\|13\|14\|15\)\(\?:\\\\\.\\\\d\+\)\*/g, "\\bV(?:11|12|13|14|15)(?:\\.\\d+)*")
  .replace("Prepared index still contains legacy product-version terminology", "Prepared index still contains legacy product-version terminology"));

console.log("Current-facing terminology finalized without modifying legacy storage identifiers.");
