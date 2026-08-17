import { test, expect } from "@playwright/test";

const profiles = [
  { profile_id:"cloud-profile-old-11111111", name:"Old phone finance", role:"owner" },
  { profile_id:"cloud-profile-desktop-22222222", name:"Desktop finance", role:"owner" }
];

async function loadLifecycle(page, { activeId = "", available = profiles } = {}) {
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(({ activeId, available }) => {
    document.body.innerHTML = `<main><section id="cloudSelectionHost"><article id="cloudFirstSyncCard" class="card"></article></section><section id="settings-panel-profiles"><article class="card profile-cloud-card"><div class="profile-actions"></div></article></section><article id="cloudSyncHealthCard" class="card"><div class="cloud-v3-health-grid"></div></article></main>`;
    sessionStorage.clear();
    window.__profileCalls = { list:0, connect:[], create:0 };
    window.__activeCloudProfileId = activeId;
    window.__availableProfiles = available;
    window.showToast = () => {};
    window.FinanceCloudSyncInternals = {
      loadClient: async () => ({
        auth:{ getSession:async () => ({ data:{ session:{ user:{ id:"user-123", email:"Me@Example.com" } } } }) }
      })
    };
    window.FinanceProfileArchitecture = {
      cloudProfileId:() => window.__activeCloudProfileId,
      activeProfile:() => ({ name:window.__activeCloudProfileId ? "Desktop finance" : "Local finance", role:"owner", cloudProfileId:window.__activeCloudProfileId }),
      listCloudProfiles:async () => {
        window.__profileCalls.list += 1;
        return { profiles:window.__availableProfiles };
      },
      connectCloudProfile:async (...args) => {
        window.__profileCalls.connect.push(args);
        window.__activeCloudProfileId = args[0];
        return { cloudProfileId:args[0] };
      },
      createCloudProfile:async () => {
        window.__profileCalls.create += 1;
        return { profile_id:"new-cloud-profile" };
      }
    };
  }, { activeId, available });
  await page.addScriptTag({ url:"http://127.0.0.1:3000/cloud-sync-lifecycle.js?v=profile-selection-test" });
  await expect.poll(async () => page.evaluate(() => Boolean(window.FinanceCloudProfileSelection)), { timeout:10000 }).toBe(true);
}

test("multiple accessible cloud profiles require explicit selection instead of returning profiles[0]", async ({ page }) => {
  await loadLifecycle(page);

  const result = await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  expect(result.profiles).toHaveLength(0);
  await expect(page.locator("#cloudProfileSelectionCard")).toBeVisible();
  await expect(page.locator('input[name="cloudProfileSelection"]')).toHaveCount(2);
  await expect(page.locator("#cloudProfileSelectionMessage")).toContainText("No finance records will be downloaded");

  const createError = await page.evaluate(async () => {
    try { await window.FinanceProfileArchitecture.createCloudProfile({}); return ""; }
    catch (error) { return String(error.message || error); }
  });
  expect(createError).toContain("Choose which Cloud Profile");
  expect(await page.evaluate(() => window.__profileCalls.connect.length)).toBe(0);
  expect(await page.evaluate(() => window.__profileCalls.create)).toBe(0);
});

test("a single accessible cloud profile keeps the existing automatic path", async ({ page }) => {
  await loadLifecycle(page, { available:[profiles[1]] });
  const result = await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  expect(result.profiles).toHaveLength(1);
  expect(result.profiles[0].profile_id).toBe(profiles[1].profile_id);
  await expect(page.locator("#cloudProfileSelectionCard")).toHaveCount(0);
});

test("confirmed profile selection connects the exact chosen profile using the account-derived key when appropriate", async ({ page }) => {
  await loadLifecycle(page);
  await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  await page.locator(`input[value="${profiles[1].profile_id}"]`).check();
  await page.locator("#cloudProfileSelectionConfirm").click();

  await expect.poll(async () => page.evaluate(() => window.__profileCalls.connect.length), { timeout:10000 }).toBe(1);
  const call = await page.evaluate(() => window.__profileCalls.connect[0]);
  expect(call[0]).toBe(profiles[1].profile_id);
  expect(call[1]).toBe("user-123:my-finance-v13:me@example.com");
  expect(call[2]).toBe(true);
  expect(call[3]).toMatchObject({ auto:false, selectedByUser:true });
});

test("connected devices show the active Cloud Profile identity and expose Switch cloud profile", async ({ page }) => {
  await loadLifecycle(page, { activeId:profiles[1].profile_id });
  await expect.poll(async () => page.locator("#cloudHealthProfile").textContent(), { timeout:10000 }).toContain("Desktop finance");
  await expect(page.locator("#cloudHealthProfile")).toContainText("22222222");
  await expect(page.locator("#cloudProfileIdentityCard [data-cloud-profile-switch]")).toBeVisible();
  await expect(page.locator("#settings-panel-profiles [data-cloud-profile-switch]")).toBeVisible();
});
