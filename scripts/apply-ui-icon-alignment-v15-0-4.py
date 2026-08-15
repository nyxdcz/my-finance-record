from pathlib import Path
import json

MARKER = "/* V15.0.4 · icon alignment hotfix */"

css_path = Path("app.css")
css = css_path.read_text()
if MARKER not in css:
    css += f'''\n\n{MARKER}\n/* Keep the build badge text-only and compact. */\n#buildBadge {{ background-image:none !important; }}\n#buildBadge::before,\n#buildBadge::after {{ content:none !important; display:none !important; }}\n\n/* Keep icon + label controls compact without changing their hit areas. */\n.button {{ gap:4px; }}\n\n/* Center any standalone top-bar utility button added beside Cloud Sync. */\n.topbar-actions > button:not(.cloud-sync-toolbar-button):not(.topbar-add-button) {{\n  display:inline-grid !important;\n  place-items:center !important;\n  padding-inline:0 !important;\n  text-align:center;\n}}\n.topbar-actions > button:not(.cloud-sync-toolbar-button):not(.topbar-add-button) > :is(svg,img,.toolbar-icon) {{\n  margin:0 !important;\n  justify-self:center;\n  align-self:center;\n}}\n\n/* Match icon-to-label spacing on common add actions and toolbar buttons. */\n#addAccountButton,\n#quickAddExpense,\n.topbar-add-button,\n.button:has(> .toolbar-icon) {{ gap:4px !important; }}\n'''
css_path.write_text(css)

index_path = Path("index.html")
index = index_path.read_text()
index = index.replace('./app.css?v=14.0.23', './app.css?v=15.0.4-ui1')
index_path.write_text(index)

worker_path = Path("sw.js")
worker = worker_path.read_text()
worker = worker.replace('finance-v15-20260815-record-spending-r8', 'finance-v15-20260815-ui-align-r9')
worker = worker.replace('./app.css?v=14.0.23', './app.css?v=15.0.4-ui1')
worker_path.write_text(worker)

version_path = Path("version.json")
version = json.loads(version_path.read_text())
version["cacheVersion"] = "finance-v15-20260815-ui-align-r9"
version_path.write_text(json.dumps(version, indent=2) + "\n")

validator_path = Path("tests/validate-v15-0-4.mjs")
validator = validator_path.read_text()
validator = validator.replace('const index = read("index.html");', 'const index = read("index.html");\nconst appCss = read("app.css");')
validator = validator.replace('finance-v15-20260815-record-spending-r8', 'finance-v15-20260815-ui-align-r9')
needle = 'assert.match(worker,/const APP_VERSION = "15\\.0\\.4";/);'
insert = '''assert.match(index,/app\\.css\\?v=15\\.0\\.4-ui1/);\nassert.match(worker,/app\\.css\\?v=15\\.0\\.4-ui1/);\nassert.match(worker,/finance-v15-20260815-ui-align-r9/);\nassert.match(appCss,/V15\\.0\\.4 · icon alignment hotfix/);\nassert.match(appCss,/#buildBadge::before/);\nassert.match(appCss,/\\.button \\{ gap:4px; \\}/);\nassert.match(appCss,/topbar-actions > button:not\\(\\.cloud-sync-toolbar-button\\):not\\(\\.topbar-add-button\\)/);\n'''
if insert not in validator:
    validator = validator.replace(needle, insert + needle)
validator_path.write_text(validator)
