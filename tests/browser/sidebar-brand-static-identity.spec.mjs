import { test, expect } from "@playwright/test";

test("static sidebar brand matches application name", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/index.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('<meta name="application-name" content="My Finance Records">');
  expect(html).toContain('<strong>My Finance Records</strong>');
});
