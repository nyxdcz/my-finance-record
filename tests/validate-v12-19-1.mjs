#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const baseline = spawnSync(process.execPath, [path.join(here, "validate-v12-19-0.mjs")], { encoding:"utf8" });
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.19.0 cloud-sync baseline failed");

const html = read("index.html");
const worker = read("sw.js");
const cloud = read("cloud-sync.js");
const readme = read("README.md");
const policies = read("supabase/security-policies.sql");
const migration = read("supabase/security-hardening-v12-19-1.sql");
const smoke = read("supabase/rls-smoke-tests.sql");
const workflow = read(".github/workflows/quality-pages.yml");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const version = JSON.parse(read("version.json"));

assert(version.version === "12.19.1", "version.json is not V12.19.1");
assert(version.schemaVersion === 12, "core finance schema changed from 12");
assert(version.cloudSchemaVersion === 1, "Cloud Schema V1 changed unexpectedly");
assert(html.includes('<title>My Finance Records · V12.19.1</title>'), "HTML title version mismatch");
assert(html.includes('const APP_VERSION = "12.19.1";'), "HTML APP_VERSION mismatch");
assert(html.includes('{"version": "V12.19.1", "title": "Repository & Security Hardening"'), "in-app version history is missing V12.19.1");
assert(worker.includes('const APP_VERSION = "12.19.1";'), "service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`), "service-worker cache mismatch");
assert(cloud.includes('My Finance Records V12.19.1'), "cloud-sync release comment mismatch");
assert(!cloud.includes('"12.19.0"'), "cloud-sync contains stale fallback version");
assert(readme.startsWith("# My Finance Records · V12.19.1 PWA"), "README heading mismatch");
assert(readme.includes("## V12.19.1 · Repository & Security Hardening"), "README release notes missing");
assert(packageJson.version === "12.19.1", "package.json version mismatch");
assert(packageLock.version === "12.19.1", "package-lock version mismatch");
assert(packageJson.private === true, "package must remain private/non-publishable");
assert(packageJson.scripts?.quality === "node tests/validate-v12-19-1.mjs", "quality script mismatch");

for (const token of [
  "pull_request:",
  "push:",
  "branches: [main]",
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "npm ci --ignore-scripts --no-audit --no-fund",
  "npm run quality",
  "actions/configure-pages@v5",
  "actions/upload-pages-artifact@v4",
  "actions/deploy-pages@v4",
  "pages: write",
  "id-token: write",
  "needs: quality",
  "path: _site"
]) assert(workflow.includes(token), `workflow token missing: ${token}`);

for (const runtimeFile of [
  "index.html", "offline.html", "manifest.webmanifest", "version.json", "sw.js",
  "cloud-sync.js", "sync-config.js", "vendor/supabase.min.js"
]) assert(workflow.includes(runtimeFile), `deployment does not copy ${runtimeFile}`);

for (const file of [
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/pull_request_template.md",
  ".gitignore",
  "CHANGELOG.md",
  "SECURITY.md",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "RELEASE_CHECKLIST.md",
  "GITHUB_SECURITY_SETUP.md",
  "SECURITY_HARDENING_VALIDATION_V12_19_1.md",
  "supabase/security-hardening-v12-19-1.sql",
  "supabase/rls-smoke-tests.sql",
  "offline.html",
  "version.json"
]) assert(fs.existsSync(path.join(root, file)), `required repository file missing: ${file}`);

for (const table of ["finance_cloud_state", "finance_cloud_devices", "finance_payment_operations"]) {
  assert(policies.includes(`alter table public.${table} force row level security;`), `forced RLS missing for ${table}`);
  assert(migration.includes(`alter table public.${table} force row level security;`), `migration forced RLS missing for ${table}`);
}
for (const token of [
  "revoke update, delete on public.finance_payment_operations from authenticated;",
  "grant select, insert on public.finance_payment_operations to authenticated;",
  'drop policy if exists "finance operations update own"',
  'drop policy if exists "finance operations delete own"',
  "Append-only payment-operation audit rows"
]) {
  assert(policies.includes(token), `hardened policy token missing: ${token}`);
  assert(migration.includes(token), `security migration token missing: ${token}`);
}
assert(!policies.includes("grant select, insert, update on public.finance_payment_operations"), "payment-operation UPDATE grant remains");
assert(!/on public\.finance_payment_operations for update/.test(policies), "payment-operation UPDATE policy remains");
assert(smoke.includes("relforcerowsecurity") && smoke.includes("role_table_grants"), "RLS smoke tests are incomplete");

const sourceExtensions = new Set([".js", ".mjs", ".json", ".html", ".sql", ".yml", ".yaml"]);
const walk = directory => fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => {
  if ([".git", "node_modules", "_site"].includes(entry.name)) return [];
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
for (const file of walk(root).filter(file => sourceExtensions.has(path.extname(file)))) {
  const text = fs.readFileSync(file, "utf8");
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text), `Supabase secret key detected in ${path.relative(root, file)}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text), `service-role credential detected in ${path.relative(root, file)}`);
}

const syntaxFiles = ["cloud-sync.js", "sync-config.js", "sync-config.example.js", "vendor/supabase.min.js", "sw.js", "tests/validate-v12-19-1.mjs"];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding:"utf8" });
  assert(syntax.status === 0, `${file} syntax failed: ${syntax.stderr}`);
}

const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const protectedHashes = {
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":"96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png":"a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png":"c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"
};
for (const [file, expected] of Object.entries(protectedHashes)) assert(sha256(file) === expected, `${file} changed unexpectedly`);

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicates.length === 0, `duplicate HTML IDs: ${duplicates.join(", ")}`);

if (failures.length) {
  console.error("V12.19.1 repository and security hardening validation failed:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V12.19.1 Repository & Security Hardening validation passed.");
console.log(`- ${ids.length} HTML IDs checked with no duplicates`);
console.log("- GitHub quality/deployment workflow, repository completeness, forced RLS, append-only payment audits, credential safety, and protected assets passed");
console.log("- Core finance schema 12 and Cloud Schema V1 remain unchanged");
