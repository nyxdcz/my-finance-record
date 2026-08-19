import fs from "node:fs";
const file = "scripts/agent-v15-2-10-sidebar-icons.mjs";
let value = fs.readFileSync(file, "utf8");
const from = 'page.goto(\\`${base}/?page=\\${route}\\`';
const to = 'page.goto(\\`\\${base}/?page=\\${route}\\`';
if (!value.includes(from) && !value.includes(to)) throw new Error("Missing generated Playwright URL template");
value = value.replace(from, to);
fs.writeFileSync(file, value);
