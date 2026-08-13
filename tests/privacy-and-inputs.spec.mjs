import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const privacyScript = path.join(root, "privacy-lock.js");
const interactionScript = path.join(root, "interaction-patterns.js");
const projectAgendaScript = path.join(root, "projects-calendar-v13.0.20.js");
const appCss = fs.readFileSync(path.join(root, "app.css"), "utf8");
const dashboardInteractionCss = fs.readFileSync(path.join(root, "dashboard-interactions.css"), "utf8");
const mobileCss = fs.readFileSync(path.join(root, "mobile-v14-0-23.css"), "utf8");
const projectAgendaCss = fs.readFileSync(path.join(root, "projects-calendar-v13.0.20.css"), "utf8");
const sourceHtml = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace("</head>", `<style>${appCss}\n${dashboardInteractionCss}\n${projectAgendaCss}\n${mobileCss}</style></head>`);
const testHtml = sourceHtml
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<script\b[^>]*\/?\s*>/gi, "")
  .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, "");

async function loadStaticApp(page, viewport) {
  await page.setViewportSize(viewport);
  await page.setContent(testHtml, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ path:interactionScript });
  await page.evaluate(() => {
    window.__privacyNav = [];
    window.goToPage = pageId => window.__privacyNav.push(pageId);
    window.activateSettingsPanel = panel => window.__privacyNav.push(`settings:${panel}`);
    window.showToast = message => { window.__privacyToast = message; };

    const patterns = window.FinanceInteractionPatterns;
    const weekTrack = document.getElementById("dashboardWeekMarqueeTrack");
    const weekDays = Array.from({ length:7 }, (_, index) => `<span class="dashboard-week-day">Day ${index + 1}</span>`).join("");
    patterns.renderDuplicatedMarquee(weekTrack, weekDays);
    ["incomeFinanceWeekMarqueeTrack","financeWeekMarqueeTrack","paidFinanceWeekMarqueeTrack"].forEach(id => patterns.renderDuplicatedMarquee(document.getElementById(id), weekDays));

    const dashboard = document.getElementById("dashboard");
    const grid = document.getElementById("dashboardCardGrid");
    const cards = [...grid.querySelectorAll("[data-dashboard-card]")];
    const order = cards.map(card => card.dataset.dashboardCard);
    const labels = Object.fromEntries(cards.map(card => [card.dataset.dashboardCard, card.querySelector("h3")?.textContent?.trim() || card.dataset.dashboardCard]));
    const dragController = patterns.createDashboardDragController({
      dashboard, grid, labels, getOrder:() => order,
      commitMove:() => {}, announcer:document.getElementById("dashboardDragAnnouncer")
    });
    cards.forEach(card => dragController.createHandle(card, card.dataset.dashboardCard));
    window.__dashboardDragController = dragController;
  });
}

async function contrastRatio(locator) {
  return locator.evaluate(node => {
    const parse = value => {
      const values = (value.match(/[\d.]+/g) || []).map(Number);
      return { rgb:values.slice(0, 3), alpha:values[3] ?? 1 };
    };
    const luminance = rgb => {
      const channels = rgb.map(value => {
        const normalized = value / 255;
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const foreground = parse(getComputedStyle(node).color).rgb;
    let backgroundNode = node;
    let background = parse(getComputedStyle(backgroundNode).backgroundColor);
    while (background.alpha === 0 && backgroundNode.parentElement) {
      backgroundNode = backgroundNode.parentElement;
      background = parse(getComputedStyle(backgroundNode).backgroundColor);
    }
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background.rgb);
    return (Math.max(foregroundLuminance, backgroundLuminance) + .05) / (Math.min(foregroundLuminance, backgroundLuminance) + .05);
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 393, height: 852 }
]) {
  test(`signed-out privacy lock at ${viewport.width}px`, async ({ page }) => {
    await loadStaticApp(page, viewport);
    await page.evaluate(() => {
      window.__safeSettingsClicks = { help:0, storage:0 };
      const help = document.createElement("button");
      help.id = "privacyHelpFixture";
      help.dataset.helpKey = "settings-page";
      help.addEventListener("click", () => { window.__safeSettingsClicks.help += 1; });
      document.body.append(help);
      document.getElementById("requestPersistenceButton")?.addEventListener("click", () => { window.__safeSettingsClicks.storage += 1; });
    });
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

    const settingsPrivacy = await page.evaluate(() => {
      document.getElementById("privacyHelpFixture")?.click();
      document.getElementById("requestPersistenceButton")?.click();
      return {
        safeClicks:window.__safeSettingsClicks,
        note:Boolean(document.querySelector(".finance-settings-privacy-note")),
        pdf:getComputedStyle(document.getElementById("pdfPackFile").closest("[data-finance-private-settings]")).display,
        reminders:getComputedStyle(document.getElementById("reminderStatusChip").closest("[data-finance-private-settings]")).display
      };
    });
    expect(settingsPrivacy).toEqual({ safeClicks:{ help:1, storage:1 }, note:true, pdf:"none", reminders:"none" });

    await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true, { email: "signed@example.com" }));
    await expect.poll(() => page.evaluate(() => ({
      signedIn: document.body.classList.contains("finance-signed-in"),
      locked: document.body.classList.contains("finance-signed-out"),
      privacyView: getComputedStyle(document.querySelector("#money > .finance-privacy-lock-view")).display,
      underlyingVisible: getComputedStyle(document.querySelector("#money .page-heading")).display !== "none"
    }))).toEqual({ signedIn: true, locked: false, privacyView: "none", underlyingVisible: true });
  });
}

test("phone paid rows, Settings devices, and conflict review stay compact and reachable", async ({ page }) => {
  await loadStaticApp(page, { width:393, height:852 });
  await page.evaluate(() => {
    document.body.classList.remove("finance-signed-out", "finance-auth-pending");
    document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
    document.getElementById("paid-expenses").classList.add("active");
    document.getElementById("paidExpenseList").innerHTML = `<div class="record-row" data-paid-expense-row="fixture"><div class="record-title"><strong>Gloan</strong><div class="record-statuses"><span class="status-badge ui-pill">Paid</span><span class="status-badge">One-time</span></div></div><div data-label="Paid date">Aug 3, 2026</div><div data-label="Paid from">Wallet</div><div class="amount" data-label="Amount">₱3,447.00</div><div class="mobile-record-actions"><button class="button">Move to unpaid</button><div class="record-more-menu"><button class="button overflow-menu-trigger" aria-label="More actions for Gloan" aria-haspopup="menu">⋮</button></div></div></div>`;
    const settings = document.getElementById("settings");
    settings.insertAdjacentHTML("beforeend", `<table class="cloud-device-table"><thead><tr><th>Device</th></tr></thead><tbody><tr><td data-label="Device"><strong>nyco's iPhone</strong><details class="device-platform-details"><summary>Browser details</summary><small>Long mobile browser identification string</small></details></td><td data-label="Status"><span class="v12-chip">Current</span></td><td data-label="App">V14.0.23</td><td data-label="Last seen">Aug 13, 2026</td><td data-label="Action">—</td></tr></tbody></table>`);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="cloud-conflict-review-dialog" open><div class="modal-header"><strong>Account: Metrobank</strong><button class="button">Resolve later</button></div><div class="modal-body"><div class="cloud-conflict-comparison"><div class="cloud-conflict-comparison-head">Header</div><div class="cloud-conflict-comparison-row"><strong>Icon</strong><span data-label="This device">Local icon</span><span data-label="Cloud version">Cloud icon</span></div></div></div><div class="cloud-conflict-review-footer"><button class="button">Download both</button><button class="button">Resolve later</button><button class="button">Use cloud version</button><button class="button">Use this device</button></div></dialog>`);
  });

  const paidRow = page.locator("[data-paid-expense-row='fixture']");
  await expect(paidRow.locator("[aria-haspopup='menu']")).toHaveCount(1);
  expect(await paidRow.evaluate(node => node.innerText.split("\n").filter(text => text.trim() === ":").length)).toBe(0);
  const actionTargets = await paidRow.locator(".mobile-record-actions .button").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(Math.min(...actionTargets)).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => {
    document.getElementById("paid-expenses").classList.remove("active");
    document.getElementById("settings").classList.add("active");
  });
  const deviceTable = page.locator("#settings .cloud-device-table");
  await expect(deviceTable.locator("thead")).toBeHidden();
  expect(await deviceTable.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(deviceTable.locator("summary")).toHaveText("Browser details");

  const dialog = page.locator(".cloud-conflict-review-dialog");
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(393);
  await expect(dialog.locator("[data-label='This device']")).toBeVisible();
  await expect(dialog.locator("[data-label='Cloud version']")).toBeVisible();
  for (const button of await dialog.locator(".button").all()) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
});

test("Projects provides compact, full-view, completed, and externally refreshed agenda states", async ({ page }) => {
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
  await expect(agenda.locator(".pc-event-card .pc-event-title")).toHaveText(["August meeting", "September presentation"]);
  await expect(agenda.locator("[data-pc-count]")).toHaveText("2 upcoming · 0 completed");

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
  await expect(agenda.locator(".pc-event-card")).toHaveCount(3);
  await expect(agenda.locator("[data-pc-count]")).toHaveText("4 upcoming · 0 completed");
  await expect.poll(() => page.evaluate(() => window.__agendaChanges.at(-1)?.action)).toBe("external-refresh");

  await agenda.locator("[data-pc-view]").first().click();
  const fullAgenda = page.locator("#projectAgendaFullDialog");
  await expect(fullAgenda).toBeVisible();
  await expect(fullAgenda.locator("[data-pc-full-upcoming] .pc-event-card")).toHaveCount(4);
  await expect(fullAgenda.getByText("External deadline", { exact:true })).toBeVisible();
  await fullAgenda.locator('[data-pc-complete="agenda-earlier"]').click();
  await expect(fullAgenda.locator("[data-pc-full-upcoming] .pc-event-card")).toHaveCount(3);
  await expect(fullAgenda.locator("[data-pc-full-completed] .pc-event-card")).toHaveCount(1);
  await expect(agenda.locator("[data-pc-count]")).toHaveText("3 upcoming · 1 completed");
  await expect.poll(() => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("simple-finance-project-calendar-v13.0.20") || "[]");
    return Boolean(stored.find(item => item.id === "agenda-earlier")?.completedAt);
  })).toBe(true);
});

test("responsive sidebar keeps one consistent desktop control and the mobile drawer", async ({ page }) => {
  await loadStaticApp(page, { width:1440, height:900 });
  const sidebar = page.locator("#sidebar");
  const menuButton = page.locator("#menuButton");
  const railButton = page.locator("#sidebarCloseButton");
  await expect(sidebar).toHaveCSS("width", "64px");
  await expect(page.locator(".main")).toHaveCSS("margin-left", "64px");
  await expect(menuButton).toBeHidden();
  await expect(railButton).toBeVisible();
  await expect(railButton).toHaveAttribute("aria-label", "Pin navigation open");
  await expect(page.locator("#menuButton:visible, #sidebarCloseButton:visible")).toHaveCount(1);

  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  const activeContrast = await sidebar.locator(".nav-button.active").evaluate(node => {
    const parseRgb = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = rgb => {
      const channels = rgb.map(value => {
        const normalized = value / 255;
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const style = getComputedStyle(node);
    const foreground = luminance(parseRgb(style.color));
    const background = luminance(parseRgb(style.backgroundColor));
    return {
      ratio:(Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05),
      color:style.color,
      background:style.backgroundColor
    };
  });
  expect(activeContrast.ratio).toBeGreaterThanOrEqual(4.5);
  expect(activeContrast).toMatchObject({ color:"rgb(16, 42, 49)", background:"rgb(223, 244, 232)" });
  await expect(sidebar.locator(".nav-button.active .nav-icon")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(sidebar.locator(".nav-icon-image")).toHaveCount(4);
  await expect(sidebar.locator('.nav-button[data-page="reports"] .nav-icon')).toHaveCount(0);
  await expect(sidebar.locator('.nav-button[data-page="reports"]')).toBeHidden();

  const dashboardLabel = sidebar.locator('.nav-button[data-page="dashboard"] .nav-label');
  const overviewIcon = sidebar.locator('.nav-button[data-page="dashboard"] .nav-icon-image');
  const compactIconBox = await overviewIcon.boundingBox();
  const compactRailControlBox = await railButton.boundingBox();
  await expect(dashboardLabel).toHaveCSS("max-width", "0px");
  await sidebar.evaluate(node => node.classList.add("desktop-open"));
  await expect(sidebar).toHaveCSS("width", "245px");
  await expect(sidebar.locator('.nav-button[data-page="reports"]')).toBeVisible();
  await expect(page.locator(".main")).toHaveCSS("margin-left", "64px");
  await expect(dashboardLabel).toHaveCSS("max-width", "170px");
  const expandedIconBox = await overviewIcon.boundingBox();
  const expandedRailControlBox = await railButton.boundingBox();
  expect(expandedIconBox).toMatchObject({ x:compactIconBox.x, y:compactIconBox.y });
  expect(expandedRailControlBox).toMatchObject({ x:compactRailControlBox.x, y:compactRailControlBox.y });
  expect(await dashboardLabel.evaluate(node => getComputedStyle(node).transitionDuration)).not.toBe("0s");
  await sidebar.evaluate(node => node.classList.remove("desktop-open"));

  await sidebar.evaluate(node => node.classList.add("desktop-open", "sidebar-pinned"));
  await page.evaluate(() => document.body.classList.add("sidebar-layout-pinned"));
  await expect(sidebar).toHaveCSS("width", "245px");
  await expect(page.locator(".main")).toHaveCSS("margin-left", "245px");
  await expect(sidebar.locator('.nav-button[data-page="dashboard"] .nav-label')).toHaveCSS("opacity", "1");
  await expect(sidebar.locator(".nav-group-label")).toHaveCount(0);
  await expect(sidebar.locator(".sidebar-navigation")).toHaveCSS("gap", "4px");

  await page.setViewportSize({ width:393, height:852 });
  await sidebar.evaluate(node => { node.classList.remove("desktop-open", "sidebar-pinned"); node.classList.add("open"); });
  await page.evaluate(() => document.body.classList.remove("sidebar-layout-pinned"));
  await expect(sidebar).toHaveCSS("width", "245px");
  await expect(page.locator(".main")).toHaveCSS("margin-left", "0px");
  await expect(menuButton).toBeVisible();
  await expect(railButton).toBeVisible();
  await expect(sidebar.locator('.nav-button[data-page="dashboard"] .nav-label')).toHaveCSS("opacity", "1");
});

test("dark theme keeps representative controls and labels readable", async ({ page }) => {
  await loadStaticApp(page, { width:1440, height:900 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.getElementById("settings-tab-app").setAttribute("aria-selected", "true");
  });
  for (const selector of [
    "#installPwaButton",
    "#settings-tab-app",
    "#pwaInstallGuideChip",
    "label[for='pdfPackFile']",
    "#resetData"
  ]) {
    expect(await contrastRatio(page.locator(selector)), selector).toBeGreaterThanOrEqual(4.5);
  }
});

test("Settings overview stays compact and responsive", async ({ page }) => {
  await loadStaticApp(page, { width:1200, height:900 });
  await page.evaluate(() => {
    document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
    document.getElementById("settings").classList.add("active");
  });
  const settings = page.locator("#settings");
  const rows = settings.locator(".settings-status-card");
  await expect(rows).toHaveCount(5);
  await expect(settings.locator(".settings-nav-group")).toHaveText(["Start", "Your data", "Protection", "App"]);
  await expect(settings.locator(".settings-overview-grid")).toHaveCSS("grid-template-columns", /.+ .+/);
  await expect(settings.locator("#settingsSearchButton")).toBeVisible();
  await expect(settings.locator("#settingsSearchPanel")).toBeHidden();
  await settings.locator("#settingsSearchPanel").evaluate(node => { node.hidden = false; });
  await expect(settings.locator("#settingsSearchInput")).toBeVisible();
  await expect(settings.locator(".settings-search-results")).toHaveCSS("grid-template-columns", /.+ .+/);
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute("type", "button");
    expect((await row.boundingBox())?.height || 0).toBeLessThanOrEqual(100);
  }

  await page.setViewportSize({ width:393, height:852 });
  await expect(settings.locator(".settings-overview-grid")).toHaveCSS("grid-template-columns", "1fr");
  expect(await settings.locator(".settings-search-results").evaluate(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("history actions stay compact on desktop and move into mobile More tools", async ({ page }) => {
  await loadStaticApp(page, { width:1200, height:900 });
  await expect(page.locator("#undoMoneyButton")).toBeVisible();
  await expect(page.locator("#redoMoneyButton")).toBeVisible();
  await expect(page.locator("#undoMoneyButton")).toBeDisabled();
  await expect(page.locator("#redoMoneyButton")).toBeDisabled();
  await page.setViewportSize({ width:393, height:852 });
  await expect(page.locator(".topbar-history-actions")).toBeHidden();
  await page.locator("#topbarToolsTrigger").click();
  await expect(page.locator("#topbarToolsTrigger")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#undoMoneyMenuButton")).toBeVisible();
  await expect(page.locator("#redoMoneyMenuButton")).toBeVisible();
});

test("expense editing keeps overflow helpers available to the live application", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("http://127.0.0.1:3000/?page=money", { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  const financeGroups = page.locator("#financeWeekMarqueeTrack > .dashboard-week-marquee-group");
  await expect(financeGroups).toHaveCount(2);
  await expect(page.locator("#financeWeekMarqueeTrack")).toHaveCSS("animation-name", "dashboard-week-marquee");
  await page.locator("#expenseCategoryFilter").selectOption("Subscriptions");
  const activeChip = page.locator("#expenseActiveFilterChips .ui-chip");
  await expect(activeChip).toContainText("Category: Subscriptions");
  await expect(page.locator("#expenseFiltersPanel .ui-badge")).toHaveJSProperty("tagName", "SPAN");
  await expect(activeChip.locator(".ui-chip-remove")).toHaveAttribute("aria-label", "Remove Category: Subscriptions filter");
  await activeChip.locator(".ui-chip-remove").click();
  await expect(page.locator("#expenseCategoryFilter")).toHaveValue("");
  await expect(page.locator(".record-row .ui-tag").first()).toBeVisible();
  await expect(page.locator(".record-row .ui-pill").first()).toBeVisible();
  await page.locator("#topbarToolsTrigger").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#topbarToolsTrigger")).toBeFocused();
  expect(await page.locator("#topbarToolsTrigger").evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await page.locator("[data-edit-expense]").first().click();
  const name = page.locator("#expenseName");
  await expect(name).toBeVisible();
  const originalName = await name.inputValue();
  await name.fill(`${originalName} edited`);
  await page.locator("#saveExpenseButton").click();
  await expect(page.locator("#expenseDialog")).not.toHaveAttribute("open", "");
  await expect(page.locator("#toast .toast-message")).not.toContainText(/closeOverflowMenu|setupOverflowMenus/);
  expect(pageErrors.filter(message => /closeOverflowMenu|setupOverflowMenus/.test(message))).toEqual([]);
  await page.locator("#topbarToolsTrigger").click();
  await expect(page.locator("#topbarToolsPanel")).toBeVisible();
});

test("collapsed Monthly budget plan is compact and keeps native control semantics", async ({ page }) => {
  await page.setViewportSize({ width:1200, height:900 });
  await page.goto("http://127.0.0.1:3000/?page=money", { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  const card = page.locator("#monthlyBudgetPlannerCard");
  const toggle = page.locator("#monthlyBudgetPlannerToggle");
  const body = page.locator("#monthlyBudgetPlannerBody");
  if (await toggle.getAttribute("aria-expanded") === "true") await toggle.click();
  await expect(card).toHaveClass(/is-planner-collapsed/);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-controls", "monthlyBudgetPlannerBody");
  await expect(body).toBeVisible();
  await expect(card.locator(".budget-planner-grid")).toBeHidden();
  expect((await card.boundingBox())?.height || Infinity).toBeLessThanOrEqual(90);
  await expect(card.locator(".budget-plan-kpi:visible")).toHaveCount(3);
  expect(await card.locator(".budget-plan-kpi:visible small").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === "none"))).toBe(true);
  await toggle.click();
  await expect(card.locator(".budget-planner-grid")).toBeVisible();
  await expect(page.locator("#budgetTemplateSelect")).toHaveJSProperty("tagName", "SELECT");
  await expect(page.locator('label[for="budgetTemplateSelect"]')).toHaveText("Budget template");
  await expect(page.locator("#buildBudgetFromExpenses")).toHaveJSProperty("tagName", "BUTTON");
  await expect(page.locator("#addBudgetItem")).toHaveJSProperty("tagName", "BUTTON");

  await toggle.click();
  await page.setViewportSize({ width:393, height:852 });
  await expect(toggle).toHaveCSS("width", "44px");
  await expect(toggle).toHaveCSS("height", "44px");
  expect((await card.boundingBox())?.height || Infinity).toBeLessThanOrEqual(130);
  await expect(card.locator(".budget-plan-kpi:visible")).toHaveCount(3);
});

test("Toast uses a pausable live status and persistent warnings", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/", { waitUntil:"networkidle" });
  const toast = page.locator("#toast");
  const dismiss = page.locator("#toastDismissButton");
  await expect(toast).toHaveAttribute("role", "status");
  await expect(toast).toHaveAttribute("aria-live", "polite");
  await expect(dismiss).toHaveAttribute("aria-label", "Dismiss notification");
  await page.evaluate(() => window.showToast("Budget saved", "success"));
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveAttribute("data-persistent", "false");
  await toast.hover();
  await page.waitForTimeout(4300);
  await expect(toast).toHaveClass(/show/);
  await page.mouse.move(10, 10);
  await expect(toast).not.toHaveClass(/show/, { timeout:4500 });
  await page.evaluate(() => window.showToast("Review this warning", "warning"));
  await expect(toast).toHaveAttribute("data-persistent", "true");
  await page.waitForTimeout(4300);
  await expect(toast).toHaveClass(/show/);
  await dismiss.focus();
  await expect(dismiss).toBeFocused();
  await dismiss.click();
  await expect(toast).not.toHaveClass(/show/);
});

test("desktop sidebar stays expanded until the pointer leaves", async ({ page }) => {
  await page.setViewportSize({ width:1200, height:900 });
  await page.goto("http://127.0.0.1:3000/?page=money", { waitUntil:"networkidle" });
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  const sidebar = page.locator("#sidebar");
  await expect(sidebar).toHaveCSS("width", "64px");
  await sidebar.locator('.nav-button[data-page="dashboard"]').click();
  await expect(sidebar).toHaveCSS("width", "245px");
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(sidebar).toHaveCSS("width", "245px");
  await page.mouse.move(700, 400);
  await expect(sidebar).toHaveCSS("width", "64px");
});

test("Dashboard marquee, menu controls, progress, and drag handles use accessible semantics", async ({ page }) => {
  await loadStaticApp(page, { width:1200, height:900 });

  const hamburger = page.locator("#menuButton");
  await expect(hamburger).toHaveAttribute("aria-controls", "sidebar");
  await expect(hamburger).toHaveAttribute("aria-expanded", "false");

  const more = page.locator("#topbarToolsTrigger");
  await expect(more).toHaveAttribute("aria-haspopup", "menu");
  await expect(more).toHaveAttribute("aria-controls", "topbarToolsPanel");
  await more.click();
  await expect(page.locator("#topbarToolsPanel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  const groups = page.locator("#dashboardWeekMarqueeTrack > .dashboard-week-marquee-group");
  await expect(groups).toHaveCount(2);
  const duplicated = await groups.evaluateAll(nodes => nodes.length === 2 && nodes[0].innerHTML === nodes[1].innerHTML);
  expect(duplicated).toBe(true);
  await expect(groups.nth(1)).toHaveAttribute("aria-hidden", "true");
  const financeGroups = page.locator("#financeWeekMarqueeTrack > .dashboard-week-marquee-group");
  await expect(financeGroups).toHaveCount(2);
  expect(await financeGroups.evaluateAll(nodes => nodes[0].innerHTML === nodes[1].innerHTML)).toBe(true);
  await expect(page.locator("#incomeFinanceWeekMarqueeTrack > .dashboard-week-marquee-group")).toHaveCount(2);
  await expect(page.locator("#paidFinanceWeekMarqueeTrack > .dashboard-week-marquee-group")).toHaveCount(2);
  await expect(page.locator("#dashPaymentProgress")).toHaveJSProperty("tagName", "PROGRESS");

  const handles = page.locator("[data-dashboard-drag]");
  await expect(handles).toHaveCount(10);
  for (const handle of await handles.all()) {
    await expect(handle).toHaveAttribute("draggable", "true");
    await expect(handle).not.toHaveAttribute("aria-grabbed", /.+/);
  }
  await expect(page.locator("#dashboardDragAnnouncer")).toHaveAttribute("aria-live", "polite");
});

test("desktop marquees match the Finance tabs and phone layouts remove them", async ({ page }) => {
  await loadStaticApp(page, { width:1200, height:900 });
  await page.evaluate(() => document.body.classList.remove("finance-signed-out", "finance-auth-pending"));
  const financeTabs = page.locator("#money .money-workspace-switcher");
  const financeMarquee = page.locator("#financeWeekMarquee");
  await expect(financeTabs).toBeVisible();
  await expect(financeMarquee).toBeVisible();
  await expect(financeTabs).toHaveCSS("height", "43px");
  await expect(financeMarquee).toHaveCSS("height", "43px");
  const [tabsBox, marqueeBox] = await Promise.all([financeTabs.boundingBox(), financeMarquee.boundingBox()]);
  expect(marqueeBox.y).toBe(tabsBox.y);

  await page.evaluate(() => {
    document.getElementById("money").classList.remove("active");
    document.getElementById("dashboard").classList.add("active");
  });
  await expect(page.locator("#dashboardWeekMarquee")).toHaveCSS("height", "43px");

  await page.setViewportSize({ width:393, height:852 });
  for (const id of ["dashboardWeekMarquee","incomeFinanceWeekMarquee","financeWeekMarquee","paidFinanceWeekMarquee"]) {
    await expect(page.locator(`#${id}`)).toBeHidden();
  }
});

test("reduced motion stops the one-week marquee", async ({ page }) => {
  await page.emulateMedia({ reducedMotion:"reduce" });
  await loadStaticApp(page, { width:1200, height:900 });
  await expect(page.locator("#dashboardWeekMarqueeTrack")).toHaveCSS("animation-name", "none");
  await expect(page.locator("#dashboardWeekMarqueeTrack > [aria-hidden='true']")).toBeHidden();
  await expect(page.locator("#financeWeekMarqueeTrack")).toHaveCSS("animation-name", "none");
  await expect(page.locator("#financeWeekMarqueeTrack > [aria-hidden='true']")).toBeHidden();
  await expect(page.locator("#incomeFinanceWeekMarqueeTrack")).toHaveCSS("animation-name", "none");
  await expect(page.locator("#paidFinanceWeekMarqueeTrack")).toHaveCSS("animation-name", "none");
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
