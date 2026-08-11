import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const privacyScript = path.join(root, "privacy-lock.js");
const projectAgendaScript = path.join(root, "projects-calendar-v13.0.20.js");
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

test("Projects keeps one complete agenda and refreshes external changes", async ({ page }) => {
  await page.route("https://app.test/**", route => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: testHtml
  }));
  await page.goto("https://app.test/");
  await page.evaluate(() => {
    const key = "simple-finance-project-calendar-v13.0.20";
    localStorage.setItem(key, JSON.stringify([
      { id:"agenda-later", title:"September presentation", type:"presentation", date:"2026-09-18", startTime:"14:00", endTime:"15:00" },
      { id:"agenda-earlier", title:"August meeting", type:"meeting", date:"2026-08-12", startTime:"09:00", endTime:"10:00" }
    ]));
    document.documentElement.dataset.financeAuth = "signed-in";
    document.body.classList.remove("finance-signed-out", "finance-auth-pending");
    document.body.classList.add("finance-signed-in");
    document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
    document.getElementById("projects")?.classList.add("active");
    window.__agendaChanges = [];
    window.addEventListener("finance:project-agenda-changed", event => window.__agendaChanges.push(event.detail));
  });
  await page.addScriptTag({ path: projectAgendaScript });

  const agenda = page.locator("#projectCalendarV13020");
  await expect(agenda.getByRole("heading", { name:"Project Agenda" })).toBeVisible();
  await expect(agenda.locator("[data-pc-calendar-grid], [data-pc-prev], [data-pc-next], [data-pc-today]")).toHaveCount(0);
  await expect(agenda.locator(".pc-event-card")).toHaveCount(2);
  await expect(agenda.locator(".pc-event-card h4")).toHaveText(["August meeting", "September presentation"]);
  await expect(agenda.locator("[data-pc-count]")).toHaveText("2 events");

  await agenda.locator("[data-pc-add]").click();
  await page.locator("#pcEventTitle").fill("October site visit");
  await page.locator("#pcEventType").selectOption("site-visit");
  await page.locator("#pcEventDate").fill("2026-10-05");
  await page.locator("#projectCalendarEventForm").evaluate(form => form.requestSubmit());
  await expect(agenda.locator(".pc-event-card")).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => ({
    saved:JSON.parse(localStorage.getItem("simple-finance-project-calendar-v13.0.20") || "[]").length,
    actions:window.__agendaChanges.map(item => item.action)
  }))).toEqual({ saved:3, actions:["created"] });

  await page.evaluate(() => {
    const key = "simple-finance-project-calendar-v13.0.20";
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    stored.push({ id:"agenda-external", title:"External deadline", type:"deadline", date:"2026-11-02" });
    const next = JSON.stringify(stored);
    localStorage.setItem(key, next);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue:next }));
  });
  await expect(agenda.locator(".pc-event-card")).toHaveCount(4);
  await expect(agenda.getByText("External deadline", { exact:true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__agendaChanges.at(-1)?.action)).toBe("external-refresh");
});

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
