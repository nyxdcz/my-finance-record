import { test, expect } from "@playwright/test";
import fs from "node:fs";

const root = name => fs.readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");

// Source-level ownership: the shell owns the visible brand and the updater stays DOM-free.
test("sidebar brand is static and PWA updater is DOM-free", () => {
  const index = root("index.html");
  const updater = root("pwa-update-v15-0-5.js");
  expect(index).toContain("<strong>My Finance Records</strong>");
  expect(index).not.toContain("<strong>Records</strong>");
  expect(updater).not.toMatch(/installSidebarBrand|querySelector|\bdocument\b/);
  expect(updater).toContain("root.FinancePwaUpdate = api");
});
