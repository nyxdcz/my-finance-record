import fs from "node:fs";

const file = "tests/run.mjs";
let value = fs.readFileSync(file, "utf8");
const entry = '  { suite: "regression", file: "tests/regression/validate-sidebar-embedded-v15-2-10.mjs" },';
if (!value.includes(entry)) {
  const marker = '  { suite: "regression", file: "tests/regression/validate-sync-config-separation.mjs" },';
  if (!value.includes(marker)) throw new Error("Missing source test-plan insertion point");
  value = value.replace(marker, `${entry}\n${marker}`);
}
fs.writeFileSync(file, value);
