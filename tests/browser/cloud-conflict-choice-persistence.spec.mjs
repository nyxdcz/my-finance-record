import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";
const IPHONE_14_PRO = { width:393, height:852 };

test("Use cloud version survives a nonessential sync metadata write failure", async ({ page }) => {
  await page.setViewportSize(IPHONE_14_PRO);
  await page.goto(`${APP_URL}/?page=settings`, { waitUntil:"domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.FinanceCloudConflictResolution?.apply));

  const result = await page.evaluate(() => {
    const resolver = window.FinanceCloudConflictResolution;
    const separator = "\u001f";
    const key = `accounts${separator}GoTyme`;
    const profileId = String(window.FinanceProfileArchitecture?.activeProfileId?.() || "profile-personal");
    const baseKey = `simple-finance-cloud-record-base-v3:${profileId}`;
    const queueKey = `simple-finance-cloud-record-queue-v3:${profileId}`;
    const conflictKey = `simple-finance-cloud-record-conflicts-v3:${profileId}`;

    const clone = value => JSON.parse(JSON.stringify(value));
    const splitKey = value => {
      const at = value.indexOf(separator);
      return [value.slice(0, at), value.slice(at + 1)];
    };
    const nowIso = () => "2026-08-28T11:30:00.000Z";

    const baseRecords = {
      [key]: {
        collection:"accounts",
        recordId:"GoTyme",
        payload:{ balance:932 },
        sortIndex:0,
        revision:6,
        deletedAt:"",
        updatedAt:"2026-08-28T11:00:00.000Z",
        updatedByDevice:"iphone",
        appVersion:"2.5.0",
        appVersionCode:130000,
        minWriterVersionCode:130000
      }
    };
    const pending = {
      [key]: {
        key,
        collection:"accounts",
        recordId:"GoTyme",
        payload:{ balance:932 },
        sortIndex:0,
        deleted:false,
        baseRevision:6,
        basePayload:{ balance:932 },
        baseSortIndex:0,
        status:"conflict",
        attempts:1,
        nextAttemptAt:0
      }
    };
    let conflicts = [{
      id:"conflict-gotyme",
      key,
      collection:"accounts",
      recordId:"GoTyme",
      localPayload:{ balance:932 },
      localSortIndex:0,
      localDeleted:false,
      remotePayload:{ balance:302 },
      remoteRevision:7,
      remoteSortIndex:0,
      remoteMissing:false,
      remoteDeletedAt:"",
      createdAt:"2026-08-28T11:15:00.000Z"
    }];

    localStorage.removeItem(baseKey);
    localStorage.removeItem(queueKey);
    localStorage.removeItem(conflictKey);

    const output = resolver.apply({
      key,
      choice:"cloud",
      item:pending[key],
      conflict:conflicts[0],
      baseRecords,
      pending,
      conflicts,
      setConflicts:value => { conflicts = value; },
      persist:() => {
        localStorage.setItem(queueKey, JSON.stringify(pending));
        localStorage.setItem(conflictKey, JSON.stringify(conflicts));
        localStorage.setItem(baseKey, JSON.stringify(baseRecords));
        return false;
      },
      clone,
      splitKey,
      nowIso,
      appVersion:"2.5.0",
      appVersionCode:130000
    });

    const storedBase = JSON.parse(localStorage.getItem(baseKey) || "{}");
    const storedQueue = JSON.parse(localStorage.getItem(queueKey) || "{}");
    const storedConflicts = JSON.parse(localStorage.getItem(conflictKey) || "[]");

    return {
      output,
      runtimeBalance:baseRecords[key]?.payload?.balance,
      pendingStillExists:Boolean(pending[key]),
      conflictCount:conflicts.length,
      storedBalance:storedBase[key]?.payload?.balance,
      storedPendingStillExists:Boolean(storedQueue[key]),
      storedConflictCount:storedConflicts.filter(entry => entry?.key === key).length
    };
  });

  expect(result.output.choice).toBe("cloud");
  expect(result.output.metadataPersisted).toBe(false);
  expect(result.runtimeBalance).toBe(302);
  expect(result.pendingStillExists).toBe(false);
  expect(result.conflictCount).toBe(0);
  expect(result.storedBalance).toBe(302);
  expect(result.storedPendingStillExists).toBe(false);
  expect(result.storedConflictCount).toBe(0);
});
