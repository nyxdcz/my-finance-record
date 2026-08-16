import { test, expect } from "@playwright/test";
import fs from "node:fs";

const privacySource = fs.readFileSync(new URL("../privacy-lock.js", import.meta.url), "utf8");

const allowedRecoveryControls = [
  "label[for='importSyncBundleInput']",
  "#importSyncBundleInput",
  "#closeSyncReviewButton",
  "#cancelSyncImportButton",
  "#mergeKeepCurrentButton",
  "#mergeUseIncomingButton",
  "#replaceWithIncomingButton"
];

test("recovery import controls are explicitly allowed through the signed-out privacy guard", async () => {
  for (const selector of allowedRecoveryControls) expect(privacySource).toContain(selector);
  expect(privacySource).toContain("runRecoveryImportAction");
  expect(privacySource).toContain("window.applyPendingSyncImport");
});

test("recovery import review actions execute and persist while the privacy guard is locked", async ({ page }) => {
  const url = "http://127.0.0.1:3000/index.html?page=settings&settings=sync";
  await page.goto(url, { waitUntil:"networkidle" });
  await page.waitForFunction(() => typeof window.openSyncReview === "function" && typeof window.buildBundle === "function" && Boolean(window.FinancePrivacyLock));

  const dialog = page.locator("#syncReviewDialog");
  const lock = async () => page.evaluate(() => window.FinancePrivacyLock.lock());
  const openReview = async (name, amount) => {
    await page.evaluate(({ name, amount }) => {
      const bundle = window.buildBundle("my-finance-v12-recovery");
      bundle.exportedAt = new Date().toISOString();
      bundle.sourceDevice = { id:`playwright-${name}`, name:"Playwright recovery source" };
      bundle.data.accounts = { ...(bundle.data.accounts || {}), [name]:amount };
      window.openSyncReview(bundle);
    }, { name, amount });
    await expect(dialog).toBeVisible();
  };
  const expectPersisted = async (name, amount) => {
    await expect.poll(() => page.evaluate(name => Number(window.buildBundle().data.accounts?.[name]), name)).toBe(amount);
    await page.reload({ waitUntil:"networkidle" });
    await page.waitForFunction(() => typeof window.buildBundle === "function" && Boolean(window.FinancePrivacyLock));
    await expect.poll(() => page.evaluate(name => Number(window.buildBundle().data.accounts?.[name]), name)).toBe(amount);
  };

  await lock();
  await openReview("Import close guard", 11);
  await page.locator("#closeSyncReviewButton").click();
  await expect(dialog).not.toBeVisible();

  await lock();
  await openReview("Import cancel guard", 12);
  await page.locator("#cancelSyncImportButton").click();
  await expect(dialog).not.toBeVisible();

  const actions = [
    ["#mergeKeepCurrentButton", "Import merge current", 101.01],
    ["#mergeUseIncomingButton", "Import merge incoming", 202.02],
    ["#replaceWithIncomingButton", "Import replace", 303.03]
  ];

  for (const [selector, name, amount] of actions) {
    await lock();
    await openReview(name, amount);
    await page.locator(selector).click();
    await expect(dialog).not.toBeVisible();
    await expectPersisted(name, amount);
  }
});
