import fs from "node:fs";
const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const formInputs = read("form-inputs.js");
const sw = read("sw.js");
const version = JSON.parse(read("version.json"));
const required = [
  [version.version === "2.0.1", "current release is Talaan V2.0.1"],
  [version.cacheVersion === "finance-v2-20260822-talaan-r1", "Talaan V2.0.1 cache is active"],
  [index.includes("Talaan · V2.0.1"), "prepared website uses the Talaan release title"],
  [index.includes("./form-inputs.js?v=15.2.6-phase5a1"), "index preserves the extracted form-input module compatibility pin"],
  [!index.includes("function evaluateArithmeticExpression"), "calculator implementation is no longer inline"],
  [formInputs.includes("function evaluateArithmeticExpression") && formInputs.includes("function validateMoneyInput") && formInputs.includes("function setupNumericInputs"), "extracted calculator APIs are present"],
  [formInputs.includes("Object.assign(root"), "extracted APIs remain globally compatible"],
  [sw.includes("form-inputs.js?v=15.2.6-phase5a1"), "form-input module is precached"]
];
for (const [ok, message] of required) if (!ok) throw new Error(message);
console.log("Form-input extraction source contract passed under Talaan V2.0.1");
