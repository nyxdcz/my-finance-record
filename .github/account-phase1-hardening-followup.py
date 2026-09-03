from pathlib import Path
import re

# Cloud readiness derives the same runtime revision as prepare-runtime.
path = Path("tests/regression/validate-cloud-readiness.mjs")
text = path.read_text()
if 'node:crypto' not in text:
    text = text.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport crypto from "node:crypto";', 1)
text = re.sub(r'const accountIntegrityQuery = "[^"]+";', '''const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of accountIntegritySources) { accountIntegrityHash.update(`${file}\\0`); accountIntegrityHash.update(fs.readFileSync(file)); }
const accountIntegrityQuery = `2.5.0-account-${accountIntegrityHash.digest("hex").slice(0, 12)}`;''', text, count=1)
path.write_text(text)

# Multi-device sync also validates the generated content-derived cloud-sync URL.
path = Path("tests/sync/validate-safe-multidevice-sync.mjs")
text = path.read_text()
if 'node:crypto' not in text:
    text = text.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport crypto from "node:crypto";', 1)
marker = 'const version = JSON.parse(read("version.json"));\n'
hash_block = '''const accountIntegritySources = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const accountIntegrityHash = crypto.createHash("sha256");
for (const file of accountIntegritySources) { accountIntegrityHash.update(`${file}\\0`); accountIntegrityHash.update(fs.readFileSync(path.join(root, file))); }
const accountIntegrityQuery = `2.5.0-account-${accountIntegrityHash.digest("hex").slice(0, 12)}`;
'''
if 'const accountIntegritySources' not in text:
    if marker not in text:
        raise SystemExit("sync validator version marker not found")
    text = text.replace(marker, marker + hash_block, 1)
text = text.replace('assert(worker.includes(\'asset("./cloud-sync.js?v=2.5.0-account-integrity2")\'), "PWA shell does not precache the account-integrity cloud sync client");', 'assert(worker.includes(`asset("./cloud-sync.js?v=${accountIntegrityQuery}")`), "PWA shell does not precache the content-derived account-integrity cloud sync client");')
path.write_text(text)

print("Aligned remaining account integrity tests with content-derived runtime revision.")
