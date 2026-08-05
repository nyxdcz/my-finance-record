"use strict";

/* My Finance Records V12.20.0 · optional MacBook + iPhone cloud synchronization.
   Local records remain the primary offline copy. Supabase is used only after the user
   configures a project, signs in, and chooses the first-sync direction. */
(function financeCloudSyncBootstrap() {
  const META_KEY = "simple-finance-cloud-sync-v1";
  const BASE_KEY = "simple-finance-cloud-base-v1";
  const CONFLICT_KEY = "simple-finance-cloud-conflicts-v1";
  const CONFIG_KEY = "simple-finance-cloud-config-v1";
  const COLLECTIONS = ["expenses", "projects", "incomeRecords", "savingsGoals", "accountLedger", "accountReconciliations"];
  const MAX_CONFLICTS = 8;
  const MAX_HISTORY_PATHS = 80;
  const SYNC_DELAY = 900;
  const CLOUD_TABLE = "finance_cloud_state";
  const DEVICE_TABLE = "finance_cloud_devices";
  const PAYMENT_TABLE = "finance_payment_operations";

  let client = null;
  let session = null;
  let cloudUser = null;
  let realtimeChannel = null;
  let syncTimer = null;
  let syncing = false;
  let suppressQueue = false;
  let saveWrapped = false;
  let initialized = false;
  let lastObservedData = safeClone(typeof data !== "undefined" ? data : {});

  const defaultState = () => ({
    enabled: true,
    autoSync: true,
    initializedUserId: "",
    baseRevision: 0,
    lastSyncAt: "",
    lastError: "",
    pendingCount: 0,
    status: "Not connected",
    tombstones: [],
    pendingOperations: [],
    currentDeviceId: "",
    currentDeviceName: "",
    lastRemoteUpdatedAt: "",
    metadataSeedAt: ""
  });

  let cloudState = loadJson(META_KEY, defaultState());
  cloudState = { ...defaultState(), ...(cloudState && typeof cloudState === "object" ? cloudState : {}) };
  cloudState.tombstones = Array.isArray(cloudState.tombstones) ? cloudState.tombstones : [];
  cloudState.pendingOperations = Array.isArray(cloudState.pendingOperations) ? cloudState.pendingOperations : [];

  function safeClone(value) {
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch (error) {}
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function persistState() {
    saveJson(META_KEY, cloudState);
  }

  function stable(value) {
    if (value === undefined) return "__undefined__";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }

  function checksum(value) {
    const text = stable(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function same(a, b) {
    return checksum(a) === checksum(b);
  }

  function payloadComparable(payload) {
    if (!payload || typeof payload !== "object") return payload;
    return { ...payload, exportedAt:"", updatedByDevice:"" };
  }

  function payloadSame(a, b) {
    return same(payloadComparable(a), payloadComparable(b));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function currentDeviceId() {
    try {
      if (typeof ensureCurrentDevice === "function") ensureCurrentDevice();
      const id = typeof appMeta !== "undefined" ? appMeta.currentDeviceId : "";
      if (id) return id;
    } catch (error) {}
    let id = cloudState.currentDeviceId;
    if (!id) id = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    cloudState.currentDeviceId = id;
    persistState();
    return id;
  }

  function currentDeviceName() {
    try {
      const id = currentDeviceId();
      const saved = typeof appMeta !== "undefined" ? appMeta.devices?.[id]?.name : "";
      if (saved) return saved;
    } catch (error) {}
    return cloudState.currentDeviceName || (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Nyco’s iPhone" : /Mac/i.test(navigator.platform || navigator.userAgent) ? "Nyco’s MacBook" : "My device");
  }

  function getStoredConfig() {
    const fileConfig = window.FINANCE_SYNC_CONFIG || {};
    const localConfig = loadJson(CONFIG_KEY, {});
    const supabaseUrl = String(localConfig.supabaseUrl || fileConfig.supabaseUrl || "").trim().replace(/\/+$/, "");
    const supabasePublishableKey = String(localConfig.supabasePublishableKey || fileConfig.supabasePublishableKey || "").trim();
    return { supabaseUrl, supabasePublishableKey };
  }

  function configStatus(config = getStoredConfig()) {
    if (!config.supabaseUrl || !config.supabasePublishableKey) return { ok:false, message:"Add your Supabase project URL and publishable key." };
    if (!/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.supabase\.co$/i.test(config.supabaseUrl) && !/^https:\/\//i.test(config.supabaseUrl)) return { ok:false, message:"Enter a valid HTTPS Supabase project URL." };
    if (/^sb_secret_/i.test(config.supabasePublishableKey) || /service[_-]?role/i.test(config.supabasePublishableKey)) return { ok:false, message:"Secret and service-role keys are blocked. Use a publishable or legacy anon key." };
    if (config.supabasePublishableKey.length < 20) return { ok:false, message:"The publishable key appears incomplete." };
    return { ok:true, message:"Cloud project configured." };
  }

  function topStatusLabel() {
    if (!configStatus().ok) return "Cloud off";
    if (!navigator.onLine) return cloudState.pendingCount ? `${cloudState.pendingCount} pending` : "Offline";
    if (syncing) return "Syncing";
    if (!cloudUser) return "Sign in";
    if (cloudState.pendingCount) return `${cloudState.pendingCount} pending`;
    if (cloudState.lastError) return "Needs attention";
    return cloudState.lastSyncAt ? "Synced" : "Ready";
  }

  function setStatus(status, detail = "", tone = "info") {
    cloudState.status = status;
    if (tone !== "danger") cloudState.lastError = "";
    if (tone === "danger") cloudState.lastError = detail || status;
    persistState();
    const chip = document.getElementById("cloudStatusChip");
    if (chip) {
      chip.textContent = status;
      chip.className = `v12-chip ${tone}`;
    }
    const detailNode = document.getElementById("cloudStatusDetail");
    if (detailNode) detailNode.textContent = detail || status;
    const topButton = document.getElementById("cloudSyncStatusButton");
    if (topButton) {
      const label = topStatusLabel();
      topButton.dataset.state = tone;
      topButton.querySelector("span:last-child").textContent = label;
      topButton.setAttribute("aria-label", `Cloud sync: ${label}`);
      topButton.title = `Cloud sync: ${label}`;
    }
    renderCloudStats();
  }

  function renderCloudStats() {
    const configured = configStatus().ok;
    const disconnected = document.getElementById("cloudDisconnectedSection");
    const connected = document.getElementById("cloudConnectedSection");
    const configCard = document.getElementById("cloudConfigCard");
    if (configCard) configCard.hidden = false;
    const configChip = document.getElementById("cloudConfigStatusChip");
    if (configChip) { configChip.textContent = configured ? "Configured" : "Setup required"; configChip.className = `v12-chip ${configured ? "success" : "warning"}`; }
    const ready = Boolean(cloudUser && cloudState.initializedUserId === cloudUser.id);
    if (disconnected) disconnected.hidden = !configured || Boolean(cloudUser);
    if (connected) connected.hidden = !configured || !ready;
    const userEmail = document.getElementById("cloudUserEmail");
    if (userEmail) userEmail.textContent = cloudUser?.email || "—";
    const pending = document.getElementById("cloudPendingCount");
    if (pending) pending.textContent = String(cloudState.pendingCount || 0);
    const lastSync = document.getElementById("cloudLastSync");
    if (lastSync) lastSync.textContent = cloudState.lastSyncAt ? new Intl.DateTimeFormat("en-PH", { dateStyle:"medium", timeStyle:"short" }).format(new Date(cloudState.lastSyncAt)) : "Never";
    const device = document.getElementById("cloudCurrentDevice");
    if (device) device.textContent = currentDeviceName();
    const deviceInput = document.getElementById("cloudDeviceName");
    if (deviceInput && document.activeElement !== deviceInput) deviceInput.value = currentDeviceName();
    const auto = document.getElementById("cloudAutoSync");
    if (auto) auto.checked = cloudState.autoSync !== false;
    const first = document.getElementById("cloudFirstSyncCard");
    if (first) first.hidden = !cloudUser || cloudState.initializedUserId === cloudUser.id;
    const config = getStoredConfig();
    const urlInput = document.getElementById("cloudConfigUrl");
    const keyInput = document.getElementById("cloudConfigKey");
    if (urlInput && !urlInput.value) urlInput.value = config.supabaseUrl;
    if (keyInput && !keyInput.value) keyInput.value = config.supabasePublishableKey;
    renderConflicts();
  }

  function markPending(reason = "Local changes waiting") {
    if (suppressQueue || !cloudState.enabled || !configStatus().ok || !cloudState.initializedUserId) return;
    cloudState.pendingCount = Math.min(999, Number(cloudState.pendingCount || 0) + 1);
    persistState();
    setStatus(navigator.onLine ? "Changes pending" : "Offline changes pending", reason, navigator.onLine ? "warning" : "info");
    if (cloudState.autoSync !== false && cloudUser && navigator.onLine) scheduleSync();
  }

  function scheduleSync(delay = SYNC_DELAY) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({ reason:"automatic" }).catch(() => {}), delay);
  }

  function recordTombstonesAndOperations(beforeData, afterData) {
    const timestamp = nowIso();
    for (const collection of COLLECTIONS) {
      const before = new Map((Array.isArray(beforeData?.[collection]) ? beforeData[collection] : []).filter(item => item?.id).map(item => [String(item.id), item]));
      const after = new Map((Array.isArray(afterData?.[collection]) ? afterData[collection] : []).filter(item => item?.id).map(item => [String(item.id), item]));
      before.forEach((item, id) => {
        if (!after.has(id)) {
          cloudState.tombstones.push({ collection, id, deletedAt:timestamp, deviceId:currentDeviceId() });
        }
      });
      after.forEach((item, id) => {
        const previous = before.get(id);
        if (!previous || !same(previous, item)) {
          item.syncUpdatedAt = timestamp;
          item.syncUpdatedByDevice = currentDeviceId();
          item.cloudRevision = Number(item.cloudRevision || 0) + 1;
        }
        if (collection === "expenses" && previous) {
          if (!previous.paid && item.paid && item.accountDeducted && item.paymentTransactionId) {
            addPendingOperation({
              operationId:String(item.paymentTransactionId),
              expenseId:id,
              operationType:item.autoPaidAtMonthEnd ? "gym_auto_payment" : "expense_payment",
              accountName:String(item.paidFromAccount || ""),
              amount:Number(item.paidAmount || item.amount || 0),
              occurredAt:String(item.paidDate || timestamp),
              payload:{ autoPaidAtMonthEnd:Boolean(item.autoPaidAtMonthEnd) }
            });
          }
          if (previous.paid && previous.accountDeducted && !item.paid) {
            addPendingOperation({
              operationId:`restore-${String(previous.paymentTransactionId || id)}-${timestamp}`,
              expenseId:id,
              operationType:"expense_payment_restore",
              accountName:String(previous.paidFromAccount || ""),
              amount:Number(previous.paidAmount || previous.amount || 0),
              occurredAt:timestamp,
              payload:{ restoredTransactionId:String(previous.paymentTransactionId || "") }
            });
          }
        }
      });
    }
    cloudState.tombstones = dedupeTombstones(cloudState.tombstones).slice(-500);
    persistState();
  }

  function addPendingOperation(operation) {
    if (!operation?.operationId || !operation?.expenseId) return;
    const key = `${operation.operationId}|${operation.expenseId}|${operation.operationType}`;
    if (cloudState.pendingOperations.some(item => `${item.operationId}|${item.expenseId}|${item.operationType}` === key)) return;
    cloudState.pendingOperations.push({ ...operation, deviceId:currentDeviceId(), appVersion:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1" });
    cloudState.pendingOperations = cloudState.pendingOperations.slice(-500);
  }

  function dedupeTombstones(items) {
    const map = new Map();
    (items || []).forEach(item => {
      if (!item?.collection || !item?.id) return;
      const key = `${item.collection}|${item.id}`;
      const prior = map.get(key);
      if (!prior || String(item.deletedAt || "") > String(prior.deletedAt || "")) map.set(key, item);
    });
    return [...map.values()];
  }

  function wrapSaveData() {
    if (saveWrapped || typeof saveData !== "function") return;
    const originalSaveData = saveData;
    saveData = function cloudAwareSaveData(message = "Saved") {
      recordTombstonesAndOperations(lastObservedData, data);
      const result = originalSaveData(message);
      lastObservedData = safeClone(data);
      markPending(message);
      return result;
    };
    saveWrapped = true;
  }

  function buildPayload() {
    if (!cloudState.metadataSeedAt) { cloudState.metadataSeedAt = nowIso(); persistState(); }
    const timestamp = cloudState.metadataSeedAt;
    const exportedAt = nowIso();
    const payloadData = safeClone(typeof data !== "undefined" ? data : {});
    for (const collection of COLLECTIONS) {
      if (!Array.isArray(payloadData[collection])) continue;
      payloadData[collection] = payloadData[collection].map(item => ({
        ...item,
        syncUpdatedAt:item.syncUpdatedAt || timestamp,
        syncUpdatedByDevice:item.syncUpdatedByDevice || currentDeviceId(),
        cloudRevision:Number(item.cloudRevision || 1)
      }));
    }
    return {
      format:"my-finance-cloud-state-v1",
      schemaVersion:typeof SCHEMA_VERSION !== "undefined" ? SCHEMA_VERSION : 12,
      appVersion:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      exportedAt,
      updatedByDevice:currentDeviceId(),
      data:payloadData,
      tombstones:dedupeTombstones(cloudState.tombstones),
      paymentOperations:safeClone(cloudState.pendingOperations)
    };
  }

  function saveBase(payload, revision) {
    cloudState.baseRevision = Number(revision || 0);
    const base = { revision:cloudState.baseRevision, payload, savedAt:nowIso(), checksum:checksum(payload) };
    const saved = saveJson(BASE_KEY, base);
    if (!saved) saveJson(BASE_KEY, { revision:cloudState.baseRevision, payload:null, savedAt:base.savedAt, checksum:base.checksum });
    persistState();
  }

  function loadBase() {
    const base = loadJson(BASE_KEY, null);
    return base && typeof base === "object" ? base : { revision:Number(cloudState.baseRevision || 0), payload:null, checksum:"" };
  }

  function conflictSnapshot(reason, localPayload, remotePayload, mergedPayload, paths) {
    const conflicts = loadJson(CONFLICT_KEY, []);
    const entry = {
      id:globalThis.crypto?.randomUUID?.() || `conflict-${Date.now()}`,
      createdAt:nowIso(),
      reason,
      paths:(paths || []).slice(0, MAX_HISTORY_PATHS),
      localChecksum:checksum(localPayload),
      remoteChecksum:checksum(remotePayload),
      mergedChecksum:checksum(mergedPayload),
      localPayload,
      remotePayload,
      mergedPayload,
      resolved:false
    };
    const compact = [entry, ...(Array.isArray(conflicts) ? conflicts : [])].slice(0, MAX_CONFLICTS);
    if (!saveJson(CONFLICT_KEY, compact)) {
      entry.localPayload = null;
      entry.remotePayload = null;
      entry.mergedPayload = null;
      saveJson(CONFLICT_KEY, [entry, ...(Array.isArray(conflicts) ? conflicts : [])].slice(0, MAX_CONFLICTS));
    }
    try { if (typeof addSyncHistory === "function") addSyncHistory("Cloud conflict preserved", "conflict", { reason, paths:entry.paths }); } catch (error) {}
    renderConflicts();
    return entry;
  }

  function recordTimestamp(item) {
    return String(item?.syncUpdatedAt || item?.updatedAt || item?.modifiedAt || "");
  }

  function mergeValues(baseValue, localValue, remoteValue, path, conflictPaths) {
    if (same(localValue, remoteValue)) return safeClone(localValue);
    if (same(localValue, baseValue)) return safeClone(remoteValue);
    if (same(remoteValue, baseValue)) return safeClone(localValue);

    const localObject = localValue && typeof localValue === "object";
    const remoteObject = remoteValue && typeof remoteValue === "object";
    const baseObject = baseValue && typeof baseValue === "object";

    if (Array.isArray(localValue) || Array.isArray(remoteValue) || Array.isArray(baseValue)) {
      const collection = path.split(".").at(-1);
      if (COLLECTIONS.includes(collection)) return mergeRecordArray(baseValue, localValue, remoteValue, collection, path, conflictPaths);
      conflictPaths.push(path);
      return safeClone(remoteValue !== undefined ? remoteValue : localValue);
    }

    if (localObject && remoteObject && !Array.isArray(localValue) && !Array.isArray(remoteValue)) {
      const result = {};
      const keys = new Set([
        ...Object.keys(baseObject && !Array.isArray(baseValue) ? baseValue : {}),
        ...Object.keys(localValue),
        ...Object.keys(remoteValue)
      ]);
      keys.forEach(key => {
        const nextPath = path ? `${path}.${key}` : key;
        result[key] = mergeValues(baseObject ? baseValue?.[key] : undefined, localValue?.[key], remoteValue?.[key], nextPath, conflictPaths);
      });
      return result;
    }

    conflictPaths.push(path);
    return safeClone(remoteValue !== undefined ? remoteValue : localValue);
  }

  function mergeRecordArray(baseValue, localValue, remoteValue, collection, path, conflictPaths) {
    const baseMap = new Map((Array.isArray(baseValue) ? baseValue : []).filter(item => item?.id).map(item => [String(item.id), item]));
    const localMap = new Map((Array.isArray(localValue) ? localValue : []).filter(item => item?.id).map(item => [String(item.id), item]));
    const remoteMap = new Map((Array.isArray(remoteValue) ? remoteValue : []).filter(item => item?.id).map(item => [String(item.id), item]));
    const ids = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
    const tombstones = dedupeTombstones(cloudState.tombstones);
    const tombstoneMap = new Map(tombstones.filter(item => item.collection === collection).map(item => [String(item.id), item]));
    const result = [];

    ids.forEach(id => {
      const baseItem = baseMap.get(id);
      const localItem = localMap.get(id);
      const remoteItem = remoteMap.get(id);
      const tombstone = tombstoneMap.get(id);
      const latestItemTime = [recordTimestamp(localItem), recordTimestamp(remoteItem)].sort().at(-1) || "";
      if (tombstone && String(tombstone.deletedAt || "") >= latestItemTime) return;
      if (!localItem && !remoteItem) return;
      if (!baseItem) {
        if (localItem && remoteItem && !same(localItem, remoteItem)) {
          conflictPaths.push(`${path}.${id}`);
          const selected = recordTimestamp(localItem) > recordTimestamp(remoteItem) ? localItem : remoteItem;
          result.push(safeClone(selected));
        } else result.push(safeClone(localItem || remoteItem));
        return;
      }
      if (!localItem && remoteItem) {
        if (same(remoteItem, baseItem)) return;
        conflictPaths.push(`${path}.${id}.delete-versus-cloud-change`);
        result.push(safeClone(remoteItem));
        return;
      }
      if (localItem && !remoteItem) {
        if (same(localItem, baseItem)) return;
        conflictPaths.push(`${path}.${id}.local-change-versus-cloud-delete`);
        result.push(safeClone(localItem));
        return;
      }
      if (same(localItem, remoteItem)) { result.push(safeClone(localItem)); return; }
      if (same(localItem, baseItem)) { result.push(safeClone(remoteItem)); return; }
      if (same(remoteItem, baseItem)) { result.push(safeClone(localItem)); return; }

      if (collection === "expenses") {
        const paymentConflict = Boolean(
          localItem?.paymentTransactionId !== remoteItem?.paymentTransactionId ||
          Boolean(localItem?.paid) !== Boolean(remoteItem?.paid) ||
          Boolean(localItem?.accountDeducted) !== Boolean(remoteItem?.accountDeducted)
        );
        if (paymentConflict) {
          conflictPaths.push(`${path}.${id}.payment-state`);
          result.push(safeClone(remoteItem));
          return;
        }
      }
      conflictPaths.push(`${path}.${id}`);
      const selected = recordTimestamp(localItem) > recordTimestamp(remoteItem) ? localItem : remoteItem;
      result.push(safeClone(selected));
    });
    return result;
  }

  function mergePayloads(basePayload, localPayload, remotePayload) {
    const conflictPaths = [];
    const baseData = basePayload?.data || {};
    cloudState.tombstones = dedupeTombstones([
      ...(basePayload?.tombstones || []),
      ...(localPayload?.tombstones || []),
      ...(remotePayload?.tombstones || []),
      ...(cloudState.tombstones || [])
    ]);
    cloudState.pendingOperations = dedupeOperations([
      ...(basePayload?.paymentOperations || []),
      ...(localPayload?.paymentOperations || []),
      ...(remotePayload?.paymentOperations || []),
      ...(cloudState.pendingOperations || [])
    ]);
    const mergedData = mergeValues(baseData, localPayload?.data || {}, remotePayload?.data || {}, "data", conflictPaths);
    const merged = {
      format:"my-finance-cloud-state-v1",
      schemaVersion:12,
      appVersion:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      exportedAt:nowIso(),
      updatedByDevice:currentDeviceId(),
      data:mergedData,
      tombstones:dedupeTombstones(cloudState.tombstones),
      paymentOperations:dedupeOperations(cloudState.pendingOperations)
    };
    if (conflictPaths.length) conflictSnapshot("Both devices changed overlapping data; the cloud copy was retained for payment and account conflicts.", localPayload, remotePayload, merged, conflictPaths);
    return { payload:merged, conflicts:conflictPaths };
  }

  function dedupeOperations(items) {
    const map = new Map();
    (items || []).forEach(item => {
      if (!item?.operationId || !item?.expenseId || !item?.operationType) return;
      const key = `${item.operationId}|${item.expenseId}|${item.operationType}`;
      if (!map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  }

  async function loadClient() {
    if (client) return client;
    const config = getStoredConfig();
    const status = configStatus(config);
    if (!status.ok) throw new Error(status.message);
    if (typeof window.financeLoadSupabase !== "function") throw new Error("Supabase loader is missing.");
    const library = await window.financeLoadSupabase();
    const createClient = library?.createClient || library?.default?.createClient || window.supabase?.createClient;
    if (typeof createClient !== "function") throw new Error("Supabase client could not be loaded.");
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
      realtime:{ params:{ eventsPerSecond:5 } },
      global:{ headers:{ "x-client-info":`my-finance-records/${typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1"}` } }
    });
    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession || null;
      cloudUser = nextSession?.user || null;
      if (cloudUser) onSignedIn().catch(error => setStatus("Sync needs attention", error.message, "danger"));
      else onSignedOut();
    });
    return client;
  }

  async function restoreSession() {
    const status = configStatus();
    if (!status.ok) {
      setStatus("Cloud sync not configured", status.message, "warning");
      renderCloudStats();
      return;
    }
    try {
      const sdk = await loadClient();
      const result = await sdk.auth.getSession();
      if (result.error) throw result.error;
      session = result.data?.session || null;
      cloudUser = session?.user || null;
      if (cloudUser) await onSignedIn();
      else setStatus("Not connected", "Sign in to synchronize this device.", "info");
    } catch (error) {
      setStatus("Cloud sync unavailable", error.message || "Could not load the cloud client.", "danger");
    }
  }

  async function signIn(email, password) {
    const sdk = await loadClient();
    setStatus("Signing in", "Checking your cloud account…", "info");
    const result = await sdk.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    session = result.data?.session || null;
    cloudUser = result.data?.user || session?.user || null;
    if (cloudUser) await onSignedIn();
  }

  async function createAccount(email, password) {
    const sdk = await loadClient();
    setStatus("Creating account", "Creating your private cloud account…", "info");
    const result = await sdk.auth.signUp({ email, password });
    if (result.error) throw result.error;
    if (!result.data?.session) {
      setStatus("Check your email", "Confirm the Supabase sign-up email, then return and sign in.", "warning");
      return;
    }
    session = result.data.session;
    cloudUser = result.data.user;
    await onSignedIn();
  }

  async function onSignedIn() {
    if (!cloudUser) return;
    cloudState.enabled = true;
    cloudState.currentDeviceId = currentDeviceId();
    cloudState.currentDeviceName = currentDeviceName();
    persistState();
    setStatus("Connected", `Signed in as ${cloudUser.email || "your account"}.`, "success");
    await upsertDevice();
    await setupRealtime();
    const first = cloudState.initializedUserId !== cloudUser.id;
    if (first) {
      await prepareFirstSyncChoices();
      renderCloudStats();
      return;
    }
    await syncNow({ reason:"sign-in" });
  }

  function onSignedOut() {
    session = null;
    cloudUser = null;
    if (realtimeChannel && client) client.removeChannel(realtimeChannel).catch(() => {});
    realtimeChannel = null;
    setStatus("Not connected", "Sign in to synchronize this device.", "info");
    renderDevices([]);
  }

  async function signOut() {
    if (!client) return onSignedOut();
    setStatus("Signing out", "Ending cloud sync on this device…", "info");
    const result = await client.auth.signOut();
    if (result.error) throw result.error;
    onSignedOut();
  }

  async function fetchCloudRow() {
    if (!client || !cloudUser) return null;
    const result = await client.from(CLOUD_TABLE).select("user_id,payload,revision,updated_at,updated_by_device,app_version,schema_version").eq("user_id", cloudUser.id).maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function prepareFirstSyncChoices() {
    const row = await fetchCloudRow();
    const cloudExists = Boolean(row?.payload);
    const download = document.getElementById("cloudInitialDownload");
    if (download) download.disabled = !cloudExists;
    const message = document.getElementById("cloudFirstSyncMessage");
    if (message) message.textContent = cloudExists
      ? "This cloud account already contains finance data. Choose whether this device uploads, downloads, or merges."
      : "The cloud account is empty. Upload this device’s records to create the first synchronized copy.";
    const upload = document.getElementById("cloudInitialUpload");
    const merge = document.getElementById("cloudInitialMerge");
    if (!cloudExists && upload) upload.checked = true;
    if (!cloudExists && merge) merge.disabled = true;
    if (cloudExists && merge) merge.disabled = false;
    renderCloudStats();
  }

  async function initializeFirstSync(mode) {
    if (!cloudUser) throw new Error("Sign in first.");
    if (!navigator.onLine) throw new Error("Connect to the internet for the first cloud synchronization.");
    setStatus("Preparing first sync", "Creating a recovery point before cloud initialization…", "info");
    createLocalRecoveryPoint("Before first cloud sync");
    const row = await fetchCloudRow();
    const localPayload = buildPayload();
    let finalPayload = localPayload;
    let finalRevision = Number(row?.revision || 0);

    if (mode === "download") {
      if (!row?.payload) throw new Error("No cloud data is available to download.");
      finalPayload = row.payload;
      applyPayload(finalPayload, "Cloud records downloaded");
      finalRevision = Number(row.revision || 0);
    } else if (mode === "merge" && row?.payload) {
      const merged = mergePayloads(null, localPayload, row.payload);
      finalPayload = merged.payload;
      const updated = await updateCloudRow(finalPayload, Number(row.revision || 0));
      finalRevision = Number(updated.revision || row.revision + 1);
      applyPayload(finalPayload, "Device and cloud records merged");
    } else if (row?.payload) {
      conflictSnapshot("Cloud data was replaced during first-device upload. The previous cloud copy is preserved here.", localPayload, row.payload, localPayload, ["first-sync.upload-replace"]);
      const updated = await updateCloudRow(localPayload, Number(row.revision || 0));
      finalRevision = Number(updated.revision || row.revision + 1);
    } else {
      const inserted = await insertCloudRow(localPayload);
      finalRevision = Number(inserted.revision || 1);
    }

    cloudState.initializedUserId = cloudUser.id;
    cloudState.pendingCount = 0;
    cloudState.lastSyncAt = nowIso();
    saveBase(finalPayload, finalRevision);
    persistState();
    await syncPaymentOperations();
    await upsertDevice();
    setStatus("Synced", "MacBook and iPhone can now use this same cloud account.", "success");
    renderCloudStats();
  }

  async function insertCloudRow(payload) {
    const result = await client.from(CLOUD_TABLE).insert({
      user_id:cloudUser.id,
      payload,
      revision:1,
      updated_by_device:currentDeviceId(),
      app_version:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      schema_version:12
    }).select().single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function updateCloudRow(payload, expectedRevision) {
    const nextRevision = Number(expectedRevision || 0) + 1;
    const result = await client.from(CLOUD_TABLE).update({
      payload,
      revision:nextRevision,
      updated_by_device:currentDeviceId(),
      app_version:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      schema_version:12
    }).eq("user_id", cloudUser.id).eq("revision", Number(expectedRevision || 0)).select().maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new Error("Cloud data changed on another device. Synchronizing again.");
    return result.data;
  }

  function applyPayload(payload, message = "Cloud records applied") {
    if (!payload?.data) throw new Error("The cloud copy does not contain valid finance records.");
    suppressQueue = true;
    try {
      data = normalizeData(safeClone(payload.data));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastObservedData = safeClone(data);
      cloudState.tombstones = dedupeTombstones([...(cloudState.tombstones || []), ...(payload.tombstones || [])]);
      cloudState.pendingOperations = dedupeOperations([...(cloudState.pendingOperations || []), ...(payload.paymentOperations || [])]);
      if (typeof renderAll === "function") renderAll(false);
      if (typeof renderV12Settings === "function") renderV12Settings();
      try { if (typeof addSyncHistory === "function") addSyncHistory(message, "success", { cloud:true, checksum:checksum(payload) }); } catch (error) {}
    } finally {
      suppressQueue = false;
    }
  }

  async function syncNow({ reason = "manual", retry = true } = {}) {
    if (syncing) return;
    if (!cloudUser || cloudState.initializedUserId !== cloudUser.id) {
      renderCloudStats();
      return;
    }
    if (!navigator.onLine) {
      setStatus("Offline", `${cloudState.pendingCount || 0} local change${cloudState.pendingCount === 1 ? "" : "s"} will sync after reconnecting.`, "info");
      return;
    }
    syncing = true;
    setStatus("Syncing", `Comparing this device with the cloud (${reason})…`, "info");
    try {
      const remoteRow = await fetchCloudRow();
      if (!remoteRow) {
        const localPayload = buildPayload();
        const inserted = await insertCloudRow(localPayload);
        saveBase(localPayload, inserted.revision || 1);
      } else {
        const remotePayload = remoteRow.payload;
        const base = loadBase();
        const localPayload = buildPayload();
        const localChanged = base.payload ? !payloadSame(localPayload, base.payload) : Boolean(cloudState.pendingCount);
        const remoteChanged = Number(remoteRow.revision || 0) !== Number(base.revision || cloudState.baseRevision || 0) || (base.payload && !payloadSame(remotePayload, base.payload));

        if (!localChanged && remoteChanged) {
          applyPayload(remotePayload, "Cloud changes downloaded");
          saveBase(remotePayload, remoteRow.revision);
        } else if (localChanged && !remoteChanged) {
          const updated = await updateCloudRow(localPayload, remoteRow.revision);
          saveBase(localPayload, updated.revision);
        } else if (localChanged && remoteChanged) {
          const merged = mergePayloads(base.payload, localPayload, remotePayload);
          const updated = await updateCloudRow(merged.payload, remoteRow.revision);
          applyPayload(merged.payload, merged.conflicts.length ? "Cloud changes merged with recoverable conflicts" : "Cloud changes merged");
          saveBase(merged.payload, updated.revision);
        } else {
          saveBase(remotePayload, remoteRow.revision);
        }
        cloudState.lastRemoteUpdatedAt = remoteRow.updated_at || "";
      }
      await syncPaymentOperations();
      await upsertDevice();
      cloudState.pendingCount = 0;
      cloudState.lastSyncAt = nowIso();
      cloudState.lastError = "";
      persistState();
      setStatus("Synced", "This device matches the latest cloud copy.", "success");
    } catch (error) {
      if (retry && /changed on another device/i.test(error.message || "")) {
        syncing = false;
        await new Promise(resolve => setTimeout(resolve, 450));
        return syncNow({ reason:"conflict retry", retry:false });
      }
      setStatus("Sync needs attention", error.message || "Cloud synchronization failed.", "danger");
      throw error;
    } finally {
      syncing = false;
      renderCloudStats();
    }
  }

  async function syncPaymentOperations() {
    if (!client || !cloudUser) return;
    const extracted = [];
    (data.expenses || []).forEach(item => {
      if (!item?.id || !item?.paid || !item?.accountDeducted || !item?.paymentTransactionId) return;
      extracted.push({
        operationId:String(item.paymentTransactionId),
        expenseId:String(item.id),
        operationType:item.autoPaidAtMonthEnd ? "gym_auto_payment" : "expense_payment",
        accountName:String(item.paidFromAccount || ""),
        amount:Number(item.paidAmount || item.amount || 0),
        occurredAt:String(item.paidDate || nowIso()),
        deviceId:String(item.syncUpdatedByDevice || currentDeviceId()),
        appVersion:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
        payload:{ autoPaidAtMonthEnd:Boolean(item.autoPaidAtMonthEnd) }
      });
    });
    const operations = dedupeOperations([...(cloudState.pendingOperations || []), ...extracted]);
    if (!operations.length) return;
    const rows = operations.map(item => ({
      user_id:cloudUser.id,
      operation_id:item.operationId,
      expense_id:item.expenseId,
      operation_type:item.operationType,
      account_name:item.accountName || "",
      amount:Number(item.amount || 0),
      occurred_at:item.occurredAt || nowIso(),
      device_id:item.deviceId || currentDeviceId(),
      app_version:item.appVersion || (typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1"),
      payload:item.payload || {}
    }));
    const result = await client.from(PAYMENT_TABLE).upsert(rows, { onConflict:"user_id,operation_id,expense_id,operation_type", ignoreDuplicates:true });
    if (result.error) throw result.error;
    cloudState.pendingOperations = operations;
    persistState();
  }

  async function upsertDevice() {
    if (!client || !cloudUser) return;
    const id = currentDeviceId();
    const name = currentDeviceName();
    const row = {
      user_id:cloudUser.id,
      device_id:id,
      device_name:name,
      platform:navigator.userAgent || navigator.platform || "Browser",
      app_version:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      last_seen_at:nowIso(),
      last_sync_at:cloudState.lastSyncAt || null
    };
    const result = await client.from(DEVICE_TABLE).upsert(row, { onConflict:"user_id,device_id" });
    if (result.error) throw result.error;
    await loadDevices();
    try {
      if (typeof appMeta !== "undefined" && appMeta.devices?.[id]) {
        appMeta.devices[id].name = name;
        appMeta.devices[id].lastSync = cloudState.lastSyncAt || appMeta.devices[id].lastSync;
        if (typeof writeMeta === "function") writeMeta();
      }
    } catch (error) {}
  }

  async function loadDevices() {
    if (!client || !cloudUser) return renderDevices([]);
    const result = await client.from(DEVICE_TABLE).select("device_id,device_name,platform,app_version,last_seen_at,last_sync_at").eq("user_id", cloudUser.id).order("last_seen_at", { ascending:false });
    if (result.error) throw result.error;
    renderDevices(result.data || []);
  }

  function renderDevices(devices) {
    const body = document.getElementById("cloudDevicesBody");
    if (!body) return;
    body.innerHTML = devices.length ? devices.map(device => {
      const current = device.device_id === currentDeviceId();
      const seen = device.last_seen_at ? new Intl.DateTimeFormat("en-PH", { dateStyle:"medium", timeStyle:"short" }).format(new Date(device.last_seen_at)) : "Never";
      return `<tr><td><strong>${escapeHtml(device.device_name || "Device")}</strong><br><small>${escapeHtml(device.platform || "Browser")}</small></td><td><span class="v12-chip ${current ? "success" : "info"}">${current ? "Current" : "Connected"}</span></td><td>${escapeHtml(seen)}</td><td>${current ? "—" : `<button class="button button-secondary button-small" type="button" data-remove-cloud-device="${escapeHtml(device.device_id)}">Remove</button>`}</td></tr>`;
    }).join("") : `<tr><td colspan="4"><div class="v12-empty">No cloud devices are listed yet.</div></td></tr>`;
  }

  async function removeDevice(deviceId) {
    if (!client || !cloudUser || !deviceId || deviceId === currentDeviceId()) return;
    const result = await client.from(DEVICE_TABLE).delete().eq("user_id", cloudUser.id).eq("device_id", deviceId);
    if (result.error) throw result.error;
    await loadDevices();
    showToast("Old device entry removed. Finance records remain in the cloud.", "success");
  }

  async function setupRealtime() {
    if (!client || !cloudUser) return;
    if (realtimeChannel) await client.removeChannel(realtimeChannel);
    realtimeChannel = client.channel(`finance-cloud-${cloudUser.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:CLOUD_TABLE, filter:`user_id=eq.${cloudUser.id}` }, payload => {
        const sourceDevice = payload?.new?.updated_by_device;
        const remoteRevision = Number(payload?.new?.revision || 0);
        if (sourceDevice === currentDeviceId() || remoteRevision <= Number(cloudState.baseRevision || 0)) return;
        setStatus("Cloud change received", "Downloading the latest update from another device…", "info");
        scheduleSync(280);
      })
      .subscribe();
  }

  function createLocalRecoveryPoint(label) {
    const backup = {
      format:"my-finance-cloud-recovery-v1",
      label,
      createdAt:nowIso(),
      appVersion:typeof APP_VERSION !== "undefined" ? APP_VERSION : "12.19.1",
      schemaVersion:12,
      data:safeClone(data)
    };
    const key = `simple-finance-cloud-recovery-${Date.now()}`;
    try { localStorage.setItem(key, JSON.stringify(backup)); } catch (error) {}
    return backup;
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function renderConflicts() {
    const node = document.getElementById("cloudConflictList");
    const chip = document.getElementById("cloudConflictCount");
    if (!node || !chip) return;
    const conflicts = loadJson(CONFLICT_KEY, []);
    const unresolved = (Array.isArray(conflicts) ? conflicts : []).filter(item => !item.resolved);
    chip.textContent = unresolved.length ? `${unresolved.length} to review` : "No conflicts";
    chip.className = `v12-chip ${unresolved.length ? "warning" : "success"}`;
    node.innerHTML = unresolved.length ? unresolved.map(item => `<article class="cloud-conflict-item"><div><strong>${escapeHtml(item.reason || "Cloud conflict")}</strong><small>${escapeHtml(item.createdAt ? new Intl.DateTimeFormat("en-PH", { dateStyle:"medium", timeStyle:"short" }).format(new Date(item.createdAt)) : "")}</small><small>${escapeHtml((item.paths || []).slice(0,3).join(" · ") || "Overlapping changes")}</small></div><div class="cloud-conflict-actions"><button class="button button-secondary button-small" type="button" data-download-cloud-conflict="${escapeHtml(item.id)}">Download copies</button>${item.localPayload ? `<button class="button button-secondary button-small" type="button" data-restore-cloud-conflict="${escapeHtml(item.id)}">Restore local copy</button>` : ""}<button class="button button-primary button-small" type="button" data-resolve-cloud-conflict="${escapeHtml(item.id)}">Keep current</button></div></article>`).join("") : `<div class="v12-empty">No unresolved cloud conflicts.</div>`;
  }

  function conflictById(id) {
    const conflicts = loadJson(CONFLICT_KEY, []);
    return { conflicts:Array.isArray(conflicts) ? conflicts : [], item:(Array.isArray(conflicts) ? conflicts : []).find(entry => entry.id === id) };
  }

  function resolveConflict(id) {
    const result = conflictById(id);
    if (!result.item) return;
    result.item.resolved = true;
    result.item.resolvedAt = nowIso();
    saveJson(CONFLICT_KEY, result.conflicts);
    renderConflicts();
  }

  function downloadConflict(id) {
    const result = conflictById(id);
    if (!result.item) return;
    downloadJson(`finance-cloud-conflict-${id}.json`, result.item);
  }

  async function restoreConflictLocal(id) {
    const result = conflictById(id);
    if (!result.item?.localPayload?.data) throw new Error("The preserved local copy is unavailable.");
    if (!confirm("Restore the preserved local snapshot? A recovery point will be saved first, and the restored copy will sync as a new change.")) return;
    createLocalRecoveryPoint("Before restoring cloud conflict");
    applyPayload(result.item.localPayload, "Preserved local conflict copy restored");
    resolveConflict(id);
    markPending("Conflict copy restored");
    await syncNow({ reason:"conflict restore" });
  }

  function bindEvents() {
    document.getElementById("cloudSyncStatusButton")?.addEventListener("click", () => {
      goToPage("settings", { smooth:false });
      activateSettingsPanel("cloud", true);
    });
    document.getElementById("saveCloudConfig")?.addEventListener("click", () => {
      const config = {
        supabaseUrl:document.getElementById("cloudConfigUrl").value.trim(),
        supabasePublishableKey:document.getElementById("cloudConfigKey").value.trim()
      };
      const status = configStatus(config);
      if (!status.ok) return showToast(status.message, "warning");
      saveJson(CONFIG_KEY, config);
      showToast("Cloud configuration saved on this device. Reloading…", "success");
      setTimeout(() => location.reload(), 350);
    });
    document.getElementById("clearCloudConfig")?.addEventListener("click", () => {
      if (!confirm("Remove the cloud project configuration from this device? Local finance records will remain.")) return;
      localStorage.removeItem(CONFIG_KEY);
      showToast("Device cloud configuration removed. Reloading…", "info");
      setTimeout(() => location.reload(), 350);
    });
    document.getElementById("cloudSignIn")?.addEventListener("click", async () => {
      const email = document.getElementById("cloudAuthEmail").value.trim();
      const password = document.getElementById("cloudAuthPassword").value;
      if (!email || password.length < 6) return showToast("Enter your email and password.", "warning");
      try { await signIn(email, password); } catch (error) { setStatus("Sign-in failed", error.message, "danger"); }
    });
    document.getElementById("cloudCreateAccount")?.addEventListener("click", async () => {
      const email = document.getElementById("cloudAuthEmail").value.trim();
      const password = document.getElementById("cloudAuthPassword").value;
      if (!email || password.length < 6) return showToast("Use a valid email and a password with at least 6 characters.", "warning");
      try { await createAccount(email, password); } catch (error) { setStatus("Account creation failed", error.message, "danger"); }
    });
    document.getElementById("cloudSyncNow")?.addEventListener("click", () => syncNow({ reason:"manual" }).catch(error => showToast(error.message, "warning")));
    document.getElementById("cloudSignOut")?.addEventListener("click", () => signOut().catch(error => showToast(error.message, "warning")));
    document.getElementById("cloudAutoSync")?.addEventListener("change", event => {
      cloudState.autoSync = Boolean(event.target.checked);
      persistState();
      setStatus(cloudState.autoSync ? "Automatic sync enabled" : "Manual sync only", cloudState.autoSync ? "Changes will synchronize while the app is open and online." : "Use Sync now to exchange changes between devices.", "info");
      if (cloudState.autoSync) scheduleSync(100);
    });
    document.getElementById("cloudInitialConfirm")?.addEventListener("click", async () => {
      const mode = document.querySelector('input[name="cloudInitialMode"]:checked')?.value || "upload";
      try { await initializeFirstSync(mode); } catch (error) { setStatus("First sync failed", error.message, "danger"); }
    });
    document.getElementById("cloudExportBeforeFirst")?.addEventListener("click", () => {
      downloadJson(`my-finance-before-cloud-${new Date().toISOString().slice(0,10)}.json`, createLocalRecoveryPoint("Manual pre-cloud export"));
    });
    document.getElementById("cloudSaveDeviceName")?.addEventListener("click", async () => {
      const value = document.getElementById("cloudDeviceName").value.trim().slice(0,60);
      if (!value) return showToast("Enter a device name.", "warning");
      cloudState.currentDeviceName = value;
      persistState();
      try {
        const id = currentDeviceId();
        if (typeof appMeta !== "undefined" && appMeta.devices?.[id]) {
          appMeta.devices[id].name = value;
          if (typeof writeMeta === "function") writeMeta();
        }
      } catch (error) {}
      try { await upsertDevice(); setStatus("Device renamed", value, "success"); } catch (error) { setStatus("Rename needs sync", error.message, "warning"); }
    });
    document.getElementById("cloudDevicesBody")?.addEventListener("click", event => {
      const button = event.target.closest("[data-remove-cloud-device]");
      if (!button) return;
      if (!confirm("Remove this old device entry? Cloud finance records will not be deleted.")) return;
      removeDevice(button.dataset.removeCloudDevice).catch(error => showToast(error.message, "warning"));
    });
    document.getElementById("cloudConflictList")?.addEventListener("click", event => {
      const download = event.target.closest("[data-download-cloud-conflict]");
      const restore = event.target.closest("[data-restore-cloud-conflict]");
      const resolve = event.target.closest("[data-resolve-cloud-conflict]");
      if (download) downloadConflict(download.dataset.downloadCloudConflict);
      if (restore) restoreConflictLocal(restore.dataset.restoreCloudConflict).catch(error => showToast(error.message, "warning"));
      if (resolve) resolveConflict(resolve.dataset.resolveCloudConflict);
    });
    window.addEventListener("online", () => { setStatus("Back online", "Synchronizing pending changes…", "info"); if (cloudState.autoSync !== false) scheduleSync(150); });
    window.addEventListener("offline", () => setStatus("Offline", `${cloudState.pendingCount || 0} change${cloudState.pendingCount === 1 ? "" : "s"} waiting.`, "info"));
    window.addEventListener("focus", () => { if (cloudState.autoSync !== false && cloudUser) scheduleSync(250); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && cloudState.autoSync !== false && cloudUser) scheduleSync(250); });
    window.addEventListener("storage", event => {
      if (event.key === STORAGE_KEY && !suppressQueue) {
        try { lastObservedData = safeClone(normalizeData(JSON.parse(event.newValue || "{}"))); } catch (error) {}
        markPending("Another tab changed finance records");
      }
    });
  }

  async function initialize() {
    if (initialized) return;
    initialized = true;
    wrapSaveData();
    bindEvents();
    renderCloudStats();
    const status = configStatus();
    if (!status.ok) {
      setStatus("Cloud sync not configured", status.message, "warning");
      return;
    }
    await restoreSession();
    setInterval(() => {
      if (cloudUser && cloudState.autoSync !== false && navigator.onLine && !document.hidden) syncNow({ reason:"periodic" }).catch(() => {});
    }, 2 * 60 * 1000);
  }

  window.FinanceCloudSync = {
    initialize,
    syncNow,
    buildPayload,
    mergePayloads,
    get status() { return { ...cloudState, signedIn:Boolean(cloudUser), email:cloudUser?.email || "" }; }
  };
  window.FinanceCloudSyncInternals = { stable, checksum, payloadSame, mergeValues, mergePayloads, dedupeTombstones, dedupeOperations };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize().catch(error => setStatus("Cloud sync unavailable", error.message, "danger")), { once:true });
  else initialize().catch(error => setStatus("Cloud sync unavailable", error.message, "danger"));
})();
