import { test, expect } from "@playwright/test";
import fs from "node:fs";

const source = name => fs.readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");

test.use({ serviceWorkers:"block" });

test("rectangular UI surfaces use 7px while structural and circular shapes stay intentional", async ({ page }) => {
  await page.setViewportSize({ width:1280, height:800 });
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(() => {
    document.body.innerHTML = `
      <div class="card" id="card">Card</div>
      <div class="summary-card" id="summaryCard">Summary</div>
      <button class="button" id="button">Button</button>
      <button class="month-nav-button" id="monthButton">Month</button>
      <div class="month-control" id="monthControl">Control</div>
      <input id="input" value="1">
      <select id="select"><option>One</option></select>
      <textarea id="textarea">Text</textarea>
      <div class="context-menu" id="contextMenu">Menu</div>
      <div class="topbar-tools-panel" id="panel">Panel</div>
      <dialog id="dialog" open>Dialog</dialog>
      <div class="legend-item" id="legendItem">Legend</div>
      <div class="month-comparison-item" id="comparisonItem">Comparison</div>
      <div class="ledger-transfer-preview" id="ledgerPreview">Ledger</div>
      <div class="month-status-chip" id="pill">Pill</div>
      <div class="avatar" id="avatar">A</div>
      <div class="structural-join" id="join">Join</div>`;
  });

  await page.addStyleTag({ content:`
    #pill { border-radius:999px; }
    #avatar { width:32px; height:32px; border-radius:50%; }
    #join { border-radius:0; }
  ` });
  await page.addStyleTag({ url:"http://127.0.0.1:3000/ui-radius.css?v=2.2.0-talaan1" });

  for (const selector of [
    "#card", "#summaryCard", "#button", "#monthButton", "#monthControl",
    "#input", "#select", "#textarea", "#contextMenu", "#panel", "#dialog",
    "#legendItem", "#comparisonItem", "#ledgerPreview"
  ]) {
    await expect(page.locator(selector)).toHaveCSS("border-radius", "7px");
  }

  await expect(page.locator("#pill")).toHaveCSS("border-radius", "999px");
  await expect(page.locator("#avatar")).toHaveCSS("border-radius", "50%");
  await expect(page.locator("#join")).toHaveCSS("border-radius", "0px");
});

test("runtime summary layer imports the canonical radius stylesheet", () => {
  expect(source("summary-mascots.css")).toContain('@import url("./ui-radius.css?v=2.2.0-talaan1")');
  expect(source("ui-radius.css")).toContain("--talaan-ui-radius: 7px");
  expect(source("ui-radius.css")).toContain("--radius: 7px");
  expect(source("ui-radius.css")).toContain("--desktop-panel-radius: 7px");
  expect(source("ui-radius.css")).toContain("--desktop-inner-radius: 7px");
  expect(source("ui-radius.css")).toContain("--liquid-glass-radius: 7px");
});
