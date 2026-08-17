import fs from "node:fs";

const replace = (file, from, to) => {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(from)) throw new Error(`${file}: missing expected text: ${from}`);
  fs.writeFileSync(file, source.replaceAll(from, to));
};

replace("tests/inspect-project.mjs", 'if (pkg.version !== "15.2.3") fail(`Expected current package version 15.2.3, found ${pkg.version || "(missing)"}`);', 'if (pkg.version !== "15.2.4") fail(`Expected current package version 15.2.4, found ${pkg.version || "(missing)"}`);');
replace("tests/inspect-project.mjs", 'if (!read("README.md").startsWith("# My Finance Records · V15.2.3")) fail("README release heading is not V15.2.3");', 'if (!read("README.md").startsWith("# My Finance Records · V15.2.4")) fail("README release heading is not V15.2.4");');
replace("tests/inspect-project.mjs", 'if (!read("CHANGELOG.md").startsWith("## 15.2.3 · 2026-08-17")) fail("CHANGELOG latest entry is not V15.2.3");', 'if (!read("CHANGELOG.md").startsWith("## 15.2.4 · 2026-08-18")) fail("CHANGELOG latest entry is not V15.2.4");');
replace("tests/inspect-project.mjs", 'console.log("Repository inspection passed: V15.2.3 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");', 'console.log("Repository inspection passed: V15.2.4 release files, local paths, deploy paths, package metadata, permissions, and public sync configuration are consistent.");');

console.log("Aligned inspect-project release assertions to V15.2.4.");
