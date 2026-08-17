import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content);

let css = read("app.css");
const marker = "/* V15.2.3 · Cloud Sync status colors match supplied icon artwork */";
const at = css.indexOf(marker);
if (at >= 0) css = `${css.slice(0, at).trimEnd()}\n`;
write("app.css", css);

let syncConfig = read("sync-config.js");
syncConfig = syncConfig.replace('window.FINANCE_RELEASE_OVERRIDE = { version:VERSION, name:RELEASE_NAME, released:"2026-08-16" };', 'window.FINANCE_RELEASE_OVERRIDE = { version:VERSION, name:RELEASE_NAME, released:"2026-08-17" };');
write("sync-config.js", syncConfig);

let sw = read("sw.js");
const iconAnchor = '  asset("./icons/sync-success-v14-0-23.png"),\n';
const newIcons = '  asset("./icons/sync-needs-sync-v15-2-3.png"),\n  asset("./icons/sync-issue-offline-v15-2-3.png"),\n  asset("./icons/sync-syncing-v15-2-3.png"),\n  asset("./icons/sync-synced-v15-2-3.png"),\n';
if (!sw.includes('sync-needs-sync-v15-2-3.png')) {
  if (!sw.includes(iconAnchor)) throw new Error("sw.js sync icon anchor missing");
  sw = sw.replace(iconAnchor, `${iconAnchor}${newIcons}`);
}
write("sw.js", sw);

console.log("Applied V15.2.3 maintainability and offline icon fixes.");
