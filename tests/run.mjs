import { spawnSync } from "node:child_process";

const testPlan = [
  { suite: "finance", file: "tests/finance/validate-finance-ui-source.mjs" },
  { suite: "finance", file: "tests/finance/validate-expense-screenshot.mjs" },
  { suite: "sync", file: "tests/sync/validate-safe-multidevice-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-mobile-cloud-revert-safety.mjs" },
  { suite: "sync", file: "tests/sync/validate-view-preference-boundary.mjs" },
  { suite: "sync", file: "tests/sync/validate-payees-rules-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-import-center-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-import-formats-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-net-worth-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-household-splits-sync.mjs" },
  { suite: "regression", file: "tests/regression/validate-desktop-ui.mjs" },
  { suite: "regression", file: "tests/regression/validate-pwa-runtime.mjs" },
  { suite: "regression", file: "tests/regression/validate-mobile-ui.mjs" },
  { suite: "regression", file: "tests/regression/validate-dashboard-view-system.mjs" },
  { suite: "regression", file: "tests/regression/validate-application-shell.mjs" },
  { suite: "sync", file: "tests/regression/validate-cloud-readiness.mjs" },
  { suite: "regression", file: "tests/regression/validate-production-ui.mjs" },
  { suite: "regression", file: "tests/regression/validate-project-interactions.mjs" },
  { suite: "regression", file: "tests/regression/validate-sync-config-separation.mjs" },
  { suite: "regression", file: "tests/regression/validate-transaction-workspace.mjs" },
  { suite: "regression", file: "tests/regression/validate-privacy-display.mjs" },
  { suite: "regression", file: "tests/regression/validate-payees-rules.mjs" },
  { suite: "regression", file: "tests/regression/validate-import-center.mjs" },
  { suite: "regression", file: "tests/regression/validate-import-formats.mjs" },
  { suite: "regression", file: "tests/regression/validate-net-worth.mjs" },
  { suite: "regression", file: "tests/regression/validate-household-splits.mjs" },
];

const supportedSuites = new Set(["all", ...testPlan.map(({ suite }) => suite)]);
const requestedSuite = process.argv[2] ?? "all";

if (!supportedSuites.has(requestedSuite)) {
  console.error(`Unknown test suite "${requestedSuite}". Expected one of: ${[...supportedSuites].join(", ")}.`);
  process.exit(2);
}

const selectedTests = requestedSuite === "all" ? testPlan : testPlan.filter(({ suite }) => suite === requestedSuite);
console.log(`Running ${selectedTests.length} ${requestedSuite === "all" ? "source regression tests" : `${requestedSuite} tests`}...`);

for (const { file } of selectedTests) {
  console.log(`\n> ${file}`);
  const result = spawnSync(process.execPath, [file], { env: process.env, stdio: "inherit" });
  if (result.error) {
    console.error(`Could not start ${file}:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nCompleted ${selectedTests.length} tests successfully.`);
