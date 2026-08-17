import { test, expect } from "@playwright/test";

const EXPECTED = {
  light:"1bbfc55061177f3afccb85371fb69fa600addff9fca6dbbccaae71028644da1f",
  dark:"8a3d04ac167510232f44fa183ac704778b46f87df6d5c0125c0e9b8da606a80d"
};

async function sha256(page, path) {
  return page.evaluate(async assetPath => {
    const response = await fetch(assetPath, { cache:"no-store" });
    if (!response.ok) throw new Error(`Could not load ${assetPath}: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
  }, path);
}

test("Finance completion hearts use the exact clean uploaded PNGs", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/index.html", { waitUntil:"domcontentloaded" });

  await expect.poll(() => sha256(page, "/icons/heart-smile-light-v15-2-4-r3.png")).toBe(EXPECTED.light);
  await expect.poll(() => sha256(page, "/icons/heart-smile-dark-v15-2-4-r3.png")).toBe(EXPECTED.dark);

  const css = await (await page.request.get("http://127.0.0.1:3000/ui-icon-alignment-v15-0-5.css", { headers:{ "cache-control":"no-cache" } })).text();
  expect(css).toContain('heart-smile-light-v15-2-4-r3.png');
  expect(css).toContain('heart-smile-dark-v15-2-4-r3.png');
  expect(css).not.toMatch(/heart-smile-(?:light|dark)-v15-2-4-r2\.png/);
});
