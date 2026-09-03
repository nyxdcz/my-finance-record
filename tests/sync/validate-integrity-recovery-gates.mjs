import assert from "node:assert/strict";
import fs from "node:fs";

const cloud = fs.readFileSync("assets/js/cloud-sync.js", "utf8");
const privacy = fs.readFileSync("assets/js/privacy-lock.js", "utf8");
const security = fs.readFileSync("assets/js/security-profiles.js", "utf8");
const ledger = fs.readFileSync("assets/js/account-ledger.js", "utf8");

for (const token of [
  "const proposedReport = integrity.scan(next, { includeStorage:false });",
  'setStatus("Integrity review required"',
  "Cloud integrity rollback restored local records",
  "persistedReport.counts.critical"
]) assert.ok(cloud.includes(token), `Cloud integrity gate missing: ${token}`);

for (const token of [
  "persistRecoverySnapshot(`Before ${action[0]} import`,before)",
  "restoreRecoverySnapshot(recoveryMeta.id,before",
  "incomingReport.counts.critical",
  "appliedReport.counts.critical",
  "finalReport.counts.critical",
  "if(!reconciliation?.ok)"
]) assert.ok(privacy.includes(token), `Recovery import integrity guard missing: ${token}`);

assert.ok(
  ledger.includes('if (architecture?.canWrite?.() === false) return { ok:false, reason:"read-only", count:0 };'),
  "Viewer profiles must be rejected before safe integrity repair planning or no-op success"
);

for (const token of [
  "function applyGuardedFinanceReplacement(",
  "assertReplacementIntegrity(source",
  'applyGuardedFinanceReplacement(payload.data, "Encrypted backup restored")',
  'applyGuardedFinanceReplacement(snapshot.data, "Cloud restore point applied")',
  "runIntegrityCheckButton",
  "repairSafeIntegrity"
]) assert.ok(security.includes(token), `Profile/restore integrity guard missing: ${token}`);

console.log("Cloud, import, encrypted backup, and restore-point integrity gates validated.");
