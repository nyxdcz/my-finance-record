import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const config = read("sync-config.js");
const runtime = read("assets/js/ui/sync-runtime-compat.js");
const index = read("index.html");
const serviceWorker = read("sw.js");
const prepareRuntime = read("scripts/prepare-runtime.mjs");
const version = JSON.parse(read("version.json"));

if (!config.includes("window.FINANCE_SYNC_CONFIG")) throw new Error("sync-config.js must expose FINANCE_SYNC_CONFIG.");
for (const runtimeMarker of ["MutationObserver", "applyTalaanReleaseLayer", "loadExpenseScreenshotTools", "document.createElement(\"style\")"]) {
  if (config.includes(runtimeMarker)) throw new Error(`sync-config.js still contains runtime marker: ${runtimeMarker}`);
}
for (const expectedMarker of ["applyTalaanReleaseLayer", "loadExpenseScreenshotTools", "MutationObserver"]) {
  if (!runtime.includes(expectedMarker)) throw new Error(`sync-runtime-compat.js is missing runtime marker: ${expectedMarker}`);
}
if (!prepareRuntime.includes('"sync-runtime-compat.js"')) throw new Error("prepare-runtime must map sync-runtime-compat.js to the flat runtime root.");

const configPosition = index.indexOf("./sync-config.js?v=2.0.1-talaan1");
const runtimePosition = index.indexOf("./sync-runtime-compat.js?v=2.0.1-talaan1");
if (configPosition < 0 || runtimePosition < 0 || runtimePosition <= configPosition) {
  throw new Error("index.html must load sync-config.js before the Talaan sync-runtime compatibility layer.");
}

const expectedCache = "finance-v2-20260822-talaan-r1";
if (version.version !== "2.0.1") throw new Error(`Unexpected Talaan app version: ${version.version}`);
if (version.schemaVersion !== 12 || version.cloudSchemaVersion !== 3) throw new Error("Talaan versioning must not change finance/cloud schema versions.");
if (version.cacheVersion !== expectedCache) throw new Error(`Unexpected cache version: ${version.cacheVersion}`);
if (!serviceWorker.includes(`const CACHE_VERSION = "${expectedCache}";`)) throw new Error("Service worker cache identity is not synchronized.");
if (!serviceWorker.includes("./sync-config.js?v=2.0.1-talaan1")) throw new Error("Service worker must precache the Talaan sync configuration file.");
if (!serviceWorker.includes("./sync-runtime-compat.js?v=2.0.1-talaan1")) throw new Error("Service worker must precache the Talaan sync runtime compatibility file.");
if (!index.includes(`const APP_CACHE_VERSION = "${expectedCache}";`)) throw new Error("index.html cache identity is not synchronized.");
if (!index.includes("Talaan · V2.0.1")) throw new Error("Prepared index title is not Talaan V2.0.1.");
if (runtime.includes("window.FINANCE_SYNC_CONFIG")) throw new Error("sync runtime compatibility file must not own hosted sync configuration.");

console.log("Sync configuration separation validated under Talaan V2.0.1.");