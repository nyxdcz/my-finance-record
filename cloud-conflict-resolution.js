"use strict";

/* My Finance Records V14.0.8 · Recoverable Cloud Sync conflict state transitions. */
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
    setConflicts(conflicts.filter(entry=>entry.key!==key));
    if (!persist()) {
      if (hadBase) baseRecords[key]=previousBase; else delete baseRecords[key];
      if (previousPending) pending[key]=previousPending; else delete pending[key];
      setConflicts(previousConflicts);
      throw new Error("Your choice could not be saved on this device. Check browser storage and try again.");
    }
    return {key,choice,revision:nextBase.revision,recoveredPending};
  }

  window.FinanceCloudConflictResolution={apply,remoteBase};
})();
