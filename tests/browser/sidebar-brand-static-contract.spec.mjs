import { test, expect } from "@playwright/test";

test("Sidebar Brand ownership contract is static", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/index.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect((html.match(/<strong>My Finance Records<\/strong>/g) || []).length).toBe(1);
});
