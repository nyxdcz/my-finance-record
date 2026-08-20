import { test, expect } from "@playwright/test";

test("sidebar brand has one static owner", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/index.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect((html.match(/My Finance Records/g) || []).length).toBeGreaterThanOrEqual(2);
});
