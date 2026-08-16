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
});

test("recovery import review buttons respond while the privacy guard is locked", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=settings&settings=sync", { waitUntil:"networkidle" });
  await page.waitForFunction(() => typeof window.openSyncReview === "function" && Boolean(window.FinancePrivacyLock));

  await page.evaluate(() => {
    window.FinancePrivacyLock.lock();
    const current = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    window.__importReviewTestBundle = {
      format:"my-finance-v12-recovery",
      schemaVersion:12,
      appVersion:"15.2.2",
      exportedAt:new Date().toISOString(),
      sourceDevice:{ id:"playwright-recovery-source", name:"Playwright recovery source" },
      data:current
    };
  });

  const dialog = page.locator("#syncReviewDialog");
  const openReview = async () => {
    await page.evaluate(() => window.openSyncReview(window.__importReviewTestBundle));
    await expect(dialog).toBeVisible();
  };

  await openReview();
  await page.locator("#closeSyncReviewButton").click();
  await expect(dialog).not.toBeVisible();

  await openReview();
  await page.locator("#cancelSyncImportButton").click();
  await expect(dialog).not.toBeVisible();

  for (const selector of ["#mergeKeepCurrentButton", "#mergeUseIncomingButton", "#replaceWithIncomingButton"]) {
    await openReview();
    await page.locator(selector).click();
    await expect(dialog).not.toBeVisible();
  }
});
