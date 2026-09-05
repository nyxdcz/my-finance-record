import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const index = read("index.html");
const styles = read("assets/css/app.css");

assert.match(index, /id="sampleDataNotice"[^>]*role="status"/);
assert.match(index, /<span class="status-chip warning">Sample data<\/span>/);
assert.match(index, /id="startEmptyWorkspaceButton"[^>]*>Start with empty workspace<\/button>/);
assert.match(index, /const SAMPLE_DATA_STATE_KEY = `\$\{STORAGE_KEY\}-sample-state`/);
assert.match(index, /setSampleDataState\("sample", "first-run"\)/);
assert.match(index, /function createEmptyWorkspaceData\(\)/);
assert.match(index, /accounts:\{ Cash:0 \}/);
assert.match(index, /expenses:\[\], expenseRecurrenceSkips:\[\], projects:\[\]/);
assert.match(index, /createRecoverySnapshot\("Before starting empty workspace", before\)/);
assert.match(index, /setSampleDataState\("empty", "user-started"\)/);
assert.match(index, /setSampleDataState\("sample", "manual-reset"\)/);
assert.match(index, /setSampleDataState\("local", "backup-import"\)/);
assert.match(index, /setSampleDataState\("local", "sync-import"\)/);
assert.match(styles, /\.sample-data-notice\[hidden\]\s*\{\s*display:\s*none;/);
assert.match(styles, /body\.finance-signed-out \.sample-data-notice,[\s\S]*?body\.finance-auth-pending \.sample-data-notice \{ display: none !important; \}/);
assert.match(styles, /\.sample-data-notice\s*\{[\s\S]*?border-radius:\s*var\(--radius\)/);
assert.match(styles, /\.sample-data-notice \.button \{ width: 100%; \}/);

console.log("Sample records are disclosed in context and can be replaced with a recoverable empty workspace.");
