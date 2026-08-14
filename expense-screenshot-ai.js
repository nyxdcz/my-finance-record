"use strict";

(function expenseScreenshotAiBootstrap() {
  const AI_BUTTON_ID = "expenseScreenshotAiButton";
  const AI_FILE_ID = "expenseScreenshotAiFile";
  const AI_ENDPOINT_PATH = "/functions/v1/detect-payment";
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  let lastScreenshotFile = null;
  let detecting = false;
  let captureBound = false;
  let observer = null;

  function screenshotApi() {
    return window.FinanceExpenseScreenshot || null;
  }

  function parser() {
    return window.FinanceExpenseScreenshotParser || null;
  }

  function accountNames() {
    const select = document.getElementById("expenseAccount");
    return select ? [...select.options].map(option => String(option.value || "").trim()).filter(Boolean) : [];
  }

  function config() {
    const value = window.FINANCE_SYNC_CONFIG || {};
    return {
      supabaseUrl:String(value.supabaseUrl || "").replace(/\/+$/, ""),
      publishableKey:String(value.supabasePublishableKey || value.supabaseAnonKey || "").trim()
    };
  }

  function confidenceLabel(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) return "low";
    if (score >= 0.85) return "high";
    if (score >= 0.6) return "medium";
    return "low";
  }

  function setSharedStatus(message, { tone = "info", progress = null, hidden = false } = {}) {
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

  function updateAiButton() {
    const button = document.getElementById(AI_BUTTON_ID);
    if (!button) return;
    button.disabled = detecting;
    button.setAttribute("aria-busy", detecting ? "true" : "false");
    if (detecting) {
      button.textContent = "Analyzing with AI…";
      return;
    }
    button.textContent = lastScreenshotFile ? "✨ Improve with AI" : "✨ Detect with AI";
  }

  function rememberFile(file) {
    if (!(file instanceof File)) return;
    lastScreenshotFile = file;
    updateAiButton();
  }

  function clearRememberedFile() {
    lastScreenshotFile = null;
    const input = document.getElementById(AI_FILE_ID);
    if (input) input.value = "";
    updateAiButton();
  }

  function validateFile(file) {
    const localValidation = screenshotApi()?.validateFile?.(file);
    if (typeof localValidation === "string" && localValidation) return localValidation;
    if (!file) return "Choose a screenshot first.";
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) return "Use a PNG, JPEG, or WebP screenshot.";
    if (!file.size) return "The selected screenshot is empty.";
    if (file.size > MAX_FILE_BYTES) return "Choose a screenshot smaller than 15 MB.";
    return "";
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not prepare this screenshot for AI detection."));
      reader.readAsDataURL(file);
    });
  }

  async function authenticatedSession() {
    const loadClient = window.FinanceCloudSyncInternals?.loadClient;
    if (typeof loadClient !== "function") throw new Error("Cloud sign-in is unavailable. Local scan still works.");
    const client = await loadClient();
    const result = await client.auth.getSession();
    if (result?.error) throw result.error;
    const session = result?.data?.session;
    if (!session?.access_token) throw new Error("Sign in to Cloud Sync to use Detect with AI. Local scan still works.");
    return session;
  }

  function normalizeDetection(detection = {}) {
    const savedAccounts = accountNames();
    const exactAccount = savedAccounts.includes(String(detection.matched_account || "")) ? String(detection.matched_account) : "";
    const accountHint = String(detection.institution || "").trim();
    const aliasMatch = !exactAccount && accountHint ? parser()?.detectAccount?.(accountHint, savedAccounts) : null;
    const account = exactAccount || String(aliasMatch?.value || "").trim();
    const amount = Number(detection.amount);
    return {
      name:String(detection.name || "").trim(),
      amount:Number.isFinite(amount) && amount > 0 ? amount : null,
      account,
      accountHint,
      confidence:{
        name:confidenceLabel(detection.confidence?.name),
        amount:confidenceLabel(detection.confidence?.amount),
        account:confidenceLabel(detection.confidence?.account)
      }
    };
  }

  function detectedFieldCount(result) {
    return Number(Boolean(result?.name)) + Number(Number.isFinite(Number(result?.amount)) && Number(result.amount) > 0) + Number(Boolean(result?.account));
  }

  async function detectWithAi(file) {
    const validation = validateFile(file);
    if (validation) {
      setSharedStatus(validation, { tone:"danger", progress:0 });
      return null;
    }
    if (detecting) return null;
    const { supabaseUrl, publishableKey } = config();
    if (!supabaseUrl || !publishableKey) {
      setSharedStatus("AI detection needs Cloud Sync configuration. Local scan still works.", { tone:"info", progress:0 });
      return null;
    }

    detecting = true;
    rememberFile(file);
    updateAiButton();
    setSharedStatus("Preparing screenshot for optional AI detection…", { tone:"info", progress:12 });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const session = await authenticatedSession();
      setSharedStatus("Sending screenshot to your private AI detector…", { tone:"info", progress:35 });
      const image = await fileToDataUrl(file);
      const response = await fetch(`${supabaseUrl}${AI_ENDPOINT_PATH}`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${session.access_token}`,
          "apikey":publishableKey
        },
        body:JSON.stringify({ image, accounts:accountNames() }),
        signal:controller.signal
      });
      let payload = {};
      try { payload = await response.json(); } catch (error) {}
      if (!response.ok) {
        if ([401, 403].includes(response.status)) throw new Error("Sign in to Cloud Sync again to use Detect with AI. Local scan still works.");
        if (response.status === 429) throw new Error("AI detection is busy right now. Try again shortly or use Local scan.");
        if (response.status === 503) throw new Error("AI detection is not configured yet. Local scan still works.");
        throw new Error(String(payload?.error || "AI detection could not read this screenshot. Local scan still works."));
      }
      const result = normalizeDetection(payload?.detection || {});
      screenshotApi()?.showResult?.(result, `AI · ${file.name || "Payment screenshot"}`);
      const count = detectedFieldCount(result);
      if (count) setSharedStatus(`AI detected ${count} detail${count === 1 ? "" : "s"}. Review before applying.`, { tone:"success", progress:100 });
      else setSharedStatus("AI read the screenshot but did not find reliable expense details. Your local scan remains available.", { tone:"info", progress:100 });
      return result;
    } catch (error) {
      const message = error?.name === "AbortError"
        ? "AI detection timed out. Try Local scan or try AI again."
        : (error?.message || "AI detection failed. Local scan still works.");
      setSharedStatus(message, { tone:"danger", progress:0 });
      return null;
    } finally {
      window.clearTimeout(timeout);
      detecting = false;
      updateAiButton();
    }
  }

  function bindFileCapture() {
    if (captureBound) return;
    captureBound = true;
    document.addEventListener("change", event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "file") return;
      if (!["expenseScreenshotFile", AI_FILE_ID].includes(target.id)) return;
      const file = target.files?.[0];
      if (file) rememberFile(file);
    }, true);
  }

  function ensureAiControls() {
    bindFileCapture();
    const panel = document.getElementById("expenseScreenshotPanel");
    const actions = panel?.querySelector(".expense-screenshot-actions");
    if (!panel || !actions) return false;
    if (!document.getElementById(AI_BUTTON_ID)) {
      const button = document.createElement("button");
      button.className = "button button-secondary button-small";
      button.id = AI_BUTTON_ID;
      button.type = "button";
      button.setAttribute("aria-controls", "expenseScreenshotReview");
      button.textContent = "✨ Detect with AI";
      const input = document.createElement("input");
      input.id = AI_FILE_ID;
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.hidden = true;
      actions.append(button, input);
      button.addEventListener("click", () => {
        if (lastScreenshotFile) detectWithAi(lastScreenshotFile);
        else input.click();
      });
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) detectWithAi(file);
      });
    }
    const clear = document.getElementById("expenseScreenshotClear");
    if (clear && clear.dataset.aiResetBound !== "true") {
      clear.dataset.aiResetBound = "true";
      clear.addEventListener("click", clearRememberedFile);
    }
    const privacy = panel.querySelector(".expense-screenshot-privacy");
    if (privacy) privacy.textContent = "Local scan processes the screenshot in your browser. Detect with AI sends the selected screenshot to your private AI endpoint only when you choose it. Neither option saves the image to Finance records or Cloud Sync.";
    updateAiButton();
    return true;
  }

  function initialize() {
    if (ensureAiControls()) return;
    observer = new MutationObserver(() => {
      if (!ensureAiControls()) return;
      observer?.disconnect();
      observer = null;
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  window.FinanceExpenseScreenshotAI = {
    initialize,
    ensureAiControls,
    detectWithAi,
    clear:clearRememberedFile,
    get lastFile(){ return lastScreenshotFile; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else initialize();
})();
