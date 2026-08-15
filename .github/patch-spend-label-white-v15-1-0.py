from pathlib import Path

OLD_CACHE = "finance-v15-20260815-mark-paid-primary-r16"
NEW_CACHE = "finance-v15-20260815-spend-label-white-r17"
OLD_CANVAS_PIN = "black-canvas-v15-1-0.css?v=15.1.0-paid1"
NEW_CANVAS_PIN = "black-canvas-v15-1-0.css?v=15.1.0-spend1"

# 1) Scope the requested pure-white color to the visible Spend label only.
css_path = Path("black-canvas-v15-1-0.css")
css = css_path.read_text()
marker = "/* V15.1.0 Available money Spend label hotfix. */"
if marker not in css:
    css += '''\n\n/* V15.1.0 Available money Spend label hotfix. */\n#availableMoneySection .account-spend-button span {\n  color:#ffffff !important;\n}\n'''
css_path.write_text(css)

# 2) Rotate the delivery URL/cache generation while keeping app version V15.1.0.
for filename in ["index.html", "sw.js", "version.json"]:
    path = Path(filename)
    text = path.read_text()
    assert OLD_CACHE in text, f"{OLD_CACHE} missing from {filename}"
    text = text.replace(OLD_CACHE, NEW_CACHE)
    text = text.replace(OLD_CANVAS_PIN, NEW_CANVAS_PIN)
    path.write_text(text)

# 3) Keep release notes accurate without changing schemas or semantic version.
version_path = Path("version.json")
version = version_path.read_text()
old_notes = '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, Liquid Glass controls, and Expense Mark paid actions while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."'
new_notes = '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, Liquid Glass controls, Expense Mark paid actions, and a pure-white Available money Spend label while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."'
assert old_notes in version
version_path.write_text(version.replace(old_notes, new_notes))

# 4) Align inherited cache/pin assertions in tests.
for path in Path("tests").glob("*.mjs"):
    text = path.read_text()
    updated = text.replace(OLD_CACHE, NEW_CACHE).replace(OLD_CANVAS_PIN, NEW_CANVAS_PIN)
    if updated != text:
        path.write_text(updated)

# 5) Extend the existing Black Canvas browser regression with the exact requested label color.
spec_path = Path("tests/black-canvas-v15-1-0.spec.mjs")
spec = spec_path.read_text()
if "spendColor" not in spec:
    spec = spec.replace(
        '      const paidStyle = getComputedStyle(paid);\n      return {',
        '      const paidStyle = getComputedStyle(paid);\n      const available = document.createElement("section");\n      available.id = "availableMoneySection";\n      const spend = document.createElement("button");\n      spend.className = "button button-secondary button-small account-spend-button";\n      const spendLabel = document.createElement("span");\n      spendLabel.textContent = "Spend";\n      spend.appendChild(spendLabel);\n      available.appendChild(spend);\n      document.body.appendChild(available);\n      const spendStyle = getComputedStyle(spendLabel);\n      return {'
    )
    spec = spec.replace(
        '        paidColor:paidStyle.color\n',
        '        paidColor:paidStyle.color,\n        spendColor:spendStyle.color\n'
    )
    spec = spec.replace(
        '    expect(result.paidColor).toBe("rgb(255, 255, 255)");\n',
        '    expect(result.paidColor).toBe("rgb(255, 255, 255)");\n    expect(result.spendColor).toBe("rgb(255, 255, 255)");\n'
    )
spec_path.write_text(spec)

# 6) Add a small structural regression to the normal npm test gate.
validator = Path("tests/validate-spend-label-v15-1-0.mjs")
validator.write_text('''#!/usr/bin/env node\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nconst css = fs.readFileSync("black-canvas-v15-1-0.css", "utf8");\nconst index = fs.readFileSync("index.html", "utf8");\nconst sw = fs.readFileSync("sw.js", "utf8");\nconst version = JSON.parse(fs.readFileSync("version.json", "utf8"));\nassert.match(css, /#availableMoneySection \\.account-spend-button span\\s*\\{[\\s\\S]*color:#ffffff !important;/);\nassert.match(index, /black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0-spend1/);\nassert.match(sw, /black-canvas-v15-1-0\\.css\\?v=15\\.1\\.0-spend1/);\nassert.equal(version.version, "15.1.0");\nassert.equal(version.schemaVersion, 12);\nassert.equal(version.cloudSchemaVersion, 3);\nassert.equal(version.cacheVersion, "finance-v15-20260815-spend-label-white-r17");\nconsole.log("V15.1.0 Spend label regression passed.");\n''')

package_path = Path("package.json")
package = package_path.read_text()
if "validate-spend-label-v15-1-0.mjs" not in package:
    needle = '"test": "'
    assert needle in package
    package = package.replace(needle, '"test": "node tests/validate-spend-label-v15-1-0.mjs && ', 1)
package_path.write_text(package)
