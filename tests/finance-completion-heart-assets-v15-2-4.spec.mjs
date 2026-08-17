import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

const EXPECTED = {
  light:"1bbfc55061177f3afccb85371fb69fa600addff9fca6dbbccaae71028644da1f",
  dark:"8a3d04ac167510232f44fa183ac704778b46f87df6d5c0125c0e9b8da606a80d"
};

async function assetSha256(request, path) {
  const response = await request.get(`http://127.0.0.1:3000${path}`, { headers:{ "cache-control":"no-cache" } });
  expect(response.ok()).toBeTruthy();
  return createHash("sha256").update(await response.body()).digest("hex");
}

test("Finance completion hearts use the exact clean uploaded PNGs", async ({ request }) => {
  expect(await assetSha256(request, "/icons/heart-smile-light-v15-2-4-r3.png")).toBe(EXPECTED.light);
  expect(await assetSha256(request, "/icons/heart-smile-dark-v15-2-4-r3.png")).toBe(EXPECTED.dark);

  const cssResponse = await request.get("http://127.0.0.1:3000/ui-icon-alignment-v15-0-5.css", { headers:{ "cache-control":"no-cache" } });
  expect(cssResponse.ok()).toBeTruthy();
  const css = await cssResponse.text();
  expect(css).toContain('heart-smile-light-v15-2-4-r3.png');
  expect(css).toContain('heart-smile-dark-v15-2-4-r3.png');
  expect(css).not.toMatch(/heart-smile-(?:light|dark)-v15-2-4-r2\.png/);
});
