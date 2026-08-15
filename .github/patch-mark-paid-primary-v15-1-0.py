from pathlib import Path

OLD_CACHE = "finance-v15-20260815-black-canvas-r15"
NEW_CACHE = "finance-v15-20260815-mark-paid-primary-r16"
OLD_STYLE = "black-canvas-v15-1-0.css?v=15.1.0"
NEW_STYLE = "black-canvas-v15-1-0.css?v=15.1.0-paid1"

# Final Black Canvas override: Mark paid is a primary action, not a green status action.
css_path = Path("black-canvas-v15-1-0.css")
css = css_path.read_text()
marker = "/* V15.1.0 Mark Paid primary-action hotfix. */"
if marker not in css:
    css += '''\n\n/* V15.1.0 Mark Paid primary-action hotfix. */\n.button-paid {\n  background:var(--primary) !important;\n  color:var(--primary-contrast) !important;\n  border-color:var(--primary) !important;\n}\n.button-paid:hover {\n  background:var(--primary-dark) !important;\n  border-color:var(--primary-dark) !important;\n}\n'''
css_path.write_text(css)

# Fresh CSS pin and matching runtime cache identity in the live document.
index_path = Path("index.html")
index = index_path.read_text()
assert OLD_STYLE in index, "Black Canvas stylesheet pin missing from index.html"
assert OLD_CACHE in index, "Old runtime cache generation missing from index.html"
index = index.replace(OLD_STYLE, NEW_STYLE).replace(OLD_CACHE, NEW_CACHE)
index_path.write_text(index)

# Fresh PWA shell generation and matching stylesheet pin.
sw_path = Path("sw.js")
sw = sw_path.read_text()
assert OLD_CACHE in sw, "Old cache generation missing from sw.js"
assert OLD_STYLE in sw, "Old Black Canvas pin missing from sw.js"
sw = sw.replace(OLD_CACHE, NEW_CACHE).replace(OLD_STYLE, NEW_STYLE)
sw_path.write_text(sw)

# Same V15.1.0 release, new cache generation only.
version_path = Path("version.json")
version = version_path.read_text()
assert OLD_CACHE in version, "Old cache generation missing from version.json"
version = version.replace(OLD_CACHE, NEW_CACHE)
version = version.replace(
    '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, and Liquid Glass controls while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."',
    '"notes": "Introduces the Black Canvas UI with a #000000 app background and #173e76 primary color across both appearance modes, PWA chrome, Liquid Glass controls, and Expense Mark paid actions while preserving Finance Schema 12, Cloud Schema V3, records, calculations, and sync behavior."'
)
version_path.write_text(version)

# Align inherited literal and regex-escaped release assertions.
for path in Path("tests").glob("*.mjs"):
    text = path.read_text()
    updated = text.replace(OLD_CACHE, NEW_CACHE).replace(OLD_STYLE, NEW_STYLE)
    updated = updated.replace(
        r"black-canvas-v15-1-0\.css\?v=15\.1\.0",
        r"black-canvas-v15-1-0\.css\?v=15\.1\.0-paid1"
    )
    if updated != text:
        path.write_text(updated)

# Strengthen the structural palette validator.
validator_path = Path("tests/validate-black-canvas-v15-1-0.mjs")
validator = validator_path.read_text()
needle = 'assert.match(css,/--nav-active-bg:#173e76/);\n'
addition = '''assert.match(css,/\\.button-paid \\{[\\s\\S]*background:var\\(--primary\\) !important;[\\s\\S]*border-color:var\\(--primary\\) !important;/);\nassert.match(css,/\\.button-paid:hover \\{[\\s\\S]*background:var\\(--primary-dark\\) !important;/);\n'''
if addition not in validator:
    assert needle in validator
    validator = validator.replace(needle, needle + addition)
validator_path.write_text(validator)

# Verify computed Mark Paid color in both appearance modes using the real stylesheet cascade.
spec_path = Path("tests/black-canvas-v15-1-0.spec.mjs")
spec = spec_path.read_text()
old_eval = '''    const result = await page.evaluate(() => {\n      const root = getComputedStyle(document.documentElement);\n      const body = getComputedStyle(document.body);\n      return { bg:root.getPropertyValue("--bg").trim(), primary:root.getPropertyValue("--primary").trim(), bodyBg:body.backgroundColor };\n    });\n    expect(result.bg).toBe("#000000");\n    expect(result.primary).toBe("#173e76");\n    expect(result.bodyBg).toBe("rgb(0, 0, 0)");\n'''
new_eval = '''    const result = await page.evaluate(() => {\n      const root = getComputedStyle(document.documentElement);\n      const body = getComputedStyle(document.body);\n      const paid = document.createElement("button");\n      paid.className = "button button-paid";\n      paid.textContent = "Mark paid";\n      document.body.appendChild(paid);\n      const paidStyle = getComputedStyle(paid);\n      return {\n        bg:root.getPropertyValue("--bg").trim(),\n        primary:root.getPropertyValue("--primary").trim(),\n        bodyBg:body.backgroundColor,\n        paidBg:paidStyle.backgroundColor,\n        paidBorder:paidStyle.borderTopColor,\n        paidColor:paidStyle.color\n      };\n    });\n    expect(result.bg).toBe("#000000");\n    expect(result.primary).toBe("#173e76");\n    expect(result.bodyBg).toBe("rgb(0, 0, 0)");\n    expect(result.paidBg).toBe("rgb(23, 62, 118)");\n    expect(result.paidBorder).toBe("rgb(23, 62, 118)");\n    expect(result.paidColor).toBe("rgb(255, 255, 255)");\n'''
assert old_eval in spec, "Black Canvas browser test shape changed unexpectedly"
spec_path.write_text(spec.replace(old_eval, new_eval))
