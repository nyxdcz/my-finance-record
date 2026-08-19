import fs from "node:fs";

const generatorFile = "scripts/agent-v15-2-10-sidebar-icons.mjs";
let generator = fs.readFileSync(generatorFile, "utf8");
const from = 'page.goto(\\`${base}/?page=\\${route}\\`';
const to = 'page.goto(\\`\\${base}/?page=\\${route}\\`';
if (!generator.includes(from) && !generator.includes(to)) throw new Error("Missing generated Playwright URL template");
generator = generator.replace(from, to);
fs.writeFileSync(generatorFile, generator);

const inspectorFile = "tests/helpers/inspect-project.mjs";
let inspector = fs.readFileSync(inspectorFile, "utf8");
inspector = inspector.replaceAll("V15.2.9", "V15.2.10");
inspector = inspector.replaceAll("15.2.9 · 2026-08-20", "15.2.10 · 2026-08-20");
fs.writeFileSync(inspectorFile, inspector);
