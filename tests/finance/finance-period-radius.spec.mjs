import { test, expect } from "@playwright/test";

test("Talaan V2.3.0 Finance period headers and expense rows use 9px corners", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"networkidle" });

  await page.evaluate(() => {
    const money = document.getElementById("money");
    if (!money) throw new Error("Money page fixture missing");
    const fixture = document.createElement("section");
    fixture.id = "periodRadiusFixture";
    fixture.className = "period-card";
    fixture.innerHTML = `<div class="period-header">Period header</div><div class="record-row">Expense row</div>`;
    money.appendChild(fixture);
  });

  const radiusOf = selector => page.locator(selector).evaluate(element => ({
    topLeft:getComputedStyle(element).borderTopLeftRadius,
    topRight:getComputedStyle(element).borderTopRightRadius,
    bottomRight:getComputedStyle(element).borderBottomRightRadius,
    bottomLeft:getComputedStyle(element).borderBottomLeftRadius
  }));

  for (const selector of [
    "#periodRadiusFixture",
    "#periodRadiusFixture .period-header",
    "#periodRadiusFixture .record-row"
  ]) {
    expect(await radiusOf(selector)).toEqual({
      topLeft:"9px",
      topRight:"9px",
      bottomRight:"9px",
      bottomLeft:"9px"
    });
  }
});
