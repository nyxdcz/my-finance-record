#!/usr/bin/env python3
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, lambda match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return updated


cloud = read("cloud-sync.js")
if 'const APP_VERSION_FALLBACK = "15.0.3";' in cloud:
    raise SystemExit("Safe multi-device sync patch already applied")

cloud = replace_once(
    cloud,
    '/* My Finance Records · Encrypted profile-scoped Cloud Sync 3.0.\n   For connected profiles, the current cloud record is authoritative. This device refreshes\n   cloud changes before queued local changes may upload, while preserving offline editing. */',
    '/* My Finance Records · Encrypted profile-scoped Cloud Sync 3.0.\n   Safe multi-device sync refreshes cloud revisions before upload, preserves concurrent device edits,\n   merges non-overlapping changes, and pauses overlapping changes for explicit review. */',
    "cloud header",
)
cloud = replace_once(cloud, 'const APP_VERSION_FALLBACK = "15.0.2";', 'const APP_VERSION_FALLBACK = "15.0.3";', "cloud version")

recover_conflicts = '''  function recoverStoredConflicts() {
    let recovered = 0;
    conflicts.filter(item => !item.resolved).forEach(conflict => {
      const key = conflict.key, base = baseRecords[key];
      if (!base) return;
      let item = pending[key];
      if (!item) {
        const [collection,recordId] = splitKey(key);
        item = pending[key] = {
          key,
          collection:String(conflict.collection || collection),
          recordId:String(conflict.recordId || recordId),
          payload:clone(conflict.localPayload || {}),
          sortIndex:Number(conflict.localSortIndex ?? base.sortIndex ?? 0),
          deleted:Boolean(conflict.localDeleted),
          baseRevision:Number(conflict.remoteRevision || base.revision || 0),
          basePayload:clone(conflict.remotePayload || base.payload || {}),
          baseSortIndex:Number(conflict.remoteSortIndex ?? base.sortIndex ?? 0),
          minWriterVersionCode:APP_VERSION_CODE,
          status:"conflict",
          attempts:0,
          nextAttemptAt:0,
          updatedAt:conflict.createdAt || nowIso(),
          reason:"Recovered unresolved multi-device conflict",
          lastError:"Both cloud and this device changed this record. Review both versions before choosing."
        };
        recovered += 1;
      } else {
        item.status = "conflict";
        item.lastError = "Both cloud and this device changed this record. Review both versions before choosing.";
      }
    });
    if (!recovered) return 0;
    persist({ reclaimFirst:true });
    applyEffectiveRecords("Recovered unresolved device edits without discarding them");
    return recovered;
  }

  function topStatusLabel'''
cloud = sub_once(
    cloud,
    r'  function adoptExistingCloudConflicts\(\) \{.*?\n  \}\n\n  function topStatusLabel',
    recover_conflicts,
    "stored conflict recovery",
)

reconcile_remote = '''  function reconcilePendingWithRemote(local, row, reason = "Cloud and this device both changed this record") {
    const key = recordKey(row.collection,row.recordId);
    const basePayload = clone(local.basePayload);
    const baseSortIndex = Number(local.baseSortIndex || 0);
    const localSortIndex = Number(local.sortIndex || 0);
    const remoteSortIndex = Number(row.sortIndex || 0);
    const overlaps = [];

    baseRecords[key] = row;

    if ((local.deleted && row.deletedAt) || (!local.deleted && !row.deletedAt && same(local.payload,row.payload) && localSortIndex === remoteSortIndex)) {
      delete pending[key];
      conflicts = conflicts.filter(item => item.key !== key);
      persist({ reclaimFirst:true });
      return "confirmed";
    }

    if (local.deleted || row.deletedAt) {
      local.status = "conflict";
      local.attempts = 0;
      local.nextAttemptAt = 0;
      local.lastError = "Deletion and edit changes overlap. Review the cloud and device versions.";
      addConflict({
        key,
        collection:local.collection,
        recordId:local.recordId,
        reason,
        localPayload:local.payload,
        localSortIndex,
        localDeleted:local.deleted,
        remotePayload:row.payload,
        remoteRevision:row.revision,
        remoteDeletedAt:row.deletedAt,
        remoteSortIndex,
        remoteMissing:Boolean(row.deletedAt),
        basePayload,
        paths:["record"]
      });
      persist({ reclaimFirst:true });
      return "conflict";
    }

    const merged = threeWayMerge(basePayload, local.payload, row.payload, "", overlaps);
    let mergedSortIndex = localSortIndex;
    const localSortChanged = localSortIndex !== baseSortIndex;
    const remoteSortChanged = remoteSortIndex !== baseSortIndex;
    if (!localSortChanged) mergedSortIndex = remoteSortIndex;
    else if (remoteSortChanged && localSortIndex !== remoteSortIndex) overlaps.push("sortIndex");

    if (overlaps.length) {
      local.status = "conflict";
      local.attempts = 0;
      local.nextAttemptAt = 0;
      local.lastError = "Cloud and this device changed the same fields. Review both versions before choosing.";
      addConflict({
        key,
        collection:local.collection,
        recordId:local.recordId,
        reason,
        localPayload:local.payload,
        localSortIndex,
        localDeleted:false,
        remotePayload:row.payload,
        remoteRevision:row.revision,
        remoteDeletedAt:row.deletedAt,
        remoteSortIndex,
        remoteMissing:false,
        basePayload,
        paths:overlaps
      });
      persist({ reclaimFirst:true });
      return "conflict";
    }

    conflicts = conflicts.filter(item => item.key !== key);
    if (same(merged,row.payload) && mergedSortIndex === remoteSortIndex) {
      delete pending[key];
      persist({ reclaimFirst:true });
      return "remote";
    }

    local.payload = merged;
    local.sortIndex = mergedSortIndex;
    local.basePayload = clone(row.payload);
    local.baseRevision = Number(row.revision || 0);
    local.baseSortIndex = remoteSortIndex;
    local.status = "pending";
    local.attempts = 0;
    local.nextAttemptAt = 0;
    local.lastError = "Safely merged non-overlapping changes from another device.";
    persist({ reclaimFirst:true });
    return "merged";
  }

  function applyRemoteEvent(event) {
    const row = recordFromRow(event), key = recordKey(row.collection,row.recordId), local = pending[key];
    if (!local) { baseRecords[key] = row; conflicts = conflicts.filter(item => item.key !== key); return; }
    const localConfirmed = row.updatedByDevice === currentDeviceId() && ((!local.deleted && !row.deletedAt && same(local.payload,row.payload) && Number(local.sortIndex || 0) === Number(row.sortIndex || 0)) || (local.deleted && row.deletedAt));
    if (localConfirmed) { baseRecords[key] = row; delete pending[key]; conflicts = conflicts.filter(item => item.key !== key); return; }
    if (Number(row.revision || 0) <= Number(local.baseRevision || 0)) return;
    reconcilePendingWithRemote(local,row,"Cloud changed after this device began editing the record.");
  }

  function addConflict'''
cloud = sub_once(
    cloud,
    r'  function applyRemoteEvent\(event\) \{.*?\n  \}\n\n  function addConflict',
    reconcile_remote,
    "remote reconciliation",
)

commit_conflicts = '''  function handleCommitConflicts(remoteConflicts, batchItems = []) {
    const remoteByKey = new Map((remoteConflicts || []).map(remote => [recordKey(remote.collection,remote.record_id),remote]));
    let reconciled = false;
    (batchItems || []).forEach(local => {
      const key = recordKey(local.collection,local.recordId), remote = remoteByKey.get(key), base = baseRecords[key];
      if (!remote) {
        local.status = "pending";
        local.attempts = 0;
        local.nextAttemptAt = 0;
        local.lastError = "A related cloud record changed. Retrying after the latest cloud revision is read.";
        return;
      }
      const row = {
        ...(base || {}),
        collection:local.collection,
        recordId:local.recordId,
        payload:sanitizeRecordPayload(local.collection,local.recordId,remote.remote_payload ?? base?.payload ?? {}),
        sortIndex:Number(remote.remote_sort_index ?? base?.sortIndex ?? 0),
        revision:Number(remote.remote_revision ?? base?.revision ?? local.baseRevision ?? 0),
        deletedAt:remote.remote_missing ? (remote.remote_deleted_at || nowIso()) : (remote.remote_deleted_at || ""),
        updatedAt:base?.updatedAt || nowIso(),
        updatedByDevice:base?.updatedByDevice || "cloud",
        appVersion:base?.appVersion || "",
        appVersionCode:Number(base?.appVersionCode || 0),
        minWriterVersionCode:Number(base?.minWriterVersionCode || APP_VERSION_CODE)
      };
      reconcilePendingWithRemote(local,row,"Cloud changed while this device was uploading the record.");
      reconciled = true;
    });
    persist({ reclaimFirst:true });
    if (reconciled) applyEffectiveRecords("Concurrent cloud changes reviewed without discarding this device edits");
  }

  async function syncNow'''
cloud = sub_once(
    cloud,
    r'  function handleCommitConflicts\(remoteConflicts, batchItems = \[\]\) \{.*?\n  \}\n\n  async function syncNow',
    commit_conflicts,
    "commit conflict reconciliation",
)

sync_now = '''  async function syncNow({ reason="manual" } = {}) {
    if (syncing) return; if (!cloudUser) { renderCloudStats(); return; }
    if (state.initializedUserId !== initializedScope()) { setStatus("Initializing sync", "Setting up encrypted cloud synchronization...", "info"); await onSignedIn(); if (state.initializedUserId !== initializedScope()) { renderCloudStats(); return; } }
    if (!navigator.onLine) { setStatus("Offline", `${pendingCount()} device change${pendingCount()===1?"":"s"} waiting for cloud.`, "info"); return; }
    requireCloudProfile(); syncing=true; setStatus("Syncing", `Reading current cloud revisions first (${reason})…`, "info");
    try {
      if (!await registerDevice()) return;
      const recovered = reconcileUnqueuedLocalChanges();
      if (recovered.length) setStatus("Queued device changes", `${recovered.length} previously missed Finance record${recovered.length===1?"":"s"} will be checked against the current cloud revision.`, "warning");
      recoverStoredConflicts();
      await pullChanges();
      let guard=0;
      while (Object.values(pending).some(item=>item.status!=="conflict"&&Number(item.nextAttemptAt||0)<=Date.now()) && guard<6) { await pushPending(); guard += 1; await pullChanges(); }
      await pullChanges(); await loadDevices(); await loadRecentAudit(); state.lastSyncAt=nowIso(); state.lastError=""; persist();
      if (conflictCount()) setStatus("Sync needs review", `${conflictCount()} record conflict${conflictCount()===1?" is":"s are"} preserved. Choose the cloud version or this device before either edit is discarded.`, "warning");
      else if (pendingCount()) setStatus("Changes pending", `${pendingCount()} device change${pendingCount()===1?"":"s"} will upload after the current cloud revision is checked.`, "warning");
      else setStatus("Synced", "This device and cloud match. Concurrent edits were preserved or safely merged.", "success");
    } catch (error) { setStatus("Sync needs attention", error.message || "Cloud synchronization failed.", "danger"); throw error; }
    finally { syncing=false; updateTopSyncUi(); renderCloudStats(); scheduleRetry(); scheduleForegroundPoll(); }
  }

  async function setupRealtime'''
cloud = sub_once(
    cloud,
    r'  async function syncNow\(\{ reason="manual" \} = \{\}\) \{.*?\n  \}\n\n  async function setupRealtime',
    sync_now,
    "sync ordering/status",
)

render_health = '''  function renderSyncHealth() {
    const set = (id,value) => { const node=document.getElementById(id); if(node) node.textContent=String(value); };
    set("cloudAuditCursor", Number(state.lastAuditId || 0)); set("cloudLastPull", formatDateTime(state.lastPullAt)); set("cloudLastPush", formatDateTime(state.lastPushAt)); set("cloudHealthPending", pendingCount()); set("cloudHealthConflicts", conflictCount()); set("cloudHealthAppVersion", `V${appVersion()}`); set("cloudHealthRequiredVersion", versionFromCode(state.requiredAppVersionCode || APP_VERSION_CODE));
    const protocol = document.getElementById("cloudProtocolChip"); if (protocol) { protocol.textContent = `Cloud Schema V${state.cloudSchemaVersion || 2}`; protocol.className = `v12-chip ${(state.requiredAppVersionCode || 0) > APP_VERSION_CODE ? "danger" : "success"}`; }
    const health = document.getElementById("cloudHealthMessage"); if (health) health.textContent = (state.requiredAppVersionCode || 0) > APP_VERSION_CODE ? `This cloud account requires ${versionFromCode(state.requiredAppVersionCode)} or newer. Update this device before writing records.` : state.lastError || "Cloud revisions are checked first. Pending device edits are preserved, merged when safe, and never silently replaced on conflict.";
    const chip = document.getElementById("cloudPendingChip"); if (chip) { chip.textContent = pendingCount() ? `${pendingCount()} waiting` : "Nothing pending"; chip.className = `v12-chip ${conflictCount() ? "warning" : pendingCount() ? "info" : "success"}`; }
    const list = document.getElementById("cloudPendingList");
    if (list) {
      const items = Object.values(pending).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      list.innerHTML = items.length ? items.map(item => {
        const next = item.nextAttemptAt && item.nextAttemptAt > Date.now() ? ` · retry ${formatDateTime(new Date(item.nextAttemptAt).toISOString())}` : "";
        const actions = item.status === "conflict"
          ? `<button class="button button-primary button-small" type="button" data-sync-review="${escape(keyToken(item.key))}">Review versions</button>`
          : `<button class="button button-secondary button-small" type="button" data-sync-retry="${escape(keyToken(item.key))}">Retry</button><button class="button button-secondary button-small" type="button" data-sync-discard="${escape(keyToken(item.key))}">Use cloud</button>`;
        return `<article class="cloud-pending-item" data-status="${escape(item.status)}"><div><strong>${escape(recordLabel(item.collection,item.payload,item.recordId))}</strong><small>${escape(item.status)} · revision ${Number(item.baseRevision || 0)} · ${Number(item.attempts || 0)} attempt${Number(item.attempts || 0) === 1 ? "" : "s"}${escape(next)}</small>${item.lastError ? `<small>${escape(item.lastError)}</small>` : ""}</div><div class="cloud-pending-actions">${actions}</div></article>`;
      }).join("") : `<div class="v12-empty">No records are waiting to synchronize.</div>`;
    }
  }

  function versionFromCode'''
cloud = sub_once(
    cloud,
    r'  function renderSyncHealth\(\) \{.*?\n  \}\n\n  function versionFromCode',
    render_health,
    "sync health UI",
)

render_conflicts = '''  function renderConflicts() {
    const node=document.getElementById("cloudConflictList"), chip=document.getElementById("cloudConflictCount");
    if (!node || !chip) return;
    const unresolved=conflicts.filter(item=>!item.resolved);
    chip.textContent=unresolved.length?`${unresolved.length} needs review`:"No conflicts";
    chip.className=`v12-chip ${unresolved.length?"warning":"success"}`;
    node.innerHTML=unresolved.length ? unresolved.map(item => `<article class="cloud-pending-item" data-status="conflict"><div><strong>${escape(recordLabel(item.collection,item.localPayload,item.recordId))}</strong><small>${escape(item.reason || "Both cloud and this device changed this record.")}</small>${item.paths?.length ? `<small>Changed fields: ${escape(item.paths.join(", "))}</small>` : ""}</div><div class="cloud-pending-actions"><button class="button button-primary button-small" type="button" data-review-cloud-conflict="${escape(keyToken(item.key))}">Review versions</button></div></article>`).join("") : `<div class="v12-empty">No unresolved record conflicts.</div>`;
  }
  function conflictForKey(key) { return conflicts.find(item=>item.key===key&&!item.resolved) || null; }
  function openConflictReview(key) {
    const item=conflictForKey(key), review=window.FinanceCloudConflictReview;
    if (!item) return false;
    if (!review?.open) throw new Error("Conflict review is unavailable. Reload the latest app version and try again.");
    review.open({ item, keyToken:keyToken(key), title:recordLabel(item.collection,item.localPayload,item.recordId) });
    return true;
  }
  function retryRecord'''
cloud = sub_once(
    cloud,
    r'  function renderConflicts\(\) \{.*?\n  function conflictForKey\(key\) \{.*?\n  function retryRecord',
    render_conflicts,
    "conflict review list",
)

resolve_conflict = '''  function resolveConflict(key, choice) {
    if (!["cloud","device"].includes(choice)) throw new Error("Choose either the cloud version or this device’s version.");
    const item=pending[key], conflict=conflictForKey(key), resolver=window.FinanceCloudConflictResolution;
    if (!resolver?.apply) throw new Error("Conflict resolution is unavailable. Reload the latest app version and try again.");
    const result=resolver.apply({key,choice,item,conflict,baseRecords,pending,conflicts,setConflicts:value=>{conflicts=value;},persist:()=>persist({reclaimFirst:true}),clone,splitKey,nowIso,appVersion:appVersion(),appVersionCode:APP_VERSION_CODE});
    const usingDevice = choice === "device";
    refreshAfterConflictChoice(usingDevice ? "This device version rebased onto the latest cloud revision" : "Current cloud version applied on this device");
    showToast(usingDevice ? "This device version is queued to become the cloud version." : "Current cloud version applied on this device.","success");
    if (usingDevice) scheduleSync(80);
    return result;
  }
  function discardLocal(key) { return resolveConflict(key,"cloud"); }
  function keepLocal(key) { return resolveConflict(key,"device"); }
  function downloadConflict'''
cloud = sub_once(
    cloud,
    r'  function resolveConflict\(key, choice\) \{.*?\n  function discardLocal\(key\) \{.*?\n  function keepLocal\(key\) \{.*?\n  function downloadConflict',
    resolve_conflict,
    "conflict choice behavior",
)

recovery_function = '''
  async function replaceCloudWithThisDevice() {
    if (syncing) throw new Error("Wait for the current sync to finish first.");
    if (!cloudUser) throw new Error("Sign in before replacing the cloud copy.");
    if (!navigator.onLine) throw new Error("Connect to the internet before replacing the cloud copy.");
    requireCloudProfile({ write:true });
    const desiredData = clone(data);
    recoveryPoint("Before replacing cloud from this device");
    syncing = true;
    setStatus("Updating cloud copy", "A recovery point was saved. Writing this device’s current records with cloud revision checks…", "warning");
    try {
      let committed = false;
      for (let attempt=0; attempt<2 && !committed; attempt += 1) {
        const snap = await snapshot();
        if (snap.status === "revoked") return false;
        if (snap.status !== "ok") throw new Error(`Cloud snapshot returned ${snap.status || "an unknown status"}.`);
        const remoteStore = storeFromSnapshotRows(snap.records || []), desiredMap = toRecordMap(desiredData), changes = changesBetween(remoteStore,desiredMap);
        if (!changes.length) { seedBaseFromSnapshot(snap.records || []); state.lastAuditId = Number(snap.latest_audit_id || state.lastAuditId || 0); committed = true; break; }
        const result = await commitRawChanges(changes);
        if (result.status === "committed") { committed = true; break; }
        if (result.status === "conflict" && attempt === 0) continue;
        if (result.status === "upgrade_required") throw new Error(`Cloud requires ${versionFromCode(result.min_app_version_code)} or newer.`);
        if (result.status === "revoked") { await handleRevoked(result); return false; }
        throw new Error(`Cloud replacement returned ${result.status || "an unknown status"}.`);
      }
      if (!committed) throw new Error("Cloud changed again while replacing it. Sync once, then retry the recovery action.");
      const refreshed = await snapshot();
      if (refreshed.status !== "ok") throw new Error(`Cloud refresh returned ${refreshed.status || "an unknown status"}.`);
      seedBaseFromSnapshot(refreshed.records || []);
      state.lastAuditId = Number(refreshed.latest_audit_id || state.lastAuditId || 0);
      pending = {}; conflicts = [];
      state.lastSyncAt = nowIso(); state.lastPullAt = nowIso(); state.lastError = "";
      persist({ reclaimFirst:true });
      applyEffectiveRecords("This device is now the current cloud copy");
      await registerDevice(); await loadDevices(); await loadRecentAudit();
      setStatus("Synced", "This device’s current records are now the cloud copy. Other devices will read this revision before uploading changes.", "success");
      return true;
    } finally {
      syncing = false; updateTopSyncUi(); renderCloudStats(); scheduleRetry(); scheduleForegroundPoll();
    }
  }

'''
cloud = replace_once(cloud, '\n  async function pullChanges() {', recovery_function + '  async function pullChanges() {', "device recovery action")

cloud = replace_once(
    cloud,
    '    controls?.insertAdjacentHTML("afterend", `<article class="card" id="cloudSyncHealthCard">',
    '    controls?.insertAdjacentHTML("afterend", `<article class="card" id="cloudSyncHealthCard">',
    "health card anchor",
)
cloud = replace_once(
    cloud,
    '  }\n\n  function renderCloudStats() {',
    '    const healthCard=document.getElementById("cloudSyncHealthCard");\n    if (healthCard && !document.getElementById("cloudReplaceFromDeviceCard")) healthCard.insertAdjacentHTML("afterend", `<article class="card" id="cloudReplaceFromDeviceCard"><div class="card-header"><div><h3>Cloud recovery</h3><p>Use only when this device contains the finance copy you want every device to use.</p></div><span class="v12-chip warning">Protected action</span></div><p class="v12-help">A local recovery point is created first. The app then compares current cloud revisions before replacing them with this device’s current records.</p><div class="card-actions"><button class="button button-danger" id="cloudReplaceFromDevice" type="button">Make this device the current cloud copy</button></div></article>`);\n  }\n\n  function renderCloudStats() {',
    "recovery card",
)

text_replacements = [
    (
        'if (conflictsNow > 0) activeDetail = `${conflictsNow} old conflict${conflictsNow === 1 ? "" : "s"} will be replaced by current cloud records on sync.`;',
        'if (conflictsNow > 0) activeDetail = `${conflictsNow} record conflict${conflictsNow === 1 ? "" : "s"} preserved for review. Neither version will be silently discarded.`;',
        "toolbar conflict text",
    ),
    ('fixButton.textContent = conflictsNow > 0 ? "Sync cloud version" :', 'fixButton.textContent = conflictsNow > 0 ? "Review conflicts" :', "toolbar conflict action"),
    ('overviewHelp.textContent = cloudUser ? "Cloud records are the source of truth. This device refreshes from cloud first, then uploads only changes based on the current cloud revision. Keep a downloaded backup for recovery." : "Connect Cloud Sync to make cloud records the source of truth across your devices.";',
     'overviewHelp.textContent = cloudUser ? "Cloud revisions are checked before upload. Device edits stay pending until safely merged or explicitly resolved. Keep a downloaded backup for recovery." : "Connect Cloud Sync to keep encrypted finance records coordinated across your devices.";',
     "overview help"),
    ('overviewFix.textContent = conflictsNow > 0 ? "Sync cloud version" :', 'overviewFix.textContent = conflictsNow > 0 ? "Review conflicts" :', "overview conflict action"),
    ('<p class="v12-help" id="cloudHealthMessage">Cloud is authoritative. This device refreshes cloud records before queued device changes can upload.</p>',
     '<p class="v12-help" id="cloudHealthMessage">Cloud revisions are checked first; pending device edits are preserved, safely merged, or held for review.</p>',
     "health message"),
]
for old,new,label in text_replacements:
    cloud = replace_once(cloud, old, new, label)

cloud = replace_once(
    cloud,
    '    document.getElementById("cloudOverviewFixButton")?.addEventListener("click", () => syncNow({reason:"overview-cloud-authority"}).catch(error => showToast(error.message, "warning")));',
    '    document.getElementById("cloudOverviewFixButton")?.addEventListener("click", () => { closeTopSyncPopover(); goToPage("settings",{smooth:false}); activateSettingsPanel("cloud",true); });\n    document.getElementById("cloudReplaceFromDevice")?.addEventListener("click",async()=>{if(!confirm("Make this device the current cloud copy? A local recovery point will be saved first. Other connected devices will download this copy before uploading their own changes."))return;try{await replaceCloudWithThisDevice();}catch(error){setStatus("Cloud replacement needs attention",error.message,"danger");showToast(error.message,"warning");}});',
    "recovery event",
)
cloud = replace_once(
    cloud,
    '    document.getElementById("cloudPendingList")?.addEventListener("click",handlePendingClick);\n    window.FinanceCloudConflictReview?.bind?.({onDownload:downloadConflict,onUseCloud:token=>discardLocal(keyFromToken(token)),onUseDevice:token=>discardLocal(keyFromToken(token))});',
    '    document.getElementById("cloudPendingList")?.addEventListener("click",handlePendingClick);\n    document.getElementById("cloudConflictList")?.addEventListener("click",event=>{const button=event.target.closest("[data-review-cloud-conflict]");if(button)openConflictReview(keyFromToken(button.dataset.reviewCloudConflict));});\n    window.FinanceCloudConflictReview?.bind?.({onDownload:downloadConflict,onUseCloud:token=>discardLocal(keyFromToken(token)),onUseDevice:token=>keepLocal(keyFromToken(token))});',
    "conflict callbacks",
)
cloud = replace_once(
    cloud,
    '  function handlePendingClick(event) { const retry=event.target.closest("[data-sync-retry]"),discard=event.target.closest("[data-sync-discard]"); if(retry)retryRecord(keyFromToken(retry.dataset.syncRetry)); if(discard&&confirm("Replace this device’s pending version with the current cloud-confirmed record?"))discardLocal(keyFromToken(discard.dataset.syncDiscard)); }',
    '  function handlePendingClick(event) { const retry=event.target.closest("[data-sync-retry]"),discard=event.target.closest("[data-sync-discard]"),review=event.target.closest("[data-sync-review]"); if(review)return openConflictReview(keyFromToken(review.dataset.syncReview)); if(retry)retryRecord(keyFromToken(retry.dataset.syncRetry)); if(discard&&confirm("Replace this device’s pending version with the current cloud-confirmed record?"))discardLocal(keyFromToken(discard.dataset.syncDiscard)); }',
    "pending conflict review",
)
cloud = replace_once(
    cloud,
    'window.FinanceCloudSync={ initialize,syncNow, buildRecordMap:()=>toRecordMap(data), get status(){return{...state,pendingCount:pendingCount(),conflictCount:conflictCount(),signedIn:Boolean(cloudUser),email:cloudUser?.email||""};} };',
    'window.FinanceCloudSync={ initialize,syncNow,replaceCloudWithThisDevice, buildRecordMap:()=>toRecordMap(data), get status(){return{...state,pendingCount:pendingCount(),conflictCount:conflictCount(),signedIn:Boolean(cloudUser),email:cloudUser?.email||""};} };',
    "public recovery API",
)
cloud = replace_once(
    cloud,
    'setPasswordVisibility,adoptExistingCloudConflicts};',
    'setPasswordVisibility,recoverStoredConflicts,reconcilePendingWithRemote,replaceCloudWithThisDevice};',
    "sync internals export",
)

write("cloud-sync.js", cloud)

# Update conflict helper comment only; its device-choice implementation already correctly rebases local changes.
resolution = read("cloud-conflict-resolution.js").replace("V14.0.12 · Recoverable Cloud Sync conflict state transitions.", "V15.0.3 · Recoverable Cloud Sync conflict state transitions.", 1)
write("cloud-conflict-resolution.js", resolution)
review = read("cloud-conflict-review.js").replace("V14.0.12 · Explicit side-by-side Cloud Sync conflict review UI.", "V15.0.3 · Explicit side-by-side Cloud Sync conflict review UI.", 1)
write("cloud-conflict-review.js", review)

# Release identity and cache pins.
sync_config = read("sync-config.js")
sync_config = replace_once(sync_config, 'const VERSION = "15.0.2";', 'const VERSION = "15.0.3";', "runtime version")
sync_config = replace_once(sync_config, 'const RELEASE_NAME = "Liquid Glass Interface";', 'const RELEASE_NAME = "Safe Multi-device Sync";', "runtime release name")
sync_config = sync_config.replace("?v=15.0.2", "?v=15.0.3")
write("sync-config.js", sync_config)

worker = read("sw.js")
worker = replace_once(worker, 'const APP_VERSION = "15.0.2";', 'const APP_VERSION = "15.0.3";', "worker version")
worker = replace_once(worker, 'const CACHE_VERSION = "finance-v15-20260815-liquid-glass-r6";', 'const CACHE_VERSION = "finance-v15-20260815-safe-multidevice-sync-r7";', "worker cache")
worker = worker.replace("?v=15.0.2", "?v=15.0.3")
worker = worker.replace("// V15 dashboard/chrome cleanup refresh · flat toolbar/toast pass · dashboard spacing/sidebar edge pass · calendar-height sync · cash-flow fit · Customize icon refresh · collapsed sidebar Insights/Pin state refresh · forced shell refresh: changing this worker forces installed PWAs to precache the updated dashboard stylesheet and supplied icon without changing the release version.", "// V15.0.3 safe multi-device sync refresh · preserves pending device edits, reviews overlapping conflicts, adds protected device-to-cloud recovery, and forces installed PWAs to fetch the repaired sync client.")
write("sw.js", worker)

index = read("index.html")
index = replace_once(index, "<title>My Finance Records · V15.0.2</title>", "<title>My Finance Records · V15.0.3</title>", "index title")
index = replace_once(index, 'title="V15.0.2 · Liquid Glass Interface · August 15, 2026">V15.0.2</small>', 'title="V15.0.3 · Safe Multi-device Sync · August 15, 2026">V15.0.3</small>', "build badge")
index = replace_once(index, 'const APP_VERSION = "15.0.2";', 'const APP_VERSION = "15.0.3";', "index app version")
index = replace_once(index, 'const APP_RELEASE_NAME = "Liquid Glass Interface";', 'const APP_RELEASE_NAME = "Safe Multi-device Sync";', "index release name")
index = index.replace("?v=15.0.2", "?v=15.0.3")
index = index.replace("Version 15.0.2", "Version 15.0.3", 1)
version_history_entry = '      {"version":"V15.0.3","title":"Safe Multi-device Sync","date":"August 15, 2026","items":["Preserves pending device edits when cloud records change instead of silently discarding them.","Automatically three-way merges non-overlapping changes and pauses same-field conflicts for explicit review.","Adds a protected Make this device the current cloud copy recovery action with a local recovery point."]},\n'
index, history_count = re.subn(r'(const VERSION_HISTORY\s*=\s*\[\s*\n)', lambda m: m.group(1) + version_history_entry, index, count=1)
if history_count != 1:
    raise SystemExit(f"version history insertion: expected 1 match, found {history_count}")
write("index.html", index)

pkg = read("package.json")
pkg = replace_once(pkg, '"version": "15.0.2"', '"version": "15.0.3"', "package version")
pkg = replace_once(pkg, '"test": "node tests/validate-cloud-authority.mjs && node tests/validate-expense-screenshot.mjs && node tests/validate-v15-0-2.mjs"', '"test": "node tests/validate-safe-multidevice-sync.mjs && node tests/validate-expense-screenshot.mjs && node tests/validate-v15-0-3.mjs"', "package test")
write("package.json", pkg)

lock = read("package-lock.json")n = lock.count('"version": "15.0.2"')
if n < 2:
    raise SystemExit(f"package-lock version: expected at least 2 matches, found {n}")
lock = lock.replace('"version": "15.0.2"', '"version": "15.0.3"', 2)
write("package-lock.json", lock)

version_path = ROOT / "version.json"
version = json.loads(version_path.read_text(encoding="utf-8"))
version.update({
    "version":"15.0.3",
    "cacheVersion":"finance-v15-20260815-safe-multidevice-sync-r7",
    "released":"2026-08-15",
    "name":"Safe Multi-device Sync",
    "notes":"Preserves pending device edits across cloud revision changes, auto-merges non-overlapping edits, requires explicit review for overlapping conflicts, and adds a protected device-to-cloud recovery action without changing Finance Schema 12 or Cloud Schema V3."
})
version_path.write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")

readme = read("README.md")
readme = replace_once(readme, "# My Finance Records · V15.0.2", "# My Finance Records · V15.0.3", "README version")
readme = replace_once(readme, "## Recent updates\n\n", "## Recent updates\n\n- **V15.0.3 · Safe Multi-device Sync** — Preserves concurrent device edits, auto-merges non-overlapping changes, stops silent cloud-over-device replacement, restores a real Use this device conflict choice, and adds protected device-to-cloud recovery.\n", "README update")
write("README.md", readme)

changelog = read("CHANGELOG.md")
entry = '''## 15.0.3 · 2026-08-15

### Fixed
- Stopped newer cloud revisions from silently deleting pending local Finance edits on MacBook or iPhone.
- Rebased and three-way merged non-overlapping concurrent changes while preserving same-field changes as explicit conflicts.
- Restored **Use this device** so it keeps and uploads the selected device record instead of behaving like **Use cloud version**.

### Recovery
- Added a protected **Make this device the current cloud copy** action that creates a local recovery point, refreshes cloud revisions, and only then writes this device’s current Finance records.
- Kept pull-before-push ordering so a stale phone cannot blindly overwrite newer cloud data.

### Preserved
- Finance Schema 12, Cloud Schema V3, client-side encryption, five-minute routine sync, Realtime updates, and existing finance calculations remain unchanged.

'''
changelog = entry + changelog
write("CHANGELOG.md", changelog)

installer_old = ROOT / "Install_V15_0_2.command"
installer_new = ROOT / "Install_V15_0_3.command"
if installer_old.exists():
    installer_text = installer_old.read_text(encoding="utf-8").replace("15.0.2", "15.0.3").replace("V15_0_2", "V15_0_3")
    installer_new.write_text(installer_text, encoding="utf-8")
    installer_new.chmod(0o755)

safe_test = r'''#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const cloud = read("cloud-sync.js");
const worker = read("sw.js");
const resolution = read("cloud-conflict-resolution.js");
const review = read("cloud-conflict-review.js");

for (const file of ["cloud-sync.js","cloud-conflict-resolution.js","cloud-conflict-review.js","sw.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(result.status === 0, `${file} syntax check failed: ${result.stderr || result.stdout}`);
}

assert(cloud.includes("function reconcilePendingWithRemote"), "multi-device reconciliation helper is missing");
assert(cloud.includes("threeWayMerge(basePayload, local.payload, row.payload"), "non-overlapping device/cloud changes are not three-way merged");
assert(cloud.includes('local.status = "conflict"'), "overlapping changes are not preserved as explicit conflicts");
assert(cloud.includes("Safely merged non-overlapping changes from another device."), "safe merge state is not recorded");
assert(!cloud.includes("function adoptExistingCloudConflicts()"), "old auto-discard conflict recovery is still present");
assert(cloud.includes("function recoverStoredConflicts()"), "stored conflicts are not preserved across upgrade");
assert(cloud.includes('function keepLocal(key) { return resolveConflict(key,"device"); }'), "Use this device does not select the device version");
assert(cloud.includes("onUseDevice:token=>keepLocal(keyFromToken(token))"), "conflict review still routes Use this device to cloud");
assert(!cloud.includes("onUseDevice:token=>discardLocal"), "legacy Use this device discard path remains");
assert(resolution.includes("choice === \"device\""), "resolution helper cannot rebase a chosen device record");
assert(review.includes('data-conflict-review-action="device"'), "conflict review has no Use this device action");
assert(cloud.includes("function replaceCloudWithThisDevice()"), "protected device-to-cloud recovery action is missing");
assert(cloud.includes('recoveryPoint("Before replacing cloud from this device")'), "device-to-cloud recovery does not create a recovery point first");
assert(cloud.includes("Make this device the current cloud copy"), "device-to-cloud recovery control is missing");
assert(cloud.includes("Reading current cloud revisions first"), "sync does not communicate pull-before-push ordering");
const syncStart = cloud.indexOf("async function syncNow");
const firstPull = cloud.indexOf("await pullChanges();", syncStart);
const pushLoop = cloud.indexOf("while (Object.values(pending)", syncStart);
assert(syncStart >= 0 && firstPull > syncStart && pushLoop > firstPull, "sync must pull current cloud revisions before queued device uploads");
assert(cloud.includes("5*60*1000"), "five-minute routine sync cadence changed");
assert(worker.includes('finance-v15-20260815-safe-multidevice-sync-r7'), "PWA cache was not rotated for the sync repair");
assert(worker.includes('asset("./cloud-sync.js?v=15.0.3")'), "PWA shell does not pin the repaired cloud sync client");
assert(worker.includes('new Request(url, { cache:"reload" })'), "PWA precache no longer bypasses stale HTTP cache");

if (failures.length) {
  console.error(`Safe multi-device sync validation failed (${failures.length}):`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log("Safe multi-device sync validation passed.");
'''
write("tests/validate-safe-multidevice-sync.mjs", safe_test)
write("tests/validate-cloud-authority.mjs", 'import "./validate-safe-multidevice-sync.mjs";\n')

release_test = r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const version = JSON.parse(read("version.json"));
const index = read("index.html");
const worker = read("sw.js");
const cloud = read("cloud-sync.js");
const runtime = read("sync-config.js");
const readme = read("README.md");
const changelog = read("CHANGELOG.md");
const installer = read("Install_V15_0_3.command");
assert.equal(pkg.version,"15.0.3");
assert.equal(lock.version,"15.0.3");
assert.equal(lock.packages?.[""]?.version,"15.0.3");
assert.equal(version.version,"15.0.3");
assert.equal(version.schemaVersion,12);
assert.equal(version.cloudSchemaVersion,3);
assert.equal(version.name,"Safe Multi-device Sync");
assert.equal(version.cacheVersion,"finance-v15-20260815-safe-multidevice-sync-r7");
assert.match(index,/<title>My Finance Records · V15\.0\.3<\/title>/);
assert.match(index,/const APP_VERSION = "15\.0\.3";/);
assert.match(index,/const APP_RELEASE_NAME = "Safe Multi-device Sync";/);
assert.match(index,/"version":"V15\.0\.3","title":"Safe Multi-device Sync"/);
assert.match(worker,/const APP_VERSION = "15\.0\.3";/);
assert.match(cloud,/const APP_VERSION_FALLBACK = "15\.0\.3";/);
assert.match(runtime,/const VERSION = "15\.0\.3";/);
assert.match(runtime,/const RELEASE_NAME = "Safe Multi-device Sync";/);
assert.ok(readme.startsWith("# My Finance Records · V15.0.3"));
assert.ok(changelog.startsWith("## 15.0.3 · 2026-08-15"));
assert.match(installer,/V15\.0\.3/);
console.log("V15.0.3 release validation passed.");
'''
write("tests/validate-v15-0-3.mjs", release_test)

print("Applied V15.0.3 safe multi-device sync patch.")
