/* Optional hosted configuration for MacBook + iPhone cloud sync.
   Leave blank to configure each device from Settings → Cloud Sync & Devices.
   Use only a Supabase publishable key or legacy anon key. Never use a secret/service_role key. */
window.FINANCE_SYNC_CONFIG = window.FINANCE_SYNC_CONFIG || {
  supabaseUrl: "https://tfhvlhnbnoxgragivchd.supabase.co",
  supabasePublishableKey: "sb_publishable_Rq4T07FdPXCm4OARCIjhwg_sGAPoXSD"
};

(function loadExpenseScreenshotTools() {
  let toolsPromise = null;

  function loadScript(src, id) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }

  function insertLauncherStyles() {
    if (document.getElementById("expenseScreenshotLauncherStyles")) return;
    const style = document.createElement("style");
    style.id = "expenseScreenshotLauncherStyles";
    style.textContent = `
      .expense-screenshot-launcher{margin:10px 0 12px;padding:10px 11px;border:1px solid var(--line);border-radius:11px;background:var(--surface-soft);display:flex;align-items:center;justify-content:space-between;gap:12px}.expense-screenshot-launcher-copy{min-width:0}.expense-screenshot-launcher-copy strong,.expense-screenshot-launcher-copy small{display:block}.expense-screenshot-launcher-copy strong{font-size:.72rem}.expense-screenshot-launcher-copy small{margin-top:2px;color:var(--muted);font-size:.6rem;line-height:1.35}.expense-screenshot-launcher .button{min-height:38px;white-space:nowrap}@media(max-width:700px){.expense-screenshot-launcher{align-items:stretch;flex-direction:column}.expense-screenshot-launcher .button{width:100%;min-height:44px}}
    `;
    document.head.appendChild(style);
  }

  function ensureLauncher() {
    if (document.getElementById("expenseScreenshotPanel")) return null;
    const existing = document.getElementById("expenseScreenshotLauncher");
    if (existing) return existing;
    const note = document.getElementById("expenseFormModeNote");
    if (!note) return null;
    insertLauncherStyles();
    const launcher = document.createElement("section");
    launcher.id = "expenseScreenshotLauncher";
    launcher.className = "expense-screenshot-launcher";
    launcher.setAttribute("aria-label", "Upload payment screenshot");
    launcher.innerHTML = `<div class="expense-screenshot-launcher-copy"><strong>Upload payment screenshot</strong><small>Detect name, amount and account used.</small></div><button class="button button-primary button-small" id="expenseScreenshotLauncherButton" type="button"><span aria-hidden="true">📷</span> Upload Screenshot</button>`;
    note.insertAdjacentElement("afterend", launcher);
    const button = document.getElementById("expenseScreenshotLauncherButton");
    button?.addEventListener("click", async () => {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.innerHTML = `<span aria-hidden="true">📷</span> Preparing scanner…`;
      try {
        await start();
        window.FinanceExpenseScreenshot?.ensurePanel?.();
        const choose = document.getElementById("expenseScreenshotChoose");
        document.getElementById("expenseScreenshotLauncher")?.remove();
        if (!choose) throw new Error("Screenshot scanner did not initialize.");
        choose.click();
      } catch (error) {
        console.warn("Screenshot detection tools are unavailable.", error);
        button.disabled = false;
        button.setAttribute("aria-busy", "false");
        button.innerHTML = `<span aria-hidden="true">📷</span> Upload Screenshot`;
        if (typeof window.showToast === "function") window.showToast("Screenshot scanner could not load. Reload the app and try again.", "warning");
      }
    });
    return launcher;
  }

  async function start() {
    if (toolsPromise) return toolsPromise;
    toolsPromise = (async () => {
      await loadScript("./expense-screenshot-parser.js?v=14.0.23", "expenseScreenshotParserScript");
      await loadScript("./expense-screenshot-detect.js?v=14.0.23", "expenseScreenshotDetectScript");
      await loadScript("./expense-screenshot-ai.js?v=14.0.23", "expenseScreenshotAiScript");
      window.FinanceExpenseScreenshot?.ensurePanel?.();
      window.FinanceExpenseScreenshotAI?.ensureAiControls?.();
      document.getElementById("expenseScreenshotLauncher")?.remove();
    })();
    try {
      await toolsPromise;
    } catch (error) {
      toolsPromise = null;
      throw error;
    }
  }

  function boot() {
    ensureLauncher();
    start().catch(error => console.warn("Screenshot detection tools are unavailable.", error));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
