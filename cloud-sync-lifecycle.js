"use strict";
/* Visible-device polling and Realtime recovery for encrypted Cloud Sync. */
(function financeCloudSyncLifecycleBootstrap() {
  const FOREGROUND_POLL_MS = 5 * 60 * 1000;
  const REALTIME_RETRY_MAX_MS = 30 * 1000;

  function create({ canPoll, canRetry, pull, reconnect }) {
    let foregroundPollTimer = null;
    let realtimeRetryTimer = null;
    let realtimeRetryAttempts = 0;

    function clearForegroundPoll() {
      clearTimeout(foregroundPollTimer);
      foregroundPollTimer = null;
    }

    function scheduleForegroundPoll(delay = FOREGROUND_POLL_MS) {
      clearForegroundPoll();
      if (!canPoll()) return;
      foregroundPollTimer = setTimeout(() => {
        Promise.resolve(pull("foreground-poll")).catch(() => {}).finally(() => scheduleForegroundPoll());
      }, Math.max(1000, Number(delay || FOREGROUND_POLL_MS)));
    }

    function clearRealtimeRetry({ resetAttempts = false } = {}) {
      clearTimeout(realtimeRetryTimer);
      realtimeRetryTimer = null;
      if (resetAttempts) realtimeRetryAttempts = 0;
    }

    function scheduleRealtimeRecovery(status = "Disconnected") {
      if (!canRetry()) return;
      clearRealtimeRetry();
      realtimeRetryAttempts += 1;
      const delay = Math.min(REALTIME_RETRY_MAX_MS, 1000 * (2 ** Math.min(realtimeRetryAttempts - 1, 5)));
      realtimeRetryTimer = setTimeout(async () => {
        if (!canRetry()) return;
        if (!canPoll()) {
          scheduleRealtimeRecovery(status);
          return;
        }
        try {
          await reconnect();
          await pull("realtime-recovery");
        } catch (error) {
          scheduleRealtimeRecovery(status);
        }
      }, delay);
    }

    function noteRealtimeSubscribed() {
      clearRealtimeRetry({ resetAttempts:true });
    }

    return {
      clearForegroundPoll,
      scheduleForegroundPoll,
      clearRealtimeRetry,
      scheduleRealtimeRecovery,
      noteRealtimeSubscribed
    };
  }

  window.FinanceCloudSyncLifecycle = { create, FOREGROUND_POLL_MS };
})();

/* V15.2.2 cloud profile identity gate.
   A fresh installation must not silently use the first Cloud Schema V3 profile when an account can access several profiles. */
(function financeCloudProfileSelectionGuard() {
  const APPROVED_PROFILE_KEY = "simple-finance-cloud-profile-approved-v1";
  const CARD_ID = "cloudProfileSelectionCard";
  const IDENTITY_CARD_ID = "cloudProfileIdentityCard";
  let pendingProfiles = [];
  let originals = null;
  let observer = null;

  function arch() { return window.FinanceProfileArchitecture || null; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  }
  function profileId(profile) { return String(profile?.profile_id || profile?.cloudProfileId || ""); }
  function shortProfileId(value) {
    const text = String(value || "");
    return text.length > 10 ? `…${text.slice(-8)}` : text || "—";
  }
  function roleLabel(role) {
    const value = String(role || "viewer").toLowerCase();
    return value === "owner" ? "Owner" : value === "editor" ? "Editor" : "Viewer";
  }
  function activeIdentity() {
    const architecture = arch();
    const profile = architecture?.activeProfile?.() || {};
    const id = String(architecture?.cloudProfileId?.() || profile.cloudProfileId || "");
    if (!id) return null;
    return {
      id,
      name:String(profile.name || "Cloud finances"),
      role:roleLabel(profile.role),
      suffix:shortProfileId(id)
    };
  }
  function showToast(message, tone = "info") {
    try {
      if (typeof window.showToast === "function") window.showToast(message, tone);
      else console.info(message);
    } catch (error) { console.info(message); }
  }

  function chooserAnchor() {
    return document.getElementById("cloudFirstSyncCard") || document.getElementById("cloudConnectedSection") || document.getElementById("cloudDisconnectedSection");
  }

  function renderChooser(profiles = pendingProfiles, { switching = false } = {}) {
    const list = Array.isArray(profiles) ? profiles.filter(item => profileId(item)) : [];
    if (!list.length) return null;
    pendingProfiles = list;
    let card = document.getElementById(CARD_ID);
    if (!card) {
      const anchor = chooserAnchor();
      if (!anchor?.parentNode) return null;
      card = document.createElement("article");
      card.id = CARD_ID;
      card.className = "card";
      anchor.parentNode.insertBefore(card, anchor);
    }
    card.hidden = false;
    card.dataset.switching = switching ? "true" : "false";
    const currentId = String(arch()?.cloudProfileId?.() || "");
    card.innerHTML = `
      <div class="card-header">
        <div><h3>${switching ? "Switch Cloud Profile" : "Choose Cloud Profile"}</h3><p>${switching ? "Choose the exact cloud dataset this device should use." : "This cloud account has more than one finance profile. Choose one before any records are downloaded."}</p></div>
        <span class="v12-chip warning">Selection required</span>
      </div>
      <div role="radiogroup" aria-label="Available cloud profiles" style="display:grid;gap:8px;margin:10px 0 12px;">
        ${list.map((profile,index) => {
          const id = profileId(profile);
          const checked = currentId ? id === currentId : index === 0;
          return `<label style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface-soft);cursor:pointer;">
            <input type="radio" name="cloudProfileSelection" value="${escapeHtml(id)}" ${checked ? "checked" : ""}>
            <span><strong style="display:block;">${escapeHtml(profile.name || "Cloud finances")}</strong><small style="display:block;color:var(--muted);margin-top:2px;">${escapeHtml(roleLabel(profile.role))} · Profile ${escapeHtml(shortProfileId(id))}</small></span>
          </label>`;
        }).join("")}
      </div>
      <div class="field" style="margin-bottom:10px;">
        <label for="cloudProfileSelectionPassphrase">Profile encryption passphrase</label>
        <input class="input" id="cloudProfileSelectionPassphrase" type="password" autocomplete="current-password" placeholder="Leave blank for an automatically created profile">
        <small style="display:block;color:var(--muted);margin-top:4px;">If this profile was created manually with a custom encryption passphrase, enter it here.</small>
      </div>
      <div class="card-actions" style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="button button-primary" id="cloudProfileSelectionConfirm" type="button">Use selected profile</button>
        ${switching ? `<button class="button button-secondary" id="cloudProfileSelectionCancel" type="button">Cancel</button>` : ""}
      </div>
      <p class="v12-help" id="cloudProfileSelectionMessage">No finance records will be downloaded until you confirm the profile.</p>`;
    return card;
  }

  async function sessionDefaultPassphrase() {
    const loadClient = window.FinanceCloudSyncInternals?.loadClient;
    if (typeof loadClient !== "function") return "";
    const client = await loadClient();
    const response = await client.auth.getSession();
    const user = response?.data?.session?.user || null;
    if (!user?.id) return "";
    return `${user.id}:my-finance-v13:${String(user.email || "").toLowerCase()}`;
  }

  async function useSelectedProfile() {
    const card = document.getElementById(CARD_ID);
    const selected = card?.querySelector('input[name="cloudProfileSelection"]:checked')?.value || "";
    const typed = String(document.getElementById("cloudProfileSelectionPassphrase")?.value || "");
    const message = document.getElementById("cloudProfileSelectionMessage");
    const button = document.getElementById("cloudProfileSelectionConfirm");
    if (!selected || !originals?.connect) return;
    const selectedProfile = pendingProfiles.find(profile => profileId(profile) === selected);
    if (!selectedProfile) return;
    const prior = button?.textContent || "Use selected profile";
    if (button) { button.disabled = true; button.textContent = "Connecting…"; }
    if (message) message.textContent = `Connecting to ${selectedProfile.name || "the selected profile"} (${shortProfileId(selected)})…`;
    try {
      const passphrase = typed || await sessionDefaultPassphrase();
      if (!passphrase) throw new Error("Enter the encryption passphrase for this Cloud Profile.");
      sessionStorage.setItem(APPROVED_PROFILE_KEY, selected);
      await originals.connect(selected, passphrase, true, { auto:false, selectedByUser:true });
      sessionStorage.removeItem(APPROVED_PROFILE_KEY);
      pendingProfiles = [];
      if (message) message.textContent = "Cloud Profile selected. Reloading this finance dataset…";
      showToast(`Cloud Profile selected: ${selectedProfile.name || shortProfileId(selected)}`, "success");
    } catch (error) {
      sessionStorage.removeItem(APPROVED_PROFILE_KEY);
      const text = String(error?.message || error || "Could not connect this Cloud Profile.");
      if (message) message.textContent = /passphrase|decrypt|encryption/i.test(text) && !typed
        ? "This profile needs its custom encryption passphrase. Enter it above, then try again."
        : text;
      showToast(text, "warning");
    } finally {
      if (button) { button.disabled = false; button.textContent = prior; }
    }
  }

  async function openSwitchChooser() {
    if (!originals?.list) return;
    try {
      const result = await originals.list();
      const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
      if (!profiles.length) return showToast("No Cloud Profiles are available for this account.", "warning");
      renderChooser(profiles, { switching:true });
      document.getElementById(CARD_ID)?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    } catch (error) {
      showToast(error?.message || "Could not list Cloud Profiles.", "warning");
    }
  }

  function renderIdentity() {
    const identity = activeIdentity();
    const grid = document.querySelector("#cloudSyncHealthCard .cloud-v3-health-grid");
    if (grid && identity) {
      let item = document.getElementById("cloudHealthProfileItem");
      if (!item) {
        item = document.createElement("div");
        item.id = "cloudHealthProfileItem";
        item.innerHTML = `<span>Active Cloud Profile</span><strong id="cloudHealthProfile">—</strong>`;
        grid.appendChild(item);
      }
      const value = item.querySelector("#cloudHealthProfile");
      if (value) value.textContent = `${identity.name} · ${identity.role} · ${identity.suffix}`;
    }

    const health = document.getElementById("cloudSyncHealthCard");
    if (health && identity) {
      let card = document.getElementById(IDENTITY_CARD_ID);
      if (!card) {
        card = document.createElement("article");
        card.id = IDENTITY_CARD_ID;
        card.className = "card";
        health.insertAdjacentElement("afterend", card);
      }
      card.innerHTML = `<div class="card-header"><div><h3>Cloud profile identity</h3><p>Verify this exact profile on every device before replacing or downloading finance records.</p></div><span class="v12-chip success">Connected</span></div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center;"><div><strong>${escapeHtml(identity.name)}</strong><small style="display:block;color:var(--muted);margin-top:3px;">${escapeHtml(identity.role)} · Profile ${escapeHtml(identity.suffix)}</small></div><button class="button button-secondary" type="button" data-cloud-profile-switch>Switch cloud profile</button></div>`;
    }

    const profileCard = document.querySelector("#settings-panel-profiles .profile-cloud-card");
    if (profileCard && identity) {
      let summary = profileCard.querySelector("[data-cloud-profile-identity]");
      if (!summary) {
        summary = document.createElement("div");
        summary.dataset.cloudProfileIdentity = "true";
        summary.className = "profile-result";
        profileCard.querySelector(".profile-actions")?.after(summary);
      }
      summary.innerHTML = `<strong>Active Cloud Profile:</strong> ${escapeHtml(identity.name)} · ${escapeHtml(identity.role)} · ${escapeHtml(identity.suffix)} <button class="button button-secondary button-small" type="button" data-cloud-profile-switch style="margin-left:8px;">Switch cloud profile</button>`;
    }
  }

  function patchArchitecture(architecture) {
    if (!architecture || architecture.__financeCloudProfileSelectionGuard) return false;
    if (typeof architecture.listCloudProfiles !== "function" || typeof architecture.connectCloudProfile !== "function" || typeof architecture.createCloudProfile !== "function") return false;
    originals = {
      list:architecture.listCloudProfiles.bind(architecture),
      connect:architecture.connectCloudProfile.bind(architecture),
      create:architecture.createCloudProfile.bind(architecture)
    };

    architecture.listCloudProfiles = async function guardedListCloudProfiles(...args) {
      const result = await originals.list(...args);
      const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
      if (architecture.cloudProfileId?.()) return result;
      const approved = String(sessionStorage.getItem(APPROVED_PROFILE_KEY) || "");
      if (approved && profiles.some(profile => profileId(profile) === approved)) {
        return { ...result, profiles:profiles.filter(profile => profileId(profile) === approved) };
      }
      if (profiles.length > 1) {
        pendingProfiles = profiles;
        renderChooser(profiles);
        window.dispatchEvent(new CustomEvent("finance:cloud-profile-selection-required", { detail:{ count:profiles.length } }));
        return { ...result, profiles:[] };
      }
      return result;
    };

    architecture.createCloudProfile = async function guardedCreateCloudProfile(...args) {
      if (!architecture.cloudProfileId?.() && pendingProfiles.length > 1 && !sessionStorage.getItem(APPROVED_PROFILE_KEY)) {
        renderChooser(pendingProfiles);
        throw new Error("Choose which Cloud Profile this device should use before creating another cloud profile.");
      }
      return originals.create(...args);
    };

    architecture.connectCloudProfile = async function guardedConnectCloudProfile(...args) {
      const result = await originals.connect(...args);
      sessionStorage.removeItem(APPROVED_PROFILE_KEY);
      pendingProfiles = [];
      queueMicrotask(renderIdentity);
      return result;
    };

    Object.defineProperty(architecture, "__financeCloudProfileSelectionGuard", { value:true, configurable:true });
    architecture.listCloudProfilesForSelection = (...args) => originals.list(...args);
    architecture.openCloudProfileChooser = openSwitchChooser;
    return true;
  }

  function install() {
    const architecture = arch();
    if (!patchArchitecture(architecture)) {
      setTimeout(install, 0);
      return;
    }
    renderIdentity();
    observer = new MutationObserver(() => renderIdentity());
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#cloudProfileSelectionConfirm")) { event.preventDefault(); useSelectedProfile(); return; }
    if (event.target.closest("#cloudProfileSelectionCancel")) { event.preventDefault(); document.getElementById(CARD_ID)?.remove(); return; }
    if (event.target.closest("[data-cloud-profile-switch]")) { event.preventDefault(); openSwitchChooser(); }
  });
  window.addEventListener("finance:cloud-profile-linked", () => setTimeout(renderIdentity, 50));
  window.addEventListener("finance:page-changed", () => setTimeout(renderIdentity, 0));

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true });
  else install();

  window.FinanceCloudProfileSelection = {
    open:openSwitchChooser,
    render:renderIdentity,
    get pendingProfiles(){ return pendingProfiles.slice(); }
  };
})();
