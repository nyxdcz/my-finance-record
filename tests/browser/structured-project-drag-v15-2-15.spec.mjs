import { test, expect } from "@playwright/test";

const fixture = `<!doctype html><html data-theme="dark"><head>
  <link rel="stylesheet" href="http://127.0.0.1:3000/app.css?v=structured-drag-test">
  <link rel="stylesheet" href="http://127.0.0.1:3000/projects-calendar-v13.0.20.css?v=structured-drag-test">
</head><body>
  <section id="active" data-structured-drop-zone data-structured-drop-kind="project" data-structured-drop-destination="active" data-structured-drop-label="Active Projects">
    <article class="project-record" data-structured-card="project" data-structured-id="project-1" data-structured-label="Garden plan" data-structured-origin="active">
      <button class="structured-drag-handle" type="button" draggable="true" data-structured-drag-handle aria-label="Move Garden plan">⠿</button>
    </article>
  </section>
  <section id="completedProjectsCard" data-structured-drop-zone data-structured-drop-kind="project" data-structured-drop-destination="completed" data-structured-drop-label="Completed Projects"></section>
  <div class="structured-drag-toast" id="structuredDragToast" role="status" aria-live="polite" hidden><span data-structured-toast-message></span><button type="button" data-structured-toast-undo hidden>Undo</button><button type="button" data-structured-toast-dismiss>×</button></div>
  <div id="structuredDragAnnouncer" role="status" aria-live="polite"></div>
</body></html>`;

async function loadFixture(page, viewport = { width:1280, height:800 }) {
  await page.setViewportSize(viewport);
  await page.setContent(fixture, { waitUntil:"networkidle" });
  await page.evaluate(() => {
    window.__moves = [];
    window.__undos = 0;
    window.FinanceStructuredDropActions = {
      project:{
        async move(id, destination) {
          window.__moves.push([id, destination]);
          return { success:true, message:"Garden plan moved to Completed Projects.", undo:() => { window.__undos += 1; return true; } };
        }
      }
    };
  });
  await page.addScriptTag({ url:"http://127.0.0.1:3000/interaction-patterns.js?v=structured-drag-test" });
}

test("keyboard pickup exposes the destination, commits, and offers Undo", async ({ page }) => {
  await loadFixture(page);
  const handle = page.locator("[data-structured-drag-handle]");
  await handle.focus();
  await handle.press("Space");
  await expect(page.locator("#completedProjectsCard")).toHaveClass(/is-structured-drop-target/);
  await expect(page.locator("#structuredDragAnnouncer")).toContainText("ready");
  await handle.press("Enter");
  await expect.poll(() => page.evaluate(() => window.__moves)).toEqual([["project-1", "completed"]]);
  await expect(page.locator("#structuredDragToast")).toBeVisible();
  await expect(page.locator("[data-structured-toast-message]")).toContainText("moved to Completed Projects");
  await page.locator("[data-structured-toast-undo]").click();
  await expect.poll(() => page.evaluate(() => window.__undos)).toBe(1);
  await expect(page.locator("[data-structured-toast-message]")).toContainText("Move undone");
});

test("Escape and invalid drops return without changing data", async ({ page }) => {
  await loadFixture(page);
  const handle = page.locator("[data-structured-drag-handle]");
  await handle.focus();
  await handle.press("Space");
  await handle.press("Escape");
  await expect(page.locator(".project-record")).not.toHaveClass(/is-structured-dragging/);
  await expect(page.locator("#completedProjectsCard")).not.toHaveClass(/is-structured-drop-target/);
  expect(await page.evaluate(() => window.__moves)).toEqual([]);
  await expect(page.locator("#structuredDragAnnouncer")).toContainText("cancelled");
});

test("phone handle is touch safe and reduced motion removes return animation", async ({ browser }) => {
  const context = await browser.newContext({ viewport:{ width:390, height:800 }, reducedMotion:"reduce" });
  const page = await context.newPage();
  await loadFixture(page, { width:390, height:800 });
  const metrics = await page.locator("[data-structured-drag-handle]").evaluate(node => {
    const box = node.getBoundingClientRect();
    const returning = node.closest("[data-structured-card]");
    returning.classList.add("is-structured-returning");
    return { width:box.width, height:box.height, animation:getComputedStyle(returning).animationName, touchAction:getComputedStyle(node).touchAction };
  });
  expect(metrics.width).toBeGreaterThanOrEqual(44);
  expect(metrics.height).toBeGreaterThanOrEqual(44);
  expect(metrics.animation).toBe("none");
  expect(metrics.touchAction).toBe("none");
  await context.close();
});
