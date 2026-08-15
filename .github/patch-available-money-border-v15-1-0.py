from pathlib import Path

OLD_CACHE = "finance-v15-20260815-spend-label-white-r17"
NEW_CACHE = "finance-v15-20260815-account-border-r18"
OLD_CSS = "black-canvas-v15-1-0.css?v=15.1.0-spend1"
NEW_CSS = "black-canvas-v15-1-0.css?v=15.1.0-accountborder1"
OLD_CSS_REGEX = r"black-canvas-v15-1-0\.css\?v=15\.1\.0-spend1"
NEW_CSS_REGEX = r"black-canvas-v15-1-0\.css\?v=15\.1\.0-accountborder1"

# Scope the visual change to the six Available money account cards only.
css_path = Path("black-canvas-v15-1-0.css")
css = css_path.read_text()
marker = "/* V15.1.0 Available money account-border softening. */"
if marker not in css:
    css += '''\n\n/* V15.1.0 Available money account-border softening. */\n#availableMoneySection .account-card {\n  border-color:rgba(207,231,213,.42) !important;\n}\n'''
css_path.write_text(css)

# Rotate the PWA shell and stylesheet URL so installed clients fetch the visual hotfix.
for filename in ["index.html", "sw.js", "version.json"]:
    path = Path(filename)
    text = path.read_text()
    assert OLD_CACHE in text, f"{OLD_CACHE} missing from {filename}"
    text = text.replace(OLD_CACHE, NEW_CACHE)
    text = text.replace(OLD_CSS, NEW_CSS)
    path.write_text(text)

# Keep inherited regression assertions aligned with the new cache/style pin.
for path in Path("tests").glob("*.mjs"):
    text = path.read_text()
    changed = text.replace(OLD_CACHE, NEW_CACHE).replace(OLD_CSS, NEW_CSS).replace(OLD_CSS_REGEX, NEW_CSS_REGEX)
    if changed != text:
        path.write_text(changed)

# Update release notes without changing semantic version or schemas.
version_path = Path("version.json")
text = version_path.read_text()
text = text.replace(
    '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, Liquid Glass controls, Expense Mark paid actions, and a pure-white Available money Spend label while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."',
    '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, Liquid Glass controls, Expense Mark paid actions, a pure-white Available money Spend label, and softer Available money account-card outlines while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."'
)
version_path.write_text(text)

# Extend the existing Black Canvas browser regression to verify only account-card border opacity changes.
spec_path = Path("tests/black-canvas-v15-1-0.spec.mjs")
spec = spec_path.read_text()
old = '''      available.appendChild(spend);\n      document.body.appendChild(available);\n      const spendStyle = getComputedStyle(spendLabel);\n      return {\n'''
new = '''      available.appendChild(spend);\n      const accountCard = document.createElement("article");\n      accountCard.className = "account-card";\n      available.appendChild(accountCard);\n      document.body.appendChild(available);\n      const spendStyle = getComputedStyle(spendLabel);\n      const accountStyle = getComputedStyle(accountCard);\n      return {\n'''
assert old in spec
spec = spec.replace(old, new, 1)
old = '''        paidColor:paidStyle.color,\n        spendColor:spendStyle.color\n'''
new = '''        paidColor:paidStyle.color,\n        spendColor:spendStyle.color,\n        accountBorder:accountStyle.borderTopColor\n'''
assert old in spec
spec = spec.replace(old, new, 1)
old = '''    expect(result.spendColor).toBe("rgb(255, 255, 255)");\n    await context.close();\n'''
new = '''    expect(result.spendColor).toBe("rgb(255, 255, 255)");\n    expect(result.accountBorder).toBe("rgba(207, 231, 213, 0.42)");\n    await context.close();\n'''
assert old in spec
spec = spec.replace(old, new, 1)
spec_path.write_text(spec)

# Add a structural validator to keep the selector tightly scoped.
validator = Path("tests/validate-available-money-border-v15-1-0.mjs")
validator.write_text('''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst css = fs.readFileSync("black-canvas-v15-1-0.css", "utf8");\nconst index = fs.readFileSync("index.html", "utf8");\nconst sw = fs.readFileSync("sw.js", "utf8");\nconst version = JSON.parse(fs.readFileSync("version.json", "utf8"));\nassert.match(css, /#availableMoneySection \\.account-card \\{[\\s\\S]*border-color:rgba\\(207,231,213,\\.42\\) !important;/);\nassert.doesNotMatch(css, /#availableMoneySection \\{[\\s\\S]{0,160}border-color:rgba\\(207,231,213,\\.42\\)/);\nassert.match(index, /black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0-accountborder1/);\nassert.match(sw, /black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0-accountborder1/);\nassert.equal(version.version, "15.1.0");\nassert.equal(version.schemaVersion, 12);\nassert.equal(version.cloudSchemaVersion, 3);\nassert.equal(version.cacheVersion, "finance-v15-20260815-account-border-r18");\nconsole.log("V15.1.0 Available money account-border regression passed.");\n''')

# Include the structural validator in normal quality runs.
package_path = Path("package.json")
package = package_path.read_text()
needle = '"test": "node tests/validate-spend-label-v15-1-0.mjs && '
if "validate-available-money-border-v15-1-0.mjs" not in package:
    assert needle in package
    package = package.replace(needle, '"test": "node tests/validate-available-money-border-v15-1-0.mjs && node tests/validate-spend-label-v15-1-0.mjs && ')
package_path.write_text(package)
