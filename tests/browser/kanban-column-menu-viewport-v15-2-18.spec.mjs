import fs from "node:fs";
import { test, expect } from "@playwright/test";

test.use({ serviceWorkers:"block" });

async function unlock(page, email) {
  await page.waitForFunction(() => typeof window.FinancePrivacyLock?.unlock === "function");
  await page.evaluate(value => window.FinancePrivacyLock.unlock({ email:value }), email);
}

async function installFixture(page, { top, right, width, panelWidth, scrollLeft }) {
  await page.evaluate(({ top, right, width, panelWidth, scrollLeft }) => {
    document.getElementById("kanbanMenuViewportFixture")?.remove();
    const board = document.createElement("div");
    board.id = "kanbanMenuViewportFixture";
    board.className = "finance-kanban-board";
    board.style.cssText = `position:fixed;top:${top}px;right:${right}px;width:${width}px;height:72px;overflow-x:auto;overflow-y:hidden;z-index:2100;background:var(--surface);`;
    board.innerHTML = `
      <div style="position:relative;min-width:900px;height:64px;">
        <div class="kanban-column-menu overflow-menu" style="position:absolute;left:842px;top:14px;">
          <button id="kanbanViewportTrigger" class="button button-secondary button-small overflow-menu-trigger" type="button" aria-label="Manage test column" aria-haspopup="menu" aria-controls="kanbanViewportPanel" aria-expanded="false">⋮</button>
          <div id="kanbanViewportPanel" class="record-more-panel" role="menu" aria-label="Manage test column" hidden style="width:${panelWidth}px;">
            <button id="kanbanViewportFirst" type="button" role="menuitem">Rename or recolor</button>
            <button id="kanbanViewportSecond" type="button" role="menuitem">Move left</button>
            <button id="kanbanViewportThird" type="button" role="menuitem">Move right</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(board);
    board.scrollLeft = scrollLeft;
  }, { top, right, width, panelWidth, scrollLeft });
}

async function panelState(page) {
  return page.evaluate(() => {
    const panel = document.getElementById("kanbanViewportPanel");
    const rect = panel.getBoundingClientRect();
    return {
      hidden:panel.hidden,
      expanded:document.getElementById("kanbanViewportTrigger").getAttribute("aria-expanded"),
      position:getComputedStyle(panel).position,
      placement:panel.dataset.viewportPlacement || "",
      left:rect.left,
      right:rect.right,
      top:rect.top,
      bottom:rect.bottom,
      width:rect.width,
      height:rect.height,
      viewportWidth:innerWidth,
      viewportHeight:innerHeight
    };
  });
}

test("Kanban menu compatibility is shipped through the network-first updater and runtime preparation", () => {
  const updater = fs.readFileSync("assets/js/pwa-update-v15-0-5.js", "utf8");
  const runtime = fs.readFileSync("scripts/prepare-runtime.mjs", "utf8");
  const compat = fs.readFileSync("assets/js/ui/kanban-menu-compat.js", "utf8");
  expect(updater).toContain("kanban-menu-compat.js?v=15.2.18-kanban-menu1");
  expect(runtime).toContain('"kanban-menu-compat.js"');
  expect(compat).toContain('panel.style.setProperty("position", "fixed", "important")');
  expect(compat).toContain("spaceAbove > spaceBelow");
  expect(compat).toContain('root.addEventListener("resize", scheduleSync)');
});

test("desktop Kanban column menu flips above, stays inside the viewport, and keeps keyboard behavior", async ({ page }) => {
  await page.setViewportSize({ width:1280, height:720 });
  await page.goto("http://127.0.0.1:3000/index.html?page=projects", { waitUntil:"networkidle" });
  await unlock(page, "kanban-menu-desktop@example.invalid");
  await page.waitForFunction(() => Boolean(window.FinanceKanbanMenuCompat));
  await installFixture(page, { top:642, right:8, width:330, panelWidth:240, scrollLeft:570 });

  await page.locator("#kanbanViewportTrigger").click();
  await expect.poll(() => panelState(page)).toMatchObject({ hidden:false, expanded:"true", position:"fixed", placement:"above" });
  const opened = await panelState(page);
  expect(opened.left).toBeGreaterThanOrEqual(7);
  expect(opened.right).toBeLessThanOrEqual(opened.viewportWidth - 7);
  expect(opened.top).toBeGreaterThanOrEqual(7);
  expect(opened.bottom).toBeLessThanOrEqual(opened.viewportHeight - 7);

  const initialLeft = opened.left;
  await page.evaluate(() => { document.getElementById("kanbanMenuViewportFixture").scrollLeft = 500; });
  await expect.poll(async () => (await panelState(page)).left).not.toBe(initialLeft);
  const afterScroll = await panelState(page);
  expect(afterScroll.left).toBeGreaterThanOrEqual(7);
  expect(afterScroll.right).toBeLessThanOrEqual(afterScroll.viewportWidth - 7);

  await page.setViewportSize({ width:900, height:620 });
  await expect.poll(async () => {
    const state = await panelState(page);
    return state.right <= state.viewportWidth - 7 && state.bottom <= state.viewportHeight - 7;
  }).toBe(true);

  await page.locator("#kanbanViewportTrigger").focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#kanbanViewportPanel")).toBeHidden();
  await expect(page.locator("#kanbanViewportTrigger")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#kanbanViewportTrigger")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#kanbanViewportFirst")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#kanbanViewportSecond")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#kanbanViewportPanel")).toBeHidden();
  await expect(page.locator("#kanbanViewportTrigger")).toBeFocused();
});

test("phone Kanban column menu is clamped to both viewport edges and outside click still closes it", async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.goto("http://127.0.0.1:3000/index.html?page=projects", { waitUntil:"networkidle" });
  await unlock(page, "kanban-menu-phone@example.invalid");
  await page.waitForFunction(() => Boolean(window.FinanceKanbanMenuCompat));
  await installFixture(page, { top:150, right:0, width:286, panelWidth:280, scrollLeft:596 });

  await page.locator("#kanbanViewportTrigger").click();
  await expect.poll(() => panelState(page)).toMatchObject({ hidden:false, expanded:"true", position:"fixed", placement:"below" });
  const opened = await panelState(page);
  expect(opened.left).toBeGreaterThanOrEqual(7);
  expect(opened.right).toBeLessThanOrEqual(opened.viewportWidth - 7);
  expect(opened.top).toBeGreaterThanOrEqual(7);
  expect(opened.bottom).toBeLessThanOrEqual(opened.viewportHeight - 7);

  await page.locator("#todayLabel").click({ force:true });
  await expect(page.locator("#kanbanViewportPanel")).toBeHidden();
  await expect(page.locator("#kanbanViewportTrigger")).toHaveAttribute("aria-expanded", "false");
});