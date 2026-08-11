import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const privacyScript = path.join(root, "privacy-lock.js");
const appCss = fs.readFileSync(path.join(root, "app.css"), "utf8");
const sourceHtml = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace("</head>", `<style>${appCss}</style></head>`);
const testHtml = sourceHtml
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<script\b[^>]*\/?\s*>/gi, "")
  .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "");

async function loadStaticApp(page, viewport) {
  await page.setViewportSize(viewport);
  await page.setContent(testHtml, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.__privacyNav = [];
    window.goToPage = pageId => window.__privacyNav.push(pageId);
    window.activateSettingsPanel = panel => window.__privacyNav.push(`settings:${panel}`);
    window.showToast = message => { window.__privacyToast = message; };
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 393, height: 852 }
]) {
  test(`signed-out privacy lock at ${viewport.width}px`, async ({ page }) => {
    await loadStaticApp(page, viewport);
    await page.addScriptTag({ path: privacyScript });

    const initial = await page.evaluate(() => ({
      locked: document.body.classList.contains("finance-signed-out"),
      pending: document.body.classList.contains("finance-auth-pending"),
      underlying: getComputedStyle(document.querySelector("#money .page-heading")).display
    }));
    expect(initial).toEqual({ locked: true, pending: true, underlying: "none" });

    await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(false));
    const locked = await page.evaluate(() => {
      const money = document.getElementById("money");
      const fixture = document.createElement("button");
      fixture.textContent = "Mutate";
      let clicks = 0;
      fixture.addEventListener("click", () => { clicks += 1; });
      money.append(fixture);
      fixture.click();
      return {
        locked: document.body.classList.contains("finance-signed-out"),
        pending: document.body.classList.contains("finance-auth-pending"),
        privacyView: getComputedStyle(money.querySelector(":scope > .finance-privacy-lock-view")).display,
        underlying: getComputedStyle(money.querySelector(".page-heading")).display,
        zeros: [...money.querySelectorAll(".finance-privacy-lock-view strong")].map(node => node.textContent),
        mutationClicks: clicks,
        toast: window.__privacyToast || ""
      };
    });
    expect(locked.locked).toBe(true);
    expect(locked.pending).toBe(false);
    expect(locked.privacyView).not.toBe("none");
    expect(locked.underlying).toBe("none");
    expect(locked.zeros).toEqual(expect.arrayContaining(["₱0.00", "0"]));
    expect(locked.mutationClicks).toBe(0);
    expect(locked.toast).toContain("Sign in");

    await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true, { email: "signed@example.com" }));
    await expect.poll(() => page.evaluate(() => ({
      signedIn: document.body.classList.contains("finance-signed-in"),
      locked: document.body.classList.contains("finance-signed-out"),
      privacyView: getComputedStyle(document.querySelector("#money > .finance-privacy-lock-view")).display,
      underlyingVisible: getComputedStyle(document.querySelector("#money .page-heading")).display !== "none"
    }))).toEqual({ signedIn: true, locked: false, privacyView: "none", underlyingVisible: true });
  });
}

for (const viewport of [
  { width: 393, height: 852 },
  { width: 360, height: 800 }
]) {
  test(`phone form controls avoid focus zoom at ${viewport.width}px`, async ({ page }) => {
    await loadStaticApp(page, viewport);
    const result = await page.evaluate(() => {
      const host = document.createElement("div");
      host.innerHTML = `<input class="input" type="text"><input class="input" inputmode="decimal"><input class="input" type="date"><input class="input" type="password"><select class="select"><option>One</option></select><textarea class="textarea"></textarea><div contenteditable="true">Editable</div>`;
      document.body.append(host);
      const selector = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), select, textarea, [contenteditable="true"]';
      const fonts = [...document.querySelectorAll(selector)].map(node => Number.parseFloat(getComputedStyle(node).fontSize));
      return {
        minimumFont: Math.min(...fonts),
        viewport: document.querySelector('meta[name="viewport"]')?.content || ""
      };
    });
    expect(result.minimumFont).toBeGreaterThanOrEqual(16);
    expect(result.viewport).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(result.viewport).not.toMatch(/maximum-scale\s*=\s*1/i);
  });
}
