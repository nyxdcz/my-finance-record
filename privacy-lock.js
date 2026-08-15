"use strict";
(() => {
  const state = { authenticated:false, resolved:false, email:"" };
  const allowedSelector = [
    "[data-page]", "#menuButton", "#sidebarCloseButton", "#overlay",
    "#previousMonthButton", "#nextMonthButton", "#monthDisplayButton", "#currentMonthButton",
    "#monthPicker", "#monthPickerPreviousYear", "#monthPickerNextYear", "#monthPickerGrid button",
    "#topbarToolsTrigger", "#themeToggleButton", ".finance-privacy-signin",
    "[data-help-key]", "[data-section-help]", "[data-close='sectionHelpDialog']", "[data-close='pwaInstallGuideDialog']",
    "[data-settings-tab='sync']", "[data-settings-tab='app']", "#settingsBackButton", "[data-settings-open='sync']", "[data-settings-open='app']",
    "#settingsSearchButton", "#settingsSearchInput", "#settingsSearchClear", "[data-settings-search-result]",
    "#cloudConfigUrl", "#cloudConfigKey", "#saveCloudConfig", "#clearCloudConfig",
    "#cloudAuthEmail", "#cloudAuthPassword", "#cloudPasswordToggle", "#cloudSignIn", "#cloudCreateAccount", "#cloudForgotPassword", "#cloudTestConnection",
    "#cloudRecoveryEmail", "#cloudRecoveryCode", "#cloudRecoveryResend", "#cloudVerifyRecoveryCode", "#cloudRecoveryBackToSignIn",
    "#cloudNewPassword", "#cloudConfirmPassword", "#cloudCompletePasswordReset", "#cloudCancelPasswordReset", "[data-cloud-password-target]",
    "#installPwaButton", "#checkUpdateButton", "#repairPwaButton", "#clearAppCacheButton", "#requestPersistenceButton", "#applyUpdateButton", "#laterUpdateButton",
    "label[for='importBackup']", "#importBackup", "#restoreV11BackupButton"
  ].join(",");
  const sensitiveDialogIds = new Set([
    "accountDialog","incomeDialog","expenseDialog","expensePaymentDialog","expenseActionConfirmDialog","dashboardCustomizeDialog",
    "projectDialog","projectRevisionDialog","projectPaidDialog","savingsGoalDialog","syncReviewDialog","sampleResetDialog"
  ]);

  function pageLabel(page){
    const heading=page.querySelector(".page-heading h2, .page-heading h3");
    return String(heading?.textContent || page.id || "Finance records").trim();
  }

  function ensurePrivacyViews(){
    document.querySelectorAll(".page:not(#settings)").forEach(page => {
      let view=page.querySelector(":scope > .finance-privacy-lock-view");
      if(!view){
        view=document.createElement("section");
        view.className="finance-privacy-lock-view";
        view.setAttribute("aria-live","polite");
        view.innerHTML=`
          <div class="finance-privacy-lock-card">
            <div class="finance-privacy-lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
            <div class="finance-privacy-lock-copy"><span class="finance-privacy-eyebrow">Signed-out privacy</span><h3>Sign in to view ${pageLabel(page)}</h3><p>No accounts, expenses, projects, payments, calendar events, reports, or search suggestions are shown while signed out.</p></div>
            <div class="finance-privacy-zero-grid" aria-label="Signed-out finance totals">
              <div><span>Available money</span><strong>₱0.00</strong></div>
              <div><span>Income</span><strong>₱0.00</strong></div>
              <div><span>Expenses</span><strong>₱0.00</strong></div>
              <div><span>Projects</span><strong>0</strong></div>
            </div>
            <button class="button button-primary finance-privacy-signin" type="button">Sign in to view records</button>
            <small>Your local records stay stored on this device. Signing out hides them; it does not delete them.</small>
          </div>`;
        page.appendChild(view);
      }
    });
  }

  function removeTopbarSignIn(){
    document.getElementById("privacySignInButton")?.remove();
  }

  function ensureSettingsPrivacyNote(){
    const panel=document.querySelector("[data-settings-panel='app']");
    if(!panel || panel.querySelector(":scope > .finance-settings-privacy-note")) return;
    const note=document.createElement("section");
    note.className="finance-settings-privacy-note";
    note.setAttribute("aria-label","Signed-out Settings privacy");
    note.innerHTML=`<div><strong>Finance-specific app settings are hidden while signed out.</strong><p>Sign in to manage reminders and offline finance documents. Installation, updates, appearance, app repair, storage protection, and Help remain available.</p></div><button class="button button-primary finance-privacy-signin" type="button">Sign in</button>`;
    const intro=panel.querySelector(":scope > .settings-section-intro");
    if(intro) intro.after(note); else panel.prepend(note);
  }

  function openSignIn(){
    try { if(typeof goToPage==="function") goToPage("settings", { historyMode:"none", smooth:false }); } catch(e){}
    try { if(typeof activateSettingsPanel==="function") activateSettingsPanel("sync", false); } catch(e){}
    setTimeout(()=>document.getElementById("cloudAuthEmail")?.focus(),30);
  }

  function closeSensitiveSurfaces(){
    document.querySelectorAll("dialog[open]").forEach(dialog=>{
      if(sensitiveDialogIds.has(dialog.id) || dialog.hasAttribute("data-form-dialog")) {
        try { dialog.close(); } catch(e) { dialog.removeAttribute("open"); }
      }
    });
    document.querySelectorAll(".topbar-tools-menu.is-open, .project-dialog-more-footer.is-open, .overflow-menu.is-open").forEach(node=>{
      node.classList.remove("is-open");
      const trigger=node.querySelector(":scope > [aria-haspopup='menu']");
      trigger?.setAttribute("aria-expanded","false");
      const panel=trigger?document.getElementById(trigger.getAttribute("aria-controls")):null;
      if(panel) panel.hidden=true;
    });
    const pop=document.getElementById("cloudSyncToolbarPopover"); if(pop) pop.hidden=true;
  }

  function updateSettingsForSignedOut(){
    if(!document.body.classList.contains("finance-signed-out")) return;
    const settings=document.getElementById("settings");
    if(!settings?.classList.contains("active")) return;
    const selected=document.querySelector("[data-settings-tab][aria-selected='true']")?.dataset.settingsTab;
    if(!["sync","app"].includes(selected)) {
      try { if(typeof activateSettingsPanel==="function") activateSettingsPanel("sync", false); } catch(e){}
    }
  }

  function notifyServiceWorker(){
    const payload={ type:"FINANCE_AUTH_STATE", authenticated:state.authenticated };
    try { navigator.serviceWorker?.controller?.postMessage(payload); } catch(e){}
    try { navigator.serviceWorker?.ready?.then(reg=>reg.active?.postMessage(payload)).catch(()=>{}); } catch(e){}
  }

  function apply(){
    ensurePrivacyViews();
    removeTopbarSignIn();
    ensureSettingsPrivacyNote();
    const locked=!state.authenticated;
    document.body.classList.toggle("finance-signed-out",locked);
    document.body.classList.toggle("finance-signed-in",!locked);
    document.body.classList.toggle("finance-auth-pending",!state.resolved);
    document.documentElement.dataset.financeAuth=locked?"signed-out":"signed-in";
    if(locked){ closeSensitiveSurfaces(); updateSettingsForSignedOut(); }
    notifyServiceWorker();
  }

  function setAuthenticated(authenticated, detail={}){
    state.authenticated=Boolean(authenticated);
    state.resolved=true;
    state.email=String(detail.email||"");
    apply();
    window.dispatchEvent(new CustomEvent("finance:privacy-auth-change",{detail:{authenticated:state.authenticated,email:state.email}}));
    if(state.authenticated){
      setTimeout(()=>{ try { if(typeof renderAll==="function") renderAll(false); } catch(e){} },0);
    }
  }

  function isAllowed(target){ return Boolean(target?.closest?.(allowedSelector)); }
  function blockLockedInteraction(event){
    if(!document.body.classList.contains("finance-signed-out")) return;
    const target=event.target;
    if(isAllowed(target)) return;
    const interactive=target?.closest?.("button, input, select, textarea, form, [contenteditable='true'], [role='button'], [role='menuitem']");
    if(!interactive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message=interactive.closest("#settings") ? "Sign in to manage this finance setting." : "Sign in to use finance records.";
    try { if(typeof showToast==="function") showToast(message,"info"); } catch(e){}
  }

  document.addEventListener("click",event=>{
    const signin=event.target.closest?.(".finance-privacy-signin");
    if(signin){ event.preventDefault(); openSignIn(); return; }
    blockLockedInteraction(event);
  },true);
  document.addEventListener("submit",blockLockedInteraction,true);
  document.addEventListener("change",event=>{
    if(document.body.classList.contains("finance-signed-out") && !isAllowed(event.target)) blockLockedInteraction(event);
  },true);
  window.addEventListener("finance:page-changed",updateSettingsForSignedOut);
  window.addEventListener("pageshow",apply);
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true}); else apply();

  window.FinancePrivacyLock={
    setAuthenticated,
    lock:()=>setAuthenticated(false),
    unlock:detail=>setAuthenticated(true,detail||{}),
    openSignIn,
    get status(){ return {...state}; }
  };
})();
