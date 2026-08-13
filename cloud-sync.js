"use strict";
/* My Finance Records V14.0.20 · Encrypted profile-scoped Cloud Sync 3.0.
   Local storage remains the immediate working copy. Cloud Schema V3 exchanges only
   changed encrypted records, commits related changes atomically, and preserves an immutable audit trail. */
(function financeCloudSyncV3Bootstrap() {
  const APP_VERSION_FALLBACK = "14.0.20";
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
  const SYNC_DELAY = 5 * 60 * 1000;
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
  const lifecycle = window.FinanceCloudSyncLifecycle?.create?.({canPoll:()=>Boolean(cloudUser&&state.autoSync!==false&&navigator.onLine&&!document.hidden),canRetry:()=>Boolean(cloudUser&&state.autoSync!==false),pull:reason=>syncNow({reason}),reconnect:()=>setupRealtime()});
  if(!lifecycle)throw new Error("Cloud Sync lifecycle support is unavailable. Reload the latest app version."); const {clearForegroundPoll,scheduleForegroundPoll,clearRealtimeRetry,scheduleRealtimeRecovery,noteRealtimeSubscribed}=lifecycle;
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
      const result = original(message);
      if (result === false) return result;
      const after = clone(data);
      // Fallback for integrations that replace saveData without dispatching finance:data-persisted.
      if(!same(lastObservedData,after)){queueDiff(lastObservedData,after,message);lastObservedData=after;}
      return result;
    };
    saveWrapped = true;
  }
  function handlePersistedData(event) { const next=normalizeData(clone(event?.detail?.data??(typeof data!=="undefined"?data:{}))); if(!suppressQueue)queueDiff(lastObservedData,next,String(event?.detail?.action||"Finance data updated")); lastObservedData=clone(next); }
  function reconcileUnqueuedLocalChanges(reason="Recovered unqueued local Finance changes") { if(suppressQueue||!profileCanWrite()||state.initializedUserId!==initializedScope()||!Object.keys(baseRecords).length||typeof data==="undefined")return[]; const tracked=fromRecordStore(effectiveRecordStore(),data),before=toRecordMap(tracked),after=toRecordMap(data),keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(key=>{const prior=before[key],next=after[key];return!prior||!next||!same(prior.payload,next.payload)||Number(prior.sortIndex||0)!==Number(next.sortIndex||0);}); if(keys.length)queueDiff(tracked,data,reason); return keys; }
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
      top.setAttribute("aria-label",`Cloud sync: ${label}`); top.title=`Cloud sync: ${label}`; top.setAttribute("aria-busy", syncing ? "true" : "false");
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
      .cloud-v3-health-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cloud-v3-health-grid>div{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-soft);min-width:0}.cloud-v3-health-grid span,.cloud-v3-health-grid strong{display:block;overflow-wrap:anywhere}.cloud-v3-health-grid span{color:var(--muted);font-size:.61rem}.cloud-v3-health-grid strong{margin-top:3px;font-size:.72rem}.cloud-pending-list{display:grid;gap:7px}.cloud-pending-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-soft)}.cloud-pending-item[data-status="conflict"]{border-color:color-mix(in srgb,var(--orange) 42%,var(--line));background:var(--orange-soft)}.cloud-pending-item[data-status="error"]{border-color:color-mix(in srgb,var(--red) 35%,var(--line));background:var(--red-soft)}.cloud-pending-item strong,.cloud-pending-item small{display:block;overflow-wrap:anywhere}.cloud-pending-item strong{font-size:.69rem}.cloud-pending-item small{margin-top:2px;color:var(--muted);font-size:.59rem}.cloud-pending-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.cloud-audit-list{display:grid;gap:5px;max-height:250px;overflow:auto}.cloud-audit-row{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid var(--line);font-size:.62rem}.cloud-audit-row small{color:var(--muted)}@media(max-width:900px){.cloud-v3-health-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.cloud-v3-health-grid{grid-template-columns:1fr}.cloud-pending-item{grid-template-columns:1fr}.cloud-pending-actions{justify-content:flex-start}.cloud-pending-actions .button{min-height:42px}.cloud-audit-row{grid-template-columns:1fr}.cloud-device-table th:nth-child(3),.cloud-device-table td:nth-child(3){display:table-cell}}
    `;
    document.head.appendChild(style);

    const controls = connected.firstElementChild;
    controls?.insertAdjacentHTML("afterend", `
      <article class="card" id="cloudSyncHealthCard">
        <div class="card-header"><div><h3>Sync Health</h3><p>Encrypted Cloud Sync 3.0 status and compatibility</p></div><span class="v12-chip info" id="cloudProtocolChip">Cloud Schema V3</span></div>
        <div class="cloud-v3-health-grid">
          <div><span>Protocol</span><strong>Encrypted record-level V3</strong></div>
          <div><span>Last cloud audit</span><strong id="cloudAuditCursor">0</strong></div>
          <div><span>Last pull</span><strong id="cloudLastPull">Never</strong></div>
          <div><span>Last push</span><strong id="cloudLastPush">Never</strong></div>
          <div><span>Pending records</span><strong id="cloudHealthPending">0</strong></div>
          <div><span>Conflicts</span><strong id="cloudHealthConflicts">0</strong></div>
          <div><span>This app</span><strong id="cloudHealthAppVersion">V${appVersion()}</strong></div>
          <div><span>Minimum writer</span><strong id="cloudHealthRequiredVersion">V13.0.0</strong></div>
        </div>
        <p class="v12-help" id="cloudHealthMessage">Only changed AES-256-GCM encrypted records are exchanged. Related payment and ledger changes are committed together.</p>
      </article>
      <article class="card" id="cloudPendingCard">
        <div class="card-header"><div><h3>Pending record changes</h3><p>Review records waiting for cloud confirmation</p></div><span class="v12-chip success" id="cloudPendingChip">Nothing pending</span></div>
        <div class="cloud-pending-list" id="cloudPendingList"><div class="v12-empty">No records are waiting to synchronize.</div></div>
      </article>
      <article class="card" id="cloudAuditCard">
        <div class="card-header"><div><h3>Recent cloud audit</h3><p>Immutable record activity received by this device</p></div><span class="v12-chip info">Latest 30</span></div>
        <div class="cloud-audit-list" id="cloudAuditList"><div class="v12-empty">No Cloud Schema V3 activity has been received yet.</div></div>
      </article>
    `);
  }

  function renderCloudStats() {
    injectV2Ui();
    const configured = configStatus().ok;
    const ready = Boolean(cloudUser && state.initializedUserId === initializedScope());
    const disconnected = document.getElementById("cloudDisconnectedSection");
    const connected = document.getElementById("cloudConnectedSection");
    const recovery = document.getElementById("cloudPasswordRecoveryCard");
    const recoveryHelp = document.getElementById("cloudRecoveryHelpCard");
    if (recovery) recovery.hidden = !passwordRecoveryActive;
    if (recoveryHelp) recoveryHelp.hidden = !(passwordRecoveryRouteActive && !passwordRecoveryActive);
    const recoveryUiActive = passwordRecoveryActive || passwordRecoveryRouteActive;
    if (disconnected) disconnected.hidden = recoveryUiActive || !configured || Boolean(cloudUser);
    if (connected) connected.hidden = recoveryUiActive || !configured || !ready;
    const configChip = document.getElementById("cloudConfigStatusChip");
    if (configChip) { configChip.textContent = configured ? "Configured" : "Setup required"; configChip.className = `v12-chip ${configured ? "success" : "warning"}`; }
    const user = document.getElementById("cloudUserEmail"); if (user) user.textContent = cloudUser?.email || "—";
    const pendingNode = document.getElementById("cloudPendingCount"); if (pendingNode) pendingNode.textContent = String(pendingCount());
    const lastSync = document.getElementById("cloudLastSync"); if (lastSync) lastSync.textContent = formatDateTime(state.lastSyncAt);
    const device = document.getElementById("cloudCurrentDevice"); if (device) device.textContent = currentDeviceName();
    const deviceInput = document.getElementById("cloudDeviceName"); if (deviceInput && document.activeElement !== deviceInput) deviceInput.value = currentDeviceName();
    const auto = document.getElementById("cloudAutoSync"); if (auto) auto.checked = state.autoSync !== false;
    const first = document.getElementById("cloudFirstSyncCard"); if (first) first.hidden = !cloudUser || ready || !cloudProfileId() || !PROFILE_ARCH()?.isCloudUnlocked?.();
    const config = getStoredConfig();
    const urlInput = document.getElementById("cloudConfigUrl"); if (urlInput && !urlInput.value) urlInput.value = config.supabaseUrl;
    const keyInput = document.getElementById("cloudConfigKey"); if (keyInput && !keyInput.value) keyInput.value = config.supabasePublishableKey;

    const conflicts = conflictCount();
    const pendingErrors = Object.values(pending).filter(item => item.status === "error" || item.status === "conflict").length;
    const overviewFix = document.getElementById("cloudOverviewFixButton");
    const overviewSync = document.getElementById("cloudOverviewSyncNow");
    if (overviewFix) {
      if (conflicts > 0 || pendingErrors > 0 || state.lastError) {
        overviewFix.hidden = false;
        overviewFix.textContent = conflicts > 0 ? `Review ${conflicts} conflict${conflicts === 1 ? "" : "s"}` : pendingErrors > 0 ? `Fix ${pendingErrors} sync issue${pendingErrors === 1 ? "" : "s"}` : "Review & fix issue";
      } else {
        overviewFix.hidden = true;
      }
    }
    if (overviewSync) overviewSync.disabled = syncing || !cloudUser || !navigator.onLine || !configStatus().ok;

    renderSyncHealth();
    renderConflicts();
  }

  function renderSyncHealth() {
    const set = (id,value) => { const node=document.getElementById(id); if(node) node.textContent=String(value); };
    set("cloudAuditCursor", Number(state.lastAuditId || 0));
    set("cloudLastPull", formatDateTime(state.lastPullAt));
    set("cloudLastPush", formatDateTime(state.lastPushAt));
    set("cloudHealthPending", pendingCount());
    set("cloudHealthConflicts", conflictCount());
    set("cloudHealthAppVersion", `V${appVersion()}`);
    set("cloudHealthRequiredVersion", versionFromCode(state.requiredAppVersionCode || APP_VERSION_CODE));
    const protocol = document.getElementById("cloudProtocolChip");
    if (protocol) { protocol.textContent = `Cloud Schema V${state.cloudSchemaVersion || 2}`; protocol.className = `v12-chip ${(state.requiredAppVersionCode || 0) > APP_VERSION_CODE ? "danger" : "success"}`; }
    const health = document.getElementById("cloudHealthMessage");
    if (health) health.textContent = (state.requiredAppVersionCode || 0) > APP_VERSION_CODE
      ? `This cloud account requires ${versionFromCode(state.requiredAppVersionCode)} or newer. Update this device before writing records.`
      : state.lastError || "Only changed AES-256-GCM encrypted records are exchanged. Related payment and ledger changes are committed together.";

    const chip = document.getElementById("cloudPendingChip");
    if (chip) { chip.textContent = pendingCount() ? `${pendingCount()} waiting` : "Nothing pending"; chip.className = `v12-chip ${conflictCount() ? "warning" : pendingCount() ? "info" : "success"}`; }
    const list = document.getElementById("cloudPendingList");
    if (list) {
      const items = Object.values(pending).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      list.innerHTML = items.length ? items.map(item => {
        const next = item.nextAttemptAt && item.nextAttemptAt > Date.now() ? ` · retry ${formatDateTime(new Date(item.nextAttemptAt).toISOString())}` : "";
        return `<article class="cloud-pending-item" data-status="${escape(item.status)}"><div><strong>${escape(recordLabel(item.collection,item.payload,item.recordId))}</strong><small>${escape(item.status)} · revision ${Number(item.baseRevision || 0)} · ${Number(item.attempts || 0)} attempt${Number(item.attempts || 0) === 1 ? "" : "s"}${escape(next)}</small>${item.lastError ? `<small>${escape(item.lastError)}</small>` : ""}</div><div class="cloud-pending-actions"><button class="button button-secondary button-small" type="button" data-sync-retry="${escape(keyToken(item.key))}">Retry</button>${item.status === "conflict" ? `<button class="button button-primary button-small" type="button" data-review-cloud-conflict="${escape(keyToken(item.key))}">Review versions</button>` : `<button class="button button-secondary button-small" type="button" data-sync-discard="${escape(keyToken(item.key))}">Discard local</button>`}</div></article>`;
      }).join("") : `<div class="v12-empty">No records are waiting to synchronize.</div>`;
    }
  }

  function versionFromCode(code) {
    const value = Number(code || 0);
    if (!value) return "Unknown";
    const major = Math.floor(value / 10000);
    const minor = Math.floor((value % 10000) / 10);
    const patch = value % 10;
    return `V${major}.${minor}.${patch}`;
  }

  function escape(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  }

  function scheduleSync(delay = SYNC_DELAY) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({ reason:"automatic" }).catch(() => {}), delay);
  }

  function requestLifecycleSync(reason) { if(!cloudUser||state.autoSync===false||!navigator.onLine||document.hidden)return; scheduleSync(); scheduleForegroundPoll(); }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    const times = Object.values(pending).filter(item => item.status === "error" && item.nextAttemptAt > Date.now()).map(item => item.nextAttemptAt);
    if (!times.length || state.autoSync === false) return;
    const delay = Math.max(250, Math.min(...times) - Date.now());
    retryTimer = setTimeout(() => syncNow({ reason:"retry" }).catch(() => {}), delay);
  }

  function retryDelay(attempts) {
    const exponential = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(Number(attempts || 0), 8)));
    return Math.min(RETRY_MAX_MS, exponential + Math.floor(Math.random() * Math.min(1500, exponential * .2)));
  }

  function setPrivacyAuthentication(authenticated, detail = {}) {
    try { window.FinancePrivacyLock?.setAuthenticated?.(Boolean(authenticated), { email:String(detail.email || cloudUser?.email || "") }); } catch (error) {}
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
      auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, experimental:{ passkey:true } },
      realtime:{ params:{ eventsPerSecond:8 } },
      global:{ headers:{ "x-client-info":`my-finance-records/${appVersion()}` } }
    });
    client.auth.onAuthStateChange((event,nextSession) => {
      session = nextSession || null;
      cloudUser = nextSession?.user || null;
      if (event === "PASSWORD_RECOVERY") {
        setPrivacyAuthentication(false, { email:nextSession?.user?.email || "" });
        passwordRecoveryRouteActive = true;
        passwordRecoveryError = null;
        passwordRecoveryActive = true;
        cleanPasswordRecoveryUrl({ keepRoute:true });
        focusPasswordRecoverySettings();
        renderCloudStats();
        setAuthMessage("Choose a new password to finish account recovery.", "warning", "recovery");
        setStatus("Reset password", "Choose a new password before continuing cloud sync.", "warning");
        return;
      }
      if (cloudUser) onSignedIn().catch(error => setStatus("Sync needs attention", friendlyAuthError(error,"sync"), "danger"));
      else onSignedOut();
    });
    return client;
  }

  async function rpc(name,args = {}) {
    const sdk = await loadClient();
    const result = await sdk.rpc(name,args);
    if (result.error) {
      const message = result.error.message || String(result.error);
      if (/finance_v3_|schema cache|could not find the function/i.test(message)) throw new Error("Cloud Schema V3 is not installed. Run supabase/cloud-profiles-v13.sql in the Supabase SQL Editor.");
      throw result.error;
    }
    return result.data || {};
  }

  function friendlyAuthError(error, context = "sign-in") {
    const message = String(error?.message || error || "").trim();
    const lower = message.toLowerCase();
    if (/invalid login credentials|invalid credentials|email or password/i.test(message)) return "Wrong email or password. If you have not created a cloud account with this email yet, click 'Create account' first.";
    if (/email not confirmed|confirm.*email/i.test(message)) return "Your email is not confirmed yet. Open the confirmation email sent to your inbox, click the confirmation link, then sign in again.";
    if (/user already registered|already been registered|already exists/i.test(message)) return "An account with this email already exists. Click 'Sign in' or use 'Forgot password?'.";
    if (/password.*(?:short|weak|least)|should be at least/i.test(message)) return "Use a stronger password with at least 6 characters.";
    if (/rate limit|too many requests/i.test(message)) return "Too many authentication attempts. Wait a moment, then try again.";
    if (/failed to fetch|network|load failed|networkerror|timeout|timed out/i.test(message)) return "Could not reach the cloud service. Check your internet connection and cloud configuration.";
    if (/redirect.*not.*allow|redirect.*not.*permitted|redirect_to/i.test(message)) return "Password-reset redirect is not allowed by the cloud project. Add this app URL to Supabase Auth redirect URLs.";
    if (/session.*missing|auth session missing/i.test(message)) return "The password-reset session has expired. Request a new password reset email.";
    if (context === "reset-request" && !message) return "Could not request a password reset email.";
    return message || (context === "sign-in" ? "Could not sign in. Check your email, password, and internet connection." : "The cloud request could not be completed.");
  }

  function setAuthMessage(message, tone = "info", area = "sign-in") {
    const id = area === "recovery" ? "cloudPasswordRecoveryMessage" : "cloudAuthMessage";
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(message || "");
    node.dataset.tone = tone;
  }

  function setCloudConnectionStatus(label, tone = "info") {
    const node = document.getElementById("cloudConnectionStatus");
    if (!node) return;
    node.textContent = String(label || "Not tested");
    node.dataset.tone = tone;
  }

  function passwordRecoveryRedirect() {
    try {
      const url = new URL(location.href);
      if (!/^https?:$/.test(url.protocol)) return "";
      url.search = "";
      url.hash = "";
      url.searchParams.set("auth", "recovery");
      return url.href;
    } catch (error) { return ""; }
  }

  function parsePasswordRecoveryUrl() {
    try {
      const url = new URL(location.href);
      const hash = new URLSearchParams(String(url.hash || "").replace(/^#/, ""));
      const requested = url.searchParams.get("auth") === "recovery" || hash.get("type") === "recovery" || hash.has("error") || hash.has("error_code");
      const error = hash.get("error") || "";
      const errorCode = hash.get("error_code") || "";
      const description = hash.get("error_description") || "";
      return { requested, error, errorCode, description };
    } catch (error) { return { requested:false, error:"", errorCode:"", description:"" }; }
  }

  function recoveryErrorMessage(info = {}) {
    const code = String(info.errorCode || "").toLowerCase();
    const text = decodeURIComponent(String(info.description || info.error || "").replace(/\+/g, " "));
    if (/otp_expired|expired|invalid.*link|access_denied/.test(`${code} ${text}`.toLowerCase())) return "This reset link is invalid, expired, or already used. Request a new reset email or use a recovery code.";
    if (/redirect/.test(`${code} ${text}`.toLowerCase())) return "The password-reset redirect is not allowed by the cloud project. Check Supabase Auth redirect URLs.";
    return text || "Password recovery could not be completed. Request a new reset email or use a recovery code.";
  }

  function focusPasswordRecoverySettings() {
    try {
      if (typeof goToPage === "function") goToPage("settings", { historyMode:"none", smooth:false });
      if (typeof activateSettingsPanel === "function") activateSettingsPanel("sync", false);
    } catch (error) {}
  }

  function cleanPasswordRecoveryUrl({ keepRoute = true } = {}) {
    try {
      const url = new URL(location.href);
      url.hash = "";
      if (keepRoute) url.searchParams.set("auth", "recovery");
      else url.searchParams.delete("auth");
      history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {}
  }

  function setRecoveryHelpMessage(message, tone = "warning") {
    const node = document.getElementById("cloudRecoveryHelpMessage");
    if (!node) return;
    node.textContent = String(message || "");
    node.dataset.tone = tone;
  }

  function setRecoveryRouteState({ active = false, error = null } = {}) {
    passwordRecoveryRouteActive = Boolean(active);
    passwordRecoveryError = error || null;
    if (passwordRecoveryRouteActive) focusPasswordRecoverySettings();
    renderCloudStats();
    if (passwordRecoveryError) setRecoveryHelpMessage(recoveryErrorMessage(passwordRecoveryError), "danger");
  }

  async function verifyRecoveryCode(email, token) {
    const value = String(email || "").trim();
    const code = String(token || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) throw new Error("Enter the email address used for your cloud account.");
    if (!code) throw new Error("Enter the recovery code from your reset email.");
    const sdk = await loadClient();
    if (typeof sdk.auth.verifyOtp !== "function") throw new Error("This app build cannot verify recovery codes. Update the app and try again.");
    const result = await sdk.auth.verifyOtp({ email:value, token:code, type:"recovery" });
    if (result.error) throw result.error;
    session = result.data?.session || session;
    cloudUser = result.data?.user || session?.user || cloudUser;
    passwordRecoveryRouteActive = true;
    passwordRecoveryError = null;
    passwordRecoveryActive = true;
    cleanPasswordRecoveryUrl({ keepRoute:true });
    focusPasswordRecoverySettings();
    renderCloudStats();
    setAuthMessage("Recovery code accepted. Choose a new password.", "success", "recovery");
    return result.data || {};
  }

  function setPasswordVisibility(input, button, visible) {
    if (!input || !button) return;
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-pressed", String(Boolean(visible)));
    button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} password`);
  }

  async function withAuthButtonBusy(button, busyText, action) {
    if (!button || button.dataset.busy === "true") return;
    const priorText = button.textContent;
    button.dataset.busy = "true";
    button.disabled = true;
    button.textContent = busyText;
    try { return await action(); }
    finally { button.dataset.busy = "false"; button.disabled = false; button.textContent = priorText; }
  }

  async function testCloudConnection() {
    const config = getStoredConfig();
    const status = configStatus(config);
    if (!status.ok) throw new Error(status.message);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const endpoint = `${String(config.supabaseUrl).replace(/\/$/,"")}/auth/v1/health`;
      const response = await fetch(endpoint, { method:"GET", cache:"no-store", headers:{ apikey:config.supabasePublishableKey }, signal:controller?.signal });
      if (!response.ok) throw new Error(`Cloud service responded with HTTP ${response.status}.`);
      return { ok:true, status:response.status, endpoint };
    } finally { if (timer) clearTimeout(timer); }
  }

  async function requestPasswordReset(email) {
    const value = String(email || "").trim();
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) throw new Error("Enter the email address used for your cloud account.");
    const sdk = await loadClient();
    const redirectTo = passwordRecoveryRedirect();
    if (!redirectTo) throw new Error("Open the hosted HTTPS app to reset a cloud password. Local file copies cannot receive the secure reset link.");
    const result = await sdk.auth.resetPasswordForEmail(value, { redirectTo });
    if (result.error) throw result.error;
    return true;
  }

  async function completePasswordReset(password, confirmPassword) {
    const next = String(password || "");
    if (next.length < 6) throw new Error("Use a password with at least 6 characters.");
    if (next !== String(confirmPassword || "")) throw new Error("The new passwords do not match.");
    const sdk = await loadClient();
    const result = await sdk.auth.updateUser({ password:next });
    if (result.error) throw result.error;
    passwordRecoveryActive = false;
    passwordRecoveryRouteActive = false;
    passwordRecoveryError = null;
    cleanPasswordRecoveryUrl({ keepRoute:false });
    session = result.data?.session || session;
    cloudUser = result.data?.user || session?.user || cloudUser;
    return result.data?.user || cloudUser;
  }

  async function restoreSession() {
    if (!configStatus().ok) return;
    try {
      const sdk = await loadClient();
      const result = await sdk.auth.getSession();
      if (result.error) throw result.error;
      session = result.data?.session || null;
      cloudUser = session?.user || null;
      if (cloudUser) await onSignedIn();
      else onSignedOut();
    } catch (error) { setStatus("Cloud sync unavailable", error.message || "Could not load cloud sync.", "danger"); }
  }

  async function signIn(email,password) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const sdk = await loadClient();
    setStatus("Signing in", "Checking your cloud account…", "info");
    setAuthMessage("Checking your email and password…", "info");
    const result = await sdk.auth.signInWithPassword({ email: normalizedEmail, password });
    if (result.error) throw result.error;
    session = result.data?.session || null;
    cloudUser = result.data?.user || session?.user || null;
    setCloudConnectionStatus("Cloud reached", "success");
    setAuthMessage("Signed in successfully. Preparing cloud sync…", "success");
    if (typeof showToast === "function") showToast("Signed in successfully!", "success");
    if (cloudUser) await onSignedIn();
  }

  async function createAccount(email,password) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const sdk = await loadClient();
    setStatus("Creating account", "Creating your private cloud account…", "info");
    setAuthMessage("Creating your private cloud account…", "info");
    const result = await sdk.auth.signUp({ email: normalizedEmail, password });
    if (result.error) throw result.error;
    setCloudConnectionStatus("Cloud reached", "success");
    if (!result.data?.session) {
      setAuthMessage("Account created. Check your email and confirm it, then return here to sign in.", "warning");
      if (typeof showToast === "function") showToast("Account created! Check your email to confirm.", "info");
      return setStatus("Check your email", "Confirm the sign-up email, then return and sign in.", "warning");
    }
    session = result.data.session;
    cloudUser = result.data.user;
    setAuthMessage("Account created and signed in.", "success");
    if (typeof showToast === "function") showToast("Account created and signed in!", "success");
    await onSignedIn();
  }

  async function signOut() {
    if (client) {
      const result = await client.auth.signOut({ scope:"local" });
      if (result?.error) throw result.error;
    }
    onSignedOut();
  }

  function onSignedOut() {
    session = null; cloudUser = null;
    setPrivacyAuthentication(false);
    passwordRecoveryActive = false;
    clearForegroundPoll(); clearRealtimeRetry({resetAttempts:true});
    if (realtimeChannel && client) client.removeChannel(realtimeChannel).catch(() => {});
    realtimeChannel = null;
    setStatus("Not connected", "Local finance records remain on this device.", "info");
  }

  async function registerDevice() {
    const profileId = requireCloudProfile();
    const result = await rpc("finance_v3_register_device", {
      p_profile_id:profileId, p_device_id:currentDeviceId(), p_device_name:currentDeviceName(),
      p_platform:navigator.userAgent || navigator.platform || "Browser",
      p_app_version:appVersion(), p_app_version_code:APP_VERSION_CODE,
      p_last_pull_audit_id:Number(state.lastAuditId || 0)
    });
    if (result.status === "revoked") { await handleRevoked(result); return false; }
    state.profileRole = result.role || profileRole();
    return true;
  }

  async function handleRevoked(result = {}) {
    state.enabled = false;
    state.lastError = "This device was signed out remotely.";
    persist();
    try { await client?.auth?.signOut?.({ scope:"local" }); } catch (error) {}
    session = null; cloudUser = null;
    setPrivacyAuthentication(false);
    setStatus("Signed out remotely", `This installation was revoked${result.revoked_at ? ` on ${formatDateTime(result.revoked_at)}` : ""}. Local records remain available.`, "danger");
  }

  async function getProfileArchWithRetry(maxWaitMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const arch = PROFILE_ARCH();
      if (arch && typeof arch.listCloudProfiles === "function") return arch;
      await new Promise(res => setTimeout(res, 50));
    }
    return PROFILE_ARCH();
  }

  async function autoEnsureCloudProfile() {
    if (!cloudUser) return false;
    const arch = await getProfileArchWithRetry();
    if (!arch || typeof arch.cloudProfileId !== "function") return false;

    const accountPassphrase = `${cloudUser.id}:my-finance-v13:${(cloudUser.email || "").toLowerCase()}`;

    if (arch.cloudProfileId()) {
      if (!arch.isCloudUnlocked?.()) {
        try {
          await arch.unlockProfile(accountPassphrase, true);
        } catch (err) {
          console.warn("Account passphrase unlock failed", err);
        }
      }
      return Boolean(arch.cloudProfileId() && arch.isCloudUnlocked?.());
    }

    try {
      const listRes = await arch.listCloudProfiles();
      const profiles = listRes?.profiles || [];
      if (profiles.length > 0) {
        const target = profiles[0];
        try {
          await arch.connectCloudProfile(target.profile_id, accountPassphrase, true, { auto: true });
          return true;
        } catch (err) {
          console.warn("Auto connect profile failed", err);
        }
      }
    } catch (err) {
      console.warn("Listing cloud profiles failed", err);
    }

    try {
      const active = arch.activeProfile?.() || {};
      if (!active.encryption?.enabled) {
        await arch.configureEncryption(accountPassphrase);
      } else if (!arch.isCloudUnlocked?.()) {
        try { await arch.unlockProfile(accountPassphrase, true); } catch (err) {}
      }

      await arch.createCloudProfile({
        name: active.name || "My Cloud Finances",
        type: active.type || "personal",
        passphrase: accountPassphrase
      }, { auto: true });
      return true;
    } catch (err) {
      console.error("Auto creation of cloud profile failed", err);
      return false;
    }
  }

  async function onSignedIn() {
    if (!cloudUser) return;
    setPrivacyAuthentication(true, { email:cloudUser.email || "" });
    state.enabled = true;
    state.currentDeviceId = currentDeviceId();
    state.currentDeviceName = currentDeviceName();

    await autoEnsureCloudProfile();

    if (!cloudProfileId()) {
      persist();
      setStatus("Cloud profile required", "Open Profiles & Security to create or join an encrypted Cloud Schema V3 profile.", "warning");
      renderCloudStats();
      return;
    }
    if (!PROFILE_ARCH()?.isCloudUnlocked?.()) {
      persist();
      setStatus("Encryption locked", "Unlock this profile’s passphrase in Profiles & Security before synchronizing.", "warning");
      renderCloudStats();
      return;
    }
    persist();
    if (!await registerDevice()) return;
    await setupRealtime();
    const first = state.initializedUserId !== initializedScope();
    if (first) {
      try {
        const snap = await snapshot();
        const v3Exists = Array.isArray(snap.records) && snap.records.length > 0;
        const localMap = toRecordMap(data);
        const localHasRecords = Object.keys(localMap).length > 0;

        let autoMode = "merge";
        if (!v3Exists && localHasRecords) {
          autoMode = "upload";
        } else if (v3Exists && !localHasRecords) {
          autoMode = "download";
        }

        await initializeFirstSync(autoMode);
        return;
      } catch (err) {
        console.warn("Auto first sync failed", err);
        const msg = err.message || String(err);
        if (/Cloud Schema V3 is not installed/i.test(msg) || /function.*does not exist/i.test(msg)) {
          setStatus("Database setup required", "Run supabase/cloud-profiles-v13.sql in your Supabase SQL Editor to enable Cloud Sync.", "warning");
        } else {
          setStatus("Sync needs attention", msg, "danger");
        }
        await prepareFirstSyncChoices().catch(() => {});
        renderCloudStats();
        return;
      }
    }
    await syncNow({ reason:"sign-in" });
  }

  async function snapshot() {
    const profileId = requireCloudProfile();
    const result = await rpc("finance_v3_snapshot", { p_profile_id:profileId, p_device_id:currentDeviceId() });
    if (result.status === "revoked") await handleRevoked(result);
    if (result.status === "ok") result.records = await decryptRows(result.records || []);
    state.requiredAppVersionCode = Number(result.min_app_version_code || APP_VERSION_CODE);
    state.cloudSchemaVersion = Number(result.cloud_schema_version || CLOUD_SCHEMA_VERSION);
    state.profileRole = result.role || profileRole();
    persist();
    return result;
  }

  async function fetchLegacyPayload() {
    if (!client || !cloudUser) return null;
    const result = await client.from(LEGACY_CLOUD_TABLE).select("payload,revision,updated_at,updated_by_device,app_version").eq("user_id",cloudUser.id).maybeSingle();
    if (result.error) {
      if (/does not exist|schema cache/i.test(result.error.message || "")) return null;
      throw result.error;
    }
    return result.data?.payload || null;
  }

  function legacyPayloadData(payload) { return payload?.data && isObject(payload.data) ? payload.data : null; }

  async function prepareFirstSyncChoices() {
    const snap = await snapshot();
    if (snap.status === "revoked") return;
    const v3Exists = Array.isArray(snap.records) && snap.records.length > 0;
    const legacy = null;
    const cloudExists = v3Exists;
    const download = document.getElementById("cloudInitialDownload");
    const merge = document.getElementById("cloudInitialMerge");
    if (download) download.disabled = !cloudExists;
    if (merge) merge.disabled = !cloudExists;
    const message = document.getElementById("cloudFirstSyncMessage");
    if (message) message.textContent = v3Exists
      ? "This account already uses Encrypted Cloud Sync 3.0. Download it on a new device or merge carefully."
      : legacy
        ? "A legacy Cloud Sync V1 copy was found. Use V12.25.0 to recover it first, then return to V13.0.0."
        : "Cloud Schema V3 is empty. Upload this device to create the first record-level cloud copy.";
    const upload = document.getElementById("cloudInitialUpload");
    if (!cloudExists && upload) upload.checked = true;
    renderCloudStats();
  }

  function recoveryPoint(label) {
    const backup = { format:"my-finance-cloud-recovery-v3", label, createdAt:nowIso(), appVersion:appVersion(), schemaVersion:12, cloudSchemaVersion:3, data:clone(data), pending:clone(pending) };
    try { localStorage.setItem(`simple-finance-cloud-recovery-${Date.now()}`,JSON.stringify(backup)); } catch (error) {}
    return backup;
  }

  function changesBetween(remoteStore, desiredMap) {
    const changes = [];
    const keys = new Set([...Object.keys(remoteStore || {}), ...Object.keys(desiredMap || {})]);
    keys.forEach(key => {
      const remote = remoteStore[key];
      const desired = desiredMap[key];
      const desiredDeleted = !desired;
      if (remote && Boolean(remote.deletedAt) === desiredDeleted && same(remote.payload,desired?.payload || remote.payload) && Number(remote.sortIndex || 0) === Number(desired?.sortIndex || 0)) return;
      if (!remote && desiredDeleted) return;
      const [collection,recordId] = remote ? [remote.collection,remote.recordId] : [desired.collection,desired.recordId];
      changes.push({ collection, recordId, payload:clone(desired?.payload || remote?.payload || {}), sortIndex:Number(desired?.sortIndex || 0), deleted:desiredDeleted, baseRevision:Number(remote?.revision || 0), minWriterVersionCode:APP_VERSION_CODE });
    });
    return changes;
  }

  async function commitRawChanges(changes,{ migratedFromV2=false, operations=[] } = {}) {
    const profileId = requireCloudProfile({ write:true });
    let latest = Number(state.lastAuditId || 0);
    for (let offset=0; offset<changes.length; offset += MAX_BATCH_RECORDS) {
      const chunk = changes.slice(offset,offset+MAX_BATCH_RECORDS);
      const encryptedChanges = await Promise.all(chunk.map(toRpcChange));
      const batchId = uid("batch");
      let result;
      if (Array.isArray(operations) && operations.length && changes.length <= MAX_BATCH_RECORDS) {
        result = await rpc("finance_v3_commit_financial_operations", {
          p_profile_id:profileId,
          p_batch_id:`financial-set:${operations.map(item => item.operationId).sort().join("+").slice(0,100)}:${checksum(encryptedChanges)}`,
          p_operations:operations.map(item => ({
            operation_id:item.operationId, operation_type:item.operationType, expense_id:item.expenseId,
            account_name:item.accountName, amount:Number(item.amount || 0)
          })),
          p_device_id:currentDeviceId(), p_app_version:appVersion(), p_app_version_code:APP_VERSION_CODE,
          p_changes:encryptedChanges
        });
      } else {
        result = await rpc("finance_v3_commit_batch", {
          p_profile_id:profileId, p_batch_id:batchId, p_device_id:currentDeviceId(), p_app_version:appVersion(),
          p_app_version_code:APP_VERSION_CODE, p_changes:encryptedChanges, p_migrated_from_v2:Boolean(migratedFromV2)
        });
      }
      if (result.status !== "committed") {
        if (result.status === "conflict") result.conflicts = await decryptConflictRows(result.conflicts || []);
        return result;
      }
      await applyCommitResult(result);
      latest = Math.max(latest,Number(result.latest_audit_id || 0));
    }
    state.lastAuditId = latest;
    return { status:"committed",latest_audit_id:latest };
  }

  async function toRpcChange(item) {
    return {
      collection:item.collection, record_id:item.recordId,
      payload:await encryptRecordPayload(sanitizeRecordPayload(item.collection,item.recordId,item.payload), item.collection, item.recordId),
      sort_index:Number(item.sortIndex || 0), deleted:Boolean(item.deleted), base_revision:Number(item.baseRevision || 0),
      min_writer_version_code:Number(item.minWriterVersionCode || APP_VERSION_CODE)
    };
  }

  async function decryptConflictRows(rows = []) {
    return Promise.all((rows || []).map(async remote => {
      if (!remote?.remote_payload?.__financeEncrypted) return remote;
      return { ...remote, remote_payload:await decryptRecordPayload(remote.remote_payload, remote.collection, remote.record_id) };
    }));
  }

  async function applyCommitResult(result) {
    const records = await decryptRows(result.records || []);
    records.forEach(raw => {
      const row = recordFromRow(raw);
      const key = recordKey(row.collection,row.recordId);
      baseRecords[key] = row;
      delete pending[key];
      conflicts = conflicts.filter(item => item.key !== key);
    });
    state.lastAuditId = Math.max(Number(state.lastAuditId || 0),Number(result.latest_audit_id || 0));
    state.lastPushAt = nowIso();
    persist();
  }

  function storeFromSnapshotRows(rows) {
    const store = {};
    (rows || []).forEach(raw => { const row=recordFromRow(raw); if(row.collection&&row.recordId) store[recordKey(row.collection,row.recordId)]=row; });
    return store;
  }

  function mergeFirstSync(localMap,remoteStore) {
    const desired = {};
    const keys = new Set([...Object.keys(localMap),...Object.keys(remoteStore)]);
    keys.forEach(key => {
      const local=localMap[key], remote=remoteStore[key];
      if (!remote || remote.deletedAt) { if(local) desired[key]=local; return; }
      if (!local) { desired[key]={collection:remote.collection,recordId:remote.recordId,payload:clone(remote.payload),sortIndex:remote.sortIndex}; return; }
      if (same(local.payload,remote.payload) && local.sortIndex===remote.sortIndex) { desired[key]=local; return; }
      const preferRemote = FINANCIAL_COLLECTIONS.has(local.collection);
      desired[key] = preferRemote ? {collection:remote.collection,recordId:remote.recordId,payload:clone(remote.payload),sortIndex:remote.sortIndex} : local;
      addConflict({ key, collection:local.collection, recordId:local.recordId, reason:"First-sync overlap preserved for review.", localPayload:local.payload, remotePayload:remote.payload, remoteRevision:remote.revision, basePayload:null, paths:["first-sync"] });
    });
    return desired;
  }

  async function initializeFirstSync(mode) {
    if (!cloudUser) throw new Error("Sign in first.");
    if (!navigator.onLine) throw new Error("Connect to the internet for the first cloud synchronization.");
    setStatus("Preparing Cloud Sync 3.0", "Creating a recovery point before migration…", "info");
    recoveryPoint("Before Cloud Sync 3.0 initialization");
    const snap = await snapshot();
    if (snap.status === "revoked") return;
    const remoteStore = storeFromSnapshotRows(snap.records || []);
    const legacyData = null;
    const localMap = toRecordMap(data);
    let desired = localMap;

    if (mode === "download") {
      if (!Object.keys(remoteStore).length) throw new Error("No cloud records are available to download.");
      seedBaseFromSnapshot(Object.values(remoteStore));
      pending = {};
      applyEffectiveRecords("Cloud records downloaded");
      desired = toRecordMap(data);
    } else if (mode === "merge") {
      desired = mergeFirstSync(localMap,remoteStore);
    }

    if (mode !== "download" || legacyData) {
      const changes = changesBetween(legacyData ? {} : remoteStore,desired);
      const result = await commitRawChanges(changes,{ migratedFromV2:true });
      if (result.status === "conflict") throw new Error("Cloud records changed during migration. Select Sync now and review the listed records.");
      if (result.status === "upgrade_required") throw new Error(`Cloud requires ${versionFromCode(result.min_app_version_code)} or newer.`);
      if (result.status !== "committed") throw new Error(`Cloud initialization returned ${result.status || "an unknown status"}.`);
      const refreshed = await snapshot();
      seedBaseFromSnapshot(refreshed.records || []);
      state.lastAuditId = Number(refreshed.latest_audit_id || state.lastAuditId || 0);
      pending = {};
      applyEffectiveRecords(mode === "merge" ? "Device and cloud records merged" : mode === "download" ? "Legacy cloud records migrated" : "Device records uploaded");
    }

    state.initializedUserId = initializedScope();
    state.initializedProfileId = cloudProfileId();
    state.migratedFromV1 = false;
    state.lastSyncAt = nowIso();
    state.lastPullAt = nowIso();
    persist();
    await registerDevice();
    await loadDevices();
    await loadRecentAudit();
    setStatus("Synced", "Encrypted Cloud Sync 3.0 is ready on this device.", "success");
  }

  async function pullChanges() {
    let pages=0, changed=false, hasMore=true;
    while (hasMore && pages < MAX_PULL_PAGES) {
      const result = await rpc("finance_v3_pull", { p_profile_id:requireCloudProfile(), p_after_audit_id:Number(state.lastAuditId || 0), p_limit:250, p_device_id:currentDeviceId() });
      if (result.status === "revoked") { await handleRevoked(result); return false; }
      if (result.status === "device_missing") { if (!await registerDevice()) return false; pages += 1; continue; }
      if (result.status !== "ok") throw new Error(`Cloud pull returned ${result.status || "an unknown status"}.`);
      for (const encryptedEvent of result.events || []) {
        const event = await decryptRow(encryptedEvent);
        applyRemoteEvent(event);
        changed = true;
        state.lastAuditId = Math.max(Number(state.lastAuditId || 0),Number(event.id || 0));
      }
      state.lastAuditId = Math.max(Number(state.lastAuditId || 0),Number(result.latest_audit_id || 0));
      hasMore = Boolean(result.has_more);
      pages += 1;
    }
    state.lastPullAt = nowIso();
    persist();
    if (changed) applyEffectiveRecords("Record-level cloud changes downloaded");
    return changed;
  }
  function applyRemoteEvent(event) {
    const row = recordFromRow(event);
    const key = recordKey(row.collection,row.recordId);
    const local = pending[key];
    if (!local) {
      baseRecords[key] = row;
      const orphan=conflicts.find(item=>item.key===key);
      if (orphan && row.updatedByDevice === currentDeviceId() && ((!orphan.localDeleted && same(orphan.localPayload,row.payload) && (orphan.localSortIndex == null || Number(orphan.localSortIndex) === Number(row.sortIndex || 0))) || (orphan.localDeleted && row.deletedAt))) conflicts=conflicts.filter(item=>item.key!==key);
      return;
    }
    if (row.updatedByDevice === currentDeviceId() && row.revision >= local.baseRevision) {
      baseRecords[key] = row;
      let confirmed=false;
      if (!local.deleted && same(local.payload,row.payload) && Number(local.sortIndex || 0) === Number(row.sortIndex || 0)) { delete pending[key]; confirmed=true; }
      else if (local.deleted && row.deletedAt) { delete pending[key]; confirmed=true; }
      if (confirmed) conflicts=conflicts.filter(item=>item.key!==key);
      return;
    }
    if (row.revision <= Number(local.baseRevision || 0)) return;
    const overlaps=[];
    const merged = local.deleted || row.deletedAt ? clone(local.payload) : threeWayMerge(local.basePayload,local.payload,row.payload,"",overlaps);
    baseRecords[key] = row;
    if (!overlaps.length && !local.deleted && !row.deletedAt) {
      conflicts=conflicts.filter(item=>item.key!==key);
      if (same(merged,row.payload) && Number(local.sortIndex || 0) === Number(row.sortIndex || 0)) delete pending[key];
      else {
        local.payload=merged;
        local.basePayload=clone(row.payload);
        local.baseRevision=row.revision;
        local.baseSortIndex=row.sortIndex;
        local.status="pending";
        local.lastError="Safely merged non-overlapping fields from another device.";
        local.nextAttemptAt=0;
      }
      return;
    }
    local.status="conflict";
    local.lastError=row.deletedAt ? "Cloud deleted this record while this device changed it." : local.deleted ? "This device deleted a record that changed in the cloud." : "Both devices changed overlapping fields.";
    addConflict({ key,collection:row.collection,recordId:row.recordId,reason:local.lastError,localPayload:local.payload,localSortIndex:local.sortIndex,localDeleted:local.deleted,remotePayload:row.payload,remoteRevision:row.revision,remoteDeletedAt:row.deletedAt,remoteSortIndex:row.sortIndex,basePayload:local.basePayload,paths:overlaps.length?overlaps:["record"] });
  }
  function addConflict(input) {
    conflicts = conflicts.filter(item => item.key !== input.key);
    conflicts.unshift({
      id:uid("conflict"), key:input.key, collection:input.collection, recordId:input.recordId,
      reason:input.reason || "Record conflict", createdAt:nowIso(), resolved:false, localPayload:sanitizeRecordPayload(input.collection,input.recordId,input.localPayload), localSortIndex:input.localSortIndex == null ? null : Number(input.localSortIndex || 0), localDeleted:Boolean(input.localDeleted), remotePayload:sanitizeRecordPayload(input.collection,input.recordId,input.remotePayload),
      remoteRevision:Number(input.remoteRevision || 0), remoteDeletedAt:input.remoteDeletedAt || "",
      remoteSortIndex:input.remoteSortIndex == null ? null : Number(input.remoteSortIndex || 0), remoteMissing:Boolean(input.remoteMissing),
      basePayload:input.basePayload == null ? null : sanitizeRecordPayload(input.collection,input.recordId,input.basePayload), paths:(input.paths || []).slice(0,80)
    });
    conflicts=conflicts.slice(0,MAX_CONFLICTS);
    persist();
  }
  function detectFinancialOperations(items) {
    const operations=[];
    items.forEach(item => {
      if (item.collection !== "accountLedger" || item.deleted) return;
      const entry=item.payload || {};
      const type=entry.type;
      if (!["expense-payment","gym-auto-payment","expense-payment-reversal"].includes(type)) return;
      operations.push({
        operationId:String(entry.operationId || entry.transactionId || entry.id || ""),
        operationType:type === "gym-auto-payment" ? "gym_auto_payment" : type === "expense-payment-reversal" ? "expense_payment_restore" : "expense_payment",
        expenseId:String(entry.expenseId || ""), accountName:String(entry.account || ""), amount:Math.abs(Number(entry.amount || 0))
      });
    });
    const unique=new Map(operations.filter(item=>item.operationId&&item.expenseId).map(item=>[`${item.operationId}|${item.expenseId}|${item.operationType}`,item]));
    return [...unique.values()];
  }

  async function pushPending() {
    if (!profileCanWrite()) return false;
    const due = Object.values(pending).filter(item => item.status !== "conflict" && Number(item.nextAttemptAt || 0) <= Date.now()).slice(0,MAX_BATCH_RECORDS);
    if (!due.length) return false;
    due.forEach(item => { item.status="retrying"; });
    persist(); renderSyncHealth();
    const operations=detectFinancialOperations(due);
    try {
      const result=await commitRawChanges(due,{ operations });
      if (result.status === "committed") {
        state.lastPushAt=nowIso();
        persist();
        return true;
      }
      if (result.status === "conflict") {
        handleCommitConflicts(result.conflicts || [], due);
        return false;
      }
      if (result.status === "upgrade_required") {
        state.requiredAppVersionCode=Number(result.min_app_version_code || APP_VERSION_CODE);
        due.forEach(item => { item.status="error"; item.lastError=`Update required: ${versionFromCode(state.requiredAppVersionCode)} or newer.`; item.nextAttemptAt=Date.now()+RETRY_MAX_MS; });
        persist();
        throw new Error(`Cloud requires ${versionFromCode(state.requiredAppVersionCode)} or newer.`);
      }
      if (result.status === "revoked") { await handleRevoked(result); return false; }
      throw new Error(`Cloud commit returned ${result.status || "an unknown status"}.`);
    } catch (error) {
      due.forEach(item => {
        if (item.status === "conflict") return;
        item.status="error";
        item.attempts=Number(item.attempts || 0)+1;
        item.lastError=String(error.message || error).slice(0,240);
        item.nextAttemptAt=Date.now()+retryDelay(item.attempts);
      });
      persist(); scheduleRetry();
      throw error;
    }
  }

  function handleCommitConflicts(remoteConflicts, batchItems = []) {
    const remoteByKey = new Map((remoteConflicts || []).map(remote => [recordKey(remote.collection,remote.record_id),remote]));
    (batchItems || []).forEach(local => {
      const key=recordKey(local.collection,local.recordId);
      const remote=remoteByKey.get(key);
      const base=baseRecords[key];
      local.status="conflict";
      local.lastError=remote
        ? (remote.reason === "record_requires_newer_app" ? "This record requires a newer app version." : "The cloud revision changed before this atomic batch was committed.")
        : "A related record in the same atomic batch conflicted, so no part of the batch was committed.";
      addConflict({
        key,collection:local.collection,recordId:local.recordId,reason:local.lastError,
        localPayload:local.payload,localSortIndex:local.sortIndex,localDeleted:local.deleted,remotePayload:remote ? (remote.remote_payload ?? {}) : (base?.payload || {}),
        remoteRevision:Number(remote?.remote_revision ?? base?.revision ?? local.baseRevision ?? 0),
        remoteDeletedAt:remote ? (remote.remote_deleted_at ?? "") : (base?.deletedAt || ""), remoteSortIndex:remote?.remote_sort_index ?? base?.sortIndex ?? local.baseSortIndex ?? null,
        remoteMissing:remote?.reason === "record_missing",
        basePayload:local.basePayload,paths:[remote?.reason || "atomic_batch_conflict"]
      });
    });
    const repairedSettings = reconcileDerivedSettingsState();
    persist();
    if (repairedSettings) applyEffectiveRecords("Device-local ledger metadata removed from cloud settings");
  }

  async function syncNow({ reason="manual" } = {}) {
    if (syncing) return;
    if (!cloudUser) { renderCloudStats(); return; }
    if (state.initializedUserId !== initializedScope()) {
      setStatus("Initializing sync", "Setting up encrypted cloud synchronization...", "info");
      await onSignedIn();
      if (state.initializedUserId !== initializedScope()) {
        renderCloudStats();
        return;
      }
    }
    if (!navigator.onLine) { setStatus("Offline", `${pendingCount()} record${pendingCount()===1?"":"s"} waiting.`, "info"); return; }
    requireCloudProfile();
    syncing=true;
    setStatus("Syncing", `Checking record-level changes (${reason})…`, "info");
    try {
      if (!await registerDevice()) return; const recovered=reconcileUnqueuedLocalChanges(); if(recovered.length)setStatus("Recovering local changes",`${recovered.length} previously missed Finance record${recovered.length===1?"":"s"} will be reconciled safely.`,"warning");
      await pullChanges();
      let guard=0;
      while (Object.values(pending).some(item=>item.status!=="conflict"&&Number(item.nextAttemptAt||0)<=Date.now()) && guard<6) {
        await pushPending();
        guard += 1;
      }
      await pullChanges();
      await loadDevices();
      await loadRecentAudit();
      state.lastSyncAt=nowIso();
      state.lastError="";
      persist();
      if (conflictCount()) setStatus("Review conflicts", `${conflictCount()} record conflict${conflictCount()===1?"":"s"} need a choice.`, "warning");
      else if (pendingCount()) setStatus("Changes pending", `${pendingCount()} record${pendingCount()===1?"":"s"} will retry automatically.`, "warning");
      else setStatus("Synced", "This device matches the latest record-level cloud state.", "success");
    } catch (error) {
      setStatus("Sync needs attention", error.message || "Cloud synchronization failed.", "danger");
      throw error;
    } finally { syncing=false; updateTopSyncUi(); renderCloudStats(); scheduleRetry(); scheduleForegroundPoll(); }
  }

  async function setupRealtime() {
    if(!client||!cloudUser)return;
    if(realtimeChannel){const previous=realtimeChannel;realtimeChannel=null;await client.removeChannel(previous);}
    const channel=client.channel(`finance-sync-v3-${cloudProfileId()}-${cloudUser.id}`); realtimeChannel=channel
      .on("postgres_changes", { event:"INSERT", schema:"public", table:AUDIT_TABLE, filter:`profile_id=eq.${cloudProfileId()}` }, payload => {
        const source=payload?.new?.device_id,auditId=Number(payload?.new?.id||0);if(source===currentDeviceId()||auditId<=Number(state.lastAuditId||0))return;
        state.realtimeStatus="Change received";persist();setStatus("Cloud change received","Downloading changed records from another device…","info");scheduleSync(220);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:DEVICE_TABLE,filter:`profile_id=eq.${cloudProfileId()}`},payload=>{if(payload?.new?.device_id===currentDeviceId()&&payload?.new?.revoked_at)handleRevoked(payload.new).catch(()=>{});})
      .subscribe(status=>{if(realtimeChannel!==channel)return;const normalized=String(status||"Connecting");state.realtimeStatus=normalized;persist();renderSyncHealth();if(normalized==="SUBSCRIBED"){noteRealtimeSubscribed();requestLifecycleSync("realtime-subscribed",0);}else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(normalized)){scheduleRealtimeRecovery(normalized);scheduleForegroundPoll(1000);}});
  }

  async function ensureRealtime(){if(realtimeChannel&&state.realtimeStatus==="SUBSCRIBED")return;await setupRealtime();}

  async function loadDevices() {
    if (!client || !cloudUser) return renderDevices([]);
    const result=await client.from(DEVICE_TABLE).select("user_id,device_id,device_name,platform,app_version,app_version_code,cloud_schema_version,last_seen_at,last_sync_at,last_push_at,last_pull_audit_id,revoked_at").eq("profile_id",requireCloudProfile()).order("last_seen_at",{ascending:false});
    if (result.error) throw result.error;
    renderDevices(result.data || []);
  }

  function renderDevices(devices) {
    const body=document.getElementById("cloudDevicesBody");
    if (!body) return;
    const table=body.closest("table");
    if (table?.tHead?.rows?.[0]) table.tHead.rows[0].innerHTML="<th>Device</th><th>Status</th><th>App</th><th>Last seen</th><th>Action</th>";
    body.innerHTML=devices.length?devices.map(device=>{
      const current=device.device_id===currentDeviceId() && device.user_id===cloudUser?.id;
      const revoked=Boolean(device.revoked_at);
      const status=revoked?"Revoked":current?"Current":"Connected";
      const tone=revoked?"danger":current?"success":"info";
      return `<tr><td><strong>${escape(device.device_name||"Device")}</strong><br><small>${escape(device.platform||"Browser")}</small></td><td><span class="v12-chip ${tone}">${status}</span></td><td>V${escape(device.app_version||"Unknown")}<br><small>Cloud V${Number(device.cloud_schema_version||1)}</small></td><td>${escape(formatDateTime(device.last_seen_at))}</td><td>${current||revoked?"—":`<button class="button button-secondary button-small" type="button" data-revoke-cloud-device="${escape(device.device_id)}" data-revoke-cloud-user="${escape(device.user_id || cloudUser?.id || "")}">Sign out remotely</button>`}</td></tr>`;
    }).join(""):`<tr><td colspan="5"><div class="v12-empty">No cloud devices are listed yet.</div></td></tr>`;
  }

  async function revokeDevice(deviceId,userId = cloudUser?.id) {
    if (!deviceId || (deviceId===currentDeviceId() && userId===cloudUser?.id)) return;
    const result=await rpc("finance_v3_revoke_device",{p_profile_id:requireCloudProfile(),p_user_id:userId,p_device_id:deviceId,p_revoked_by_device:currentDeviceId()});
    if (result.status!=="revoked") throw new Error("The device could not be revoked.");
    await loadDevices();
    showToast("The device will sign out the next time it connects.","success");
  }

  async function loadRecentAudit() {
    if (!client || !cloudUser) return;
    const result=await client.from(AUDIT_TABLE).select("id,collection,record_id,action,revision,device_id,app_version,created_at").eq("profile_id",requireCloudProfile()).order("id",{ascending:false}).limit(30);
    if (result.error) throw result.error;
    const node=document.getElementById("cloudAuditList");
    if (!node) return;
    node.innerHTML=(result.data||[]).length?(result.data||[]).map(item=>`<div class="cloud-audit-row"><small>#${Number(item.id||0)} · ${escape(item.action)}</small><span>${escape(item.collection)} · ${escape(item.record_id)}</span><small>r${Number(item.revision||0)} · V${escape(item.app_version||"?")}</small></div>`).join(""):`<div class="v12-empty">No encrypted Cloud Schema V3 activity has been recorded yet.</div>`;
  }

  function renderConflicts() {
    const node=document.getElementById("cloudConflictList");
    const chip=document.getElementById("cloudConflictCount");
    if (!node||!chip) return;
    const unresolved=conflicts.filter(item=>!item.resolved);
    chip.textContent=unresolved.length?`${unresolved.length} to review`:"No conflicts";
    chip.className=`v12-chip ${unresolved.length?"warning":"success"}`;
    node.innerHTML=unresolved.length?unresolved.map(item=>`<article class="cloud-conflict-item"><div><strong>${escape(recordLabel(item.collection,item.localPayload,item.recordId))}</strong><small>${escape(item.reason)}</small><small>${escape((item.paths||[]).slice(0,3).join(" · "))}</small></div><div class="cloud-conflict-actions"><button class="button button-secondary button-small" type="button" data-download-cloud-conflict="${escape(item.id)}">Download both</button><button class="button button-primary button-small" type="button" data-review-cloud-conflict="${escape(keyToken(item.key))}">Review versions</button></div></article>`).join(""):`<div class="v12-empty">No unresolved record conflicts.</div>`;
  }

  function conflictForKey(key) { return conflicts.find(item=>item.key===key&&!item.resolved) || null; }

  function retryRecord(key) {
    const item=pending[key];
    if (!item) return;
    const conflict=conflictForKey(key);
    if (conflict) {
      const overlap=[];
      const merged=threeWayMerge(conflict.basePayload,item.payload,conflict.remotePayload,"",overlap);
      if (overlap.length) { showToast("This record has overlapping fields. Choose Keep this version or Discard local.","warning"); return; }
      item.payload=merged;
      item.basePayload=clone(conflict.remotePayload);
      item.baseRevision=Number(conflict.remoteRevision||0);
      item.status="pending";
      item.attempts=0; item.nextAttemptAt=0; item.lastError="Safe field merge ready to retry.";
      conflicts=conflicts.filter(entry=>entry.key!==key);
    } else {
      item.status="pending"; item.attempts=0; item.nextAttemptAt=0; item.lastError="";
    }
    persist(); renderCloudStats(); scheduleSync(80);
  }
  function refreshAfterConflictChoice(message) {
    try { applyEffectiveRecords(message); } catch (error) {
      console.error("Conflict choice was saved but the interface could not refresh.",error); try { showToast("Choice saved. Reload the app to refresh the interface.","warning"); } catch (toastError) {}
    }
    try { renderCloudStats(); } catch (error) { console.error("Could not refresh Cloud Sync status.",error); }
  }
  function resolveConflict(key, choice) {
    const item=pending[key], conflict=conflictForKey(key);
    const resolver=window.FinanceCloudConflictResolution;
    if (!resolver?.apply) throw new Error("Conflict resolution is unavailable. Reload the latest app version and try again.");
    const result=resolver.apply({key,choice,item,conflict,baseRecords,pending,conflicts,setConflicts:value=>{conflicts=value;},persist,clone,splitKey,nowIso,appVersion:appVersion(),appVersionCode:APP_VERSION_CODE});
    refreshAfterConflictChoice(choice === "cloud" ? "Cloud version selected for sync conflict" : "Device version selected for sync conflict");
    if (choice === "device") scheduleSync(80);
    showToast(choice === "cloud" ? "Cloud version applied on this device." : "This device’s version is queued for cloud sync.","success");
    return result;
  }
  function discardLocal(key) { return resolveConflict(key,"cloud"); }
  function keepLocal(key) { return resolveConflict(key,"device"); }
  function downloadConflict(id) {
    const item=conflicts.find(entry=>entry.id===id);
    if (!item) return;
    downloadJson(`finance-record-conflict-${id}.json`,item);
  }
  function downloadJson(filename,value) {
    const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob), link=document.createElement("a");
    link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function bindEvents() {
    document.getElementById("cloudSyncStatusButton")?.addEventListener("click",event=>{event.stopPropagation();toggleTopSyncPopover();});
    document.getElementById("cloudToolbarClose")?.addEventListener("click",closeTopSyncPopover);
    document.getElementById("cloudToolbarSyncNow")?.addEventListener("click",()=>syncNow({reason:"toolbar"}).catch(error=>showToast(error.message,"warning")));
    document.getElementById("cloudToolbarOpenSettings")?.addEventListener("click",()=>{closeTopSyncPopover();goToPage("settings",{smooth:false});activateSettingsPanel("cloud",true);});
    document.getElementById("cloudToolbarFixIssue")?.addEventListener("click",()=>{
      closeTopSyncPopover();
      goToPage("settings",{smooth:false});
      activateSettingsPanel("cloud",true);
      setTimeout(()=>{
        const conflicts = document.getElementById("cloudConflictList");
        const healthCard = document.getElementById("cloudSyncHealthCard");
        if (conflicts && conflicts.querySelector(".cloud-conflict-item")) {
          conflicts.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (healthCard) {
          healthCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    });
    document.getElementById("cloudOverviewSyncNow")?.addEventListener("click", () => syncNow({reason:"overview"}).catch(error => showToast(error.message, "warning")));
    document.getElementById("cloudOverviewFixButton")?.addEventListener("click", () => {
      const conflicts = document.getElementById("cloudConflictList");
      const healthCard = document.getElementById("cloudSyncHealthCard");
      if (conflicts && conflicts.querySelector(".cloud-conflict-item")) {
        conflicts.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (healthCard) {
        healthCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    document.addEventListener("click",event=>{if(!event.target.closest("#cloudSyncToolbarPopover")&&!event.target.closest("#cloudSyncStatusButton"))closeTopSyncPopover();});
    window.addEventListener("resize",()=>{if(!document.getElementById("cloudSyncToolbarPopover")?.hidden&&typeof positionCloudToolbarPopover==="function")positionCloudToolbarPopover();});
    document.getElementById("saveCloudConfig")?.addEventListener("click",()=>{
      const config={supabaseUrl:document.getElementById("cloudConfigUrl").value.trim(),supabasePublishableKey:document.getElementById("cloudConfigKey").value.trim()};
      const status=configStatus(config); if(!status.ok)return showToast(status.message,"warning");
      saveJson(CONFIG_KEY,config); showToast("Cloud configuration saved. Reloading…","success"); setTimeout(()=>location.reload(),350);
    });
    document.getElementById("clearCloudConfig")?.addEventListener("click",()=>{ if(!confirm("Remove cloud configuration from this device? Local records remain."))return; localStorage.removeItem(CONFIG_KEY); setTimeout(()=>location.reload(),250); });
    document.getElementById("cloudPasswordToggle")?.addEventListener("click",event=>{const input=document.getElementById("cloudAuthPassword");setPasswordVisibility(input,event.currentTarget,input?.type === "password");});
    document.querySelectorAll("[data-cloud-password-target]").forEach(button=>button.addEventListener("click",()=>{const input=document.getElementById(button.dataset.cloudPasswordTarget);setPasswordVisibility(input,button,input?.type === "password");}));
    document.getElementById("cloudSignIn")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Signing in…",async()=>{const email=document.getElementById("cloudAuthEmail").value.trim().toLowerCase(),password=document.getElementById("cloudAuthPassword").value;if(!email||password.length<6){const msg="Enter your email and password. Passwords must have at least 6 characters.";setAuthMessage(msg,"warning");if(typeof showToast==="function")showToast(msg,"warning");return;}try{await signIn(email,password);}catch(error){const message=friendlyAuthError(error,"sign-in");if(/wrong email or password/i.test(message))setCloudConnectionStatus("Cloud reached","success");setAuthMessage(`${message} Your local finance records stay stored on this device and remain hidden until you sign in.`,"danger");setStatus("Sign-in failed",message,"danger");if(typeof showToast==="function")showToast(message,"danger");}}));
    document.getElementById("cloudCreateAccount")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Creating…",async()=>{const email=document.getElementById("cloudAuthEmail").value.trim().toLowerCase(),password=document.getElementById("cloudAuthPassword").value;if(!email||password.length<6){const msg="Use a valid email and a password with at least 6 characters.";setAuthMessage(msg,"warning");if(typeof showToast==="function")showToast(msg,"warning");return;}try{await createAccount(email,password);}catch(error){const message=friendlyAuthError(error,"create-account");setAuthMessage(`${message} Your local finance records stay stored on this device and remain hidden until you sign in.`,"danger");setStatus("Account creation failed",message,"danger");if(typeof showToast==="function")showToast(message,"danger");}}));
    document.getElementById("cloudAuthEmail")?.addEventListener("keydown",event=>{if(event.key === "Enter"){event.preventDefault();document.getElementById("cloudSignIn")?.click();}});
    document.getElementById("cloudAuthPassword")?.addEventListener("keydown",event=>{if(event.key === "Enter"){event.preventDefault();document.getElementById("cloudSignIn")?.click();}});
    document.getElementById("cloudForgotPassword")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Sending…",async()=>{const email=document.getElementById("cloudAuthEmail")?.value?.trim()||"";try{await requestPasswordReset(email);setCloudConnectionStatus("Cloud reached","success");setAuthMessage("If a cloud account exists for this email, a password-reset link has been sent. Check your inbox and spam folder.","success");setStatus("Password reset sent","Check your email for the secure reset link.","success");}catch(error){const message=friendlyAuthError(error,"reset-request");setAuthMessage(`${message} Your local finance records stay stored on this device and remain hidden until you sign in.`,"danger");setStatus("Password reset failed",message,"danger");}}));
    document.getElementById("cloudTestConnection")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Testing…",async()=>{setCloudConnectionStatus("Testing…","info");try{await testCloudConnection();setCloudConnectionStatus("Connected","success");setAuthMessage("Cloud service is reachable. If sign-in still fails, check the email/password or use Forgot password.","success");}catch(error){const message=friendlyAuthError(error,"connection");setCloudConnectionStatus("Connection failed","danger");setAuthMessage(message,"danger");}}));
    document.getElementById("cloudRecoveryResend")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Sending…",async()=>{const email=document.getElementById("cloudRecoveryEmail")?.value?.trim()||document.getElementById("cloudAuthEmail")?.value?.trim()||"";try{await requestPasswordReset(email);passwordRecoveryRouteActive=true;passwordRecoveryError=null;setRecoveryHelpMessage("A new reset email was requested. If the account exists, check your inbox and spam folder.","success");setStatus("Password reset sent","Use the newest reset email only.","success");}catch(error){setRecoveryHelpMessage(friendlyAuthError(error,"reset-request"),"danger");}}));
    document.getElementById("cloudVerifyRecoveryCode")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Verifying…",async()=>{const email=document.getElementById("cloudRecoveryEmail")?.value?.trim()||"",token=document.getElementById("cloudRecoveryCode")?.value||"";try{await verifyRecoveryCode(email,token);}catch(error){setRecoveryHelpMessage(friendlyAuthError(error,"recovery-code"),"danger");}}));
    document.getElementById("cloudRecoveryBackToSignIn")?.addEventListener("click",()=>{passwordRecoveryRouteActive=false;passwordRecoveryError=null;passwordRecoveryActive=false;cleanPasswordRecoveryUrl({keepRoute:false});renderCloudStats();});
    document.getElementById("cloudCompletePasswordReset")?.addEventListener("click",event=>withAuthButtonBusy(event.currentTarget,"Saving…",async()=>{const next=document.getElementById("cloudNewPassword")?.value||"",confirmPassword=document.getElementById("cloudConfirmPassword")?.value||"";try{await completePasswordReset(next,confirmPassword);document.getElementById("cloudNewPassword").value="";document.getElementById("cloudConfirmPassword").value="";setAuthMessage("Password updated successfully. Continuing cloud sign-in…","success","recovery");setStatus("Password updated","Your new cloud password is active.","success");renderCloudStats();if(cloudUser)await onSignedIn();}catch(error){const message=friendlyAuthError(error,"password-reset");setAuthMessage(message,"danger","recovery");}}));
    document.getElementById("cloudCancelPasswordReset")?.addEventListener("click",async()=>{passwordRecoveryActive=false;passwordRecoveryRouteActive=false;passwordRecoveryError=null;cleanPasswordRecoveryUrl({keepRoute:false});try{const sdk=await loadClient();await sdk.auth.signOut({scope:"local"});}catch(error){}onSignedOut();renderCloudStats();});
    document.getElementById("cloudSyncNow")?.addEventListener("click",()=>syncNow({reason:"manual"}).catch(error=>showToast(error.message,"warning")));
    document.getElementById("cloudSignOut")?.addEventListener("click",()=>signOut().catch(error=>showToast(error.message,"warning")));
    document.getElementById("cloudAutoSync")?.addEventListener("change",event=>{state.autoSync=Boolean(event.target.checked);persist();if(state.autoSync){requestLifecycleSync("auto-sync-enabled",100);ensureRealtime().catch(()=>scheduleRealtimeRecovery("CHANNEL_ERROR"));}else{clearForegroundPoll();clearRealtimeRetry();}renderCloudStats();});
    document.getElementById("cloudInitialConfirm")?.addEventListener("click",async()=>{const mode=document.querySelector('input[name="cloudInitialMode"]:checked')?.value||"upload";try{await initializeFirstSync(mode);}catch(error){setStatus("Cloud initialization failed",error.message,"danger");}});
    document.getElementById("cloudExportBeforeFirst")?.addEventListener("click",()=>downloadJson(`my-finance-before-cloud-v3-${new Date().toISOString().slice(0,10)}.json`,recoveryPoint("Manual pre-cloud-v3 export")));
    document.getElementById("cloudSaveDeviceName")?.addEventListener("click",async()=>{const value=document.getElementById("cloudDeviceName").value.trim().slice(0,60);if(!value)return showToast("Enter a device name.","warning");state.currentDeviceName=value;persist();try{const id=currentDeviceId();if(typeof appMeta!=="undefined"&&appMeta.devices?.[id]){appMeta.devices[id].name=value;if(typeof writeMeta==="function")writeMeta();}}catch(error){}try{await registerDevice();await loadDevices();setStatus("Device renamed",value,"success");}catch(error){setStatus("Rename needs sync",error.message,"warning");}});
    document.getElementById("cloudDevicesBody")?.addEventListener("click",event=>{const button=event.target.closest("[data-revoke-cloud-device]");if(!button)return;if(!confirm("Sign out this device remotely? It will be blocked from future Cloud Sync 3.0 commits and will clear its cloud session the next time it connects."))return;revokeDevice(button.dataset.revokeCloudDevice,button.dataset.revokeCloudUser).catch(error=>showToast(error.message,"warning"));});
    document.getElementById("cloudPendingList")?.addEventListener("click",handlePendingClick);
    document.getElementById("cloudConflictList")?.addEventListener("click",event=>{const download=event.target.closest("[data-download-cloud-conflict]");if(download)downloadConflict(download.dataset.downloadCloudConflict);else handlePendingClick(event);});
    window.FinanceCloudConflictReview?.bind?.({onDownload:downloadConflict,onUseCloud:token=>discardLocal(keyFromToken(token)),onUseDevice:token=>keepLocal(keyFromToken(token))});
    window.addEventListener("finance:data-persisted",handlePersistedData); window.addEventListener("online",()=>{setStatus("Back online","Checking pending record changes…","info");if(state.autoSync!==false){ensureRealtime().catch(()=>scheduleRealtimeRecovery("CHANNEL_ERROR"));requestLifecycleSync("online",120);}});
    window.addEventListener("offline",()=>{clearForegroundPoll();setStatus("Offline",`${pendingCount()} record${pendingCount()===1?"":"s"} waiting.`,"info");}); window.addEventListener("focus",()=>requestLifecycleSync("focus",220));
    window.addEventListener("pageshow",()=>{if(state.autoSync!==false&&cloudUser){ensureRealtime().catch(()=>scheduleRealtimeRecovery("CHANNEL_ERROR"));requestLifecycleSync("pageshow",80);}});
    window.addEventListener("pagehide",clearForegroundPoll); document.addEventListener("visibilitychange",()=>{if(document.hidden)clearForegroundPoll();else if(state.autoSync!==false&&cloudUser){ensureRealtime().catch(()=>scheduleRealtimeRecovery("CHANNEL_ERROR"));requestLifecycleSync("visible",80);}});
    window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY&&!suppressQueue){try{const next=normalizeData(JSON.parse(event.newValue||"{}"));queueDiff(lastObservedData,next,"Another tab changed finance records");lastObservedData=clone(next);}catch(error){}}});
    window.addEventListener("finance:cloud-profile-linked",event=>{if(event?.detail?.auto)return;state={...defaultState()};baseRecords={};pending={};conflicts=[];persist();setStatus("Cloud profile linked","Reloading encrypted Cloud Sync 3.0…","success");setTimeout(()=>location.reload(),400);});
    window.addEventListener("finance:profile-unlocked",()=>{if(cloudUser)requestLifecycleSync("profile-unlocked",100);});
  }

  function handlePendingClick(event) {
    const retry=event.target.closest("[data-sync-retry]"),discard=event.target.closest("[data-sync-discard]"),keep=event.target.closest("[data-sync-keep]"),review=event.target.closest("[data-review-cloud-conflict]");
    if(retry)retryRecord(keyFromToken(retry.dataset.syncRetry));
    if(review){const key=keyFromToken(review.dataset.reviewCloudConflict),item=conflictForKey(key);window.FinanceCloudConflictReview?.open?.({item,keyToken:keyToken(key),title:item?recordLabel(item.collection,item.localPayload,item.recordId):"Review sync difference"});}
    if(discard&&confirm("Discard this device’s pending version and use the cloud-confirmed record?"))discardLocal(keyFromToken(discard.dataset.syncDiscard));
    if(keep&&confirm("Keep this device’s version and write it over the current cloud record? A cloud audit entry will preserve the change."))keepLocal(keyFromToken(keep.dataset.syncKeep));
  }

  async function initialize() {
    if(initialized)return;
    initialized=true;
    setPrivacyAuthentication(false);
    const repairedSettings = reconcileDerivedSettingsState();
    persist();
    if (repairedSettings) applyEffectiveRecords("Recovered derived settings sync conflict");
    injectV2Ui(); wrapSaveData(); bindEvents();
    const recoveryRoute = parsePasswordRecoveryUrl();
    if (recoveryRoute.requested) {
      passwordRecoveryRouteActive = true;
      passwordRecoveryError = recoveryRoute.error || recoveryRoute.errorCode ? recoveryRoute : null;
      focusPasswordRecoverySettings();
      if (passwordRecoveryError) {
        cleanPasswordRecoveryUrl({ keepRoute:true });
        setStatus("Password reset needs attention", recoveryErrorMessage(passwordRecoveryError), "danger");
      }
    }
    renderCloudStats();
    if (passwordRecoveryError) setRecoveryHelpMessage(recoveryErrorMessage(passwordRecoveryError), "danger");
    const status=configStatus();
    if(!status.ok){setStatus("Cloud sync not configured",status.message,"warning");return;}
    await restoreSession();
    setInterval(()=>{if(cloudUser&&state.autoSync!==false&&navigator.onLine&&!document.hidden)syncNow({reason:"periodic"}).catch(()=>{});},5*60*1000); scheduleForegroundPoll();
    scheduleRetry();
  }

  window.FinanceCloudSync={
    initialize,syncNow,
    buildRecordMap:()=>toRecordMap(data),
    get status(){return{...state,pendingCount:pendingCount(),conflictCount:conflictCount(),signedIn:Boolean(cloudUser),email:cloudUser?.email||""};}
  };
  window.FinanceCloudSyncInternals={loadClient,stable,checksum,deepMerge,threeWayMerge,toRecordMap,fromRecordStore,changesBetween,recordKey,keyToken,keyFromToken,retryDelay,detectFinancialOperations,encryptRecordPayload,decryptRecordPayload,toRpcChange,decryptRow,sanitizeRecordPayload,reconcileDerivedSettingsState,reconcileUnqueuedLocalChanges,seedBaseFromSnapshot,applyRemoteEvent,resolveConflict,handlePersistedData,requestLifecycleSync,scheduleForegroundPoll,scheduleRealtimeRecovery,ensureRealtime,friendlyAuthError,passwordRecoveryRedirect,parsePasswordRecoveryUrl,recoveryErrorMessage,cleanPasswordRecoveryUrl,testCloudConnection,requestPasswordReset,verifyRecoveryCode,completePasswordReset,setPasswordVisibility};

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>initialize().catch(error=>setStatus("Cloud sync unavailable",error.message,"danger")),{once:true});
  else initialize().catch(error=>setStatus("Cloud sync unavailable",error.message,"danger"));
})();
