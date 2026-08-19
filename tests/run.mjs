import { spawnSync } from "node:child_process";

const testPlan = [
  { suite: "finance", file: "tests/finance/validate-finance-marquee-source-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-desktop-ui-phase1-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-month-navigation-borderless-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-desktop-ui-consistency-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-available-money-border-v15-1-0.mjs" },
  { suite: "finance", file: "tests/finance/validate-spend-label-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-black-canvas-v15-1-0.mjs" },
  { suite: "regression", file: "tests/regression/validate-header-ui-v15-0-5.mjs" },
  { suite: "regression", file: "tests/regression/validate-pwa-updater-v15-0-5.mjs" },
  { suite: "finance", file: "tests/finance/validate-record-spending-v15-0-4.mjs" },
  { suite: "sync", file: "tests/sync/validate-safe-multidevice-sync.mjs" },
  { suite: "sync", file: "tests/sync/validate-mobile-cloud-revert-safety.mjs" },
  { suite: "finance", file: "tests/finance/validate-expense-screenshot.mjs" },
  { suite: "regression", file: "tests/regression/validate-v15-2-0-desktop-ux.mjs" },
  { suite: "regression", file: "tests/regression/validate-v15-2-2-mobile-ui.mjs" },
  { suite: "finance", file: "tests/finance/validate-form-inputs-v15-2-6.mjs" },
  { suite: "regression", file: "tests/regression/validate-application-help-v15-2-7.mjs" },
];

const supportedSuites = new Set(["all", ...testPlan.map(({ suite }) => suite)]);
const requestedSuite = process.argv[2] ?? "all";

if (!supportedSuites.has(requestedSuite)) {
  console.error(
    `Unknown test suite "${requestedSuite}". Expected one of: ${[...supportedSuites].join(", ")}.`,
  );
  process.exit(2);
}

const selectedTests =
  requestedSuite === "all"
    ? testPlan
    : testPlan.filter(({ suite }) => suite === requestedSuite);

console.log(
  `Running ${selectedTests.length} ${requestedSuite === "all" ? "source regression tests" : `${requestedSuite} tests`}...`,
);

for (const { file } of selectedTests) {
  console.log(`\n> ${file}`);
  const result = spawnSync(process.execPath, [file], {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`Could not start ${file}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nCompleted ${selectedTests.length} tests successfully.`);
