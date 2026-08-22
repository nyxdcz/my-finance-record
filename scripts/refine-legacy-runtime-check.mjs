import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const target = path.join(root, "tests/helpers/inspect-project.mjs");
let source = fs.readFileSync(target, "utf8");
source = source.replace(
  'const versionedRuntimeFilenamePattern = /-v(?:1[345])(?:[-.]|\\b)/i;',
  'const versionedRuntimeFilenamePattern = /-v(?:1[345])(?:[-.][A-Za-z0-9.-]+)?\\.(?:css|js|png|svg)\\b/i;'
);
fs.writeFileSync(target, source);
console.log("Repository inspector now distinguishes legacy runtime assets from compatibility identifiers.");
