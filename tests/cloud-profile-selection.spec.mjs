import { test, expect } from "@playwright/test";

const profiles = [
  { profile_id:"cloud-profile-old-11111111", name:"My Finances", role:"owner", created_at:"2026-08-10T03:00:00Z", updated_at:"2026-08-12T03:00:00Z" },
  { profile_id:"cloud-profile-desktop-22222222", name:"My Finances", role:"owner", created_at:"2026-08-11T03:00:00Z", updated_at:"2026-08-17T09:00:00Z" }
];

const profileStats = {
  "cloud-profile-old-11111111":{ accounts:3, devices:1 },
  "cloud-profile-desktop-22222222":{ accounts:6, devices:2 }
};

async function loadLifecycle(page, { activeId = "", available = profiles } = {}) {
  await page.goto("http://127.0.0.1:3000/offline.html", { waitUntil:"networkidle" });
  await page.evaluate(({ activeId, available, profileStats }) => {
    document.body.innerHTML = `<main><section id="cloudSelectionHost"><article id="cloudFirstSyncCard" class="card"></article></section><section id="settings-panel-profiles"><article class="card profile-cloud-card"><div class="profile-actions"></div></article></section><article id="cloudSyncHealthCard" class="card"><div class="cloud-v3-health-grid"></div></article></main>`;
    sessionStorage.clear();
    localStorage.removeItem("simple-finance-cloud-profile-last-selected-v1");
    window.__profileCalls = { list:0, connect:[], create:0 };
    window.__activeCloudProfileId = activeId;
    window.__availableProfiles = available;
    window.__profileStats = profileStats;
    window.showToast = () => {};
    const query = table => {
      const state = { profileId:"", collection:"" };
      const api = {
        select:() => api,
        eq:(key, value) => { if (key === "profile_id") state.profileId = value; if (key === "collection") state.collection = value; return api; },
        is:() => api,
        then:(resolve, reject) => {
          try {
            const stats = window.__profileStats[state.profileId] || { accounts:0, devices:0 };
            const count = table === "finance_v3_devices" ? stats.devices : state.collection === "accounts" ? stats.accounts : 0;
            return Promise.resolve({ count, error:null }).then(resolve, reject);
          } catch (error) { return Promise.reject(error).then(resolve, reject); }
        }
      };
      return api;
    };
    window.FinanceCloudSyncInternals = {
      loadClient: async () => ({
        auth:{ getSession:async () => ({ data:{ session:{ user:{ id:"user-123", email:"Me@Example.com" } } } }) },
        from:query
      })
    };
    window.FinanceProfileArchitecture = {
      cloudProfileId:() => window.__activeCloudProfileId,
      activeProfile:() => ({ name:window.__activeCloudProfileId ? "My Finances" : "Local finance", role:"owner", cloudProfileId:window.__activeCloudProfileId }),
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
  }, { activeId, available, profileStats });
  await page.addScriptTag({ url:"http://127.0.0.1:3000/cloud-sync-lifecycle.js?v=profile-selection-test" });
  await expect.poll(async () => page.evaluate(() => Boolean(window.FinanceCloudProfileSelection)), { timeout:10000 }).toBe(true);
}

test("duplicate cloud profiles require deliberate selection and show identity clues", async ({ page }) => {
  await loadLifecycle(page);

  const result = await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  expect(result.profiles).toHaveLength(0);
  await expect(page.locator("#cloudProfileSelectionCard")).toBeVisible();
  await expect(page.locator('input[name="cloudProfileSelection"]')).toHaveCount(2);
  await expect(page.locator('input[name="cloudProfileSelection"]:checked')).toHaveCount(0);
  await expect(page.locator("#cloudProfileSelectionConfirm")).toBeDisabled();
  await expect(page.locator("[data-cloud-profile-duplicate-warning]")).toContainText("2 profiles share a duplicate name");
  await expect(page.locator("#cloudProfileSelectionMessage")).toContainText("No profile is preselected");

  const newest = page.locator('[data-cloud-profile-id="cloud-profile-desktop-22222222"]');
  await expect(newest).toContainText("Most recently updated");
  await expect(newest).toContainText("Duplicate name");
  await expect(newest).toContainText("Updated");
  await expect(newest).toContainText("Created");
  await expect.poll(async () => newest.locator("[data-cloud-profile-stats]").textContent()).toContain("Accounts 6 · Devices 2");

  const createError = await page.evaluate(async () => {
    try { await window.FinanceProfileArchitecture.createCloudProfile({}); return ""; }
    catch (error) { return String(error.message || error); }
  });
  expect(createError).toContain("Choose which existing Cloud Profile");
  expect(await page.evaluate(() => window.__profileCalls.connect.length)).toBe(0);
  expect(await page.evaluate(() => window.__profileCalls.create)).toBe(0);
});

test("a single accessible cloud profile keeps auto-connect compatibility but blocks accidental duplicate creation", async ({ page }) => {
  await loadLifecycle(page, { available:[profiles[1]] });
  const result = await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  expect(result.profiles).toHaveLength(1);
  expect(result.profiles[0].profile_id).toBe(profiles[1].profile_id);
  await expect(page.locator("#cloudProfileSelectionCard")).toHaveCount(0);

  const createError = await page.evaluate(async () => {
    try { await window.FinanceProfileArchitecture.createCloudProfile({}); return ""; }
    catch (error) { return String(error.message || error); }
  });
  expect(createError).toContain("existing Cloud Profile is already available");
  expect(await page.evaluate(() => window.__profileCalls.create)).toBe(0);
});

test("confirmed profile selection connects the exact chosen profile using the account-derived key when appropriate", async ({ page }) => {
  await loadLifecycle(page);
  await page.evaluate(() => window.FinanceProfileArchitecture.listCloudProfiles());
  await page.locator(`input[value="${profiles[1].profile_id}"]`).check();
  await expect(page.locator("#cloudProfileSelectionConfirm")).toBeEnabled();
  await page.locator("#cloudProfileSelectionConfirm").click();

  await expect.poll(async () => page.evaluate(() => window.__profileCalls.connect.length), { timeout:10000 }).toBe(1);
  const call = await page.evaluate(() => window.__profileCalls.connect[0]);
  expect(call[0]).toBe(profiles[1].profile_id);
  expect(call[1]).toBe("user-123:my-finance-v13:me@example.com");
  expect(call[2]).toBe(true);
  expect(call[3]).toMatchObject({ auto:false, selectedByUser:true });
  expect(await page.evaluate(() => localStorage.getItem("simple-finance-cloud-profile-last-selected-v1"))).toBe(profiles[1].profile_id);
});

test("connected devices show the active Cloud Profile identity and expose Switch cloud profile", async ({ page }) => {
  await loadLifecycle(page, { activeId:profiles[1].profile_id });
  await expect.poll(async () => page.locator("#cloudHealthProfile").textContent(), { timeout:10000 }).toContain("My Finances");
  await expect(page.locator("#cloudHealthProfile")).toContainText("22222222");
  await expect(page.locator("#cloudProfileIdentityCard [data-cloud-profile-switch]")).toBeVisible();
  await expect(page.locator("#settings-panel-profiles [data-cloud-profile-switch]")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("simple-finance-cloud-profile-last-selected-v1"))).toBe(profiles[1].profile_id);
});

test("switching profiles preselects only the currently connected dataset", async ({ page }) => {
  await loadLifecycle(page, { activeId:profiles[0].profile_id });
  await page.evaluate(() => window.FinanceCloudProfileSelection.open());
  await expect(page.locator(`input[value="${profiles[0].profile_id}"]`)).toBeChecked();
  await expect(page.locator(`input[value="${profiles[1].profile_id}"]`)).not.toBeChecked();
  await expect(page.locator('[data-cloud-profile-id="cloud-profile-old-11111111"]')).toContainText("Current on this device");
});
