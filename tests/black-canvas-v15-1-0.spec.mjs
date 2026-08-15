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
      const paid = document.createElement("button");
      paid.className = "button button-paid";
      paid.textContent = "Mark paid";
      document.body.appendChild(paid);
      const paidStyle = getComputedStyle(paid);
      const available = document.createElement("section");
      available.id = "availableMoneySection";
      const spend = document.createElement("button");
      spend.className = "button button-secondary button-small account-spend-button";
      const spendLabel = document.createElement("span");
      spendLabel.textContent = "Spend";
      spend.appendChild(spendLabel);
      available.appendChild(spend);
      document.body.appendChild(available);
      const spendStyle = getComputedStyle(spendLabel);
      return {
        bg:root.getPropertyValue("--bg").trim(),
        primary:root.getPropertyValue("--primary").trim(),
        bodyBg:body.backgroundColor,
        paidBg:paidStyle.backgroundColor,
        paidBorder:paidStyle.borderTopColor,
        paidColor:paidStyle.color,
        spendColor:spendStyle.color
      };
    });
    expect(result.bg).toBe("#000000");
    expect(result.primary).toBe("#173e76");
    expect(result.bodyBg).toBe("rgb(0, 0, 0)");
    expect(result.paidBg).toBe("rgb(23, 62, 118)");
    expect(result.paidBorder).toBe("rgb(23, 62, 118)");
    expect(result.paidColor).toBe("rgb(255, 255, 255)");
    expect(result.spendColor).toBe("rgb(255, 255, 255)");
    await context.close();
  });
}
