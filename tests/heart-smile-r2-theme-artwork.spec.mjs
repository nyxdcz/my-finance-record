import { test, expect } from "@playwright/test";

test("Finance completion heart uses the refreshed light and dark artwork", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
    document.body.innerHTML = `<main id="money"><img class="first-half-complete-icon" alt=""></main>`;
  });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/ui-icon-alignment-v15-0-5.css?v=heart-smile-r2-test" });

  const icon = page.locator(".first-half-complete-icon");
  await expect.poll(async () => icon.evaluate(node => getComputedStyle(node).content)).toContain("heart-smile-light-v15-2-4-r2.png");

  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await expect.poll(async () => icon.evaluate(node => getComputedStyle(node).content)).toContain("heart-smile-dark-v15-2-4-r2.png");
});
