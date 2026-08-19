import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
if (version.version !== "15.2.9") process.exit(0);

const replaceIn = (file, replacements) => {
  const target = path.join(root, file);
  let value = fs.readFileSync(target, "utf8");
  for (const [from, to] of replacements) value = value.replaceAll(from, to);
  fs.writeFileSync(target, value);
};

replaceIn("index.html", [
  ['const APP_RELEASE_NAME = "Application Help Module Extraction";', 'const APP_RELEASE_NAME = "UI Asset Delivery Hotfix";'],
  ['const APP_RELEASE_DATE = "August 19, 2026";', 'const APP_RELEASE_DATE = "August 20, 2026";']
]);

const visit = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
      let value = fs.readFileSync(full, "utf8");
      value = value.replaceAll("## 15.2.9 · 2026-08-19", "## 15.2.9 · 2026-08-20");
      value = value.replaceAll("V15.2.9 · UI Asset Delivery Hotfix · August 19, 2026", "V15.2.9 · UI Asset Delivery Hotfix · August 20, 2026");
      fs.writeFileSync(full, value);
    }
  }
};
visit(path.join(root, "tests"));

console.log("Normalized V15.2.9 release pins.");
