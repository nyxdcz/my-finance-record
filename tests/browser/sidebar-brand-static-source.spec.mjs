import { test, expect } from "@playwright/test";

test("sidebar brand is present in static HTML before application scripts execute", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3000/index.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('<div class="brand">\n        <strong>My Finance Records</strong>\n      </div>');
  expect(html).not.toContain('<strong>Records</strong>');
});
