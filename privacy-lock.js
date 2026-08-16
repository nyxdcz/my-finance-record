"use strict";
(() => {
  const state = { authenticated:false, resolved:false, email:"" };
  const importReviewState = { bundle:null, beforeAccounts:{} };
  const RECOVERY_META_KEY = "simple-finance-project-records-v12-meta";
  const RECOVERY_DB_NAME = "simple-finance-project-records-v12-db";
  const RECOVERY_DB_VERSION = 2;
  const RECOVERY_STORE = "recoverySnapshots";
  const MAX_RECOVERY_SNAPSHOTS = 12;
  let recoveryStorageReadyPromise = null;
  let recoveryImportBusy = false;
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
    "label[for='importBackup']", "#importBackup", "label[for='importSyncBundleInput']", "#importSyncBundleInput", "#restoreV11BackupButton",
    "#closeSyncReviewButton", "#cancelSyncImportButton", "#mergeKeepCurrentButton", "#mergeUseIncomingButton", "#replaceWithIncomingButton"
  ].join(",");
  const sensitiveDialogIds = new Set([
    "accountDialog","incomeDialog","expenseDialog","expensePaymentDialog","expenseActionConfirmDialog","dashboardCustomizeDialog",
    "projectDialog","projectRevisionDialog","projectPaidDialog","savingsGoalDialog","syncReviewDialog","sampleResetDialog"
  ]);
  const recoveryImportActions = new Map([
    ["mergeKeepCurrentButton", ["merge", "current"]],
    ["mergeUseIncomingButton", ["merge", "incoming"]],
    ["replaceWithIncomingButton", ["replace", "incoming"]]
  ]);

  function cloneValue(value){
    try { return structuredClone(value); } catch(e){}
    try { return JSON.parse(JSON.stringify(value)); } catch(e) { return value; }
  }

  function currentAccounts(){
    try {
      const bundle=typeof window.buildBundle==="function" ? window.buildBundle() : null;
      return cloneValue(bundle?.data?.accounts || {});
    } catch(e) { return {}; }
  }

  function currentFinanceData(){
    try {
      const bundle=typeof window.buildBundle==="function" ? window.buildBundle("my-finance-v12-recovery") : null;
      if(bundle?.data) return cloneValue(bundle.data);
    } catch(e){}
    try { if(typeof data!=="undefined") return cloneValue(data); } catch(e){}
    return {};
  }

  function captureImportReview(bundle){
    importReviewState.bundle=cloneValue(bundle);
    importReviewState.beforeAccounts=currentAccounts();
  }

  function installSyncReviewCapture(){
    const original=window.openSyncReview;
    if(typeof original!=="function" || original.__financeRecoveryCapture) return;
    const wrapped=function(bundle){
      captureImportReview(bundle);
      return original.apply(this,arguments);
    };
    Object.defineProperty(wrapped,"__financeRecoveryCapture",{value:true});
    window.openSyncReview=wrapped;
  }

  function clearImportReviewCapture(){
    importReviewState.bundle=null;
    importReviewState.beforeAccounts={};
  }

  function importedAccounts(){
    const incoming=importReviewState.bundle?.data || importReviewState.bundle;
    return incoming?.accounts && typeof incoming.accounts==="object" && !Array.isArray(incoming.accounts) ? incoming.accounts : {};
  }

  function reconcileImportedAccountBalances(mode, conflictPolicy){
    const ledger=window.FinanceAccountLedger;
    if(!ledger || typeof ledger.appendReconciliation!=="function") return 0;
    if(window.FinanceProfileArchitecture?.canWrite?.()===false) return 0;
    const desired=importedAccounts();
    const before=importReviewState.beforeAccounts || {};
    const after=currentAccounts();
    let adjusted=0;
    Object.entries(desired).forEach(([name, rawValue])=>{
      const target=Number(rawValue);
      if(!Number.isFinite(target) || !Object.prototype.hasOwnProperty.call(after,name)) return;
      const existedBefore=Object.prototype.hasOwnProperty.call(before,name);
      const shouldUseIncoming=mode==="replace" || conflictPolicy==="incoming" || !existedBefore;
      if(!shouldUseIncoming) return;
      const actual=Number(after[name] || 0);
      if(Math.abs(actual-target)<0.005) return;
      const result=ledger.appendReconciliation(name,target,{note:"Imported backup balance"});
      if(result) adjusted+=1;
    });
    if(adjusted){
      try {
        if(typeof window.saveData==="function") window.saveData("Imported account balances reconciled");
        else if(typeof saveData==="function") saveData("Imported account balances reconciled");
      } catch(error){ console.error("Imported balance persistence failed",error); }
    }
    return adjusted;
  }

  function openRecoveryDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)) return reject(new Error("IndexedDB is unavailable"));
      const request=indexedDB.open(RECOVERY_DB_NAME,RECOVERY_DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains("accountSnapshots")) db.createObjectStore("accountSnapshots",{keyPath:"id"});
        if(!db.objectStoreNames.contains("pdfPacks")) db.createObjectStore("pdfPacks",{keyPath:"id"});
        if(!db.objectStoreNames.contains("reminderIndex")) db.createObjectStore("reminderIndex",{keyPath:"id"});
        if(!db.objectStoreNames.contains(RECOVERY_STORE)) db.createObjectStore(RECOVERY_STORE,{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error || new Error("Could not open recovery storage"));
      request.onblocked=()=>reject(new Error("Recovery storage upgrade is blocked by another open tab"));
    });
  }

  function installRecoveryDbUpgrade(){
    try {
      if(typeof openV12Db!=="function" || openV12Db.__financeRecoveryV2) return;
      const upgraded=function(){ return openRecoveryDb(); };
      Object.defineProperty(upgraded,"__financeRecoveryV2",{value:true});
      openV12Db=upgraded;
    } catch(error){ console.warn("Could not attach recovery storage upgrade",error); }
  }

  async function recoveryPut(value){
    const db=await openRecoveryDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(RECOVERY_STORE,"readwrite");
      tx.objectStore(RECOVERY_STORE).put(value);
      tx.oncomplete=()=>{ db.close(); resolve(value); };
      tx.onerror=()=>{ db.close(); reject(tx.error || new Error("Could not save recovery snapshot")); };
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("Recovery snapshot transaction was aborted")); };
    });
  }

  async function recoveryDelete(id){
    if(!id) return;
    const db=await openRecoveryDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(RECOVERY_STORE,"readwrite");
      tx.objectStore(RECOVERY_STORE).delete(id);
      tx.oncomplete=()=>{ db.close(); resolve(); };
      tx.onerror=()=>{ db.close(); reject(tx.error || new Error("Could not remove old recovery snapshot")); };
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("Recovery cleanup was aborted")); };
    });
  }

  async function recoveryGetAll(){
    const db=await openRecoveryDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(RECOVERY_STORE,"readonly");
      const request=tx.objectStore(RECOVERY_STORE).getAll();
      request.onsuccess=()=>resolve(request.result || []);
      request.onerror=()=>reject(request.error || new Error("Could not read recovery snapshots"));
      tx.oncomplete=()=>db.close();
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("Recovery read was aborted")); };
    });
  }

  function recoveryMetaObject(){
    try { if(typeof appMeta!=="undefined" && appMeta && typeof appMeta==="object") return appMeta; } catch(e){}
    try {
      const raw=localStorage.getItem(RECOVERY_META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function snapshotMetadata(snapshot){
    return {
      id:String(snapshot?.id || ""),
      label:String(snapshot?.label || "Recovery snapshot"),
      createdAt:String(snapshot?.createdAt || new Date().toISOString()),
      sourceDeviceId:String(snapshot?.sourceDeviceId || ""),
      checksum:String(snapshot?.checksum || ""),
      summary:cloneValue(snapshot?.summary || {}),
      storage:"indexeddb-v2"
    };
  }

  function persistRecoveryMeta(meta){
    try {
      if(typeof appMeta!=="undefined" && meta===appMeta && typeof writeMeta==="function") {
        writeMeta();
        return;
      }
    } catch(e){}
    localStorage.setItem(RECOVERY_META_KEY,JSON.stringify(meta));
  }

  function financeUid(){
    try { if(typeof uid==="function") return uid(); } catch(e){}
    return globalThis.crypto?.randomUUID?.() || `recovery-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function financeChecksum(value){
    try { if(typeof checksum==="function") return checksum(value); } catch(e){}
    try { return String(JSON.stringify(value).length); } catch(e) { return ""; }
  }

  function financeSummary(value){
    try { if(typeof dataSummary==="function") return cloneValue(dataSummary(value)); } catch(e){}
    return {};
  }

  function currentDeviceId(){
    try { return String(typeof appMeta!=="undefined" ? appMeta.currentDeviceId || "" : ""); } catch(e) { return ""; }
  }

  async function compactLegacyRecoverySnapshots(){
    installRecoveryDbUpgrade();
    const meta=recoveryMetaObject();
    if(!meta) return { migrated:0, total:0 };
    const snapshots=Array.isArray(meta.recoverySnapshots) ? meta.recoverySnapshots : [];
    let migrated=0;
    for(const snapshot of snapshots){
      if(!snapshot?.id || !snapshot?.data) continue;
      await recoveryPut(cloneValue(snapshot));
      migrated+=1;
    }
    if(migrated){
      meta.recoverySnapshots=snapshots.map(snapshotMetadata).slice(0,MAX_RECOVERY_SNAPSHOTS);
      persistRecoveryMeta(meta);
    }
    return { migrated, total:meta.recoverySnapshots?.length || 0 };
  }

  function ensureRecoveryStorageReady(){
    if(!recoveryStorageReadyPromise){
      recoveryStorageReadyPromise=compactLegacyRecoverySnapshots().catch(error=>{
        recoveryStorageReadyPromise=null;
        throw error;
      });
    }
    return recoveryStorageReadyPromise;
  }

  async function persistRecoverySnapshot(label,sourceData){
    await ensureRecoveryStorageReady();
    const source=cloneValue(sourceData);
    const snapshot={
      id:financeUid(),
      label:String(label || "Before import"),
      createdAt:new Date().toISOString(),
      sourceDeviceId:currentDeviceId(),
      checksum:financeChecksum(source),
      summary:financeSummary(source),
      data:source
    };
    await recoveryPut(snapshot);

    const meta=recoveryMetaObject();
    if(!meta) throw new Error("Recovery metadata is unavailable");
    const previous=Array.isArray(meta.recoverySnapshots) ? meta.recoverySnapshots : [];
    const next=[snapshotMetadata(snapshot),...previous.filter(item=>item?.id!==snapshot.id).map(snapshotMetadata)].slice(0,MAX_RECOVERY_SNAPSHOTS);
    const keepIds=new Set(next.map(item=>item.id));
    const removed=previous.filter(item=>item?.id && !keepIds.has(String(item.id))).map(item=>String(item.id));
    meta.recoverySnapshots=next;
    persistRecoveryMeta(meta);
    await Promise.allSettled(removed.map(recoveryDelete));
    return snapshotMetadata(snapshot);
  }

  function setImportButtonsBusy(active,activeButton=null){
    recoveryImportActions.forEach((_,id)=>{
      const button=document.getElementById(id);
      if(!button) return;
      if(active){
        button.dataset.recoveryOriginalText=button.textContent;
        button.disabled=true;
        if(button===activeButton) button.textContent="Creating recovery copy…";
      } else {
        button.disabled=false;
        if(button.dataset.recoveryOriginalText) button.textContent=button.dataset.recoveryOriginalText;
        delete button.dataset.recoveryOriginalText;
      }
    });
  }

  async function executeRecoveryImport(button,action){
    if(recoveryImportBusy) return;
    recoveryImportBusy=true;
    setImportButtonsBusy(true,button);
    const dialog=document.getElementById("syncReviewDialog");
    let originalCreateRecoverySnapshot=null;
    let replacedSnapshotCreator=false;
    try {
      await ensureRecoveryStorageReady();
      const before=currentFinanceData();
      const recoveryMeta=await persistRecoverySnapshot(`Before ${action[0]} import`,before);

      try {
        if(typeof createRecoverySnapshot!=="function") throw new Error("Recovery snapshot hook is unavailable");
        originalCreateRecoverySnapshot=createRecoverySnapshot;
        createRecoverySnapshot=function(){ return recoveryMeta; };
        replacedSnapshotCreator=true;
      } catch(error){
        throw new Error(`Could not attach safe recovery storage: ${error?.message || "unknown error"}`);
      }

      if(typeof window.applyPendingSyncImport!=="function") throw new Error("Import action is unavailable");
      window.applyPendingSyncImport(action[0],action[1]);
      if(dialog?.open) throw new Error("Import review expired. Choose the backup again.");
      reconcileImportedAccountBalances(action[0],action[1]);
      clearImportReviewCapture();
    } catch(error) {
      console.error("Recovery import action failed",error);
      try { if(typeof showToast==="function") showToast(`Import failed: ${error?.message || "unknown error"}`,"warning"); } catch(e){}
    } finally {
      if(replacedSnapshotCreator){
        try { createRecoverySnapshot=originalCreateRecoverySnapshot; } catch(e){}
      }
      setImportButtonsBusy(false);
      recoveryImportBusy=false;
    }
  }

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

  function structurallyRemoveExpenseDialogGuidance(){
    const dialog=document.getElementById("expenseDialog");
    if(!dialog) return;
    dialog.querySelector(":scope > form > .modal-body > .required-note")?.remove();
    const modeNote=dialog.querySelector("#expenseFormModeNote");
    if(!modeNote) return;
    modeNote.remove();
    if(document.querySelector("[data-expense-mode-surrogate='true']")) return;
    const surrogate=document.createElement("span");
    surrogate.id="expenseFormModeNote";
    surrogate.hidden=true;
    surrogate.setAttribute("aria-hidden","true");
    surrogate.dataset.expenseModeSurrogate="true";
    document.body.appendChild(surrogate);
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
    structurallyRemoveExpenseDialogGuidance();
    installRecoveryDbUpgrade();
    ensureRecoveryStorageReady().catch(error=>console.error("Recovery storage migration failed",error));
    installSyncReviewCapture();
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

  function runRecoveryImportAction(event){
    const button=event.target.closest?.("#mergeKeepCurrentButton, #mergeUseIncomingButton, #replaceWithIncomingButton");
    if(!button) return false;
    const action=recoveryImportActions.get(button.id);
    if(!action) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    executeRecoveryImport(button,action);
    return true;
  }

  document.addEventListener("click",event=>{
    if(runRecoveryImportAction(event)) return;
    const closeImport=event.target.closest?.("#closeSyncReviewButton, #cancelSyncImportButton");
    if(closeImport) setTimeout(clearImportReviewCapture,0);
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
    recoveryStorage:{
      ready:ensureRecoveryStorageReady,
      compact:async()=>{ recoveryStorageReadyPromise=null; return ensureRecoveryStorageReady(); },
      list:recoveryGetAll,
      version:RECOVERY_DB_VERSION,
      store:RECOVERY_STORE
    },
    get status(){ return {...state}; }
  };
})();