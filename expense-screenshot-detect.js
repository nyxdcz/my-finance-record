"use strict";

(function expenseScreenshotDetectBootstrap() {
  const TESSERACT_VERSION = "7.0.0";
  const TESSERACT_SCRIPT = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
  const TESSERACT_WORKER = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
  const TESSERACT_CORE = `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}`;
  const TESSERACT_LANG = "https://tessdata.projectnaptha.com/4.0.0_fast";
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const FIELD_META = {
    name:{ label:"Name", inputId:"expenseName" },
    amount:{ label:"Amount", inputId:"expenseAmount" },
    account:{ label:"Account used", inputId:"expenseAccount" }
  };

  let panel = null;
  let currentResult = null;
  let currentWorker = null;
  let scanToken = 0;
  let accountTouched = false;
  let tesseractPromise = null;

  function parser() {
    return window.FinanceExpenseScreenshotParser || null;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  }

  function insertStyles() {
    if (document.getElementById("expenseScreenshotDetectStyles")) return;
    const style = document.createElement("style");
    style.id = "expenseScreenshotDetectStyles";
    style.textContent = `
      .expense-screenshot-panel{margin:10px 0 12px;padding:11px;border:1px solid var(--line);border-radius:12px;background:var(--surface-soft);display:grid;gap:9px}.expense-screenshot-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.expense-screenshot-head strong,.expense-screenshot-head small{display:block}.expense-screenshot-head small{margin-top:2px;color:var(--muted);font-size:.64rem;line-height:1.4}.expense-screenshot-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.expense-screenshot-status{display:grid;gap:6px}.expense-screenshot-status[hidden],.expense-screenshot-review[hidden]{display:none}.expense-screenshot-status progress{width:100%;height:7px}.expense-screenshot-status span{font-size:.63rem;color:var(--muted)}.expense-screenshot-status[data-tone="danger"] span{color:var(--red)}.expense-screenshot-status[data-tone="success"] span{color:var(--green)}.expense-screenshot-review{display:grid;gap:7px;padding-top:2px}.expense-screenshot-review-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.expense-screenshot-review-head strong{font-size:.7rem}.expense-screenshot-review-head small{color:var(--muted);font-size:.59rem}.expense-screenshot-result-list{display:grid;gap:6px}.expense-screenshot-result{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:8px 9px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}.expense-screenshot-result input{width:18px;height:18px}.expense-screenshot-result-copy{min-width:0}.expense-screenshot-result-copy span,.expense-screenshot-result-copy strong,.expense-screenshot-result-copy small{display:block}.expense-screenshot-result-copy span{font-size:.57rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.expense-screenshot-result-copy strong{margin-top:2px;font-size:.68rem;overflow-wrap:anywhere}.expense-screenshot-result-copy small{margin-top:2px;color:var(--muted);font-size:.56rem;line-height:1.35}.expense-screenshot-confidence{font-size:.54rem;padding:3px 6px;border:1px solid var(--line);border-radius:999px;text-transform:capitalize;white-space:nowrap}.expense-screenshot-review-actions{display:flex;gap:7px;flex-wrap:wrap}.expense-screenshot-review-actions .button{min-height:36px}.expense-screenshot-privacy{margin:0;color:var(--muted);font-size:.57rem;line-height:1.4}@media(max-width:700px){.expense-screenshot-panel{padding:10px}.expense-screenshot-head{align-items:flex-start;flex-direction:column}.expense-screenshot-actions{width:100%;justify-content:stretch}.expense-screenshot-actions .button{flex:1;min-height:42px}.expense-screenshot-result{grid-template-columns:auto minmax(0,1fr)}.expense-screenshot-confidence{grid-column:2;justify-self:start}.expense-screenshot-review-actions .button{flex:1;min-height:42px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    if (panel?.isConnected) return panel;
    const dialog = document.getElementById("expenseDialog");
    const note = document.getElementById("expenseFormModeNote");
    if (!dialog || !note) return null;
    insertStyles();
    panel = document.createElement("section");
    panel.className = "expense-screenshot-panel";
    panel.id = "expenseScreenshotPanel";
    panel.setAttribute("aria-labelledby", "expenseScreenshotTitle");
    panel.innerHTML = `
      <div class="expense-screenshot-head">
        <div><strong id="expenseScreenshotTitle">Screenshot Upload + Detect</strong><small>Detect the payment name, amount, and account used from a screenshot.</small></div>
        <div class="expense-screenshot-actions"><button class="button button-secondary button-small" id="expenseScreenshotChoose" type="button" aria-controls="expenseScreenshotReview">Upload screenshot</button><input id="expenseScreenshotFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></div>
      </div>
      <div class="expense-screenshot-status" id="expenseScreenshotStatus" data-tone="info" hidden><progress id="expenseScreenshotProgress" max="100" value="0" aria-label="Screenshot text detection progress"></progress><span id="expenseScreenshotStatusText" role="status" aria-live="polite"></span></div>
      <div class="expense-screenshot-review" id="expenseScreenshotReview" hidden>
        <div class="expense-screenshot-review-head"><strong>Review detected details</strong><small id="expenseScreenshotFileName"></small></div>
        <div class="expense-screenshot-result-list" id="expenseScreenshotResultList"></div>
        <div class="expense-screenshot-review-actions"><button class="button button-primary button-small" id="expenseScreenshotApply" type="button">Apply selected details</button><button class="button button-secondary button-small" id="expenseScreenshotClear" type="button">Clear scan</button></div>
      </div>
      <p class="expense-screenshot-privacy">The image is processed in your browser and is not saved in finance records or Cloud Sync. The first scan needs internet access to download the OCR engine files.</p>`;
    note.insertAdjacentElement("afterend", panel);
    bindPanelEvents(dialog);
    return panel;
  }

  function setStatus(message, { tone = "info", progress = null, hidden = false } = {}) {
    const status = document.getElementById("expenseScreenshotStatus");
    const text = document.getElementById("expenseScreenshotStatusText");
    const bar = document.getElementById("expenseScreenshotProgress");
    if (!status || !text || !bar) return;
    status.hidden = hidden;
    status.dataset.tone = tone;
    text.textContent = String(message || "");
    if (progress === null || !Number.isFinite(Number(progress))) bar.removeAttribute("value");
    else bar.value = Math.max(0, Math.min(100, Number(progress)));
  }

  function setBusy(busy) {
    const button = document.getElementById("expenseScreenshotChoose");
    const input = document.getElementById("expenseScreenshotFile");
    if (button) {
      button.disabled = Boolean(busy);
      button.setAttribute("aria-busy", busy ? "true" : "false");
      button.textContent = busy ? "Reading screenshot…" : "Upload screenshot";
    }
    if (input) input.disabled = Boolean(busy);
  }

  function accountNames() {
    const select = document.getElementById("expenseAccount");
    return select ? [...select.options].map(option => option.value).filter(Boolean) : [];
  }

  function currentFormState() {
    return {
      name:document.getElementById("expenseName")?.value || "",
      amount:document.getElementById("expenseAmount")?.value || "",
      account:document.getElementById("expenseAccount")?.value || ""
    };
  }

  function isEditingExpense() {
    return Boolean(String(document.getElementById("expenseId")?.value || "").trim());
  }

  function normalExpenseAmountAvailable() {
    return (document.getElementById("expenseType")?.value || "normal") === "normal";
  }

  function fieldDisplay(field, result) {
    if (field === "amount") return Number.isFinite(Number(result.amount)) ? new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(Number(result.amount)) : "Not detected";
    if (field === "account") return result.account || (result.accountHint ? `${result.accountHint} · no matching saved account` : "Not detected");
    return result.name || "Not detected";
  }

  function fieldAvailable(field, result) {
    if (field === "amount") return Number.isFinite(Number(result.amount)) && Number(result.amount) > 0 && normalExpenseAmountAvailable();
    if (field === "account") return Boolean(result.account);
    return Boolean(result.name);
  }

  function fieldHelp(field, available, checked, result) {
    if (field === "amount" && Number.isFinite(Number(result.amount)) && !normalExpenseAmountAvailable()) return "Detected total is shown for review. Switch to Normal expense to apply it safely.";
    if (field === "account" && !result.account && result.accountHint) return `Detected ${result.accountHint}, but no saved account matched it.`;
    if (!available) return "No confident value was found.";
    if (!checked) return "Existing form value will be kept unless you select this row.";
    return "Selected to fill the expense form.";
  }

  function renderResult(result, fileName = "") {
    ensurePanel();
    currentResult = {
      name:String(result?.name || "").trim(),
      amount:Number.isFinite(Number(result?.amount)) ? Number(result.amount) : null,
      account:String(result?.account || "").trim(),
      accountHint:String(result?.accountHint || "").trim(),
      confidence:{
        name:result?.confidence?.name || "low",
        amount:result?.confidence?.amount || "low",
        account:result?.confidence?.account || "low"
      }
    };
    const review = document.getElementById("expenseScreenshotReview");
    const list = document.getElementById("expenseScreenshotResultList");
    const file = document.getElementById("expenseScreenshotFileName");
    const parse = parser();
    const plan = parse?.applicationPlan?.(currentFormState(), currentResult, { editing:isEditingExpense(), accountTouched }) || { name:false, amount:false, account:false };
    if (file) file.textContent = fileName ? String(fileName).slice(0, 70) : "Detected from screenshot";
    if (list) {
      list.innerHTML = Object.keys(FIELD_META).map(field => {
        const available = fieldAvailable(field, currentResult);
        const checked = available && Boolean(plan[field]);
        const confidence = currentResult.confidence[field] || "low";
        return `<label class="expense-screenshot-result"><input type="checkbox" data-expense-screenshot-field="${field}" ${checked ? "checked" : ""} ${available ? "" : "disabled"}><span class="expense-screenshot-result-copy"><span>${FIELD_META[field].label}</span><strong>${esc(fieldDisplay(field, currentResult))}</strong><small>${esc(fieldHelp(field, available, checked, currentResult))}</small></span><span class="expense-screenshot-confidence">${esc(confidence)}</span></label>`;
      }).join("");
    }
    if (review) review.hidden = false;
    return currentResult;
  }

  function clearReview({ keepStatus = false } = {}) {
    currentResult = null;
    const review = document.getElementById("expenseScreenshotReview");
    const list = document.getElementById("expenseScreenshotResultList");
    const fileName = document.getElementById("expenseScreenshotFileName");
    const input = document.getElementById("expenseScreenshotFile");
    if (review) review.hidden = true;
    if (list) list.innerHTML = "";
    if (fileName) fileName.textContent = "";
    if (input) input.value = "";
    if (!keepStatus) setStatus("", { hidden:true, progress:0 });
  }

  function dispatchValueEvents(input) {
    if (!input) return;
    input.dispatchEvent(new Event("input", { bubbles:true }));
    input.dispatchEvent(new Event("change", { bubbles:true }));
  }

  function applySelectedDetails() {
    if (!currentResult) return false;
    const selected = new Set([...document.querySelectorAll("[data-expense-screenshot-field]:checked")].map(input => input.dataset.expenseScreenshotField));
    if (!selected.size) {
      setStatus("Select at least one detected detail to apply.", { tone:"info", progress:100 });
      return false;
    }
    let applied = 0;
    if (selected.has("name") && currentResult.name) {
      const input = document.getElementById("expenseName");
      if (input) { input.value = currentResult.name; dispatchValueEvents(input); applied += 1; }
    }
    if (selected.has("amount") && Number.isFinite(currentResult.amount) && normalExpenseAmountAvailable()) {
      const input = document.getElementById("expenseAmount");
      if (input) { input.value = currentResult.amount.toFixed(2); dispatchValueEvents(input); applied += 1; }
    }
    if (selected.has("account") && currentResult.account) {
      const input = document.getElementById("expenseAccount");
      if (input && [...input.options].some(option => option.value === currentResult.account)) {
        input.value = currentResult.account;
        dispatchValueEvents(input);
        applied += 1;
      }
    }
    try { if (typeof updateExpenseFormDirty === "function") updateExpenseFormDirty(); } catch (error) {}
    if (!applied) {
      setStatus("The selected details could not be applied to this expense type.", { tone:"danger", progress:100 });
      return false;
    }
    setStatus(`${applied} detected detail${applied === 1 ? "" : "s"} applied. Review the form before saving.`, { tone:"success", progress:100 });
    try { if (typeof showToast === "function") showToast("Detected screenshot details applied", "success"); } catch (error) {}
    return true;
  }

  function validateFile(file) {
    if (!file) return "Choose a screenshot first.";
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) return "Use a PNG, JPEG, or WebP screenshot.";
    if (!file.size) return "The selected screenshot is empty.";
    if (file.size > MAX_FILE_BYTES) return "Choose a screenshot smaller than 15 MB.";
    return "";
  }

  function loadTesseract() {
    if (window.Tesseract?.createWorker) return Promise.resolve(window.Tesseract);
    if (tesseractPromise) return tesseractPromise;
    tesseractPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("financeTesseractScript");
      if (existing) {
        existing.addEventListener("load", () => window.Tesseract?.createWorker ? resolve(window.Tesseract) : reject(new Error("OCR engine did not initialize.")), { once:true });
        existing.addEventListener("error", () => reject(new Error("Could not download the OCR engine.")), { once:true });
        return;
      }
      const script = document.createElement("script");
      script.id = "financeTesseractScript";
      script.src = TESSERACT_SCRIPT;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      script.onload = () => window.Tesseract?.createWorker ? resolve(window.Tesseract) : reject(new Error("OCR engine did not initialize."));
      script.onerror = () => reject(new Error("Could not download the OCR engine. Check your internet connection and try again."));
      document.head.appendChild(script);
    });
    return tesseractPromise.catch(error => { tesseractPromise = null; throw error; });
  }

  function updateOcrProgress(message, token) {
    if (token !== scanToken || !message) return;
    const rawProgress = Number(message.progress);
    const status = String(message.status || "").replace(/_/g, " ");
    let progress = 20;
    if (Number.isFinite(rawProgress)) {
      if (/recogniz/i.test(status)) progress = 28 + (rawProgress * 68);
      else progress = 8 + (rawProgress * 20);
    }
    const label = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}…` : "Reading screenshot…";
    setStatus(label, { progress });
  }

  async function terminateWorker() {
    const worker = currentWorker;
    currentWorker = null;
    if (!worker?.terminate) return;
    try { await worker.terminate(); } catch (error) {}
  }

  async function scanFile(file) {
    ensurePanel();
    const validation = validateFile(file);
    if (validation) {
      clearReview({ keepStatus:true });
      setStatus(validation, { tone:"danger", progress:0 });
      return null;
    }
    const parse = parser();
    if (!parse?.parsePaymentScreenshot) {
      setStatus("Screenshot parser is unavailable. Reload the latest app version.", { tone:"danger", progress:0 });
      return null;
    }
    const token = ++scanToken;
    clearReview({ keepStatus:true });
    setBusy(true);
    setStatus("Loading on-device OCR engine…", { progress:4 });
    let worker = null;
    try {
      const Tesseract = await loadTesseract();
      if (token !== scanToken) return null;
      setStatus("Preparing screenshot recognition…", { progress:12 });
      worker = await Tesseract.createWorker("eng", 1, {
        workerPath:TESSERACT_WORKER,
        corePath:TESSERACT_CORE,
        langPath:TESSERACT_LANG,
        logger:message => updateOcrProgress(message, token)
      });
      currentWorker = worker;
      if (token !== scanToken) return null;
      const response = await worker.recognize(file, { rotateAuto:true });
      if (token !== scanToken) return null;
      const text = String(response?.data?.text || "").trim();
      if (!text) throw new Error("No readable text was found in this screenshot.");
      const result = parse.parsePaymentScreenshot(text, accountNames());
      renderResult(result, file.name || "Payment screenshot");
      if (!result.fieldCount) setStatus("Text was read, but no reliable name, amount, or account was detected. Enter the details manually.", { tone:"info", progress:100 });
      else setStatus(`${result.fieldCount} detail${result.fieldCount === 1 ? "" : "s"} detected. Review before applying.`, { tone:"success", progress:100 });
      return result;
    } catch (error) {
      if (token !== scanToken) return null;
      clearReview({ keepStatus:true });
      setStatus(error?.message || "Could not read this screenshot. Try a clearer image.", { tone:"danger", progress:0 });
      return null;
    } finally {
      if (worker === currentWorker) await terminateWorker();
      if (token === scanToken) setBusy(false);
    }
  }

  function cancelScan() {
    scanToken += 1;
    setBusy(false);
    terminateWorker();
  }

  function resetForDialog() {
    cancelScan();
    accountTouched = false;
    clearReview();
  }

  function bindPanelEvents(dialog) {
    const choose = document.getElementById("expenseScreenshotChoose");
    const input = document.getElementById("expenseScreenshotFile");
    const apply = document.getElementById("expenseScreenshotApply");
    const clear = document.getElementById("expenseScreenshotClear");
    const account = document.getElementById("expenseAccount");
    choose?.addEventListener("click", () => input?.click());
    input?.addEventListener("change", () => { const file = input.files?.[0]; if (file) scanFile(file); });
    apply?.addEventListener("click", applySelectedDetails);
    clear?.addEventListener("click", () => { cancelScan(); clearReview(); });
    account?.addEventListener("change", event => { if (dialog.open && event.isTrusted) accountTouched = true; });
    dialog.addEventListener("close", resetForDialog);
    const observer = new MutationObserver(() => { if (dialog.open) { accountTouched = false; clearReview(); } });
    observer.observe(dialog, { attributes:true, attributeFilter:["open"] });
  }

  function initialize() {
    if (!parser()) return;
    ensurePanel();
  }

  window.FinanceExpenseScreenshot = {
    initialize,
    ensurePanel,
    scanFile,
    showResult:renderResult,
    applySelectedDetails,
    clear:clearReview,
    validateFile,
    get currentResult(){ return currentResult ? { ...currentResult, confidence:{ ...currentResult.confidence } } : null; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else initialize();
})();
