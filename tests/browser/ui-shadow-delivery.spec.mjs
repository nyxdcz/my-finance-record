import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

test("canonical UI shadow contract is published to the runtime", async ({ request }) => {
  const radiusResponse = await request.get("http://127.0.0.1:3000/ui-radius.css?v=2.5.0-talaan2");
  expect(radiusResponse.ok()).toBeTruthy();
  const radiusCss = await radiusResponse.text();
  expect(radiusCss).toContain("--shadow-level-0: none");
  expect(radiusCss).toContain("--shadow-level-2: 0 8px 24px");
  expect(radiusCss).toContain("#dashboard :is(.card,.dashboard-detail-card)");

  const summaryResponse = await request.get("http://127.0.0.1:3000/summary-mascots.css?v=2.5.0-talaan1");
  expect(summaryResponse.ok()).toBeTruthy();
  expect(await summaryResponse.text()).toContain('@import url("./ui-radius.css?v=2.5.0-talaan2")');

  const workerResponse = await request.get("http://127.0.0.1:3000/sw.js");
  expect(workerResponse.ok()).toBeTruthy();
  const worker = await workerResponse.text();
  expect(worker).toContain('asset("./ui-radius.css?v=2.5.0-talaan2")');
  expect(worker).toContain('url.pathname.endsWith("ui-radius.css")');
});
