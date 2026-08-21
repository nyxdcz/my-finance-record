import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const formInputs = read("form-inputs.js");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const required = [
  [version.version === "15.2.23", "current release is V15.2.18"],
  [version.cacheVersion === "finance-v15-20260821-monthly-repeat-icon-r59", "r50 cache is active"],
  [index.includes("./form-inputs.js?v=15.2.6-phase5a1"), "index preserves the extracted V15.2.6 form-input module pin"],
  [!index.includes("function evaluateArithmeticExpression"), "calculator implementation is no longer inline"],
  [formInputs.includes("function evaluateArithmeticExpression") && formInputs.includes("function validateMoneyInput") && formInputs.includes("function setupNumericInputs"), "extracted calculator APIs are present"],
  [formInputs.includes("Object.assign(root"), "extracted APIs remain globally compatible"],
  [sw.includes("form-inputs.js?v=15.2.6-phase5a1"), "form-input module is precached"]
];
for (const [ok, message] of required) if (!ok) throw new Error(message);
console.log("V15.2.6 form-input extraction source contract passed under the V15.2.18 shell");
