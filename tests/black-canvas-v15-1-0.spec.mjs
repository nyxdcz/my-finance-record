import { test, expect } from "@playwright/test";
for (const theme of ["light","dark"]) {
  test(`V15.1.0 Black Canvas uses exact palette in ${theme} appearance`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled:false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });
    await page.locator("html").evaluate((element, value) => { element.dataset.theme = value; }, theme);
    const result = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return { bg:root.getPropertyValue("--bg").trim(), primary:root.getPropertyValue("--primary").trim(), bodyBg:body.backgroundColor };
    });
    expect(result.bg).toBe("#000000");
    expect(result.primary).toBe("#173e76");
    expect(result.bodyBg).toBe("rgb(0, 0, 0)");
    await context.close();
  });
}
