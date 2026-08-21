import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const QUERY = "15.2.24-mascot5";

let changed = 0;
const writeIfChanged = (target, content) => {
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (fs.existsSync(target) && Buffer.compare(next, fs.readFileSync(target)) === 0) return false;
  fs.writeFileSync(target, next);
  changed += 1;
  return true;
};

const copyRuntime = (source, target) => {
  const from = path.join(root, source);
  const to = path.join(root, target);
  if (!fs.existsSync(from)) throw new Error(`Missing mascot runtime source: ${source}`);
  writeIfChanged(to, fs.readFileSync(from));
};

const patch = (file, transform) => {
  const target = path.join(root, file);
  const current = fs.readFileSync(target, "utf8");
  writeIfChanged(target, transform(current));
};

copyRuntime("assets/css/summary-mascots-v15-2-25.css", "summary-mascots-v15-2-25.css");
copyRuntime("assets/js/ui/summary-mascots-v15-2-25.js", "summary-mascots-v15-2-25.js");

patch("index.html", source => {
  let next = source;
  const cssTag = `<link rel="stylesheet" href="./summary-mascots-v15-2-25.css?v=${QUERY}">`;
  const jsTag = `<script src="./summary-mascots-v15-2-25.js?v=${QUERY}"></script>`;

  if (/summary-mascots-v15-2-25\.css\?v=[^"]+/.test(next)) {
    next = next.replace(/summary-mascots-v15-2-25\.css\?v=[^"]+/, `summary-mascots-v15-2-25.css?v=${QUERY}`);
  } else {
    next = next.replace(
      /(<link rel="stylesheet" href="\.\/production-ui-audit-v15-2-13\.css\?v=[^"]+">)/,
      `$1\n  ${cssTag}`
    );
  }

  if (/summary-mascots-v15-2-25\.js\?v=[^"]+/.test(next)) {
    next = next.replace(/summary-mascots-v15-2-25\.js\?v=[^"]+/, `summary-mascots-v15-2-25.js?v=${QUERY}`);
  } else {
    next = next.replace(
      /(<script src="\.\/phone-finance-compat\.js\?v=[^"]+"><\/script>)/,
      `$1\n  ${jsTag}`
    );
  }
  return next;
});

patch("sw.js", source => {
  let next = source;
  const cssEntry = `asset("./summary-mascots-v15-2-25.css?v=${QUERY}"),`;
  const jsEntry = `asset("./summary-mascots-v15-2-25.js?v=${QUERY}"),`;
  const mascotEntries = [
    'asset("./assets/mascots/mascot-red.svg"),',
    'asset("./assets/mascots/mascot-green.svg"),',
    'asset("./assets/mascots/mascot-blue.svg"),',
    'asset("./assets/mascots/mascot-orange.svg"),'
  ];

  if (/asset\("\.\/summary-mascots-v15-2-25\.css\?v=[^"]+"\),/.test(next)) {
    next = next.replace(/asset\("\.\/summary-mascots-v15-2-25\.css\?v=[^"]+"\),/, cssEntry);
  } else {
    next = next.replace(
      /(\s+asset\("\.\/production-ui-audit-v15-2-13\.css\?v=[^"]+"\),)/,
      `$1\n  ${cssEntry}`
    );
  }

  if (/asset\("\.\/summary-mascots-v15-2-25\.js\?v=[^"]+"\),/.test(next)) {
    next = next.replace(/asset\("\.\/summary-mascots-v15-2-25\.js\?v=[^"]+"\),/, jsEntry);
  } else {
    next = next.replace(
      /(\s+asset\("\.\/phone-finance-compat\.js\?v=[^"]+"\),)/,
      `$1\n  ${jsEntry}`
    );
  }

  if (!next.includes(mascotEntries[0])) {
    next = next.replace(
      `  ${jsEntry}`,
      `  ${jsEntry}\n  ${mascotEntries.join("\n  ")}`
    );
  }
  return next;
});

console.log(`Budget summary mascot runtime ready${changed ? ` · refreshed ${changed}` : ""}.`);
