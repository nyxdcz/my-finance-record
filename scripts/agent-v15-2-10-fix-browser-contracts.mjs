import fs from "node:fs";

function update(file, transform) {
  const before = fs.readFileSync(file, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No browser-contract change applied to ${file}`);
  fs.writeFileSync(file, after);
}

update("tests/browser/pwa-upgrade-v15-0-5.spec.mjs", value => value
  .replace('test("V15.2.9 registers the cache-qualified worker and clears stale Finance caches"', 'test("V15.2.10 registers the cache-qualified worker and clears stale Finance caches"')
  .replace('toContain("v=15.2.9")', 'toContain("v=15.2.10")')
  .replace('cache=finance-v15-20260820-ui-asset-delivery-r45', 'cache=finance-v15-20260820-sidebar-icons-r46')
);

update("tests/sync/sync-status-v15-2-3.spec.mjs", value => value
  .replace('test("V15.2.9 release metadata is visible"', 'test("V15.2.10 release metadata is visible"')
  .replace('toHaveTitle(/V15\\.2\\.9/)', 'toHaveTitle(/V15\\.2\\.10/)')
  .replace('toContainText("V15.2.9")', 'toContainText("V15.2.10")')
);

update("tests/security/privacy-and-inputs.spec.mjs", value => {
  const marker = '  const body = page.locator("#monthlyBudgetPlannerBody");\n  if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();';
  const replacement = '  const body = page.locator("#monthlyBudgetPlannerBody");\n  await expect(card).toBeVisible();\n  await expect(toggle).toBeVisible();\n  if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();';
  if (!value.includes(marker)) throw new Error("Missing Monthly budget planner browser setup");
  return value.replace(marker, replacement);
});

update("tests/browser/more-tools-theme-alignment-v15-2-4.spec.mjs", value => {
  const marker = '  await expect(page.locator("#topbarToolsPanel")).toBeVisible();\n\n  const layout = await page.locator("#themeToggleButton").evaluate(button => {';
  const replacement = '  await expect(page.locator("#topbarToolsPanel")).toBeVisible();\n  const appearanceButton = page.locator("#themeToggleButton");\n  const searchButton = page.locator("#globalSearchButton");\n  await expect(appearanceButton).toBeVisible();\n  await expect(searchButton).toBeVisible();\n  await expect.poll(async () => page.evaluate(() => {\n    const appearanceIcon = document.querySelector("#themeToggleButton > .toolbar-icon");\n    const searchIcon = document.querySelector("#globalSearchButton > .toolbar-icon");\n    if (!appearanceIcon || !searchIcon) return Infinity;\n    return Math.abs(appearanceIcon.getBoundingClientRect().left - searchIcon.getBoundingClientRect().left);\n  })).toBeLessThanOrEqual(1);\n\n  const layout = await appearanceButton.evaluate(button => {';
  if (!value.includes(marker)) throw new Error("Missing More tools layout snapshot setup");
  return value.replace(marker, replacement);
});
