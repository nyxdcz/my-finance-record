"use strict";

/* Talaan local CSV import center.
   Files are parsed in memory and are never uploaded, cached, or persisted. */
(function importCenterBootstrap() {
  const VERSION = 1;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_ROWS = 20000;
  const MAX_BATCHES = 100;
  const FIELD_KEYS = ["date", "amount", "debit", "credit", "description", "reference", "type", "category", "payee"];
  const HEADER_ALIASES = Object.freeze({
    date:["date", "transaction date", "posting date", "posted date", "petsa"],
    amount:["amount", "transaction amount", "net amount", "halaga"],
    debit:["debit", "withdrawal", "money out", "charge"],
    credit:["credit", "deposit", "money in"],
    description:["description", "details", "memo", "narration", "merchant", "transaction description"],
    reference:["reference", "reference number", "ref", "transaction id", "id"],
    type:["type", "transaction type", "direction"],
    category:["category", "classification"],
    payee:["payee", "merchant", "beneficiary"]
  });
  const clone = value => {
    try { return structuredClone(value); } catch (error) {}
    return JSON.parse(JSON.stringify(value ?? null));
  };
  const compact = (value, limit = 240) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, limit);
  const canonical = value => compact(value, 500).toLocaleLowerCase("en-PH");
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
  const makeId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const nowIso = () => new Date().toISOString();
  const localMoney = value => new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(Number(value || 0));

  function detectDelimiter(text) {
    const candidates = [",", ";", "\t"];
    const sample = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).slice(0, 8).join("\n");
    const scores = new Map(candidates.map(delimiter => [delimiter, 0]));
    let quoted = false;
    for (let index = 0; index < sample.length; index += 1) {
      const character = sample[index];
      if (character === '"') {
        if (quoted && sample[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && scores.has(character)) scores.set(character, scores.get(character) + 1);
    }
    return [...scores].sort((left, right) => right[1] - left[1])[0]?.[1] ? [...scores].sort((left, right) => right[1] - left[1])[0][0] : ",";
  }

  function parseCsv(text, options = {}) {
    const source = String(text ?? "").replace(/^\uFEFF/, "");
    const delimiter = options.delimiter === "tab" ? "\t" : (options.delimiter || detectDelimiter(source));
    if (![",", ";", "\t"].includes(delimiter)) throw new Error("Choose a supported CSV delimiter.");
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
        else if (character === '"') quoted = false;
        else field += character;
        continue;
      }
      if (character === '"' && field === "") quoted = true;
      else if (character === delimiter) { row.push(field); field = ""; }
      else if (character === "\n") {
        row.push(field.replace(/\r$/, ""));
        if (row.some(value => String(value).trim())) rows.push(row);
        if (rows.length > MAX_ROWS + 1) throw new Error(`CSV files are limited to ${MAX_ROWS.toLocaleString()} data rows.`);
        row = []; field = "";
      } else field += character;
    }
    if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
    row.push(field.replace(/\r$/, ""));
    if (row.some(value => String(value).trim())) rows.push(row);
    if (rows.length > MAX_ROWS + 1) throw new Error(`CSV files are limited to ${MAX_ROWS.toLocaleString()} data rows.`);
    if (!rows.length) throw new Error("The CSV is empty.");
    const width = Math.max(...rows.map(item => item.length));
    const headers = rows[0].map((value, index) => compact(value, 100) || `Column ${index + 1}`);
    while (headers.length < width) headers.push(`Column ${headers.length + 1}`);
    const records = rows.slice(1).map(values => headers.map((header, index) => String(values[index] ?? "")));
    return { delimiter, headers, rows:records };
  }

  function normalizeHeader(value) {
    return canonical(value).replace(/[_-]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
  }

  function guessMapping(headers) {
    const normalized = headers.map(normalizeHeader);
    const mapping = {};
    FIELD_KEYS.forEach(field => {
      const aliases = HEADER_ALIASES[field] || [];
      const index = normalized.findIndex(header => aliases.includes(header));
      mapping[field] = index >= 0 ? String(index) : "";
    });
    if (!mapping.description && mapping.payee) mapping.description = mapping.payee;
    return mapping;
  }

  function parseDateValue(raw, format = "dmy") {
    const value = compact(raw, 40);
    if (!value) return { value:"", error:"Missing date" };
    const iso = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) return validDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const parts = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (!parts) return { value:"", error:"Unsupported date" };
    const first = Number(parts[1]), second = Number(parts[2]);
    let year = Number(parts[3]); if (year < 100) year += year >= 70 ? 1900 : 2000;
    let resolved = format;
    if (format === "auto") {
      if (first > 12 && second <= 12) resolved = "dmy";
      else if (second > 12 && first <= 12) resolved = "mdy";
      else return { value:"", error:"Ambiguous date; choose D/M/Y or M/D/Y" };
    }
    return resolved === "mdy" ? validDateParts(year, first, second) : validDateParts(year, second, first);
  }

  function validDateParts(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { value:"", error:"Invalid date" };
    return { value:`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, error:"" };
  }

  function parseAmountValue(raw, decimalSeparator = ".") {
    const original = compact(raw, 80);
    if (!original) return { value:0, error:"Missing amount" };
    let value = original.replace(/[₱$€£¥\s]/g, "").replace(/^PHP/i, "");
    const parentheses = /^\(.*\)$/.test(value);
    value = value.replace(/[()]/g, "");
    if (decimalSeparator === ",") value = value.replace(/\./g, "").replace(",", ".");
    else value = value.replace(/,/g, "");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(value)) return { value:0, error:"Invalid amount" };
    const number = Number(value) * (parentheses ? -1 : 1);
    if (!Number.isFinite(number) || Math.abs(number) < 0.005) return { value:0, error:"Amount must not be zero" };
    return { value:Math.round(number * 100) / 100, error:"" };
  }

  function hashText(value) {
    let primary = 2166136261, secondary = 0x9e3779b9;
    const text = String(value ?? "");
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      primary = Math.imul(primary ^ code, 16777619);
      secondary = Math.imul(secondary ^ code, 2246822519);
      secondary ^= secondary >>> 13;
    }
    return `${(primary >>> 0).toString(16).padStart(8, "0")}${(secondary >>> 0).toString(16).padStart(8, "0")}`;
  }

  function normalizeProfile(item) {
    if (!item || typeof item !== "object") return null;
    const name = compact(item.name, 80);
    if (!name) return null;
    const mapping = Object.fromEntries(FIELD_KEYS.map(field => [field, /^\d+$/.test(String(item.mapping?.[field] ?? "")) ? String(item.mapping[field]) : ""]));
    return {
      id:compact(item.id || makeId("import-profile"), 120), name, format:"csv", mapping,
      delimiter:[",", ";", "\t", "auto"].includes(item.delimiter) ? item.delimiter : "auto",
      dateFormat:["dmy", "mdy", "auto"].includes(item.dateFormat) ? item.dateFormat : "dmy",
      decimalSeparator:item.decimalSeparator === "," ? "," : ".",
      positiveMeans:item.positiveMeans === "expense" ? "expense" : "income",
      updatedAt:Number.isFinite(Date.parse(String(item.updatedAt || ""))) ? String(item.updatedAt) : nowIso()
    };
  }

  function normalizeBatch(item) {
    if (!item || typeof item !== "object" || !item.id) return null;
    return {
      id:compact(item.id, 120), format:"csv", importedAt:Number.isFinite(Date.parse(String(item.importedAt || ""))) ? String(item.importedAt) : nowIso(),
      account:compact(item.account, 100), profileId:compact(item.profileId, 120), rowCount:Math.max(0, Math.round(Number(item.rowCount || 0))),
      expenseIds:(Array.isArray(item.expenseIds) ? item.expenseIds : []).map(value => compact(value, 120)).filter(Boolean).slice(0, MAX_ROWS),
      incomeIds:(Array.isArray(item.incomeIds) ? item.incomeIds : []).map(value => compact(value, 120)).filter(Boolean).slice(0, MAX_ROWS),
      fingerprints:(Array.isArray(item.fingerprints) ? item.fingerprints : []).map(value => compact(value, 80)).filter(Boolean).slice(0, MAX_ROWS),
      rolledBackAt:Number.isFinite(Date.parse(String(item.rolledBackAt || ""))) ? String(item.rolledBackAt) : ""
    };
  }

  function normalizeImportCenter(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const profiles = (Array.isArray(source.profiles) ? source.profiles : []).map(normalizeProfile).filter(Boolean).slice(0, 50);
    const batches = (Array.isArray(source.batches) ? source.batches : []).map(normalizeBatch).filter(Boolean)
      .sort((left, right) => String(right.importedAt).localeCompare(String(left.importedAt))).slice(0, MAX_BATCHES);
    return { version:VERSION, profiles, batches };
  }

  function ensureShape(source) {
    const target = source && typeof source === "object" ? source : {};
    target.ledgerSettings = target.ledgerSettings && typeof target.ledgerSettings === "object" && !Array.isArray(target.ledgerSettings) ? target.ledgerSettings : {};
    target.ledgerSettings.importCenter = normalizeImportCenter(target.ledgerSettings.importCenter);
    return target;
  }

  function rowValue(row, mapping, field) {
    const mappedIndex = String(mapping?.[field] ?? "");
    if (!/^\d+$/.test(mappedIndex)) return "";
    const index = Number(mappedIndex);
    return Number.isInteger(index) && index >= 0 ? String(row[index] ?? "") : "";
  }

  function explicitType(value) {
    const type = canonical(value);
    if (/ignore|skip|excluded/.test(type)) return "ignore";
    if (/transfer|internal/.test(type)) return "transfer";
    if (/debit|expense|withdrawal|purchase|payment/.test(type)) return "expense";
    if (/credit|income|deposit|salary|refund/.test(type)) return "income";
    return "";
  }

  function existingFingerprintSet(sourceData) {
    return new Set([
      ...(sourceData?.expenses || []).map(item => item.importFingerprint),
      ...(sourceData?.incomeRecords || []).map(item => item.importFingerprint)
    ].filter(Boolean).map(String));
  }

  function analyzeRows(parsed, options = {}, sourceData = {}) {
    const mapping = options.mapping || guessMapping(parsed.headers || []);
    const account = compact(options.account, 100);
    const errors = [];
    const isMapped = field => /^\d+$/.test(String(mapping[field] ?? ""));
    if (!isMapped("date")) errors.push("Map the date column.");
    if (!isMapped("description") && !isMapped("payee")) errors.push("Map a description or payee column.");
    if (!isMapped("amount") && !isMapped("debit") && !isMapped("credit")) errors.push("Map an amount column or debit/credit columns.");
    if (!account || !Object.prototype.hasOwnProperty.call(sourceData.accounts || {}, account)) errors.push("Choose an existing destination account.");
    if (errors.length) return { rows:[], errors, totals:{income:0, expenses:0, net:0, ready:0, duplicates:0, invalid:0, ignored:0}, dateRange:{from:"",to:""} };

    const existing = existingFingerprintSet(sourceData);
    const seen = new Set();
    const analyzed = (parsed.rows || []).map((row, index) => {
      const rowNumber = index + 2;
      const description = compact(rowValue(row, mapping, "description") || rowValue(row, mapping, "payee"), 240);
      const reference = compact(rowValue(row, mapping, "reference"), 120);
      const category = compact(rowValue(row, mapping, "category"), 40);
      const payee = compact(rowValue(row, mapping, "payee"), 80);
      const date = parseDateValue(rowValue(row, mapping, "date"), options.dateFormat || "dmy");
      const typeOverride = explicitType(rowValue(row, mapping, "type"));
      let type = typeOverride, signedAmount = 0, amountError = "";
      const debitRaw = rowValue(row, mapping, "debit"), creditRaw = rowValue(row, mapping, "credit"), amountRaw = rowValue(row, mapping, "amount");
      if (debitRaw || creditRaw) {
        const debit = debitRaw ? parseAmountValue(debitRaw, options.decimalSeparator) : { value:0, error:"" };
        const credit = creditRaw ? parseAmountValue(creditRaw, options.decimalSeparator) : { value:0, error:"" };
        if (debit.error || credit.error) amountError = debit.error || credit.error;
        else if (debit.value && credit.value) amountError = "Both debit and credit contain values";
        else if (debit.value) { signedAmount = -Math.abs(debit.value); if (!type) type = "expense"; }
        else if (credit.value) { signedAmount = Math.abs(credit.value); if (!type) type = "income"; }
        else amountError = "Missing amount";
      } else {
        const amount = parseAmountValue(amountRaw, options.decimalSeparator);
        amountError = amount.error;
        signedAmount = amount.value;
        if (!type) type = signedAmount < 0 ? "expense" : (options.positiveMeans === "expense" ? "expense" : "income");
      }
      if (type === "ignore") return { rowNumber, status:"ignored", type, description, reference, date:date.value, amount:Math.abs(signedAmount), errors:[], selected:false };
      if (type === "transfer" && !signedAmount) amountError ||= "Transfer amount is missing";
      const rowErrors = [date.error, amountError, description ? "" : "Missing description", type ? "" : "Choose a transaction type"].filter(Boolean);
      const direction = type === "transfer" ? (signedAmount < 0 ? "expense" : "income") : type;
      const fingerprint = rowErrors.length ? "" : `csv-${hashText([account,date.value,Math.abs(signedAmount).toFixed(2),direction,canonical(description),canonical(reference)].join("\u001f"))}`;
      const duplicate = Boolean(fingerprint && (existing.has(fingerprint) || seen.has(fingerprint)));
      if (fingerprint) seen.add(fingerprint);
      const id = makeId(direction === "income" ? "income" : "expense");
      let record = null;
      if (!rowErrors.length) {
        const common = { id, name:description.slice(0, 80), amount:Math.abs(signedAmount), date:date.value, account, notes:description.slice(0, 240), payee:payee || description.slice(0, 80), importFingerprint:fingerprint, importSource:"csv", importReference:reference, importedAt:nowIso(), recurring:"No", seriesId:"", includeInTotals:type !== "transfer" };
        if (direction === "income") record = { ...common, category:type === "transfer" ? "Transfer from savings" : (category || "Other income"), categoryGroup:type === "transfer" ? "Internal transfer" : "Other income", postToLedger:false, ledgerTransactionId:"" };
        else record = { ...common, expenseType:"normal", category:type === "transfer" ? "Internal transfer" : (category || "Other"), expensePeriod:"other", budgetPeriod:"", dueDay:null, paid:true, paidDate:date.value, paidFromAccount:"", paidAmount:0, accountDeducted:false, paymentTransactionId:"", autoPaidAtMonthEnd:false, gymAutoPay:false, gymAutoPayAccount:"", gymAutoPaySuppressed:false };
      }
      if (record && globalThis.FinancePayeeRules?.previewRecord) {
        const rulePreview = globalThis.FinancePayeeRules.previewRecord(record, direction === "income" ? "incomeRecords" : "expenses");
        record = rulePreview.after;
        return { rowNumber, status:duplicate ? "duplicate" : "ready", type, direction, description, reference, date:date.value, amount:Math.abs(signedAmount), errors:rowErrors, fingerprint, duplicate, selected:!duplicate, record, rulePreview };
      }
      return { rowNumber, status:rowErrors.length ? "invalid" : (duplicate ? "duplicate" : "ready"), type, direction, description, reference, date:date.value, amount:Math.abs(signedAmount), errors:rowErrors, fingerprint, duplicate, selected:!rowErrors.length && !duplicate, record, rulePreview:null };
    });
    const readyRows = analyzed.filter(item => item.status === "ready");
    const totals = {
      income:readyRows.filter(item => item.direction === "income" && item.type !== "transfer").reduce((sum, item) => sum + item.amount, 0),
      expenses:readyRows.filter(item => item.direction === "expense" && item.type !== "transfer").reduce((sum, item) => sum + item.amount, 0),
      ready:readyRows.length,
      duplicates:analyzed.filter(item => item.status === "duplicate").length,
      invalid:analyzed.filter(item => item.status === "invalid").length,
      ignored:analyzed.filter(item => item.status === "ignored").length
    };
    totals.net = Math.round((totals.income - totals.expenses) * 100) / 100;
    const dates = readyRows.map(item => item.date).filter(Boolean).sort();
    return { rows:analyzed, errors:[], totals, dateRange:{ from:dates[0] || "", to:dates.at(-1) || "" } };
  }

  const api = { version:VERSION, maxFileSize:MAX_FILE_SIZE, maxRows:MAX_ROWS, detectDelimiter, parseCsv, guessMapping, parseDateValue, parseAmountValue, hashText, normalizeImportCenter, analyzeRows, ensureShape };
  globalThis.FinanceImportCenter = api;
  if (typeof document === "undefined") return;

  const baseNormalizeData = typeof normalizeData === "function" ? normalizeData : value => value;
  normalizeData = value => ensureShape(baseNormalizeData(value));
  data = ensureShape(data);
  let session = null;
  let preferredProfileId = "";

  function state() {
    data = ensureShape(data);
    return data.ledgerSettings.importCenter;
  }

  function canWrite() {
    return globalThis.FinanceProfileArchitecture?.canWrite?.() !== false && !document.body.classList.contains("finance-signed-out");
  }

  function toast(message, tone = "info") {
    if (typeof showToast === "function") showToast(message, tone);
  }

  async function confirmAction(options) {
    if (typeof openAppConfirmation === "function") return openAppConfirmation(options);
    return globalThis.confirm(`${options.title || "Confirm"}\n\n${options.message || ""}`);
  }

  async function saveRecovery(label) {
    if (globalThis.FinancePrivacyLock?.recoveryStorage?.save) return globalThis.FinancePrivacyLock.recoveryStorage.save(label, clone(data));
    if (typeof createRecoverySnapshot === "function") return createRecoverySnapshot(label, clone(data));
    throw new Error("Recovery storage is unavailable.");
  }

  function persist(label) {
    data = normalizeData(data);
    return typeof saveData === "function" ? saveData(label) : false;
  }

  function optionMarkup(headers, selected, emptyLabel = "Not mapped") {
    return `<option value="">${emptyLabel}</option>${headers.map((header, index) => `<option value="${index}" ${String(index) === String(selected) ? "selected" : ""}>${esc(header)}</option>`).join("")}`;
  }

  function ensureDialog() {
    if (document.getElementById("importCenterDialog")) return;
    document.body.insertAdjacentHTML("beforeend", `<dialog class="app-dialog import-center-dialog" id="importCenterDialog" aria-labelledby="importCenterDialogTitle"><div class="modal-header"><div><h3 id="importCenterDialogTitle">Import local CSV</h3><p id="importCenterFileSummary">Choose a CSV file</p></div><button class="button button-secondary button-small" type="button" data-close-import-center>Close</button></div><div class="modal-body import-center-body"><p class="info-box">Parsing happens only in this browser. The uploaded file is not stored, synchronized, or cached.</p><section id="importMappingSection"></section><section id="importPreviewSection"></section><p class="field-error" id="importCenterError" role="alert" hidden></p></div><div class="modal-footer"><button class="button button-secondary" type="button" data-close-import-center>Cancel</button><span class="footer-spacer"></span><button class="button button-primary" id="commitCsvImport" type="button" disabled>Import selected records</button></div></dialog>`);
  }

  function renderMapping() {
    if (!session) return;
    const mapping = session.options.mapping;
    const section = document.getElementById("importMappingSection");
    const field = (key, label, required = false) => `<label class="field"><span>${label}${required ? " *" : ""}</span><select class="select" data-import-map="${key}">${optionMarkup(session.parsed.headers, mapping[key])}</select></label>`;
    section.innerHTML = `<div class="import-step-heading"><div><strong>1. Map columns</strong><small>Choose how this file should become Talaan records.</small></div><span class="status-chip info">CSV</span></div><div class="import-mapping-grid">${field("date", "Date", true)}${field("amount", "Signed amount")}${field("debit", "Debit")}${field("credit", "Credit")}${field("description", "Description", true)}${field("reference", "Reference")}${field("type", "Type")}${field("category", "Category")}${field("payee", "Payee")}</div><div class="import-settings-grid"><label class="field"><span>Destination account</span><select class="select" id="importDestinationAccount">${Object.keys(data.accounts || {}).map(name => `<option value="${esc(name)}" ${name === session.options.account ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label><label class="field"><span>Date format</span><select class="select" id="importDateFormat"><option value="dmy" ${session.options.dateFormat === "dmy" ? "selected" : ""}>D/M/Y · Philippines</option><option value="mdy" ${session.options.dateFormat === "mdy" ? "selected" : ""}>M/D/Y</option><option value="auto" ${session.options.dateFormat === "auto" ? "selected" : ""}>Auto · flag ambiguity</option></select></label><label class="field"><span>Decimal separator</span><select class="select" id="importDecimalSeparator"><option value="." ${session.options.decimalSeparator === "." ? "selected" : ""}>Period · 1,234.56</option><option value="," ${session.options.decimalSeparator === "," ? "selected" : ""}>Comma · 1.234,56</option></select></label><label class="field"><span>Positive signed amounts</span><select class="select" id="importPositiveMeans"><option value="income" ${session.options.positiveMeans === "income" ? "selected" : ""}>Income</option><option value="expense" ${session.options.positiveMeans === "expense" ? "selected" : ""}>Expense</option></select></label></div><div class="import-profile-row"><label class="field"><span>Mapping profile name</span><input class="input" id="importProfileName" maxlength="80" placeholder="Example: BDO statement"></label><button class="button button-secondary" type="button" data-save-import-profile>Save profile</button><button class="button button-primary" type="button" data-preview-import>Preview records</button></div>`;
  }

  function formatRuleChange(change) {
    const describe = value => value === null || value === "" ? "None" : Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Included" : "Excluded") : String(value);
    return `${change.ruleName || "Rule"}: ${change.label || change.field} · ${describe(change.before)} → ${describe(change.after)}`;
  }

  function renderPreview() {
    const section = document.getElementById("importPreviewSection");
    if (!session?.analysis) { section.innerHTML = `<div class="system-empty">Map the columns, then preview every row before importing.</div>`; return; }
    const analysis = session.analysis;
    const summary = analysis.totals;
    const error = document.getElementById("importCenterError");
    if (analysis.errors.length) {
      error.textContent = analysis.errors.join(" "); error.hidden = false;
      section.innerHTML = ""; document.getElementById("commitCsvImport").disabled = true; return;
    }
    error.hidden = true;
    section.innerHTML = `<div class="import-step-heading"><div><strong>2. Review rows</strong><small>${esc(analysis.dateRange.from || "No valid date")} to ${esc(analysis.dateRange.to || "—")}</small></div><span class="status-chip ${summary.invalid ? "warning" : "success"}">${summary.ready} ready</span></div><div class="import-summary-grid"><div><span>Income</span><strong>${esc(localMoney(summary.income))}</strong></div><div><span>Expenses</span><strong>${esc(localMoney(summary.expenses))}</strong></div><div><span>Net</span><strong>${esc(localMoney(summary.net))}</strong></div><div><span>Duplicates</span><strong>${summary.duplicates}</strong></div><div><span>Invalid</span><strong>${summary.invalid}</strong></div><div><span>Ignored</span><strong>${summary.ignored}</strong></div></div><div class="import-preview-list">${analysis.rows.map((item, index) => `<article class="import-preview-row is-${item.status}" data-import-preview-row="${index}"><label class="import-row-select"><input type="checkbox" data-import-select="${index}" ${item.selected ? "checked" : ""} ${item.status !== "ready" ? "disabled" : ""}><span><strong>Row ${item.rowNumber} · ${esc(item.description || "No description")}</strong><small>${esc(item.date || "No date")} · ${esc(localMoney(item.amount))} · ${esc(item.type || "Unknown")}${item.rulePreview?.matches?.length ? ` · ${item.rulePreview.matches.length} reviewed rule suggestion${item.rulePreview.matches.length === 1 ? "" : "s"}` : ""}</small></span></label><span class="status-chip ${item.status === "ready" ? "success" : item.status === "duplicate" ? "info" : item.status === "ignored" ? "neutral" : "warning"}">${esc(item.status)}</span>${item.rulePreview?.changes?.length ? `<div class="import-rule-suggestions"><small>These rule suggestions will be included if this row stays selected.</small><ul>${item.rulePreview.changes.map(change => `<li>${esc(formatRuleChange(change))}</li>`).join("")}</ul></div>` : ""}${item.errors?.length ? `<ul>${item.errors.map(message => `<li>${esc(message)}</li>`).join("")}</ul>` : ""}</article>`).join("")}</div>`;
    updateSelection();
  }

  function updateSelection() {
    if (!session?.analysis) return;
    document.querySelectorAll("[data-import-select]").forEach(input => { session.analysis.rows[Number(input.dataset.importSelect)].selected = input.checked; });
    const selected = session.analysis.rows.filter(item => item.status === "ready" && item.selected).length;
    const button = document.getElementById("commitCsvImport");
    if (button) { button.disabled = !selected; button.textContent = selected ? `Import ${selected} selected record${selected === 1 ? "" : "s"}` : "Import selected records"; }
  }

  function collectOptions() {
    if (!session) return;
    document.querySelectorAll("[data-import-map]").forEach(select => { session.options.mapping[select.dataset.importMap] = select.value; });
    session.options.account = document.getElementById("importDestinationAccount")?.value || "";
    session.options.dateFormat = document.getElementById("importDateFormat")?.value || "dmy";
    session.options.decimalSeparator = document.getElementById("importDecimalSeparator")?.value || ".";
    session.options.positiveMeans = document.getElementById("importPositiveMeans")?.value || "income";
  }

  function previewCurrent() {
    collectOptions();
    session.analysis = analyzeRows(session.parsed, session.options, data);
    renderPreview();
  }

  function saveProfile() {
    collectOptions();
    const name = compact(document.getElementById("importProfileName")?.value, 80);
    if (!name) return toast("Enter a profile name", "warning");
    const profile = normalizeProfile({ id:makeId("import-profile"), name, mapping:session.options.mapping, delimiter:session.parsed.delimiter, dateFormat:session.options.dateFormat, decimalSeparator:session.options.decimalSeparator, positiveMeans:session.options.positiveMeans, updatedAt:nowIso() });
    const current = state(); current.profiles = [...current.profiles.filter(item => canonical(item.name) !== canonical(name)), profile];
    if (!persist("Import profile saved")) return toast("The import profile could not be saved", "warning");
    session.profileId = profile.id; renderCard(); toast("Import profile saved", "success");
  }

  async function readFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return toast("CSV files are limited to 10 MB", "warning");
    if (!/\.csv$/i.test(file.name) && !/^(text\/csv|text\/plain|application\/vnd\.ms-excel)$/i.test(file.type || "")) return toast("Choose a CSV file", "warning");
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const preferredProfile = state().profiles.find(item => item.id === preferredProfileId) || null;
      const mapping = preferredProfile ? clone(preferredProfile.mapping) : guessMapping(parsed.headers);
      session = { fileName:compact(file.name, 140), fileSize:file.size, parsed, profileId:preferredProfile?.id || "", options:{ mapping, account:Object.keys(data.accounts || {})[0] || "", dateFormat:preferredProfile?.dateFormat || "dmy", decimalSeparator:preferredProfile?.decimalSeparator || ".", positiveMeans:preferredProfile?.positiveMeans || "income" }, analysis:null };
      preferredProfileId = "";
      ensureDialog(); document.getElementById("importCenterFileSummary").textContent = `${session.fileName} · ${parsed.rows.length.toLocaleString()} data rows · parsed locally`;
      renderMapping(); renderPreview();
      if (typeof showAppDialog === "function") showAppDialog("importCenterDialog", "[data-import-map='date']");
      else document.getElementById("importCenterDialog").showModal();
    } catch (error) { toast(error?.message || "The CSV could not be parsed", "warning"); }
  }

  function buildBatch(rows) {
    const batchId = makeId("import-batch");
    const expenseIds = [], incomeIds = [], fingerprints = [];
    const records = rows.map(item => {
      const record = { ...clone(item.record), importBatchId:batchId };
      fingerprints.push(record.importFingerprint);
      if (item.direction === "income") incomeIds.push(record.id); else expenseIds.push(record.id);
      return { direction:item.direction, record };
    });
    return { batchId, records, batch:normalizeBatch({ id:batchId, importedAt:nowIso(), account:session.options.account, profileId:session.profileId, rowCount:records.length, expenseIds, incomeIds, fingerprints, rolledBackAt:"" }) };
  }

  async function commitImport() {
    if (!canWrite() || !session?.analysis) return;
    updateSelection();
    const selectedFingerprints = new Set(session.analysis.rows.filter(item => item.status === "ready" && item.selected).map(item => item.fingerprint));
    const refreshed = analyzeRows(session.parsed, session.options, data);
    refreshed.rows.forEach(item => { item.selected = item.status === "ready" && selectedFingerprints.has(item.fingerprint); });
    session.analysis = refreshed;
    renderPreview();
    const selected = refreshed.rows.filter(item => item.status === "ready" && item.selected && item.record);
    if (!selected.length) return toast("Select at least one ready row", "warning");
    if (selected.length !== selectedFingerprints.size) toast("The preview changed after current records were rechecked", "warning");
    const confirmed = await confirmAction({ title:"Import reviewed CSV records?", message:`Add ${selected.length} reviewed record${selected.length === 1 ? "" : "s"} without changing account balances?`, details:"A recovery snapshot and Undo point will be created. Duplicate and invalid rows remain excluded.", confirmLabel:"Import records" });
    if (!confirmed) return;
    const before = clone(data);
    const button = document.getElementById("commitCsvImport");
    button.disabled = true; button.textContent = "Creating recovery copy…";
    try {
      await saveRecovery("Before local CSV import");
      if (typeof pushUndo === "function") pushUndo("Import local CSV");
      const built = buildBatch(selected);
      built.records.forEach(item => {
        if (item.direction === "income") data.incomeRecords.push(item.record);
        else data.expenses.push(item.record);
      });
      const current = state(); current.batches = [built.batch, ...current.batches].slice(0, MAX_BATCHES);
      if (persist(`Imported ${selected.length} CSV record${selected.length === 1 ? "" : "s"}`) !== true) throw new Error("The imported records could not be saved.");
      if (typeof addSyncHistory === "function") addSyncHistory("Import · local CSV", "success", { batchId:built.batchId, records:selected.length, account:session.options.account });
      document.getElementById("importCenterDialog")?.close(); session = null; renderCard(); toast("CSV records imported without changing account balances", "success");
    } catch (error) {
      data = normalizeData(before);
      try { if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("CSV import rolled back"); } catch (persistError) {}
      toast(`Import failed: ${error?.message || "unknown error"}`, "warning");
      button.disabled = false; button.textContent = "Import selected records";
    }
  }

  async function rollbackBatch(id) {
    if (!canWrite()) return;
    const batch = state().batches.find(item => item.id === id);
    if (!batch || batch.rolledBackAt) return;
    const confirmed = await confirmAction({ title:"Roll back this CSV import?", message:`Remove the ${batch.rowCount} record${batch.rowCount === 1 ? "" : "s"} created by this import?`, details:"A recovery snapshot and Undo point will be created first. Account balances remain unchanged.", confirmLabel:"Roll back import", danger:true });
    if (!confirmed) return;
    const before = clone(data);
    try {
      await saveRecovery("Before CSV import rollback");
      if (typeof pushUndo === "function") pushUndo("Roll back CSV import");
      data.expenses = (data.expenses || []).filter(item => item.importBatchId !== id);
      data.incomeRecords = (data.incomeRecords || []).filter(item => item.importBatchId !== id);
      const current = state(); const currentBatch = current.batches.find(item => item.id === id); if (currentBatch) currentBatch.rolledBackAt = nowIso();
      if (persist("CSV import rolled back") !== true) throw new Error("The rollback could not be saved.");
      if (typeof addSyncHistory === "function") addSyncHistory("Import · rollback", "success", { batchId:id, records:batch.rowCount });
      renderCard(); toast("CSV import rolled back", "success");
    } catch (error) {
      data = normalizeData(before);
      try { if (typeof persistFinanceDataRaw === "function") persistFinanceDataRaw("CSV rollback restored"); } catch (persistError) {}
      toast(`Rollback failed: ${error?.message || "unknown error"}`, "warning");
    }
  }

  function renderCard() {
    const panel = document.getElementById("settings-panel-finance-tools");
    if (!panel) return;
    let card = panel.querySelector("#financeImportCenter");
    if (!card) {
      card = document.createElement("article"); card.className = "card import-center-card"; card.id = "financeImportCenter"; panel.appendChild(card);
    }
    const current = state();
    card.innerHTML = `<div class="card-header finance-tool-card-header"><div><h3>Import center</h3><p>Map, preview, deduplicate, and recover local CSV imports</p></div><label class="button button-primary import-file-button">Choose CSV<input type="file" accept=".csv,text/csv,text/plain" data-import-csv hidden></label></div><p class="system-help">Files stay in this browser session. Imports create records only and never change account balances.</p>${current.profiles.length ? `<div class="import-saved-profiles"><strong>Saved profiles</strong><div>${current.profiles.map(profile => `<button class="status-chip" type="button" data-use-import-profile="${esc(profile.id)}">${esc(profile.name)}</button>`).join("")}</div></div>` : ""}<div class="import-batch-list"><strong>Recent imports</strong>${current.batches.length ? current.batches.slice(0, 8).map(batch => `<div class="import-batch-row"><span><strong>${batch.rowCount} CSV record${batch.rowCount === 1 ? "" : "s"}</strong><small>${esc(batch.importedAt.slice(0, 10))} · ${esc(batch.account || "No account")}${batch.rolledBackAt ? " · Rolled back" : ""}</small></span>${batch.rolledBackAt ? `<span class="status-chip neutral">Rolled back</span>` : `<button class="button button-secondary button-small" type="button" data-rollback-import="${esc(batch.id)}">Rollback</button>`}</div>`).join("") : `<div class="system-empty">No CSV imports yet.</div>`}</div>`;
    const fileInput = card.querySelector("[data-import-csv]");
    fileInput?.addEventListener("change", () => {
      const selectedFile = fileInput.files?.[0];
      void readFile(selectedFile).finally(() => { fileInput.value = ""; });
    });
    card.querySelectorAll("[data-rollback-import]").forEach(button => {
      button.addEventListener("click", () => { void rollbackBatch(button.dataset.rollbackImport); });
    });
    card.querySelectorAll("[data-use-import-profile]").forEach(button => {
      button.addEventListener("click", () => {
        preferredProfileId = button.dataset.useImportProfile;
        fileInput?.click();
      });
    });
  }

  function mount() { ensureDialog(); renderCard(); }
  function open() {
    if (typeof goToPage === "function") goToPage("settings", { smooth:false });
    if (typeof activateSettingsPanel === "function") activateSettingsPanel("finance-tools", true, true);
    setTimeout(() => { mount(); document.getElementById("financeImportCenter")?.scrollIntoView({ block:"start" }); document.querySelector("[data-import-csv]")?.focus(); }, 0);
  }

  document.addEventListener("change", event => {
    if (event.target.matches?.("[data-import-select]")) updateSelection();
  });
  document.addEventListener("click", event => {
    const close = event.target.closest?.("[data-close-import-center]"); if (close) { document.getElementById("importCenterDialog")?.close(); session = null; return; }
    if (event.target.closest?.("[data-preview-import]")) return previewCurrent();
    if (event.target.closest?.("[data-save-import-profile]")) return saveProfile();
    if (event.target.closest?.("#commitCsvImport")) { void commitImport(); return; }
  });

  const observer = new MutationObserver(() => {
    const panel = document.getElementById("settings-panel-finance-tools");
    if (panel && !panel.querySelector("#financeImportCenter")) queueMicrotask(renderCard);
  });
  const start = () => { data = ensureShape(data); mount(); const panel = document.getElementById("settings-panel-finance-tools"); if (panel) observer.observe(panel, { childList:true }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true }); else start();

  Object.assign(api, { open, mount, rollback:rollbackBatch, ensureShape });
  Object.defineProperty(api, "data", { enumerable:true, get:() => clone(state()) });
})();
