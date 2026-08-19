import fs from "node:fs";

const generatorFile = "scripts/agent-v15-2-10-sidebar-icons.mjs";
let generator = fs.readFileSync(generatorFile, "utf8");
const from = 'page.goto(\\`${base}/?page=\\${route}\\`';
const to = 'page.goto(\\`\\${base}/?page=\\${route}\\`';
if (!generator.includes(from) && !generator.includes(to)) throw new Error("Missing generated Playwright URL template");
generator = generator.replace(from, to);
const broadEscapedVersionRewrite = '        value = value.replaceAll(`15\\\\.2\\\\.9`, `15\\\\.2\\\\.10`);\n';
if (!generator.includes(broadEscapedVersionRewrite)) throw new Error("Missing broad escaped-version rewrite");
generator = generator.replace(broadEscapedVersionRewrite, "");
fs.writeFileSync(generatorFile, generator);

const inspectorFile = "tests/helpers/inspect-project.mjs";
let inspector = fs.readFileSync(inspectorFile, "utf8");
inspector = inspector.replaceAll("V15.2.9", "V15.2.10");
inspector = inspector.replaceAll("15.2.9 · 2026-08-20", "15.2.10 · 2026-08-20");
fs.writeFileSync(inspectorFile, inspector);

const consistencyFile = "tests/regression/validate-desktop-ui-consistency-v15-1-0.mjs";
let consistency = fs.readFileSync(consistencyFile, "utf8");
const oldIndexAssertion = 'assert.match(index, /data-page="reports"[^>]*data-nav-label="Insights"[\\s\\S]*?<span class="nav-icon"><img class="nav-icon-image" src="\\.\\/icons\\/sidebar-insights-v14-0-24\\.png\\?v=15\\.2\\.9-icon1"/);';
const oldCssAssertion = 'assert.match(dashboard, /data-page="reports"\\] \\.nav-icon-image\\{content:url\\("\\.\\/icons\\/sidebar-insights-v14-0-24\\.png"\\)\\}/);';
if (!consistency.includes(oldIndexAssertion)) throw new Error("Missing legacy Insights URL assertion");
if (!consistency.includes(oldCssAssertion)) throw new Error("Missing legacy Insights CSS content assertion");
consistency = consistency.replace(oldIndexAssertion, 'assert.equal((index.match(/<img class="nav-icon-image" src="data:image\\/png;base64,[^\"]+" alt="">/g) || []).length, 5);');
consistency = consistency.replace(oldCssAssertion, 'assert.doesNotMatch(dashboard, /nav-icon-image\\{content:url/);');
consistency = consistency.replaceAll("sync-config.js?v=15.2.9-release1", "sync-config.js?v=15.2.10-release1");
fs.writeFileSync(consistencyFile, consistency);
