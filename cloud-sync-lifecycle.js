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

/* V15.2.2: never auto-pick profiles[0] when a cloud account exposes several finance profiles. */
(function financeCloudProfileSelectionGuard() {
  const APPROVED_KEY = "simple-finance-cloud-profile-approved-v1";
  const CHOOSER_ID = "cloudProfileSelectionCard";
  let pendingProfiles = [];
  let originals = null;

  const architecture = () => window.FinanceProfileArchitecture || null;
  const profileId = profile => String(profile?.profile_id || profile?.cloudProfileId || "");
  const shortId = value => {
    const text = String(value || "");
    return text.length > 10 ? `…${text.slice(-8)}` : text || "—";
  };
  const roleLabel = value => String(value || "viewer").toLowerCase() === "owner" ? "Owner" : String(value || "viewer").toLowerCase() === "editor" ? "Editor" : "Viewer";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);

  function toast(message, tone = "info") {
    if (typeof window.showToast === "function") window.showToast(message, tone);
    else console.info(message);
  }

  function chooserAnchor() {
    return document.getElementById("cloudFirstSyncCard") || document.getElementById("cloudConnectedSection") || document.getElementById("cloudDisconnectedSection");
  }

  function renderChooser(profiles = pendingProfiles, switching = false) {
    const list = (Array.isArray(profiles) ? profiles : []).filter(profile => profileId(profile));
    if (!list.length) return null;
    pendingProfiles = list;
    let card = document.getElementById(CHOOSER_ID);
    if (!card) {
      const anchor = chooserAnchor();
      if (!anchor?.parentNode) return null;
      card = document.createElement("article");
      card.id = CHOOSER_ID;
      card.className = "card";
      anchor.parentNode.insertBefore(card, anchor);
    }
    const current = String(architecture()?.cloudProfileId?.() || "");
    card.hidden = false;
    card.innerHTML = `<div class="card-header"><div><h3>${switching ? "Switch Cloud Profile" : "Choose Cloud Profile"}</h3><p>${switching ? "Choose the exact cloud dataset this device should use." : "This account has more than one finance profile. Confirm one before any finance records are downloaded."}</p></div><span class="v12-chip warning">Selection required</span></div>
      <div role="radiogroup" aria-label="Available cloud profiles" style="display:grid;gap:8px;margin:10px 0 12px;">${list.map((profile,index) => {
        const id = profileId(profile);
        const checked = current ? id === current : index === 0;
        return `<label style="display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface-soft);"><input type="radio" name="cloudProfileSelection" value="${escapeHtml(id)}" ${checked ? "checked" : ""}><span><strong style="display:block;">${escapeHtml(profile.name || "Cloud finances")}</strong><small style="display:block;color:var(--muted);margin-top:2px;">${escapeHtml(roleLabel(profile.role))} · Profile ${escapeHtml(shortId(id))}</small></span></label>`;
      }).join("")}</div>
      <div class="field" style="margin-bottom:10px;"><label for="cloudProfileSelectionPassphrase">Profile encryption passphrase</label><input class="input" id="cloudProfileSelectionPassphrase" type="password" autocomplete="current-password" placeholder="Leave blank for an automatically created profile"><small style="display:block;color:var(--muted);margin-top:4px;">Enter a passphrase only when this profile was created with a custom encryption passphrase.</small></div>
      <div class="card-actions" style="display:flex;gap:8px;flex-wrap:wrap;"><button class="button button-primary" id="cloudProfileSelectionConfirm" type="button">Use selected profile</button>${switching ? `<button class="button button-secondary" id="cloudProfileSelectionCancel" type="button">Cancel</button>` : ""}</div><p class="v12-help" id="cloudProfileSelectionMessage">No finance records will be downloaded until you confirm the profile.</p>`;
    return card;
  }

  async function defaultPassphrase() {
    const loadClient = window.FinanceCloudSyncInternals?.loadClient;
    if (typeof loadClient !== "function") return "";
    const client = await loadClient();
    const response = await client.auth.getSession();
    const user = response?.data?.session?.user;
    return user?.id ? `${user.id}:my-finance-v13:${String(user.email || "").toLowerCase()}` : "";
  }

  async function confirmSelection() {
    const selected = document.querySelector(`#${CHOOSER_ID} input[name="cloudProfileSelection"]:checked`)?.value || "";
    const typed = String(document.getElementById("cloudProfileSelectionPassphrase")?.value || "");
    const button = document.getElementById("cloudProfileSelectionConfirm");
    const message = document.getElementById("cloudProfileSelectionMessage");
    const profile = pendingProfiles.find(item => profileId(item) === selected);
    if (!selected || !profile || !originals?.connect) return;
    const prior = button?.textContent || "Use selected profile";
    if (button) { button.disabled = true; button.textContent = "Connecting…"; }
    try {
      const passphrase = typed || await defaultPassphrase();
      if (!passphrase) throw new Error("Enter the encryption passphrase for this Cloud Profile.");
      sessionStorage.setItem(APPROVED_KEY, selected);
      await originals.connect(selected, passphrase, true, { auto:false, selectedByUser:true });
      sessionStorage.removeItem(APPROVED_KEY);
      pendingProfiles = [];
      if (message) message.textContent = "Cloud Profile selected. Reloading this finance dataset…";
      toast(`Cloud Profile selected: ${profile.name || shortId(selected)}`, "success");
    } catch (error) {
      sessionStorage.removeItem(APPROVED_KEY);
      const text = String(error?.message || error || "Could not connect this Cloud Profile.");
      if (message) message.textContent = !typed && /passphrase|decrypt|encryption/i.test(text) ? "This profile needs its custom encryption passphrase. Enter it above, then try again." : text;
      toast(text, "warning");
    } finally {
      if (button) { button.disabled = false; button.textContent = prior; }
    }
  }

  async function openSwitcher() {
    if (!originals?.list) return;
    try {
      const result = await originals.list();
      const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
      if (!profiles.length) return toast("No Cloud Profiles are available for this account.", "warning");
      renderChooser(profiles, true);
      document.getElementById(CHOOSER_ID)?.scrollIntoView?.({ behavior:"smooth", block:"center" });
    } catch (error) { toast(error?.message || "Could not list Cloud Profiles.", "warning"); }
  }

  function identity() {
    const arch = architecture();
    const profile = arch?.activeProfile?.() || {};
    const id = String(arch?.cloudProfileId?.() || profile.cloudProfileId || "");
    return id ? { id, name:String(profile.name || "Cloud finances"), role:roleLabel(profile.role) } : null;
  }

  function renderIdentity() {
    const current = identity();
    if (!current) return;
    const grid = document.querySelector("#cloudSyncHealthCard .cloud-v3-health-grid");
    if (grid) {
      let item = document.getElementById("cloudHealthProfileItem");
      if (!item) {
        item = document.createElement("div");
        item.id = "cloudHealthProfileItem";
        item.innerHTML = `<span>Active Cloud Profile</span><strong id="cloudHealthProfile">—</strong>`;
        grid.appendChild(item);
      }
      const next = `${current.name} · ${current.role} · ${shortId(current.id)}`;
      const value = document.getElementById("cloudHealthProfile");
      if (value && value.textContent !== next) value.textContent = next;
    }
    const health = document.getElementById("cloudSyncHealthCard");
    if (health && !document.getElementById("cloudProfileIdentityCard")) {
      const card = document.createElement("article");
      card.id = "cloudProfileIdentityCard";
      card.className = "card";
      card.innerHTML = `<div class="card-header"><div><h3>Cloud profile identity</h3><p>Verify this same profile on every device.</p></div><span class="v12-chip success">Connected</span></div><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center;"><div><strong>${escapeHtml(current.name)}</strong><small style="display:block;color:var(--muted);margin-top:3px;">${escapeHtml(current.role)} · Profile ${escapeHtml(shortId(current.id))}</small></div><button class="button button-secondary" type="button" data-cloud-profile-switch>Switch cloud profile</button></div>`;
      health.insertAdjacentElement("afterend", card);
    }
    const profileCard = document.querySelector("#settings-panel-profiles .profile-cloud-card");
    if (profileCard && !profileCard.querySelector("[data-cloud-profile-identity]")) {
      const row = document.createElement("div");
      row.dataset.cloudProfileIdentity = "true";
      row.className = "profile-result";
      row.innerHTML = `<strong>Active Cloud Profile:</strong> ${escapeHtml(current.name)} · ${escapeHtml(current.role)} · ${escapeHtml(shortId(current.id))} <button class="button button-secondary button-small" type="button" data-cloud-profile-switch style="margin-left:8px;">Switch cloud profile</button>`;
      profileCard.querySelector(".profile-actions")?.after(row);
    }
  }

  function patch(arch) {
    if (!arch || arch.__financeCloudProfileSelectionGuard) return false;
    if (![arch.listCloudProfiles, arch.connectCloudProfile, arch.createCloudProfile].every(fn => typeof fn === "function")) return false;
    originals = { list:arch.listCloudProfiles.bind(arch), connect:arch.connectCloudProfile.bind(arch), create:arch.createCloudProfile.bind(arch) };
    arch.listCloudProfiles = async (...args) => {
      const result = await originals.list(...args);
      const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
      if (arch.cloudProfileId?.()) return result;
      const approved = String(sessionStorage.getItem(APPROVED_KEY) || "");
      if (approved && profiles.some(profile => profileId(profile) === approved)) return { ...result, profiles:profiles.filter(profile => profileId(profile) === approved) };
      if (profiles.length > 1) {
        pendingProfiles = profiles;
        renderChooser(profiles, false);
        window.dispatchEvent(new CustomEvent("finance:cloud-profile-selection-required", { detail:{ count:profiles.length } }));
        return { ...result, profiles:[] };
      }
      return result;
    };
    arch.createCloudProfile = async (...args) => {
      if (!arch.cloudProfileId?.() && pendingProfiles.length > 1 && !sessionStorage.getItem(APPROVED_KEY)) {
        renderChooser(pendingProfiles, false);
        throw new Error("Choose which Cloud Profile this device should use before creating another cloud profile.");
      }
      return originals.create(...args);
    };
    arch.connectCloudProfile = async (...args) => {
      const result = await originals.connect(...args);
      sessionStorage.removeItem(APPROVED_KEY);
      pendingProfiles = [];
      setTimeout(renderIdentity, 0);
      return result;
    };
    Object.defineProperty(arch, "__financeCloudProfileSelectionGuard", { value:true, configurable:true });
    arch.listCloudProfilesForSelection = (...args) => originals.list(...args);
    arch.openCloudProfileChooser = openSwitcher;
    return true;
  }

  function install() {
    if (!patch(architecture())) return setTimeout(install, 0);
    [0,250,1000,2500].forEach(delay => setTimeout(renderIdentity, delay));
  }

  document.addEventListener("click", event => {
    if (event.target.closest("#cloudProfileSelectionConfirm")) { event.preventDefault(); confirmSelection(); return; }
    if (event.target.closest("#cloudProfileSelectionCancel")) { event.preventDefault(); document.getElementById(CHOOSER_ID)?.remove(); return; }
    if (event.target.closest("[data-cloud-profile-switch]")) { event.preventDefault(); openSwitcher(); }
  });
  window.addEventListener("finance:cloud-profile-linked", () => setTimeout(renderIdentity, 50));
  window.addEventListener("finance:page-changed", () => setTimeout(renderIdentity, 0));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true }); else install();

  window.FinanceCloudProfileSelection = { open:openSwitcher, render:renderIdentity, get pendingProfiles(){ return pendingProfiles.slice(); } };
})();
