import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appCssPath = path.join(root, "assets/css/app.css");
const browserTestPath = path.join(root, "tests/browser/workspace-active-tabs.spec.mjs");
const changelogPath = path.join(root, "CHANGELOG.md");

const marker = "/* Talaan · active workspace tabs */";
const activeCss = `\n\n${marker}\n:is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]),\n:is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]):hover,\n:is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]):focus-visible {\n  background:#356FD1 !important;\n  border-color:#356FD1 !important;\n  color:#FFFFFF !important;\n}\n\nhtml[data-theme=\"dark\"] :is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]),\nhtml[data-theme=\"dark\"] :is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]):hover,\nhtml[data-theme=\"dark\"] :is(.money-workspace-switcher, .project-workspace-switcher) .workspace-switcher-button:is(.active, [aria-selected=\"true\"]):focus-visible {\n  background:#356FD1 !important;\n  border-color:#356FD1 !important;\n  color:#FFFFFF !important;\n}\n`;

let appCss = fs.readFileSync(appCssPath, "utf8");
if (!appCss.includes(marker)) {
  appCss = `${appCss.trimEnd()}${activeCss}\n`;
  fs.writeFileSync(appCssPath, appCss);
}

const browserTest = `import { test, expect } from "@playwright/test";\n\ntest.use({ serviceWorkers:"block" });\n\nasync function unlock(page, email) {\n  await page.waitForFunction(() => typeof window.FinancePrivacyLock?.unlock === "function");\n  await page.evaluate(value => window.FinancePrivacyLock.unlock({ email:value }), email);\n}\n\nasync function expectReadableActiveTab(page, pageId, switcherSelector, tabPage) {\n  await page.setViewportSize({ width:1440, height:900 });\n  await page.goto(\`http://127.0.0.1:3000/index.html?page=\${pageId}\`, { waitUntil:"networkidle" });\n  await unlock(page, \`workspace-\${pageId}@example.invalid\`);\n  const tab = page.locator(\`\${switcherSelector} [data-workspace-page=\"\${tabPage}\"]\`).first();\n  await expect(tab).toBeVisible();\n  await expect(tab).toHaveAttribute("aria-selected", "true");\n  await expect(tab).toHaveCSS("background-color", "rgb(53, 111, 209)");\n  await expect(tab).toHaveCSS("color", "rgb(255, 255, 255)");\n  await tab.hover();\n  await expect(tab).toHaveCSS("background-color", "rgb(53, 111, 209)");\n  await expect(tab).toHaveCSS("color", "rgb(255, 255, 255)");\n  await tab.focus();\n  await expect(tab).toHaveCSS("background-color", "rgb(53, 111, 209)");\n  await expect(tab).toHaveCSS("color", "rgb(255, 255, 255)");\n}\n\ntest("Finance active workspace tab stays readable on hover and focus", async ({ page }) => {\n  await expectReadableActiveTab(page, "money", "#money .money-workspace-switcher", "money");\n});\n\ntest("Projects active workspace tab stays readable on hover and focus", async ({ page }) => {\n  await expectReadableActiveTab(page, "projects", "#projects .project-workspace-switcher", "projects");\n});\n`;
fs.writeFileSync(browserTestPath, browserTest);

let changelog = fs.readFileSync(changelogPath, "utf8");
const bullet = "- Styled the active Finance and Projects workspace tabs with Talaan blue `#356FD1` and persistent white text across hover, focus, and dark mode.";
if (!changelog.includes(bullet)) {
  const anchor = "- Replaced the remaining exact `#244770` and `#325279` shades with `#356FD1` across tracked source and runtime styles.";
  if (changelog.includes(anchor)) changelog = changelog.replace(anchor, `${anchor}\n${bullet}`);
  else changelog = changelog.replace("### Brand and PWA", `### Brand and PWA\n\n${bullet}`);
  fs.writeFileSync(changelogPath, changelog);
}

const skip = new Set([
  ".git",
  "node_modules",
  "playwright-report",
  "test-results"
]);
const ownFiles = new Set([
  path.normalize("scripts/migrations/workspace-active-blue.mjs"),
  path.normalize(".github/workflows/one-time-workspace-active-blue.yml")
]);
const textExt = new Set([".css", ".js", ".mjs", ".html", ".json", ".md", ".yml", ".yaml", ".webmanifest", ".txt", ".ts"]);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const rel = path.normalize(path.relative(root, full));
    if (ownFiles.has(rel) || !textExt.has(path.extname(entry.name))) continue;
    let text = fs.readFileSync(full, "utf8");
    const next = text
      .replaceAll("talaan4", "talaan5")
      .replaceAll("finance-v2-20260822-talaan-r4", "finance-v2-20260822-talaan-r5");
    if (next !== text) fs.writeFileSync(full, next);
  }
}
walk(root);

console.log("Workspace active tabs staged with #356FD1/white selected states and V2.0.1 cache generation r5/talaan5.");
