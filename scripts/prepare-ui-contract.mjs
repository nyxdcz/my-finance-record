import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const UI_CONTRACT_QUERY = "2.5.0-talaan2";

const writeIfChanged = (target, content) => {
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (fs.existsSync(target) && Buffer.compare(next, fs.readFileSync(target)) === 0) return false;
  fs.writeFileSync(target, next);
  return true;
};

const patchTextFile = (file, transform) => {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) throw new Error(`Missing UI contract runtime file: ${file}`);
  const current = fs.readFileSync(target, "utf8");
  return writeIfChanged(target, transform(current));
};

const sourceRadius = path.join(root, "assets", "css", "ui-radius.css");
const runtimeRadius = path.join(root, "ui-radius.css");
if (!fs.existsSync(sourceRadius)) throw new Error("Missing canonical UI contract: assets/css/ui-radius.css");

let changed = 0;
if (writeIfChanged(runtimeRadius, fs.readFileSync(sourceRadius))) changed += 1;

if (patchTextFile("summary-mascots.css", source => source.replace(
  /\.\/ui-radius\.css\?v=[^"')]+/g,
  `./ui-radius.css?v=${UI_CONTRACT_QUERY}`
))) changed += 1;

if (patchTextFile("sw.js", source => {
  let next = source;
  const runtimeAsset = `asset("./ui-radius.css?v=${UI_CONTRACT_QUERY}")`;

  if (!next.includes('asset("./ui-radius.css?')) {
    next = next.replace(
      /(\s+asset\("\.\/summary-mascots\.css\?v=[^"]+"\),)/,
      `$1\n  ${runtimeAsset},`
    );
  } else {
    next = next.replace(
      /asset\("\.\/ui-radius\.css\?v=[^"]+"\)/g,
      runtimeAsset
    );
  }

  if (!next.includes('url.pathname.endsWith("ui-radius.css")')) {
    next = next.replace(
      'url.pathname.endsWith("summary-mascots.css") ||',
      'url.pathname.endsWith("summary-mascots.css") || url.pathname.endsWith("ui-radius.css") ||'
    );
  }

  return next;
})) changed += 1;

console.log(`Talaan UI contract runtime ready${changed ? ` · refreshed ${changed}` : ""}.`);
