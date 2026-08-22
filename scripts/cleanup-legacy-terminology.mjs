import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const skipDirectories = new Set([".git", "node_modules", "test-results", "playwright-report"]);
const textExtensions = new Set([".css", ".html", ".js", ".mjs", ".json", ".md", ".sql", ".yml", ".yaml", ".sh", ".webmanifest"]);

const semanticReplacements = new Map([
  ["v12-section-heading", "system-section-heading"],
  ["v12-grid", "system-grid"],
  ["v12-card", "system-card"],
  ["v12-status-row", "system-status-row"],
  ["v12-status-value", "system-status-value"],
  ["v12-chip", "status-chip"],
  ["v12-actions", "system-actions"],
  ["v12-help", "system-help"],
  ["v12-table-wrap", "system-table-wrap"],
  ["v12-table", "system-table"],
  ["v12-empty", "system-empty"],
  ["v12-inline-form", "system-inline-form"],
  ["v12-pack-form", "recovery-pack-form"],
  ["v12-progress", "migration-progress"],
  ["v12-guidance", "recovery-guidance"],
  ["v12-check-list", "system-check-list"],
  ["v12-check-item", "system-check-item"],
  ["v12-sync-summary", "sync-summary"],
  ["v12-warning-box", "warning-box"],
  ["v12-success-box", "success-box"],
  ["v12-file-label", "file-label"],
  ["syncV1303ExpenseSections", "syncCompactExpenseSections"],
  ["setupV1303CompactExpenseSections", "setupCompactExpenseSections"],
  ["runV12Migration", "runLegacyDataMigration"],
  ["openV12Db", "openFinanceDatabase"],
  ["V12_META_KEY", "FINANCE_META_KEY"],
  ["V11_BACKUP_KEY", "LEGACY_BACKUP_KEY"],
  ["V12_DB_NAME", "FINANCE_DB_NAME"],
  ["V12_DB_VERSION", "FINANCE_DB_VERSION"],
  ["V12_CHANNEL_NAME", "FINANCE_CHANNEL_NAME"],
  ["docs/migration/V13_MIGRATION_GUIDE.md", "docs/migration/CLOUD_SCHEMA_V3_MIGRATION_GUIDE.md"],
  ["supabase/cloud-profiles-v13.sql", "supabase/cloud-profiles-v3.sql"],
  ["supabase/cloud-profile-management-v15-2-2.sql", "supabase/cloud-profile-management.sql"],
  ["supabase/security-hardening-v12-19-1.sql", "supabase/security-hardening.sql"],
  ["V12 App, Offline & Recovery", "App, Offline & Recovery"],
  ["Schema V12", "Finance Schema 12"],
  ["V11 → V12 migration", "Legacy data migration"],
  ["Install V12 from the same HTTPS site on the new device.", "Install Talaan from the same HTTPS site on the new device."],
  ["Import it; V12 creates a pre-import recovery snapshot first.", "Import it; Talaan creates a pre-import recovery snapshot first."],
  ["V12 creates a pre-import recovery snapshot before any merge or replacement.", "Talaan creates a pre-import recovery snapshot before any merge or replacement."],
  ["Existing V12 metadata loaded", "Existing finance metadata loaded"],
  ["V11 and V12 totals did not match", "Legacy and migrated totals did not match"],
  ["Fresh V12 initialization", "Fresh finance initialization"],
  ["old V13-V15 product-era filenames", "legacy product-era filenames"],
  ["active V13-V15 runtime filename", "legacy versioned runtime filename"],
  ["V13-V15 runtime filename", "legacy versioned runtime filename"]
]);

const renamePairs = [
  ["docs/migration/V13_MIGRATION_GUIDE.md", "docs/migration/CLOUD_SCHEMA_V3_MIGRATION_GUIDE.md"],
  ["supabase/cloud-profiles-v13.sql", "supabase/cloud-profiles-v3.sql"],
  ["supabase/cloud-profile-management-v15-2-2.sql", "supabase/cloud-profile-management.sql"],
  ["supabase/security-hardening-v12-19-1.sql", "supabase/security-hardening.sql"]
];

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes:true })) {
    if (entry.isDirectory() && skipDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function replaceAllText(source) {
  let next = source;
  for (const [before, after] of semanticReplacements) next = next.replaceAll(before, after);
  return next;
}

for (const [oldPath, newPath] of renamePairs) {
  const oldAbsolute = path.join(root, oldPath);
  const newAbsolute = path.join(root, newPath);
  if (!fs.existsSync(oldAbsolute)) continue;
  fs.mkdirSync(path.dirname(newAbsolute), { recursive:true });
  if (fs.existsSync(newAbsolute)) fs.rmSync(newAbsolute);
  fs.renameSync(oldAbsolute, newAbsolute);
}

for (const file of walk(root)) {
  if (!textExtensions.has(path.extname(file)) && path.basename(file) !== "manifest.webmanifest") continue;
  const source = fs.readFileSync(file, "utf8");
  let next = replaceAllText(source);

  if (path.relative(root, file) === "index.html") {
    next = next
      .replaceAll('title="V15.2.19 · Compact Expense Cards · August 21, 2026">V15.2.19</small>', 'title="V2.0.1 · Talaan · August 22, 2026">V2.0.1</small>')
      .replaceAll("/* V13.0.5 · Dashboard calendar source scoping and idempotent event projection */", "/* Dashboard calendar source scoping and idempotent event projection */")
      .replaceAll("// V13.0.8: the Dashboard calendar represents upcoming/due expenses only.", "// The Dashboard calendar represents upcoming/due expenses only.")
      .replace(/\/\/ ---------------- V12\.10\.0 PWA,[^\n]*\n/, "// ---------------- Talaan application runtime: PWA, finance workflows, recovery, projects, savings, reports, and responsive interface ----------------\n")
      .replaceAll('from: "V11", to: "V12"', 'from: "Legacy", to: "Finance Schema 12"')
      .replaceAll('from: "V11", to: "V12", status:', 'from: "Legacy", to: "Finance Schema 12", status:');
  }

  if (path.relative(root, file) === "scripts/prepare-runtime.mjs") {
    next = next
      .replace(/\nconst LEGACY_RUNTIME_RENAMES = new Map\(\[[\s\S]*?\n\]\);\n/, "\n")
      .replace(/\n\s*for \(const \[legacy, current\] of LEGACY_RUNTIME_RENAMES\) next = next\.replaceAll\(legacy, current\);/, "");
  }

  if (path.relative(root, file) === "tests/helpers/inspect-project.mjs") {
    next = next
      .replace(/const activeLegacyRuntimePattern = \/[\s\S]*?\/i;/, 'const versionedRuntimeFilenamePattern = /-v(?:1[345])(?:[-.]|\\b)/i;')
      .replaceAll("activeLegacyRuntimePattern.test(text)", "versionedRuntimeFilenamePattern.test(text)");
  }

  if (next !== source) fs.writeFileSync(file, next);
}

const migrationGuide = path.join(root, "docs/migration/CLOUD_SCHEMA_V3_MIGRATION_GUIDE.md");
if (fs.existsSync(migrationGuide)) {
  fs.writeFileSync(migrationGuide, `# Cloud Schema V3 Controlled Migration Guide\n\n## Stop conditions\n\nDo not continue unless authoritative-device balances match, Cloud Sync is Synced, a fresh recovery backup can be opened, and the earlier Cloud Schema V2 migration has completed.\n\n## Stage 1 — Recovery\n\n1. Export a recovery backup from the authoritative device.\n2. Save a second copy outside the Downloads folder.\n3. Record the current account total and one recent ledger transaction for comparison.\n\n## Stage 2 — Database\n\n1. Open the Supabase SQL Editor.\n2. Run \`supabase/cloud-profiles-v3.sql\` once.\n3. Confirm the transaction completes successfully.\n4. Review \`supabase/rls-smoke-tests-v3.sql\` and the Security Advisor.\n\nCloud Schema V3 creates new profile-scoped tables. It does not delete earlier cloud records.\n\n## Stage 3 — App\n\n1. Deploy the current Talaan release.\n2. Open the authoritative device first.\n3. Confirm existing local data is assigned to the default personal profile.\n4. Create the encrypted cloud profile and store the passphrase externally.\n5. Upload from the authoritative device and wait for Synced.\n6. Create and test an encrypted \`.mfrx\` backup.\n\n## Stage 4 — Second device\n\n1. Update the Home Screen app.\n2. Sign in, open **Profiles & Security**, and use **Find existing profiles** or accept the household invitation.\n3. Connect and unlock using the same passphrase.\n4. Download the cloud records.\n5. Compare the recorded account total and ledger transaction.\n\n## Stage 5 — Household access\n\n1. The Owner creates an Editor or Viewer invitation code.\n2. Send the invitation code and encryption passphrase through separate trusted channels.\n3. The invited user signs in, accepts the code, unlocks the profile, and downloads records.\n4. Verify Viewer accounts cannot save or upload.\n\n## Rollback\n\nStop all Cloud Schema V3 writers before rollback. Preserve encrypted backups and the pre-migration recovery backup. Earlier cloud tables remain available for controlled rollback, but records written only to Cloud Schema V3 will not automatically appear in earlier schemas.\n`);
}

const profileSql = path.join(root, "supabase/cloud-profiles-v3.sql");
if (fs.existsSync(profileSql)) {
  let source = fs.readFileSync(profileSql, "utf8");
  source = source
    .replace(/^-- My Finance Records V13\.0\.0 · Cloud Schema V3/m, "-- Talaan · Cloud Schema V3")
    .replace(/^-- Run after the V12\.21\.0 Cloud Schema V2 migration\./m, "-- Run after the legacy Cloud Schema V2 migration.");
  fs.writeFileSync(profileSql, source);
}

const managementSql = path.join(root, "supabase/cloud-profile-management.sql");
if (fs.existsSync(managementSql)) {
  let source = fs.readFileSync(managementSql, "utf8");
  source = source
    .replace(/^-- My Finance Records V15\.2\.2 · Cloud Profile management/m, "-- Talaan · Cloud Profile management")
    .replace(/supabase\/cloud-profiles-v13\.sql/g, "supabase/cloud-profiles-v3.sql");
  fs.writeFileSync(managementSql, source);
}

const securitySql = path.join(root, "supabase/security-hardening.sql");
if (fs.existsSync(securitySql)) {
  let source = fs.readFileSync(securitySql, "utf8");
  source = source.replace(/^-- My Finance Records V12\.19\.1 · existing-project security migration/m, "-- Talaan · Legacy cloud security hardening migration");
  fs.writeFileSync(securitySql, source);
}

console.log("Legacy terminology migration prepared for Talaan V2.0.1.");
