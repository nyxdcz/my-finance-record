from pathlib import Path
import json

UI_CSS = '''/* My Finance Records · V15.0.4 · icon alignment hotfix */
/* Keep the build badge text-only and compact. */
#buildBadge { background-image:none !important; }
#buildBadge::before,
#buildBadge::after { content:none !important; display:none !important; }

/* Keep icon + label controls compact without changing their hit areas. */
.button { gap:4px !important; }

/* Center any standalone top-bar utility button added beside Cloud Sync. */
.topbar-actions > button:not(.cloud-sync-toolbar-button):not(.topbar-add-button) {
  display:inline-grid !important;
  place-items:center !important;
  padding-inline:0 !important;
  text-align:center;
}
.topbar-actions > button:not(.cloud-sync-toolbar-button):not(.topbar-add-button) > :is(svg,img,.toolbar-icon) {
  margin:0 !important;
  justify-self:center;
  align-self:center;
}

/* Match icon-to-label spacing on common add actions and toolbar buttons. */
#addAccountButton,
#quickAddExpense,
.topbar-add-button,
.button:has(> .toolbar-icon) { gap:4px !important; }
'''

Path("ui-icon-alignment-v15-0-4.css").write_text(UI_CSS)

index_path = Path("index.html")
index = index_path.read_text()
link = '  <link rel="stylesheet" href="./ui-icon-alignment-v15-0-4.css?v=15.0.4-ui1">'
anchor = '  <link rel="stylesheet" href="./app.css?v=14.0.23">'
if link not in index:
    index = index.replace(anchor, anchor + "\n" + link)
index_path.write_text(index)

worker_path = Path("sw.js")
worker = worker_path.read_text()
worker = worker.replace('finance-v15-20260815-record-spending-r8', 'finance-v15-20260815-ui-align-r9')
asset_line = '  asset("./ui-icon-alignment-v15-0-4.css?v=15.0.4-ui1"),'
anchor_asset = '  asset("./app.css?v=14.0.23"),'
if asset_line not in worker:
    worker = worker.replace(anchor_asset, anchor_asset + "\n" + asset_line)
worker_path.write_text(worker)

version_path = Path("version.json")
version = json.loads(version_path.read_text())
version["cacheVersion"] = "finance-v15-20260815-ui-align-r9"
version_path.write_text(json.dumps(version, indent=2) + "\n")

validator_path = Path("tests/validate-v15-0-4.mjs")
validator = validator_path.read_text()
validator = validator.replace('const index = read("index.html");', 'const index = read("index.html");\nconst uiCss = read("ui-icon-alignment-v15-0-4.css");')
validator = validator.replace('finance-v15-20260815-record-spending-r8', 'finance-v15-20260815-ui-align-r9')
needle = 'assert.match(worker,/const APP_VERSION = "15\\.0\\.4";/);'
insert = '''assert.match(index,/ui-icon-alignment-v15-0-4\\.css\\?v=15\\.0\\.4-ui1/);\nassert.match(worker,/ui-icon-alignment-v15-0-4\\.css\\?v=15\\.0\\.4-ui1/);\nassert.match(worker,/finance-v15-20260815-ui-align-r9/);\nassert.match(uiCss,/V15\\.0\\.4 · icon alignment hotfix/);\nassert.match(uiCss,/#buildBadge::before/);\nassert.match(uiCss,/\\.button \\{ gap:4px !important; \\}/);\nassert.match(uiCss,/topbar-actions > button:not\\(\\.cloud-sync-toolbar-button\\):not\\(\\.topbar-add-button\\)/);\n'''
if insert not in validator:
    validator = validator.replace(needle, insert + needle)
validator_path.write_text(validator)
