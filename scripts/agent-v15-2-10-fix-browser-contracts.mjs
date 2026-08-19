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
