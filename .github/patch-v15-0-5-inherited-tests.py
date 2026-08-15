#!/usr/bin/env python3
from pathlib import Path

root = Path('.')

p = root / 'tests/validate-record-spending-v15-0-4.mjs'
s = p.read_text()
s = s.replace('assert.equal(pkg.version, "15.0.4");', 'assert.equal(pkg.version, "15.0.5");')
p.write_text(s)

p = root / 'tests/validate-safe-multidevice-sync.mjs'
s = p.read_text()
s = s.replace('asset("./cloud-sync.js?v=15.0.4")', 'asset("./cloud-sync.js?v=15.0.5")')
p.write_text(s)

print('Inherited V15 behavior regressions aligned to V15.0.5 release metadata')
