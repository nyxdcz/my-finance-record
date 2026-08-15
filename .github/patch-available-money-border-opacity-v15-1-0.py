from pathlib import Path

OLD_CACHE = "finance-v15-20260815-account-border-r18"
NEW_CACHE = "finance-v15-20260815-account-border-r19"
OLD_PIN = "black-canvas-v15-1-0.css?v=15.1.0-accountborder1"
NEW_PIN = "black-canvas-v15-1-0.css?v=15.1.0-accountborder2"
OLD_PIN_REGEX = r"black-canvas-v15-1-0\.css\?v=15\.1\.0-accountborder1"
NEW_PIN_REGEX = r"black-canvas-v15-1-0\.css\?v=15\.1\.0-accountborder2"

css_path = Path("black-canvas-v15-1-0.css")
css = css_path.read_text()
old_rule = "border-color:rgba(207,231,213,.42) !important;"
new_rule = "border-color:rgba(207,231,213,.24) !important;"
assert old_rule in css, "Current .42 account border rule not found"
css_path.write_text(css.replace(old_rule, new_rule, 1))

for filename in ["index.html", "sw.js"]:
    path = Path(filename)
    text = path.read_text()
    assert OLD_CACHE in text, f"{OLD_CACHE} missing from {filename}"
    assert OLD_PIN in text, f"{OLD_PIN} missing from {filename}"
    text = text.replace(OLD_CACHE, NEW_CACHE)
    text = text.replace(OLD_PIN, NEW_PIN)
    path.write_text(text)

version_path = Path("version.json")
version = version_path.read_text()
assert OLD_CACHE in version
version_path.write_text(version.replace(OLD_CACHE, NEW_CACHE))

for path in Path("tests").glob("*.mjs"):
    text = path.read_text()
    updated = text.replace(OLD_CACHE, NEW_CACHE)
    updated = updated.replace(OLD_PIN, NEW_PIN).replace(OLD_PIN_REGEX, NEW_PIN_REGEX)
    updated = updated.replace("rgba(207, 231, 213, 0.42)", "rgba(207, 231, 213, 0.24)")
    updated = updated.replace(r"rgba\(207,231,213,\.42\)", r"rgba\(207,231,213,\.24\)")
    if updated != text:
        path.write_text(updated)
