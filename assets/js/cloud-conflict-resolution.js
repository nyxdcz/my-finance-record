"use strict";

/* My Finance Records V15.0.3 · Recoverable Cloud Sync conflict state transitions. */
(function financeCloudConflictResolutionBootstrap() {
  function remoteBase({ key, conflict, existingBase = {}, clone, splitKey, nowIso, appVersion, appVersionCode }) {
    if (!conflict) throw new Error("This conflict is no longer available. Reload the app to review the latest sync state.");
    const [keyCollection,keyRecordId] = splitKey(key);
    return {
      ...existingBase,
      collection:String(conflict.collection || existingBase.collection || keyCollection),
      recordId:String(conflict.recordId || existingBase.recordId || keyRecordId),
      payload:clone(conflict.remotePayload || {}),
      sortIndex:Number(conflict.remoteSortIndex ?? existingBase.sortIndex ?? 0),
      revision:Number(conflict.remoteRevision || 0),
      deletedAt:conflict.remoteMissing ? (conflict.createdAt || nowIso()) : (conflict.remoteDeletedAt || ""),
      updatedAt:existingBase.updatedAt || conflict.createdAt || nowIso(),
      updatedByDevice:existingBase.updatedByDevice || "cloud",
      appVersion:existingBase.appVersion || appVersion,
      appVersionCode:Number(existingBase.appVersionCode || appVersionCode),
      minWriterVersionCode:Number(existingBase.minWriterVersionCode || appVersionCode)
    };
  }

  function readStoredJson(key) {
    try {
      const raw=window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) { return null; }
  }

  function sameStoredPayload(left,right) {
    try { return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {}); }
    catch (error) { return false; }
  }

  function essentialChoicePersisted({ key, choice, nextBase, nextPending, nextConflicts }) {
    const profileId=String(window.FinanceProfileArchitecture?.activeProfileId?.() || "profile-personal");
    const baseStore=readStoredJson(`simple-finance-cloud-record-base-v3:${profileId}`);
    const queueStore=readStoredJson(`simple-finance-cloud-record-queue-v3:${profileId}`);
    const conflictStore=readStoredJson(`simple-finance-cloud-record-conflicts-v3:${profileId}`);
    if (!baseStore || !queueStore || !Array.isArray(conflictStore)) return false;

    const storedBase=baseStore[key];
    if (!storedBase) return false;
    const baseMatches=Number(storedBase.revision || 0) === Number(nextBase.revision || 0)
      && Number(storedBase.sortIndex || 0) === Number(nextBase.sortIndex || 0)
      && String(storedBase.deletedAt || "") === String(nextBase.deletedAt || "")
      && sameStoredPayload(storedBase.payload,nextBase.payload);
    if (!baseMatches || conflictStore.some(entry=>entry?.key===key)) return false;

    if (choice === "cloud") return !Object.prototype.hasOwnProperty.call(queueStore,key);
    const storedPending=queueStore[key];
    return Boolean(storedPending
      && nextPending
      && storedPending.status === "pending"
      && Number(storedPending.baseRevision || 0) === Number(nextPending.baseRevision || 0)
      && Number(storedPending.baseSortIndex || 0) === Number(nextPending.baseSortIndex || 0)
      && sameStoredPayload(storedPending.payload,nextPending.payload)
      && sameStoredPayload(storedPending.basePayload,nextPending.basePayload));
  }

  function apply({ key, choice, item, conflict, baseRecords, pending, conflicts, setConflicts, persist, clone, splitKey, nowIso, appVersion, appVersionCode }) {
    if (!conflict) throw new Error("This conflict changed before your choice was applied. Reload and review the latest versions.");
    if (!['cloud','device'].includes(choice)) throw new Error("Choose either the cloud version or this device’s version.");
    const recoveredPending=choice === "device" && !item;
    const hadBase=Object.prototype.hasOwnProperty.call(baseRecords,key);
    const previousBase=clone(baseRecords[key]), previousPending=clone(pending[key]), previousConflicts=clone(conflicts);
    const nextBase=remoteBase({key,conflict,existingBase:baseRecords[key],clone,splitKey,nowIso,appVersion,appVersionCode});
    baseRecords[key]=nextBase;
    if (choice === "cloud") delete pending[key];
    else {
      if (!item) {
        const [collection,recordId]=splitKey(key);
        item=pending[key]={key,collection:String(conflict.collection || collection),recordId:String(conflict.recordId || recordId),payload:clone(conflict.localPayload || {}),sortIndex:Number(conflict.localSortIndex ?? nextBase.sortIndex ?? 0),deleted:Boolean(conflict.localDeleted),updatedAt:conflict.createdAt || nowIso(),minWriterVersionCode:appVersionCode};
      }
      item.baseRevision=nextBase.revision; item.basePayload=clone(nextBase.payload); item.baseSortIndex=nextBase.sortIndex;
      item.status="pending"; item.attempts=0; item.nextAttemptAt=0; item.lastError="Explicitly keeping this device’s version.";
    }
    const nextConflicts=conflicts.filter(entry=>entry.key!==key);
    setConflicts(nextConflicts);
    const persisted=persist();
    const essentialPersisted=persisted || essentialChoicePersisted({key,choice,nextBase,nextPending:pending[key],nextConflicts});
    if (!essentialPersisted) {
      if (hadBase) baseRecords[key]=previousBase; else delete baseRecords[key];
      if (previousPending) pending[key]=previousPending; else delete pending[key];
      setConflicts(previousConflicts);
      throw new Error("Your choice could not be saved on this device. Check browser storage and try again.");
    }
    return {key,choice,revision:nextBase.revision,recoveredPending,metadataPersisted:Boolean(persisted)};
  }

  window.FinanceCloudConflictResolution={apply,remoteBase};
})();
