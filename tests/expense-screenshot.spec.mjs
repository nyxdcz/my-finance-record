import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const parserScript = path.join(root, "expense-screenshot-parser.js");
const detectorScript = path.join(root, "expense-screenshot-detect.js");
const appCss = fs.readFileSync(path.join(root, "app.css"), "utf8");
const sourceHtml = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace("</head>", `<style>${appCss}</style></head>`);
const testHtml = sourceHtml
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<script\b[^>]*\/?\s*>/gi, "")
  .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "");

async function loadExpenseDialog(page, viewport = { width:900, height:760 }) {
  await page.setViewportSize(viewport);
  await page.setContent(testHtml, { waitUntil:"domcontentloaded" });
  await page.evaluate(() => {
    document.body.classList.remove("finance-signed-out", "finance-auth-pending");
    document.getElementById("expenseId").value = "";
    document.getElementById("expenseType").value = "normal";
    document.getElementById("expenseName").value = "";
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseAccount").innerHTML = `<option value="Cash">Cash</option><option value="GCash">GCash</option><option value="Maya">Maya</option><option value="UnionBank">UnionBank</option>`;
    document.getElementById("expenseAccount").value = "Cash";
    window.showToast = message => { window.__screenshotToast = message; };
  });
  await page.addScriptTag({ path:parserScript });
  await page.addScriptTag({ path:detectorScript });
  await page.evaluate(() => document.getElementById("expenseDialog").showModal());
  await expect(page.locator("#expenseScreenshotPanel")).toBeVisible();
}

test("detected screenshot details fill an empty Add Expense form after review", async ({ page }) => {
  await loadExpenseDialog(page);
  await page.evaluate(() => window.FinanceExpenseScreenshot.showResult({
    name:"ABC STORE",
    amount:599,
    account:"GCash",
    confidence:{ name:"high", amount:"high", account:"high" }
  }, "gcash-payment.png"));

  await expect(page.locator("#expenseScreenshotReview")).toBeVisible();
  await expect(page.locator("[data-expense-screenshot-field]:checked")).toHaveCount(3);
  await expect(page.locator("#expenseScreenshotFileName")).toHaveText("gcash-payment.png");

  await page.locator("#expenseScreenshotApply").click();
  await expect(page.locator("#expenseName")).toHaveValue("ABC STORE");
  await expect(page.locator("#expenseAmount")).toHaveValue("599.00");
  await expect(page.locator("#expenseAccount")).toHaveValue("GCash");
  await expect(page.locator("#expenseScreenshotStatusText")).toContainText("3 detected details applied");
});

test("existing expense values stay protected until the user explicitly selects replacements", async ({ page }) => {
  await loadExpenseDialog(page);
  await page.evaluate(() => {
    document.getElementById("expenseId").value = "existing-expense";
    document.getElementById("expenseName").value = "Rent";
    document.getElementById("expenseAmount").value = "1000.00";
    document.getElementById("expenseAccount").value = "Cash";
    window.FinanceExpenseScreenshot.showResult({
      name:"NEW MERCHANT",
      amount:120,
      account:"GCash",
      confidence:{ name:"high", amount:"high", account:"high" }
    }, "replacement.png");
  });

  await expect(page.locator("[data-expense-screenshot-field]:checked")).toHaveCount(0);
  await page.locator("#expenseScreenshotApply").click();
  await expect(page.locator("#expenseName")).toHaveValue("Rent");
  await expect(page.locator("#expenseAmount")).toHaveValue("1000.00");
  await expect(page.locator("#expenseAccount")).toHaveValue("Cash");

  await page.locator('[data-expense-screenshot-field="name"]').check();
  await page.locator('[data-expense-screenshot-field="amount"]').check();
  await page.locator('[data-expense-screenshot-field="account"]').check();
  await page.locator("#expenseScreenshotApply").click();
  await expect(page.locator("#expenseName")).toHaveValue("NEW MERCHANT");
  await expect(page.locator("#expenseAmount")).toHaveValue("120.00");
  await expect(page.locator("#expenseAccount")).toHaveValue("GCash");
});

test("phone screenshot review stays inside the dialog with touch-sized actions", async ({ page }) => {
  await loadExpenseDialog(page, { width:393, height:852 });
  await page.evaluate(() => window.FinanceExpenseScreenshot.showResult({
    name:"Coffee Shop",
    amount:185.5,
    account:"Maya",
    confidence:{ name:"medium", amount:"high", account:"high" }
  }, "maya.png"));

  const panel = page.locator("#expenseScreenshotPanel");
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(393);
  for (const button of await panel.locator(".button").all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(42);
  await expect(page.locator("#expenseScreenshotStatusText")).toHaveAttribute("role", "status");
});
