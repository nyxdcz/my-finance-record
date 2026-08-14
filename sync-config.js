/* Optional hosted configuration for MacBook + iPhone cloud sync.
   Leave blank to configure each device from Settings → Cloud Sync & Devices.
   Use only a Supabase publishable key or legacy anon key. Never use a secret/service_role key. */
window.FINANCE_SYNC_CONFIG = window.FINANCE_SYNC_CONFIG || {
  supabaseUrl: "https://tfhvlhnbnoxgragivchd.supabase.co",
  supabasePublishableKey: "sb_publishable_Rq4T07FdPXCm4OARCIjhwg_sGAPoXSD"
};

(function loadExpenseScreenshotTools() {
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

  async function start() {
    try {
      await loadScript("./expense-screenshot-parser.js?v=14.0.23", "expenseScreenshotParserScript");
      await loadScript("./expense-screenshot-detect.js?v=14.0.23", "expenseScreenshotDetectScript");
    } catch (error) {
      console.warn("Screenshot detection tools are unavailable.", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
