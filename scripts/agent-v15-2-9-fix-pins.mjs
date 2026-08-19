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

const sidebarRegexPins = [
  [String.raw`sidebar-overview\.png"`, String.raw`sidebar-overview\.png\?v=15\.2\.9-icon1"`],
  [String.raw`sidebar-finance\.png"`, String.raw`sidebar-finance\.png\?v=15\.2\.9-icon1"`],
  [String.raw`sidebar-work\.png"`, String.raw`sidebar-work\.png\?v=15\.2\.9-icon1"`],
  [String.raw`sidebar-settings\.png"`, String.raw`sidebar-settings\.png\?v=15\.2\.9-icon1"`],
  [String.raw`sidebar-insights-v14-0-24\.png"`, String.raw`sidebar-insights-v14-0-24\.png\?v=15\.2\.9-icon1"`]
];
const legacyCssFallbackPin = [
  String.raw`data-page="reports"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-insights-v14-0-24\.png\?v=15\.2\.9-icon1"\)\}`,
  String.raw`data-page="reports"\] \.nav-icon-image\{content:url\("\.\/icons\/sidebar-insights-v14-0-24\.png"\)\}`
];
const escapedReleasePins = [
  [String.raw`15\.2\.8`, String.raw`15\.2\.9`],
  [String.raw`ui-icon-alignment-v15-0-5\.css\?v=15\.2\.4-ui1`, String.raw`ui-icon-alignment-v15-0-5\.css\?v=15\.2\.9-ui2`],
  [String.raw`budget-planning\.css\?v=15\.1\.0-desktop3`, String.raw`budget-planning\.css\?v=15\.2\.9-ui1`]
];

const visit = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
      let value = fs.readFileSync(full, "utf8");
      value = value.replaceAll("## 15.2.9 · 2026-08-19", "## 15.2.9 · 2026-08-20");
      value = value.replaceAll("V15.2.9 · UI Asset Delivery Hotfix · August 19, 2026", "V15.2.9 · UI Asset Delivery Hotfix · August 20, 2026");
      for (const [from, to] of escapedReleasePins) value = value.replaceAll(from, to);
      for (const [from, to] of sidebarRegexPins) value = value.replaceAll(from, to);
      value = value.replaceAll(...legacyCssFallbackPin);
      fs.writeFileSync(full, value);
    }
  }
};
visit(path.join(root, "tests"));

// The action wrapper lives inside the header, so keep the card's third column
// reserved for it while positioning the nested wrapper into that reserved area.
replaceIn("assets/css/budget-planning.css", [[
`  html body #monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-actions {
    position:static;
    grid-column:3;
    grid-row:1;
    top:auto;
    right:auto;
    margin:0;
    transform:none;
    align-self:center;
    justify-content:center;
  }`,
`  html body #monthlyBudgetPlannerCard.is-planner-collapsed .budget-planner-actions {
    position:absolute;
    top:50%;
    right:8px;
    margin:0;
    transform:translateY(-50%);
    align-self:center;
    justify-content:center;
    z-index:1;
  }`
], [
  "grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 40px;",
  "grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 44px;"
], [
  "grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 44px;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed #monthlyBudgetPlannerToggle {\n    width:44px !important;",
  "grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr) 48px;\n  }\n  html body #monthlyBudgetPlannerCard.is-planner-collapsed #monthlyBudgetPlannerToggle {\n    width:44px !important;"
]]);

// Keep the screenshot-specific cases deterministic against the same local app.
{
  const file = path.join(root, "tests/browser/ui-asset-delivery-v15-2-9.spec.mjs");
  if (fs.existsSync(file)) {
    let value = fs.readFileSync(file, "utf8");
    if (!value.includes('test.describe.configure({ mode:"serial" });')) {
      value = value.replace(
        'const base = "http://127.0.0.1:3000";\n',
        'const base = "http://127.0.0.1:3000";\n\ntest.describe.configure({ mode:"serial" });\n'
      );
    }
    fs.writeFileSync(file, value);
  }
}

// Git's whitespace gate should not depend on Markdown hard-break spaces.
{
  const file = path.join(root, "README.md");
  const value = fs.readFileSync(file, "utf8").split("\n").map(line => line.replace(/[ \t]+$/u, "")).join("\n");
  fs.writeFileSync(file, value);
}

console.log("Normalized V15.2.9 release, asset pins, disclosure spacing, and Markdown whitespace.");
