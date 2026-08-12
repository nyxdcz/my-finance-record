"use strict";
/* My Finance Records V14.0.12 · Encrypted profile-scoped Cloud Sync 3.0.
   Local storage remains the immediate working copy. Cloud Schema V3 exchanges only
   changed encrypted records, commits related changes atomically, and preserves an immutable audit trail. */
(function financeCloudSyncV3Bootstrap() {
  const APP_VERSION_FALLBACK = "14.0.12";
  const APP_VERSION_CODE = 130000;
  const CLOUD_SCHEMA_VERSION = 3;
  const CORE_SCHEMA_VERSION = 12;
  const PROFILE_ARCH = () => window.FinanceProfileArchitecture || null;
  const LOCAL_PROFILE_ID = PROFILE_ARCH()?.activeProfileId?.() || "profile-personal";
  const META_KEY = `simple-finance-cloud-sync-v3:${LOCAL_PROFILE_ID}`;
  const BASE_KEY = `simple-finance-cloud-record-base-v3:${LOCAL_PROFILE_ID}`;
  const QUEUE_KEY = `simple-finance-cloud-record-queue-v3:${LOCAL_PROFILE_ID}`;
  const CONFLICT_KEY = `simple-finance-cloud-record-conflicts-v3:${LOCAL_PROFILE_ID}`;
  const CONFIG_KEY = "simple-finance-cloud-config-v1";
  const LEGACY_META_KEY = "simple-finance-cloud-sync-v1";
  const LEGACY_CLOUD_TABLE = "finance_cloud_state";
  const DEVICE_TABLE = "finance_v3_devices";
  const AUDIT_TABLE = "finance_v3_audit";
  const SYNC_DELAY = 850;
  const MAX_PULL_PAGES = 12;
  const MAX_BATCH_RECORDS = 350;
  const MAX_CONFLICTS = 60;
  const RETRY_BASE_MS = 2000;
  const RETRY_MAX_MS = 5 * 60 * 1000;
  const ARRAY_COLLECTIONS = ["expenses", "projects", "incomeRecords", "savingsGoals",
    "accountLedger", "accountReconciliations", "budgetTemplates", "expenseTemplates"
  ];
  const MAP_COLLECTIONS = ["monthlyReports", "monthlyChecklists", "monthlyBudgets", "iconLibrary"];
  const FINANCIAL_COLLECTIONS = new Set(["expenses", "incomeRecords", "accounts", "accountLedger", "accountReconciliations", "monthlyBudgets", "budgetTemplates"]);
  const KNOWN_TOP_LEVEL = new Set([
    ...ARRAY_COLLECTIONS, ...MAP_COLLECTIONS,
    "accounts", "accountTypes", "accountOrder", "accountIcons",
    "expenseRecurrenceSkips", "savingsSettings", "projectCalendarSettings",
    "salaryWorkSettings", "ledgerSettings", "budgetSettings", "productivitySettings", "reminderSettings"
  ]);

  let client = null;
  let session = null;
  let cloudUser = null;
  let realtimeChannel = null;
  let syncTimer = null;
  let retryTimer = null;
  let syncing = false;
  let passwordRecoveryActive = false;
  let passwordRecoveryRouteActive = false;
  let passwordRecoveryError = null;
  let suppressQueue = false;
  let saveWrapped = false;
  let initialized = false;
  let lastObservedData = clone(typeof data !== "undefined" ? data : {});

  const defaultState = () => ({
    enabled:true,
    autoSync:true,
    initializedUserId:"",
    initializedProfileId:"",
    profileRole:"owner",
    lastAuditId:0,
    lastSyncAt:"",
    lastPullAt:"",
    lastPushAt:"",
    lastError:"",
    status:"Not connected",
    currentDeviceId:"",
    currentDeviceName:"",
    requiredAppVersionCode:APP_VERSION_CODE,
    cloudSchemaVersion:CLOUD_SCHEMA_VERSION,
    migratedFromV1:false,
    realtimeStatus:"Disconnected",
    lastHealthAt:""
  });

  let state = { ...defaultState(), ...loadJson(META_KEY, {}) };
  let baseRecords = normalizeRecordStore(loadJson(BASE_KEY, {}));
  let pending = normalizeQueue(loadJson(QUEUE_KEY, {}));
  let conflicts = normalizeConflicts(loadJson(CONFLICT_KEY, []));

  function appVersion() {
    return typeof APP_VERSION !== "undefined" ? APP_VERSION : APP_VERSION_FALLBACK;
  }

  function cloudProfileId() { return String(PROFILE_ARCH()?.cloudProfileId?.() || ""); }
  function profileRole() { return String(PROFILE_ARCH()?.activeRole?.() || "owner"); }
  function profileCanWrite() { return PROFILE_ARCH()?.canWrite?.() !== false; }
  function initializedScope() { return cloudUser && cloudProfileId() ? `${cloudUser.id}:${cloudProfileId()}` : ""; }
  function requireCloudProfile({ write = false } = {}) {
    const architecture = PROFILE_ARCH();
    if (!architecture) throw new Error("Profile architecture is unavailable. Reload V13.0.0.");
    if (!cloudProfileId()) throw new Error("Open Settings → Profiles & Security and create or join an encrypted cloud profile first.");
    if (!architecture.isCloudUnlocked?.()) throw new Error("Unlock this finance profile’s encryption passphrase before cloud sync.");
    if (write && !profileCanWrite()) throw new Error("This Viewer profile is read-only. It can download cloud changes but cannot upload records.");
    return cloudProfileId();
  }

  async function encryptRecordPayload(payload, collection, recordId) {
    const architecture = PROFILE_ARCH();
    if (!architecture?.encryptCloudPayload) throw new Error("Client-side cloud encryption is unavailable.");
    return architecture.encryptCloudPayload(payload || {}, { collection, recordId });
  }

  async function decryptRecordPayload(payload, collection, recordId) {
    const architecture = PROFILE_ARCH();
    if (!payload?.__financeEncrypted) throw new Error(`Cloud record ${collection}/${recordId} is not encrypted.`);
    if (!architecture?.decryptCloudPayload) throw new Error("Client-side cloud decryption is unavailable.");
    return architecture.decryptCloudPayload(payload, { collection, recordId });
  }

  async function decryptRow(raw) {
    const collection = String(raw?.collection || "");
    const recordId = String(raw?.record_id ?? raw?.recordId ?? "");
    return { ...raw, payload:await decryptRecordPayload(raw?.payload, collection, recordId) };
  }

  async function decryptRows(rows = []) {
    return Promise.all((rows || []).map(decryptRow));
  }

  function clone(value) {
    try { if (typeof structuredClone === "function") return structuredClone(value); } catch (error) {}
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) { return fallback; }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { return false; }
  }

  function persist() {
    return [
      saveJson(META_KEY, state),
      saveJson(BASE_KEY, baseRecords),
      saveJson(QUEUE_KEY, pending),
      saveJson(CONFLICT_KEY, conflicts.slice(0, MAX_CONFLICTS))
    ].every(Boolean);
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
  function same(a, b) { return checksum(a) === checksum(b); }
  function nowIso() { return new Date().toISOString(); }
  function uid(prefix = "sync") { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function recordKey(collection, recordId) { return `${collection}\u001f${recordId}`; }
  function splitKey(key) { const at = key.indexOf("\u001f"); return [key.slice(0, at), key.slice(at + 1)]; }
  function keyToken(key) { return encodeURIComponent(String(key || "")); }
  function keyFromToken(token) { try { return decodeURIComponent(String(token || "")); } catch (error) { return String(token || ""); } }
  function isObject(value) { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
  function isSettingsPreferences(collection, recordId) { return collection === "settings" && recordId === "preferences"; }
  function sanitizeRecordPayload(collection, recordId, payload) {
    const output = clone(isObject(payload) ? payload : {});
    if (!isSettingsPreferences(collection, recordId) || !isObject(output.ledgerSettings)) return output;
    output.ledgerSettings = clone(output.ledgerSettings); delete output.ledgerSettings.lastRecalculatedAt; return output;
  }
  function deepMerge(original, incoming) {
    if (!isObject(original) || !isObject(incoming)) return clone(incoming === undefined ? original : incoming);
    const result = clone(original);
    Object.keys(incoming).forEach(key => {
      result[key] = isObject(result[key]) && isObject(incoming[key]) ? deepMerge(result[key], incoming[key]) : clone(incoming[key]);
    });
    return result;
  }
  function threeWayMerge(baseValue, localValue, remoteValue, path = "", overlap = []) {
    if (same(localValue, remoteValue)) return clone(localValue);
    if (same(localValue, baseValue)) return clone(remoteValue);
    if (same(remoteValue, baseValue)) return clone(localValue);
    if (isObject(localValue) && isObject(remoteValue) && (baseValue === undefined || isObject(baseValue))) {
      const result = {};
      const keys = new Set([...Object.keys(baseValue || {}), ...Object.keys(localValue), ...Object.keys(remoteValue)]);
      keys.forEach(key => {
        result[key] = threeWayMerge(baseValue?.[key], localValue?.[key], remoteValue?.[key], path ? `${path}.${key}` : key, overlap);
      });
      return result;
    }
    overlap.push(path || "record");
    return clone(localValue);
  }
  function normalizeRecordStore(value) {
    const output = {};
    if (!isObject(value)) return output;
    Object.entries(value).forEach(([key, row]) => {
      if (!row || !row.collection || !row.recordId) return;
      output[key] = {
        collection:String(row.collection), recordId:String(row.recordId), payload:sanitizeRecordPayload(String(row.collection),String(row.recordId),row.payload),
        sortIndex:Number(row.sortIndex || 0), revision:Number(row.revision || 0), deletedAt:row.deletedAt || "", updatedAt:row.updatedAt || "",
        updatedByDevice:row.updatedByDevice || "", appVersion:row.appVersion || "",
        appVersionCode:Number(row.appVersionCode || 0), minWriterVersionCode:Number(row.minWriterVersionCode || APP_VERSION_CODE)
      };
    });
    return output;
  }
  function normalizeQueue(value) {
    const output = {};
    if (!isObject(value)) return output;
    Object.entries(value).forEach(([key, item]) => {
      if (!item || !item.collection || !item.recordId) return;
      output[key] = {
        ...item, payload:sanitizeRecordPayload(String(item.collection),String(item.recordId),item.payload),
        basePayload:item.basePayload == null ? null : sanitizeRecordPayload(String(item.collection),String(item.recordId),item.basePayload),
        baseRevision:Number(item.baseRevision || 0), sortIndex:Number(item.sortIndex || 0), baseSortIndex:Number(item.baseSortIndex || 0), deleted:Boolean(item.deleted),
        attempts:Number(item.attempts || 0), nextAttemptAt:Number(item.nextAttemptAt || 0),
        status:["pending","retrying","error","conflict"].includes(item.status) ? item.status : "pending"
      };
    });
    return output;
  }
  function normalizeConflicts(value) {
    return (Array.isArray(value) ? value : []).filter(item => item?.id && item?.key).slice(0, MAX_CONFLICTS).map(item => ({ ...item,
      localPayload:sanitizeRecordPayload(String(item.collection || ""),String(item.recordId || ""),item.localPayload),
      remotePayload:sanitizeRecordPayload(String(item.collection || ""),String(item.recordId || ""),item.remotePayload),
      basePayload:item.basePayload == null ? null : sanitizeRecordPayload(String(item.collection || ""),String(item.recordId || ""),item.basePayload),
      localSortIndex:item.localSortIndex == null ? null : Number(item.localSortIndex || 0), localDeleted:Boolean(item.localDeleted),
      remoteRevision:Number(item.remoteRevision || 0), remoteSortIndex:item.remoteSortIndex == null ? null : Number(item.remoteSortIndex || 0), remoteMissing:Boolean(item.remoteMissing)
    }));
  }
  function reconcileDerivedSettingsState() {
    const key = recordKey("settings","preferences"), local = pending[key], base = baseRecords[key], conflict = conflicts.find(item => item.key === key && !item.resolved);
    if (!local) return false;
    if (!conflict) {
      if (!local.deleted && base && !base.deletedAt && same(local.payload,base.payload) && Number(local.sortIndex || 0) === Number(base.sortIndex || 0)) {
        delete pending[key]; conflicts = conflicts.filter(item => item.key !== key); return true;
      }
      return false;
    }
    if (local.deleted || conflict.remoteDeletedAt) return false;
    const remotePayload = sanitizeRecordPayload("settings","preferences",conflict.remotePayload || base?.payload || {});
    const overlaps = [], merged = threeWayMerge(local.basePayload,local.payload,remotePayload,"",overlaps);
    if (overlaps.length) return false;
    const remoteRevision = Math.max(Number(conflict.remoteRevision || 0),Number(base?.revision || 0)), remoteSortIndex = Number(base?.sortIndex || 0);
    baseRecords[key] = { ...(base || {}), collection:"settings", recordId:"preferences", payload:remotePayload, sortIndex:remoteSortIndex, revision:remoteRevision, deletedAt:"" };
    if (same(merged,remotePayload) && Number(local.sortIndex || 0) === remoteSortIndex) delete pending[key];
    else {
      local.payload = merged; local.basePayload = clone(remotePayload);
      local.baseRevision = remoteRevision; local.baseSortIndex = remoteSortIndex;
      local.status = "pending"; local.attempts = 0; local.nextAttemptAt = 0;
      local.lastError = "Removed device-local ledger metadata and safely merged cloud settings.";
    }
    conflicts = conflicts.filter(item => item.key !== key); return true;
  }
  function currentDeviceId() {
    try {
      if (typeof ensureCurrentDevice === "function") ensureCurrentDevice();
      const id = typeof appMeta !== "undefined" ? appMeta.currentDeviceId : "";
      if (id) return String(id);
    } catch (error) {}
    if (!state.currentDeviceId) state.currentDeviceId = uid("device");
    persist();
    return state.currentDeviceId;
  }

  function currentDeviceName() {
    try {
      const id = currentDeviceId();
      const saved = typeof appMeta !== "undefined" ? appMeta.devices?.[id]?.name : "";
      if (saved) return saved;
    } catch (error) {}
    if (state.currentDeviceName) return state.currentDeviceName;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Nyco’s iPhone" : /Mac/i.test(navigator.platform || navigator.userAgent) ? "Nyco’s MacBook" : "My device";
  }

  function getStoredConfig() {
    const fileConfig = window.FINANCE_SYNC_CONFIG || {};
    const localConfig = loadJson(CONFIG_KEY, {});
    return {
      supabaseUrl:String(localConfig.supabaseUrl || fileConfig.supabaseUrl || "").trim().replace(/\/+$/, ""),
      supabasePublishableKey:String(localConfig.supabasePublishableKey || fileConfig.supabasePublishableKey || "").trim()
    };
  }

  function configStatus(config = getStoredConfig()) {
    if (!config.supabaseUrl || !config.supabasePublishableKey) return { ok:false, message:"Add your Supabase project URL and publishable key." };
    if (!/^https:\/\//i.test(config.supabaseUrl)) return { ok:false, message:"Enter a valid HTTPS Supabase project URL." };
    if (/^sb_secret_/i.test(config.supabasePublishableKey) || /service[_-]?role/i.test(config.supabasePublishableKey)) return { ok:false, message:"Secret and service-role keys are blocked. Use a publishable or legacy anon key." };
    if (config.supabasePublishableKey.length < 20) return { ok:false, message:"The publishable key appears incomplete." };
    return { ok:true, message:"Cloud project configured." };
  }

  function recordLabel(collection, payload, recordId) {
    const labels = {
      expenses:"Expense", projects:"Project", incomeRecords:"Income", savingsGoals:"Savings goal",
      accountLedger:"Ledger entry", accountReconciliations:"Reconciliation", accounts:"Account",
      monthlyReports:"Monthly report", monthlyChecklists:"Monthly checklist", monthlyBudgets:"Monthly budget", budgetTemplates:"Budget template", iconLibrary:"Icon",
      expenseRecurrenceSkips:"Recurring skip", settings:"Settings", extra:"App data"
    };
    const name = payload?.name || payload?.description || payload?.account || payload?.month || recordId;
    return `${labels[collection] || collection}: ${String(name || recordId).slice(0, 90)}`;
  }

  function recordFromRow(row) {
    const collection = String(row.collection || "");
    const recordId = String(row.record_id ?? row.recordId ?? "");
    return {
      collection, recordId, payload:sanitizeRecordPayload(collection,recordId,row.payload), sortIndex:Number(row.sort_index ?? row.sortIndex ?? 0),
      revision:Number(row.revision || 0), deletedAt:row.deleted_at ?? row.deletedAt ?? "",
      updatedAt:row.updated_at ?? row.updatedAt ?? "", updatedByDevice:row.updated_by_device ?? row.updatedByDevice ?? row.device_id ?? "",
      appVersion:row.app_version ?? row.appVersion ?? "", appVersionCode:Number(row.app_version_code ?? row.appVersionCode ?? 0),
      minWriterVersionCode:Number(row.min_writer_version_code ?? row.minWriterVersionCode ?? APP_VERSION_CODE)
    };
  }

  function toRecordMap(source) {
    const records = {};
    const add = (collection, recordId, payload, sortIndex = 0) => {
      if (!recordId) return;
      const key = recordKey(collection, String(recordId));
      records[key] = { collection, recordId:String(recordId), payload:clone(payload || {}), sortIndex:Number(sortIndex || 0), deleted:false };
    };

    ARRAY_COLLECTIONS.forEach(collection => {
      (Array.isArray(source?.[collection]) ? source[collection] : []).forEach((item, index) => {
        if (item?.id) add(collection, item.id, item, index);
      });
    });

    const accountOrder = Array.isArray(source?.accountOrder) ? source.accountOrder : Object.keys(source?.accounts || {});
    accountOrder.forEach((name, index) => {
      if (!Object.prototype.hasOwnProperty.call(source?.accounts || {}, name)) return;
      add("accounts", name, {
        name,
        balance:Number(source.accounts[name] || 0),
        type:source.accountTypes?.[name] || "Other",
        icon:source.accountIcons?.[name] || null
      }, index);
    });
    Object.keys(source?.accounts || {}).filter(name => !accountOrder.includes(name)).forEach((name, index) => {
      add("accounts", name, { name, balance:Number(source.accounts[name] || 0), type:source.accountTypes?.[name] || "Other", icon:source.accountIcons?.[name] || null }, accountOrder.length + index);
    });

    MAP_COLLECTIONS.forEach(collection => {
      Object.entries(isObject(source?.[collection]) ? source[collection] : {}).forEach(([id, payload], index) => add(collection, id, payload, index));
    });

    (Array.isArray(source?.expenseRecurrenceSkips) ? source.expenseRecurrenceSkips : []).forEach((item, index) => {
      const id = `${String(item?.seriesId || "")}::${String(item?.month || "")}`;
      if (item?.seriesId && item?.month) add("expenseRecurrenceSkips", id, item, index);
    });

    add("settings", "preferences", {
      savingsSettings:clone(source?.savingsSettings || {}),
      projectCalendarSettings:clone(source?.projectCalendarSettings || {}),
      salaryWorkSettings:clone(source?.salaryWorkSettings || {}),
      ledgerSettings:sanitizeRecordPayload("settings","preferences",{ ledgerSettings:source?.ledgerSettings || {} }).ledgerSettings,
      budgetSettings:clone(source?.budgetSettings || {}),
      productivitySettings:clone(source?.productivitySettings || {}),
      reminderSettings:clone(source?.reminderSettings || {})
    }, 0);

    const extra = {};
    Object.keys(source || {}).forEach(key => { if (!KNOWN_TOP_LEVEL.has(key)) extra[key] = clone(source[key]); });
    if (Object.keys(extra).length) add("extra", "root", extra, 0);
    return records;
  }

  function fromRecordStore(store, fallback = {}) {
    const active = Object.values(store || {}).filter(row => row && !row.deletedAt).sort((a,b) => Number(a.sortIndex || 0) - Number(b.sortIndex || 0) || String(a.recordId).localeCompare(String(b.recordId)));
    const output = {};
    ARRAY_COLLECTIONS.forEach(collection => { output[collection] = active.filter(row => row.collection === collection).map(row => clone(row.payload)); });

    output.accounts = {};
    output.accountTypes = {};
    output.accountIcons = {};
    output.accountOrder = [];
    active.filter(row => row.collection === "accounts").forEach(row => {
      const name = String(row.payload?.name || row.recordId);
      output.accounts[name] = Number(row.payload?.balance || 0);
      output.accountTypes[name] = row.payload?.type || "Other";
      if (row.payload?.icon) output.accountIcons[name] = clone(row.payload.icon);
      output.accountOrder.push(name);
    });

    MAP_COLLECTIONS.forEach(collection => {
      output[collection] = {};
      active.filter(row => row.collection === collection).forEach(row => { output[collection][row.recordId] = clone(row.payload); });
    });
    output.expenseRecurrenceSkips = active.filter(row => row.collection === "expenseRecurrenceSkips").map(row => clone(row.payload));

    const settings = active.find(row => row.collection === "settings" && row.recordId === "preferences")?.payload || {};
    output.savingsSettings = clone(settings.savingsSettings || fallback?.savingsSettings || {});
    output.projectCalendarSettings = clone(settings.projectCalendarSettings || fallback?.projectCalendarSettings || {});
    output.salaryWorkSettings = clone(settings.salaryWorkSettings || fallback?.salaryWorkSettings || {});
    const localLedgerSettings = clone(fallback?.ledgerSettings || {});
    output.ledgerSettings = clone(settings.ledgerSettings || localLedgerSettings);
    if (localLedgerSettings.lastRecalculatedAt) output.ledgerSettings.lastRecalculatedAt = localLedgerSettings.lastRecalculatedAt;
    else delete output.ledgerSettings.lastRecalculatedAt;
    output.budgetSettings = clone(settings.budgetSettings || fallback?.budgetSettings || {});
    output.productivitySettings = clone(settings.productivitySettings || fallback?.productivitySettings || {});
    output.reminderSettings = clone(settings.reminderSettings || fallback?.reminderSettings || {});
    const extra = active.find(row => row.collection === "extra" && row.recordId === "root")?.payload;
    if (isObject(extra)) Object.assign(output, clone(extra));
    return output;
  }

  function effectiveRecordStore() {
    const store = normalizeRecordStore(baseRecords);
    Object.entries(pending).forEach(([key, item]) => {
      store[key] = {
        collection:item.collection, recordId:item.recordId, payload:clone(item.payload || {}),
        sortIndex:Number(item.sortIndex || 0), revision:Number(item.baseRevision || 0),
        deletedAt:item.deleted ? (item.updatedAt || nowIso()) : "", updatedAt:item.updatedAt || "",
        updatedByDevice:currentDeviceId(), appVersion:appVersion(), appVersionCode:APP_VERSION_CODE,
        minWriterVersionCode:Number(item.minWriterVersionCode || APP_VERSION_CODE)
      };
    });
    return store;
  }

  function applyEffectiveRecords(message = "Cloud records applied") {
    suppressQueue = true;
    try {
      const next = fromRecordStore(effectiveRecordStore(), typeof data !== "undefined" ? data : {});
      data = normalizeData(clone(next));
      if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw(message);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastObservedData = clone(data);
      if (typeof renderAll === "function") renderAll(false);
      if (typeof renderV12Settings === "function") renderV12Settings();
      try { if (typeof addSyncHistory === "function") addSyncHistory(message, "success", { cloudSchemaVersion:3, profileId:cloudProfileId(), auditId:state.lastAuditId }); } catch (error) {}
    } finally { suppressQueue = false; }
  }

  function seedBaseFromSnapshot(records) {
    baseRecords = {};
    (records || []).forEach(raw => {
      const row = recordFromRow(raw);
      if (!row.collection || !row.recordId) return;
      baseRecords[recordKey(row.collection,row.recordId)] = row;
    });
    persist();
  }

  function queueDiff(beforeData, afterData, reason = "Local save") {
    if (suppressQueue || state.initializedUserId !== initializedScope()) return;
    const before = toRecordMap(beforeData);
    const after = toRecordMap(afterData);
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    let changed = 0;
    keys.forEach(key => {
      const prior = before[key];
      const next = after[key];
      if (prior && next && same(prior.payload,next.payload) && prior.sortIndex === next.sortIndex) return;
      const base = baseRecords[key];
      const deleted = !next;
      const currentPayload = clone(next?.payload || prior?.payload || base?.payload || {});
      const currentSort = Number(next?.sortIndex || 0);
      const matchesBase = base && Boolean(base.deletedAt) === deleted && same(base.payload,currentPayload) && Number(base.sortIndex || 0) === currentSort;
      if (matchesBase || (!base && deleted)) {
        delete pending[key];
        conflicts = conflicts.filter(item => item.key !== key);
        return;
      }
      const existing = pending[key];
      pending[key] = {
        key,
        collection:next?.collection || prior?.collection || base?.collection || splitKey(key)[0],
        recordId:next?.recordId || prior?.recordId || base?.recordId || splitKey(key)[1],
        payload:currentPayload,
        sortIndex:currentSort,
        deleted,
        baseRevision:existing ? Number(existing.baseRevision || 0) : Number(base?.revision || 0),
        basePayload:existing ? clone(existing.basePayload) : clone(base?.payload ?? null),
        baseSortIndex:existing ? Number(existing.baseSortIndex || 0) : Number(base?.sortIndex || 0),
        minWriterVersionCode:APP_VERSION_CODE,
        status:existing?.status === "conflict" ? "conflict" : "pending",
        attempts:existing?.status === "conflict" ? Number(existing.attempts || 0) : 0,
        nextAttemptAt:0,
        updatedAt:nowIso(),
        reason:String(reason || "Local save").slice(0,160),
        lastError:existing?.status === "conflict" ? existing.lastError || "Record changed on another device." : ""
      };
      changed += 1;
    });
    persist();
    if (changed) {
      setStatus(navigator.onLine ? "Changes pending" : "Offline changes pending", `${pendingCount()} record${pendingCount() === 1 ? "" : "s"} waiting to synchronize.`, navigator.onLine ? "warning" : "info");
      if (state.autoSync !== false && navigator.onLine) scheduleSync();
    }
    renderSyncHealth();
  }

  function wrapSaveData() {
    if (saveWrapped || typeof saveData !== "function") return;
    const original = saveData;
    saveData = function recordAwareSaveData(message = "Saved") {
      const before = clone(lastObservedData);
      const result = original(message);
      const after = clone(data);
      queueDiff(before, after, message);
      lastObservedData = after;
      return result;
    };
    saveWrapped = true;
  }

  function pendingCount() { return Object.keys(pending).length; }
  function conflictCount() { return conflicts.filter(item => !item.resolved).length; }

  function topStatusLabel() {
    if (!configStatus().ok) return "Cloud off";
    if (!navigator.onLine) return pendingCount() ? `${pendingCount()} pending` : "Offline";
    if (syncing) return "Syncing…";
    if (!cloudUser) return "Sign in";
    if (conflictCount()) return "Sync issue";
    if (pendingCount()) return "Needs sync";
    if (state.lastError) return "Sync issue";
    return state.lastSyncAt ? "Synced" : "Needs sync";
  }

  function topSyncStateKey(label = topStatusLabel()) {
    if (label === "Synced") return "synced";
    if (label === "Syncing…") return "syncing";
    if (label === "Needs sync") return "needs-sync";
    if (label === "Sync issue") return "sync-issue";
    if (label === "Offline") return "offline";
    return "setup";
  }

  function updateTopSyncUi(detail = "") {
    const top=document.getElementById("cloudSyncStatusButton"), label=topStatusLabel();
    if (top) {
      top.dataset.syncState=topSyncStateKey(label);
      const text=top.querySelector(".cloud-sync-label") || top.querySelector("span:last-child");
      if (text) text.textContent=label;
      top.setAttribute("aria-label",`Cloud sync: ${label}`); top.title=`Cloud sync: ${label}`;
    }
    const stateNode=document.getElementById("cloudToolbarState"), detailNode=document.getElementById("cloudToolbarDetail"), lastNode=document.getElementById("cloudToolbarLastSync"), syncButton=document.getElementById("cloudToolbarSyncNow"), fixButton=document.getElementById("cloudToolbarFixIssue");
    if (stateNode) stateNode.textContent=label;
    const conflicts = conflictCount();
    const pendingErrors = Object.values(pending).filter(item => item.status === "error" || item.status === "conflict").length;
    let activeDetail = detail;
    if (!activeDetail) {
      if (conflicts > 0) {
        activeDetail = `${conflicts} record conflict${conflicts === 1 ? "" : "s"} need resolution.`;
      } else if (pendingErrors > 0) {
        activeDetail = `${pendingErrors} pending record change${pendingErrors === 1 ? "" : "s"} failed to sync.`;
      } else if (state.lastError) {
        activeDetail = `Sync issue: ${state.lastError}`;
      } else {
        activeDetail = state.status || (label === "Synced" ? "This device matches the latest cloud state." : label === "Cloud off" ? "Cloud sync is not configured on this device." : "Review cloud sync status and settings.");
      }
    }
    if (detailNode) detailNode.textContent=activeDetail;
    if (lastNode) lastNode.textContent=formatDateTime(state.lastSyncAt);
    if (syoad?.account || payload?.month || recordId;
    return `${labels[collection] || collection}: ${String(name || recordId).slice(0, 90)}`;
  }

  function recordFromRow(row) {
    const collection = String(row.collection || "");
    const recordId = String(row.record_id ?? row.recordId ?? "");
    return {
      collection, recordId, payload:sanitizeRecordPayload(collection,recordId,row.payload), sortIndex:Number(row.sort_index ?? row.sortIndex ?? 0),
      revision:Number(row.revision || 0), deletedAt:row.deleted_at ?? row.deletedAt ?? "",
      updatedAt:row.updated_at ?? row.updatedAt ?? "", updatedByDevice:row.updated_by_device ?? row.updatedByDevice ?? row.device_id ?? "",
      appVersion:row.app_version ?? row.appVersion ?? "", appVersionCode:Number(row.app_version_code ?? row.appVersionCode ?? 0),
      minWriterVersionCode:Number(row.min_writer_version_code ?? row.minWriterVersionCode ?? APP_VERSION_CODE)
    };
  }

  function toRecordMap(source) {
    const records = {};
    const add = (collection, recordId, payload, sortIndex = 0) => {
      if (!recordId) return;
      const key = recordKey(collection, String(recordId));
      records[key] = { collection, recordId:String(recordId), payload:clone(payload || {}), sortIndex:Number(sortIndex || 0), deleted:false };
    };

    ARRAY_COLLECTIONS.forEach(collection => {
      (Array.isArray(source?.[collection]) ? source[collection] : []).forEach((item, index) => {
        if (item?.id) add(collection, item.id, item, index);
      });
    });

    const accountOrder = Array.isArray(source?.accountOrder) ? source.accountOrder : Object.keys(source?.accounts || {});
    accountOrder.forEach((name, index) => {
      if (!Object.prototype.hasOwnProperty.call(source?.accounts || {}, name)) return;
      add("accounts", name, {
        name,
        balance:Number(source.accounts[name] || 0),
        type:source.accountTypes?.[name] || "Other",
        icon:source.accountIcons?.[name] || null
      }, index);
    });
    Object.keys(source?.accounts || {}).filter(name => !accountOrder.includes(name)).forEach((name, index) => {
      add("accounts", name, { name, balance:Number(source.accounts[name] || 0), type:source.accountTypes?.[name] || "Other", icon:source.accountIcons?.[name] || null }, accountOrder.length + index);
    });

    MAP_COLLECTIONS.forEach(collection => {
      Object.entries(isObject(source?.[collection]) ? source[collection] : {}).forEach(([id, payload], index) => add(collection, id, payload, index));
    });

    (Array.isArray(source?.expenseRecurrenceSkips) ? source.expenseRecurrenceSkips : []).forEach((item, index) => {
      const id = `${String(item?.seriesId || "")}::${String(item?.month || "")}`;
      if (item?.seriesId && item?.month) add("expenseRecurrenceSkips", id, item, index);
    });

    add("settings", "preferences", {
      savingsSettings:clone(source?.savingsSettings || {}),
      projectCalendarSettings:clone(source?.projectCalendarSettings || {}),
      salaryWorkSettings:clone(source?.salaryWorkSettings || {}),
      ledgerSettings:sanitizeRecordPayload("settings","preferences",{ ledgerSettings:source?.ledgerSettings || {} }).ledgerSettings,
      budgetSettings:clone(source?.budgetSettings || {}),
      productivitySettings:clone(source?.productivitySettings || {}),
      reminderSettings:clone(source?.reminderSettings || {})
    }, 0);

    const extra = {};
    Object.keys(source || {}).forEach(key => { if (!KNOWN_TOP_LEVEL.has(key)) extra[key] = clone(source[key]); });
    if (Object.keys(extra).length) add("extra", "root", extra, 0);
    return records;
  }

  function fromRecordStore(store, fallback = {}) {
    const active = Object.values(store || {}).filter(row => row && !row.deletedAt).sort((a,b) => Number(a.sortIndex || 0) - Number(b.sortIndex || 0) || String(a.recordId).localeCompare(String(b.recordId)));
    const output = {};
    ARRAY_COLLECTIONS.forEach(collection => { output[collection] = active.filter(row => row.collection === collection).map(row => clone(row.payload)); });

    output.accounts = {};
    output.accountTypes = {};
    output.accountIcons = {};
    output.accountOrder = [];
    active.filter(row => row.collection === "accounts").forEach(row => {
      const name = String(row.payload?.name || row.recordId);
      output.accounts[name] = Number(row.payload?.balance || 0);
      output.accountTypes[name] = row.payload?.type || "Other";
      if (row.payload?.icon) output.accountIcons[name] = clone(row.payload.icon);
      output.accountOrder.push(name);
    });

    MAP_COLLECTIONS.forEach(collection => {
      output[collection] = {};
      active.filter(row => row.collection === collection).forEach(row => { output[collection][row.recordId] = clone(row.payload); });
    });
    output.expenseRecurrenceSkips = active.filter(row => row.collection === "expenseRecurrenceSkips").map(row => clone(row.payload));

    const settings = active.find(row => row.collection === "settings" && row.recordId === "preferences")?.payload || {};
    output.savingsSettings = clone(settings.savingsSettings || fallback?.savingsSettings || {});
    output.projectCalendarSettings = clone(settings.projectCalendarSettings || fallback?.projectCalendarSettings || {});
    output.salaryWorkSettings = clone(settings.salaryWorkSettings || fallback?.salaryWorkSettings || {});
    const localLedgerSettings = clone(fallback?.ledgerSettings || {});
    output.ledgerSettings = clone(settings.ledgerSettings || localLedgerSettings);
    if (localLedgerSettings.lastRecalculatedAt) output.ledgerSettings.lastRecalculatedAt = localLedgerSettings.lastRecalculatedAt;
    else delete output.ledgerSettings.lastRecalculatedAt;
    output.budgetSettings = clone(settings.budgetSettings || fallback?.budgetSettings || {});
    output.productivitySettings = clone(settings.productivitySettings || fallback?.productivitySettings || {});
    output.reminderSettings = clone(settings.reminderSettings || fallback?.reminderSettings || {});
    const extra = active.find(row => row.collection === "extra" && row.recordId === "root")?.payload;
    if (isObject(extra)) Object.assign(output, clone(extra));
    return output;
  }

  function effectiveRecordStore() {
    const store = normalizeRecordStore(baseRecords);
    Object.entries(pending).forEach(([key, item]) => {
      store[key] = {
        collection:item.collection, recordId:item.recordId, payload:clone(item.payload || {}),
        sortIndex:Number(item.sortIndex || 0), revision:Number(item.baseRevision || 0),
        deletedAt:item.deleted ? (item.updatedAt || nowIso()) : "", updatedAt:item.updatedAt || "",
        updatedByDevice:currentDeviceId(), appVersion:appVersion(), appVersionCode:APP_VERSION_CODE,
        minWriterVersionCode:Number(item.minWriterVersionCode || APP_VERSION_CODE)
      };
    });
    return store;
  }

  function applyEffectiveRecords(message = "Cloud records applied") {
    suppressQueue = true;
    try {
      const next = fromRecordStore(effectiveRecordStore(), typeof data !== "undefined" ? data : {});
      data = normalizeData(clone(next));
      if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw(message);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      lastObservedData = clone(data);
      if (typeof renderAll === "function") renderAll(false);
      if (typeof renderV12Settings === "function") renderV12Settings();
      try { if (typeof addSyncHistory === "function") addSyncHistory(message, "success", { cloudSchemaVersion:3, profileId:cloudProfileId(), auditId:state.lastAuditId }); } catch (error) {}
    } finally { suppressQueue = false; }
  }

  function seedBaseFromSnapshot(records) {
    baseRecords = {};
    (records || []).forEach(raw => {
      const row = recordFromRow(raw);
      if (!row.collection || !row.recordId) return;
      baseRecords[recordKey(row.collection,row.recordId)] = row;
    });
    persist();
  }

  function queueDiff(beforeData, afterData, reason = "Local save") {
    if (suppressQueue || state.initializedUserId !== initializedScope()) return;
    const before = toRecordMap(beforeData);
    const after = toRecordMap(afterData);
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    let changed = 0;
    keys.forEach(key => {
      const prior = before[key];
      const next = after[key];
      if (prior && next && same(prior.payload,next.payload) && prior.sortIndex === next.sortIndex) return;
      const base = baseRecords[key];
      const deleted = !next;
      const currentPayload = clone(next?.payload || prior?.payload || base?.payload || {});
      const currentSort = Number(next?.sortIndex || 0);
      const matchesBase = base && Boolean(base.deletedAt) === deleted && same(base.payload,currentPayload) && Number(base.sortIndex || 0) === currentSort;
      if (matchesBase || (!base && deleted)) {
        delete pending[key];
        conflicts = conflicts.filter(item => item.key !== key);
        return;
      }
      const existing = pending[key];
      pending[key] = {
        key,
        collection:next?.collection || prior?.collection || base?.collection || splitKey(key)[0],
        recordId:next?.recordId || prior?.recordId || base?.recordId || splitKey(key)[1],
        payload:currentPayload,
        sortIndex:currentSort,
        deleted,
        baseRevision:existing ? Number(existing.baseRevision || 0) : Number(base?.revision || 0),
        basePayload:existing ? clone(existing.basePayload) : clone(base?.payload ?? null),
        baseSortIndex:existing ? Number(existing.baseSortIndex || 0) : Number(base?.sortIndex || 0),
        minWriterVersionCode:APP_VERSION_CODE,
        status:existing?.status === "conflict" ? "conflict" : "pending",
        attempts:existing?.status === "conflict" ? Number(existing.attempts || 0) : 0,
        nextAttemptAt:0,
        updatedAt:nowIso(),
        reason:String(reason || "Local save").slice(0,160),
        lastError:existing?.status === "conflict" ? existing.lastError || "Record changed on another device." : ""
      };
      changed += 1;
    });
    persist();
    if (changed) {
      setStatus(navigator.onLine ? "Changes pending" : "Offline changes pending", `${pendingCount()} record${pendingCount() === 1 ? "" : "s"} waiting to synchronize.`, navigator.onLine ? "warning" : "info");
      if (state.autoSync !== false && navigator.onLine) scheduleSync();
    }
    renderSyncHealth();
  }

  function wrapSaveData() {
    if (saveWrapped || typeof saveData !== "function") return;
    const original = saveData;
    saveData = function recordAwareSaveData(message = "Saved") {
      const before = clone(lastObservedData);
      const result = original(message);
      const after = clone(data);
      queueDiff(before, after, message);
      lastObservedData = after;
      return result;
    };
    saveWrapped = true;
  }

  function pendingCount() { return Object.keys(pending).length; }
  function conflictCount() { return conflicts.filter(item => !item.resolved).length; }

  function topStatusLabel() {
    if (!configStatus().ok) return "Cloud off";
    if (!navigator.onLine) return pendingCount() ? `${pendingCount()} pending` : "Offline";
    if (syncing) return "Syncing…";
    if (!cloudUser) return "Sign in";
    if (conflictCount()) return "Sync issue";
    if (pendingCount()) return "Needs sync";
    if (state.lastError) return "Sync issue";
    return state.lastSyncAt ? "Synced" : "Needs sync";
  }

  function topSyncStateKey(label = topStatusLabel()) {
    if (label === "Synced") return "synced";
    if (label === "Syncing…") return "syncing";
    if (label === "Needs sync") return "needs-sync";
    if (label === "Sync issue") return "sync-issue";
    if (label === "Offline") return "offline";
    return "setup";
  }

  function updateTopSyncUi(detail = "") {
    const top=document.getElementById("cloudSyncStatusButton"), label=topStatusLabel();
    if (top) {
      top.dataset.syncState=topSyncStateKey(label);
      const text=top.querySelector(".cloud-sync-label") || top.querySelector("span:last-child");
      if (text) text.textContent=label;
      top.setAttribute("aria-label",`Cloud sync: ${label}`); top.title=`Cloud sync: ${label}`;
    }
    const stateNode=document.getElementById("cloudToolbarState"), detailNode=document.getElementById("cloudToolbarDetail"), lastNode=document.getElementById("cloudToolbarLastSync"), syncButton=document.getElementById("cloudToolbarSyncNow"), fixButton=document.getElementById("cloudToolbarFixIssue");
    if (stateNode) stateNode.textContent=label;
    const conflicts = conflictCount();
    const pendingErrors = Object.values(pending).filter(item => item.status === "error" || item.status === "conflict").length;
    let activeDetail = detail;
    if (!activeDetail) {
      if (conflicts > 0) {
        activeDetail = `${conflicts} record conflict${conflicts === 1 ? "" : "s"} need resolution.`;
      } else if (pendingErrors > 0) {
        activeDetail = `${pendingErrors} pending record change${pendingErrors === 1 ? "" : "s"} failed to sync.`;
      } else if (state.lastError) {
        activeDetail = `Sync issue: ${state.lastError}`;
      } else {
        activeDetail = state.status || (label === "Synced" ? "This device matches the latest cloud state." : label === "Cloud off" ? "Cloud sync is not configured on this device." : "Review cloud sync status and settings.");
      }
    }
    if (detailNode) detailNode.textContent=activeDetail;
    if (lastNode) lastNode.textContent=formatDateTime(state.lastSyncAt);
    if (syncButton) syncButton.disabled=syncing || !cloudUser || !navigator.onLine || !configStatus().ok;
    if (fixButton) {
      if (conflicts > 0 || pendingErrors > 0 || label === "Sync issue" || Boolean(state.lastError)) {
        fixButton.hidden = false;
        fixButton.textContent = conflicts > 0 ? `Review ${conflicts} conflict${conflicts === 1 ? "" : "s"}` : pendingErrors > 0 ? `Fix ${pendingErrors} sync issue${pendingErrors === 1 ? "" : "s"}` : "Review & fix issue";
      } else {
        fixButton.hidden = true;
      }
    }
  }

  function closeTopSyncPopover() {
    const pop=document.getElementById("cloudSyncToolbarPopover"), button=document.getElementById("cloudSyncStatusButton"); if(pop)pop.hidden=true; if(button)button.setAttribute("aria-expanded","false");
  }
  function toggleTopSyncPopover() {
    const pop=document.getElementById("cloudSyncToolbarPopover"), button=document.getElementById("cloudSyncStatusButton"); if(!pop||!button)return;
    const opening=pop.hidden; pop.hidden=!opening; button.setAttribute("aria-expanded",String(opening)); updateTopSyncUi();
    if(opening && typeof positionCloudToolbarPopover === "function") requestAnimationFrame(positionCloudToolbarPopover);
  }

  function setStatus(status, detail = "", tone = "info") {
    state.status = status;
    if (tone === "danger") state.lastError = detail || status;
    else if (!["warning"].includes(tone)) state.lastError = "";
    persist();
    const chip = document.getElementById("cloudStatusChip");
    if (chip) { chip.textContent = status; chip.className = `v12-chip ${tone}`; }
    const detailNode = document.getElementById("cloudStatusDetail");
    if (detailNode) detailNode.textContent = detail || status;
    const top = document.getElementById("cloudSyncStatusButton");
    updateTopSyncUi(detail);
    renderCloudStats();
  }

  function formatDateTime(value) {
    if (!value) return "Never";
    try { return new Intl.DateTimeFormat("en-PH", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)); }
    catch (error) { return String(value); }
  }

  function injectV2Ui() {
    window.FinanceCloudConflictReview?.ensure?.();
    if (document.getElementById("cloudSyncHealthCard")) return;
    const connected = document.getElementById("cloudConnectedSection");
    if (!connected) return;
    const style = document.createElement("style");
    style.textContent = `
      .cloud-v3-health-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cloud-v3-health-grid>div{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-soft);min-width:0}.cloud-v3-health-grid span,.cloud-v3-health-grid strong{display:block;overflow-wrap:anywhere}.cloud-v3-health-grid span{color:var(--muted);fon