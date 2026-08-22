import fs from "node:fs";

const file = "assets/css/production-ui-audit.css";
let css = fs.readFileSync(file, "utf8");
const marker = "/* Talaan · More tools touch-tablet target restoration */";
if (!css.includes(marker)) {
  css = `${css.trimEnd()}\n\n${marker}\n@media (min-width: 851px) and (max-width: 1024px) and (pointer: coarse),\n       (min-width: 851px) and (max-width: 1024px) and (hover: none) {\n  html body .topbar-actions .topbar-tools-menu {\n    flex: 0 0 44px !important;\n    width: 44px !important;\n    min-width: 44px !important;\n    max-width: 44px !important;\n  }\n\n  html body .topbar-actions #topbarToolsTrigger {\n    width: 44px !important;\n    min-width: 44px !important;\n    max-width: 44px !important;\n    height: 44px !important;\n    min-height: 44px !important;\n    max-height: 44px !important;\n    flex-basis: 44px !important;\n  }\n}\n`;
  fs.writeFileSync(file, css);
}
console.log("Restored the 44px More tools target on touch tablets while retaining 34px fine-pointer desktop geometry.");
