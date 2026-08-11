#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TextEncoder, TextDecoder } from "node:util";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const failures=[];
const assert=(condition,message)=>{ if(!condition) failures.push(message); };
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const exists=file=>fs.existsSync(path.join(root,file));
const sha256=file=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");

const html=`${read("index.html")}\n<style>\n${read("app.css")}\n</style>`;
const profiles=read("security-profiles.js");
const profileCss=read("security-profiles.css");
const cloud=read("cloud-sync.js");
const conflictReview=read("cloud-conflict-review.js");
const conflictResolution=read("cloud-conflict-resolution.js");
const privacyLock=read("privacy-lock.js");
const worker=read("sw.js");
const sql=read("supabase/cloud-profiles-v13.sql");
const workflow=read(".github/workflows/quality-pages.yml");
const releaseWorkflow=read(".github/workflows/release.yml");
const dependabot=read(".github/dependabot.yml");
const installer=read("Install_V14_0_8.command");
const maintainability=read("tests/check-maintainability.mjs");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const security=read("SECURITY.md");
const privacy=read("PRIVACY.md");
const migration=read("V13_MIGRATION_GUIDE.md");
const validation=read("CLOUD_PROFILE_ENCRYPTION_VALIDATION_V13_0_0.md");
const uiValidation=read("TOOLBAR_BUDGET_BENTO_VALIDATION_V13_0_2.md");
const settingsValidation=read("SETTINGS_SIMPLIFICATION_VALIDATION_V13_0_2.md");
const compactModalValidation=read("COMPACT_MODAL_SVG_ICON_VALIDATION_V13_0_3.md");
const productivity=read("productivity-tools.js");
const accountLedger=read("account-ledger.js");
const projectCalendar=read("projects-calendar-v13.0.20.js");
const projectCalendarCss=read("projects-calendar-v13.0.20.css");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));

assert(version.version==="14.0.8","version.json is not V14.0.8");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===3,"Cloud Schema V3 metadata missing");
for(const [field,value] of Object.entries({ledgerVersion:1,budgetVersion:1,insightsVersion:1,productivityVersion:1,remindersVersion:1,profileArchitectureVersion:1,encryptionVersion:1,authSecurityVersion:1})) assert(version[field]===value,`${field} metadata mismatch`);
assert(html.includes('<title>My Finance Records · V14.0.8</title>'),"HTML title mismatch");
assert(html.includes('const APP_VERSION = "14.0.8";'),"HTML APP_VERSION mismatch");
assert(html.includes('const APP_RELEASE_NAME = "Orphan Conflict Recovery";'),"HTML release name mismatch");
assert(html.includes('function synchronizeVersionDisplay()')&&html.includes('badge.textContent = `V${APP_VERSION}`'),"central runtime version display updater missing");
assert(html.includes('{"version":"V14.0.8","title":"Orphan Conflict Recovery"'),"in-app V14.0.8 history entry missing");
assert(!projectCalendar.includes("document.title")&&!projectCalendar.includes('getElementById("buildBadge")'),"project calendar still overrides central release metadata");
assert(projectCalendar.includes("<h3>Project Agenda</h3>")&&projectCalendar.includes("Next events")&&projectCalendar.includes("View full agenda"),"compact Project Agenda interface is missing");
for(const removedToken of ["buildCalendarGrid", "data-pc-calendar-grid", "data-pc-month-label", "data-pc-prev", "data-pc-next", "data-pc-today", "data-pc-date"]) {
  assert(!projectCalendar.includes(removedToken),`duplicate Projects calendar control remains: ${removedToken}`);
}
for(const removedSelector of [".pc-calendar-grid", ".pc-calendar-day", ".pc-weekdays", ".pc-toolbar", ".pc-layout"]) {
  assert(!projectCalendarCss.includes(removedSelector),`duplicate Projects calendar style remains: ${removedSelector}`);
}
for(const token of [
  'const EVENTS_KEY = "simple-finance-project-calendar-v13.0.20"',
  "const agendaEvents = sortedEvents(events)",
  "window.getProjectAgendaEvents = () => safeRead()",
  "window.getProjectCalendarEvents = window.getProjectAgendaEvents",
  'new CustomEvent("finance:project-agenda-changed"',
  'window.addEventListener("storage"',
  "if (event.key !== EVENTS_KEY) return",
  "data-pc-add", "data-pc-edit", "data-pc-delete", "data-pc-ics", "data-pc-view", "data-pc-complete",
  'dialog.id = "projectCalendarEventDialog"', 'fullDialog.id = "projectAgendaFullDialog"',
  "function agendaDateState(event)", "function eventCard(event", "function openFullAgenda()", "async function toggleEventCompleted(id)",
  "completedAt:completing ? timestamp", 'window.completeProjectFromAgenda(event.projectId, event.title)'
]) assert(projectCalendar.includes(token),`Project Agenda behavior missing: ${token}`);
for(const token of [".pc-agenda-preview",".pc-full-dialog",".pc-date-overdue",".pc-date-near",".pc-date-soon",".pc-date-completed"]) assert(projectCalendarCss.includes(token),`Project Agenda compact/full-view style missing: ${token}`);
for(const token of [
  "function projectAgendaItems()",
  "function isValidAgendaDate(value)",
  "function agendaCalendarDateState(item)",
  "projectAgendaItems().filter(item => isValidAgendaDate(item.date) && item.date === date)",
  'sourceKey:`agenda|${agendaId}|${date}`',
  'window.addEventListener("finance:project-agenda-changed", () => renderDashboardCalendar())',
  "async function completeProjectFromAgenda(projectId", "window.completeProjectFromAgenda = completeProjectFromAgenda",
  'project.status = "Completed"', "project.completedDate = project.completedDate || today", "agenda-${event.dateState}"
]) assert(html.includes(token),`Dashboard agenda projection missing: ${token}`);
for(const token of ["data-review-cloud-conflict", "FinanceCloudConflictReview?.open", "FinanceCloudConflictReview?.bind"]) assert(cloud.includes(token),`safe cloud-conflict integration missing: ${token}`);
for(const token of [
  'dialog.id = "cloudConflictReviewDialog"', "function comparisonRows(item)",
  "Use cloud version", "Use this device", "Download both", "Resolve later", "Nothing changes until you choose one",
  "Applying your choice…", "Using cloud…", "Using device…", "runResolutionAction"
]) assert(conflictReview.includes(token),`safe cloud-conflict comparison missing: ${token}`);
for(const token of ["recoveredPending", "item=pending[key]", "conflict.localPayload", "conflict.localSortIndex", "conflict.localDeleted"]) assert(conflictResolution.includes(token),`orphan conflict recovery missing: ${token}`);
for(const token of ["localSortIndex:local.sortIndex", "localDeleted:local.deleted", "if (confirmed) conflicts=conflicts.filter(item=>item.key!==key)"]) assert(cloud.includes(token),`confirmed conflict cleanup missing: ${token}`);

// Conflict-review click actions must settle visibly instead of failing silently.
const reviewStatus={hidden:true,textContent:"",className:""};
const reviewButton=action=>({dataset:{conflictReviewAction:action},textContent:action,disabled:false,attributes:{},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;}});
const reviewButtons=[reviewButton("later"),reviewButton("download"),reviewButton("cloud"),reviewButton("device")];
const reviewDialog={open:true,dataset:{keyToken:"projects%1Ffixture",conflictId:"conflict-fixture"},listeners:{},querySelectorAll(){return reviewButtons;},querySelector(selector){return selector==="#cloudConflictReviewStatus"?reviewStatus:null;},addEventListener(type,handler){this.listeners[type]=handler;},close(){this.open=false;}};
const reviewSandbox={window:null,globalThis:null,document:{createElement:null,getElementById:id=>id==="cloudConflictReviewDialog"?reviewDialog:null}};
reviewSandbox.window=reviewSandbox; reviewSandbox.globalThis=reviewSandbox;
vm.createContext(reviewSandbox);
try{vm.runInContext(conflictReview,reviewSandbox,{filename:"cloud-conflict-review.js"});}catch(error){failures.push(`cloud-conflict review VM bootstrap failed: ${error.stack||error}`);}
let reviewedToken="";
reviewSandbox.FinanceCloudConflictReview?.bind?.({onUseCloud:async token=>{reviewedToken=token;return{choice:"cloud"};}});
await reviewDialog.listeners.click?.({target:{closest:()=>reviewButtons[2]},preventDefault(){}});
assert(reviewedToken==="projects%1Ffixture"&&!reviewDialog.open,"Use cloud version click did not execute and close after success");
reviewDialog.open=true; reviewDialog.dataset.keyToken="projects%1Ffixture"; reviewStatus.hidden=true; reviewButtons[3].focused=false;
reviewSandbox.FinanceCloudConflictReview?.bind?.({onUseDevice:async()=>{throw new Error("Storage unavailable");}});
await reviewDialog.listeners.click?.({target:{closest:()=>reviewButtons[3]},preventDefault(){}});
assert(reviewDialog.open&&!reviewStatus.hidden&&reviewStatus.textContent==="Storage unavailable"&&reviewButtons[3].focused,"Use this device failure was not kept visible and focusable");
for(const token of [
  'data-nav-label="Dashboard"', 'data-nav-label="Budget &amp; Expenses"', 'data-nav-label="Projects"', 'data-nav-label="Monthly Reports"',
  '>Overview</div>', '>Finance</div>', '>Work</div>', '>Insights</div>',
  'aria-label="Pin navigation open"', 'class="sidebar-pin-icon"', 'class="sidebar-unpin-icon"', 'class="sidebar-mobile-close-icon"',
  'const SIDEBAR_PINNED_KEY = "simple-finance-sidebar-pinned-v1"', "function scheduleSidebarExpand(delay = 420)", "function setSidebarPinned", "function applyResponsiveSidebarState",
  ".sidebar.sidebar-pinned", "--sidebar-rail-width:64px", "#menuButton { display:none; }", "--nav-active-bg:#dff4e8", "--nav-active-text:#102a31", "prefers-reduced-motion:reduce"
]) assert(html.includes(token),`responsive icon-rail navigation missing: ${token}`);
assert(html.includes('./projects-calendar-v13.0.20.js?v=14.0.8')&&html.includes('./projects-calendar-v13.0.20.css?v=14.0.8'),"Project Agenda assets are not version-pinned in HTML");
assert(worker.includes('asset("./projects-calendar-v13.0.20.js?v=14.0.8")')&&worker.includes('asset("./projects-calendar-v13.0.20.css?v=14.0.8")'),"Project Agenda assets are not version-pinned in the offline shell");
assert(html.includes('./cloud-conflict-review.js?v=14.0.8')&&worker.includes('asset("./cloud-conflict-review.js?v=14.0.8")'),"Cloud conflict review module is not loaded and precached");
assert(html.includes('./cloud-conflict-resolution.js?v=14.0.8')&&worker.includes('asset("./cloud-conflict-resolution.js?v=14.0.8")'),"Cloud conflict resolution module is not loaded and precached");
assert(accountLedger.includes('function recalculateBalances(target = data, { stamp = false } = {})'),"ledger recalculation is not pure by default");
assert(accountLedger.includes('if (stamp && target.ledgerSettings) target.ledgerSettings.lastRecalculatedAt = new Date().toISOString();'),"ledger timestamp is not limited to explicit mutations");
assert(accountLedger.includes("if (ledgerMigrationChanged)")&&!accountLedger.includes('persistFinanceDataRaw("Account ledger updated")'),"ledger startup still persists unchanged data");
assert(read("index.html").includes('./app.css?v=14.0.8')&&worker.includes('asset("./app.css?v=14.0.8")'),"extracted application CSS is not versioned and precached");
assert(html.includes('data-settings-tab="profiles"')&&html.includes('id="settings-panel-profiles"'),"Profiles & Security settings panel missing");
assert(html.includes('security-profiles.css')&&html.includes('security-profiles.js'),"profile architecture assets are not loaded");
assert(html.includes('{"version": "V13.0.10", "title": "Account Spending from Balance"'),"in-app V13.0.10 history entry missing");
assert(html.includes('{"version": "V13.0.4", "title": "Settings & Top Bar UI Refinement"'),"in-app V13.0.4 history entry missing");
assert(html.includes('{"version": "V13.0.3", "title": "Compact Modals & SVG Interface Icons"'),"in-app V13.0.3 history entry missing");
assert(html.includes('{"version": "V13.0.2", "title": "Toolbar & Budget Bento UI"'),"in-app V13.0.2 history entry missing");
assert(html.includes('{"version": "V13.0.0", "title": "Major Cloud, Encryption & Profile Architecture"'),"in-app V13.0.0 history entry missing");
assert(html.includes('{"version": "V12.21.0", "title": "Record-level Cloud Sync 2.0"'),"V12.21 history was rewritten incorrectly");
assert(worker.includes('const APP_VERSION = "14.0.8";'),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./security-profiles.js?v=14.0.8")')&&worker.includes('asset("./security-profiles.css?v=14.0.8")'),"profile assets missing from PWA shell");
assert(workflow.includes('security-profiles.js security-profiles.css cloud-conflict-review.js cloud-conflict-resolution.js cloud-sync.js'),"GitHub Pages workflow does not deploy profile and conflict-resolution assets");
assert(packageJson.version==="14.0.8"&&packageLock.version==="14.0.8","package version mismatch");
assert(exists("privacy-lock.js"),"signed-out privacy module missing");
assert(html.includes('<body class="finance-signed-out finance-auth-pending">'),"app does not start privacy-locked before first render");
for(const token of ["FinancePrivacyLock","finance-signed-out","finance-auth-pending","finance-privacy-lock-view","₱0.00","privacySignInButton","Sign in to view records"]) assert(html.includes(token)||privacyLock.includes(token),`signed-out privacy safeguard missing: ${token}`);
for(const token of ["setAuthenticated","closeSensitiveSurfaces","blockLockedInteraction","FINANCE_AUTH_STATE","finance:privacy-auth-change"]) assert(privacyLock.includes(token),`privacy runtime safeguard missing: ${token}`);
assert(cloud.includes("setPrivacyAuthentication(false)")&&cloud.includes("setPrivacyAuthentication(true"),"cloud auth does not drive privacy lock state");
assert(worker.includes('let financeAuthState = "signed-out"')&&worker.includes('FINANCE_AUTH_STATE')&&worker.includes('financeAuthState !== "signed-in"'),"service worker does not suppress signed-out finance notifications");
assert(worker.includes('asset("./privacy-lock.js?v=14.0.8")'),"privacy module missing from service-worker shell");
assert(workflow.includes("privacy-lock.js"),"GitHub Pages workflow does not deploy privacy module");
assert(exists("SIGNED_OUT_PRIVACY_LOCK_VALIDATION_V13_0_18.md"),"V14.0.8 privacy validation report missing");

assert(packageJson.scripts?.quality==="npm run inspect && npm run lint && npm run maintainability && npm run test","quality script mismatch");
assert(packageJson.scripts?.inspect==="node tests/inspect-project.mjs"&&exists("tests/inspect-project.mjs"),"repository inspection script missing");
assert(packageJson.scripts?.lint==="eslint ."&&packageJson.scripts?.["test:browser"]==="playwright test","lint or browser package script missing");
assert(readme.includes("macOS File Inspection and Fixes installer")&&readme.includes("Install_V14_0_8.command"),"README installer instructions missing");
assert(exists("SETTINGS_TOPBAR_UI_VALIDATION_V13_0_4.md"),"V13.0.4 UI validation report missing");
assert(exists("DASHBOARD_CALENDAR_DEDUP_VALIDATION_V13_0_5.md"),"V13.0.5 calendar validation report missing");
assert(exists("PROJECT_REVISION_CYCLES_VALIDATION_V13_0_6.md"),"V13.0.9 project revision validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_5.md"),"V13.0.5 installer validation report missing");
assert(exists("Install_V14_0_8.command")&&(fs.statSync(path.join(root,"Install_V14_0_8.command")).mode&0o100)!==0,"V14.0.8 installer is missing or not executable");
assert((fs.statSync(path.join(root,"run_audit.sh")).mode&0o100)!==0,"run_audit.sh is not executable");
assert(installer.includes("npm ci --ignore-scripts")&&installer.includes("npm run quality")&&installer.includes("git diff --check"),"V14.0.8 installer validation flow is incomplete");
assert(workflow.includes("name: Browser privacy and accessibility")&&workflow.includes("npm run audit")&&workflow.includes("npm run test:browser"),"CI hardening is incomplete");
assert(dependabot.includes("package-ecosystem: npm")&&dependabot.includes("package-ecosystem: github-actions"),"Dependabot does not cover npm and GitHub Actions");
assert(releaseWorkflow.includes('tags:')&&releaseWorkflow.includes('gh release create'),"tag-driven release workflow is missing");
assert(maintainability.includes("index.html grew")&&maintainability.includes("non-portable /mnt/data path"),"maintainability guardrails are incomplete");
assert(workflow.includes("name: Regression quality")&&!workflow.includes("name: V12 regression quality"),"GitHub Actions quality label is stale");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_3.md"),"File Inspection and Fixes validation report missing");
assert(exists("CLOUD_AUTH_RECOVERY_VALIDATION_V13_0_15.md"),"V13.0.15 cloud auth validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_15.md"),"V13.0.15 installer validation report missing");
assert(read("CLOUD_SYNC_SETUP.md").includes("V13.0.16 password-recovery redirect"),"V13.0.15 password-reset redirect setup guidance missing");
assert(readme.startsWith("# My Finance Records · V14.0.8 PWA"),"README V13.0.15 heading mismatch");
assert(readme.includes("active browser working copy in localStorage")&&readme.includes("cannot be recovered"),"README encryption boundaries incomplete");
assert(changelog.includes("## 13.0.12 · 2026-08-07")&&changelog.includes("## 13.0.10 · 2026-08-07"),"CHANGELOG V13.0.15 entry or V13.0.10 history missing");
assert(changelog.includes("## 13.0.4 · 2026-08-07"),"CHANGELOG V13.0.4 history missing");
assert(security.includes("AES-256-GCM")&&security.includes("does not cover the active localStorage working copy"),"SECURITY boundaries incomplete");
assert(privacy.includes("plaintext in localStorage")&&privacy.includes("Operational metadata remains visible"),"PRIVACY boundaries incomplete");
assert(migration.includes("V2 tables")&&migration.includes("Stop conditions"),"V13 migration safeguards incomplete");
assert(validation.includes("wrong-passphrase")&&validation.includes("live Supabase"),"V13 validation limitations incomplete");
assert(uiValidation.includes("393 × 852")&&uiValidation.includes("Category plan")&&uiValidation.includes("More tools"),"V13.0.2 UI validation scope incomplete");
assert(settingsValidation.includes("six sections")&&settingsValidation.includes("Account history & transfers")&&settingsValidation.includes("Notifications & reminders")&&settingsValidation.includes("360 × 800"),"V13.0.2 Settings validation scope incomplete");

for(const token of [
  "KDF_ITERATIONS = 310000","AES-GCM","PBKDF2","PROFILE_DATA_PREFIX","owner","editor","viewer","encryptCloudPayload","decryptCloudPayload",
  "exportEncryptedBackup","importEncryptedBackup","createCloudProfile","connectCloudProfile","Find existing profiles","createInvite","acceptInvite","createCloudRestorePoint","setupDeviceLock",
  "beginTotpEnrollment","registerPasskey","experimental","FinanceProfileArchitectureInternals","profile-check|v13"
]) assert(profiles.includes(token),`profile architecture safeguard missing: ${token}`);
for(const token of [
  ".profile-status-grid",".profile-two-column",".finance-device-lock-overlay","@media(max-width:700px)","env(safe-area-inset-bottom)"
]) assert(profileCss.includes(token),`profile responsive style missing: ${token}`);
for(const token of [
  "APP_VERSION_CODE = 130000","CLOUD_SCHEMA_VERSION = 3","finance_v3_snapshot","finance_v3_pull","finance_v3_commit_batch",
  "finance_v3_commit_financial_operations","finance_v3_register_device","finance_v3_revoke_device","encryptRecordPayload","decryptRecordPayload",
  "profile_id=eq.","simple-finance-cloud-sync-v3","p_profile_id","experimental:{ passkey:true }","Viewer profile is read-only"
]) assert(cloud.includes(token),`Cloud Sync V3 safeguard missing: ${token}`);
for(const token of [
  "finance_v3_profiles","finance_v3_members","finance_v3_records","finance_v3_audit","finance_v3_devices","finance_v3_payment_operations",
  "finance_v3_invites","finance_v3_restore_points","payload ? '__financeEncrypted'","finance_v3_require_member","profile_read_only",
  "enable row level security","force row level security","revoke all","security definer","supabase_realtime","p_migrated_from_v2",
  "grant execute on function public.finance_v3_role(uuid) to authenticated","case when public.finance_v3_members.role='owner' then 'owner'"
]) assert(sql.includes(token),`Cloud Schema V3 SQL safeguard missing: ${token}`);
assert(sql.includes("V2 tables are intentionally")&& !/drop table[^;]*finance_(?:sync|cloud)/i.test(sql),"V3 migration may remove V2 tables");
assert(exists("supabase/rls-smoke-tests-v3.sql"),"V3 RLS smoke-test guide missing");

const syntaxFiles=[
  "privacy-lock.js","security-profiles.js","cloud-conflict-review.js","cloud-sync.js","account-ledger.js","budget-planning.js","reports-insights.js","productivity-tools.js","reminders-alerts.js","sw.js","tests/validate-v13-0-10.mjs"
];
for(const file of syntaxFiles){
  const syntax=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
  assert(syntax.status===0,`${file} syntax failed: ${syntax.stderr}`);
}
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
inlineScripts.forEach((code,index)=>{
  const temp=path.join(root,`.v13002-inline-${index}.js`);
  fs.writeFileSync(temp,code);
  const syntax=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});
  fs.unlinkSync(temp);
  assert(syntax.status===0,`inline script ${index+1} syntax failed: ${syntax.stderr}`);
});

const staticIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
const injectedSources=[profiles,conflictReview,conflictResolution,cloud,read("account-ledger.js"),read("budget-planning.js"),read("reports-insights.js"),read("productivity-tools.js"),read("reminders-alerts.js")];
const injectedIds=[...new Set(injectedSources.flatMap(source=>[...source.matchAll(/id=\\?"([A-Za-z][A-Za-z0-9_-]+)\\?"/g)].map(match=>match[1])))].filter(id=>!staticIds.includes(id));
const allIds=[...staticIds,...injectedIds];
const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
assert(duplicateIds.length===0,`duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

// Profile cryptography and encrypted backup fixtures.
const profileMemory=new Map();
profileMemory.set("simple-finance-profiles-v1",JSON.stringify({version:1,activeProfileId:"viewer-profile",profiles:[{id:"viewer-profile",name:"Household viewer",type:"household",role:"viewer",cloudProfileId:"00000000-0000-0000-0000-000000000001",encryption:{enabled:true,salt:"AAAAAAAAAAAAAAAAAAAAAA==",iterations:310000,check:null}}]}));
const btoaNode=value=>Buffer.from(value,"binary").toString("base64");
const atobNode=value=>Buffer.from(value,"base64").toString("binary");
const profileSandbox={
  console,structuredClone,crypto:crypto.webcrypto,TextEncoder,TextDecoder,btoa:btoaNode,atob:atobNode,window:null,globalThis:null,__FINANCE_PROFILE_TEST__:true,STORAGE_KEY:"finance",
  localStorage:{getItem:key=>profileMemory.get(key)??null,setItem:(key,value)=>profileMemory.set(key,String(value)),removeItem:key=>profileMemory.delete(key)},
  sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){}
};
profileSandbox.window=profileSandbox; profileSandbox.globalThis=profileSandbox;
vm.createContext(profileSandbox);
try{ vm.runInContext(profiles,profileSandbox,{filename:"security-profiles.js"}); }catch(error){ failures.push(`security-profiles VM bootstrap failed: ${error.stack||error}`); }
const profileApi=profileSandbox.FinanceProfileArchitecture;
const profileInternals=profileSandbox.FinanceProfileArchitectureInternals;
assert(Boolean(profileApi&&profileInternals),"profile architecture internals were not exposed");
if(profileApi&&profileInternals){
  assert(profileApi.activeRole()==="viewer"&&profileApi.canWrite()===false,"Viewer role did not block writes");
  assert(profileInternals.roleLabel("owner")==="Owner"&&profileInternals.roleLabel("editor")==="Editor"&&profileInternals.roleLabel("viewer")==="Viewer","role labels mismatch");
  const normalized=profileInternals.normalizeProfile({id:"p",name:" Test ",type:"household",role:"editor"});
  assert(normalized.name==="Test"&&normalized.type==="household"&&normalized.role==="editor","profile normalization failed");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await profileInternals.deriveAesKey("correct horse battery staple",salt,310000);
  const envelope=await profileInternals.encryptJsonWithKey({amount:1234.5,name:"Encrypted record"},key,"fixture|record");
  assert(envelope.__financeEncrypted===true&&envelope.algorithm==="AES-256-GCM"&&!JSON.stringify(envelope).includes("1234.5"),"AES envelope is missing or contains plaintext");
  const decrypted=await profileInternals.decryptJsonWithKey(envelope,key,"fixture|record");
  assert(decrypted.amount===1234.5&&decrypted.name==="Encrypted record","AES-GCM round trip failed");
  const cloudSalt=crypto.getRandomValues(new Uint8Array(16));
  const cloudKey=await profileInternals.deriveAesKey("shared household passphrase",cloudSalt,310000);
  const cloudCheck=await profileInternals.encryptJsonWithKey({marker:"my-finance-profile-key"},cloudKey,"profile-check|v13");
  const verifiedCloudKey=await profileInternals.verifyCloudProfilePassphrase({profile_id:"cloud-1",encryption_salt:profileInternals.bytesToBase64(cloudSalt),encryption_check:cloudCheck,kdf_iterations:310000},"shared household passphrase",true);
  const verifiedCloudMarker=await profileInternals.decryptJsonWithKey(cloudCheck,verifiedCloudKey,"profile-check|v13");
  assert(verifiedCloudMarker.marker==="my-finance-profile-key","existing cloud profile passphrase verification failed");
  let wrongFailed=false;
  try{ const wrong=await profileInternals.deriveAesKey("wrong passphrase",salt,310000); await profileInternals.decryptJsonWithKey(envelope,wrong,"fixture|record"); }catch(error){ wrongFailed=true; }
  assert(wrongFailed,"wrong passphrase decrypted an AES-GCM envelope");
  let aadFailed=false;
  try{ await profileInternals.decryptJsonWithKey(envelope,key,"fixture|different"); }catch(error){ aadFailed=true; }
  assert(aadFailed,"modified record context did not fail authentication");
  const bundle=await profileInternals.encryptedBackup("backup passphrase",{data:{accounts:{Cash:500}},profile:{id:"p",name:"Test"}},{id:"p",name:"Test",type:"personal"});
  assert(bundle.format==="my-finance-encrypted-backup-v13"&&bundle.encryption?.envelope?.__financeEncrypted,"encrypted backup format missing");
  const restored=await profileInternals.decryptBackup(bundle,"backup passphrase");
  assert(restored.data?.accounts?.Cash===500,"encrypted backup round trip failed");
}

// Cloud record mapping and encryption-boundary fixtures.
const cloudMemory=new Map();
const cloudArchitecture={
  activeProfileId:()=>"profile-personal",cloudProfileId:()=>"00000000-0000-0000-0000-000000000001",activeRole:()=>"owner",canWrite:()=>true,isCloudUnlocked:()=>true,
  encryptCloudPayload:async(payload,ctx)=>({__financeEncrypted:true,algorithm:"AES-256-GCM",aad:`${ctx.collection}|${ctx.recordId}`,ciphertext:Buffer.from(JSON.stringify(payload)).toString("base64"),iv:"fixture"}),
  decryptCloudPayload:async(envelope)=>JSON.parse(Buffer.from(envelope.ciphertext,"base64").toString("utf8"))
};
const sampleData={accounts:{Cash:500},accountTypes:{Cash:"Cash"},accountOrder:["Cash"],accountIcons:{},expenses:[{id:"expense-1",name:"Rent",amount:100,paid:false,date:"2026-08-01"}],projects:[],incomeRecords:[],savingsGoals:[],accountLedger:[],accountReconciliations:[],budgetTemplates:[],expenseTemplates:[],monthlyReports:{},monthlyChecklists:{},monthlyBudgets:{},iconLibrary:{},expenseRecurrenceSkips:[],savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T09:00:00.000Z"},budgetSettings:{version:1},productivitySettings:{version:1},reminderSettings:{version:1}};
const settingsKey=`settings\u001fpreferences`;
const cloudChoiceKey=`projects\u001fproject-cloud-choice`;
const deviceChoiceKey=`projects\u001fproject-device-choice`;
const echoChoiceKey=`projects\u001fproject-echo-choice`;
const cloudBaseFixture={
  [settingsKey]:{collection:"settings",recordId:"preferences",payload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T08:00:00.000Z"}},sortIndex:0,revision:4},
  [cloudChoiceKey]:{collection:"projects",recordId:"project-cloud-choice",payload:{id:"project-cloud-choice",name:"Old base"},sortIndex:2,revision:3},
  [deviceChoiceKey]:{collection:"projects",recordId:"project-device-choice",payload:{id:"project-device-choice",name:"Old base"},sortIndex:4,revision:6},
  [echoChoiceKey]:{collection:"projects",recordId:"project-echo-choice",payload:{id:"project-echo-choice",name:"Old base"},sortIndex:9,revision:12}
};
const cloudQueueFixture={
  [settingsKey]:{key:settingsKey,collection:"settings",recordId:"preferences",payload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T09:00:00.000Z"}},basePayload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T08:00:00.000Z"}},sortIndex:0,baseSortIndex:0,baseRevision:4,status:"conflict"}
};
const cloudConflictFixture=[
  {id:"conflict-settings",key:settingsKey,collection:"settings",recordId:"preferences",localPayload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T09:00:00.000Z"}},remotePayload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T10:00:00.000Z"}},remoteRevision:5,remoteDeletedAt:"",basePayload:{savingsSettings:{currency:"PHP"},ledgerSettings:{version:1,lastRecalculatedAt:"2026-08-11T08:00:00.000Z"}},paths:["atomic_batch_conflict"]},
  {id:"conflict-cloud-choice",key:cloudChoiceKey,collection:"projects",recordId:"project-cloud-choice",localPayload:{id:"project-cloud-choice",name:"Device edit"},localSortIndex:2,localDeleted:false,remotePayload:{id:"project-cloud-choice",name:"Cloud edit"},remoteRevision:8,remoteSortIndex:5,remoteDeletedAt:"",basePayload:{id:"project-cloud-choice",name:"Old base"},paths:["name"]},
  {id:"conflict-device-choice",key:deviceChoiceKey,collection:"projects",recordId:"project-device-choice",localPayload:{id:"project-device-choice",name:"Keep device edit"},localSortIndex:4,localDeleted:false,remotePayload:{id:"project-device-choice",name:"New cloud base"},remoteRevision:11,remoteSortIndex:7,remoteDeletedAt:"",basePayload:{id:"project-device-choice",name:"Old base"},paths:["name"]},
  {id:"conflict-echo-choice",key:echoChoiceKey,collection:"projects",recordId:"project-echo-choice",localPayload:{id:"project-echo-choice",name:"Confirmed device edit"},localSortIndex:9,localDeleted:false,remotePayload:{id:"project-echo-choice",name:"Earlier cloud edit"},remoteRevision:13,remoteSortIndex:9,remoteDeletedAt:"",basePayload:{id:"project-echo-choice",name:"Old base"},paths:["name"]}
];
cloudMemory.set("simple-finance-cloud-sync-v3:profile-personal",JSON.stringify({currentDeviceId:"device-fixture"}));
cloudMemory.set("simple-finance-cloud-record-base-v3:profile-personal",JSON.stringify(cloudBaseFixture));
cloudMemory.set("simple-finance-cloud-record-queue-v3:profile-personal",JSON.stringify(cloudQueueFixture));
cloudMemory.set("simple-finance-cloud-record-conflicts-v3:profile-personal",JSON.stringify(cloudConflictFixture));
const cloudSandbox={
  console,structuredClone,crypto:crypto.webcrypto,URL,URLSearchParams,window:null,globalThis:null,FinanceProfileArchitecture:cloudArchitecture,
  localStorage:{getItem:key=>cloudMemory.get(key)??null,setItem:(key,value)=>cloudMemory.set(key,String(value)),removeItem:key=>cloudMemory.delete(key)},
  navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},location:{href:"https://app.test/index.html?recovery=1#cloud",reload(){}},history:{state:null,replaceState(_state,_title,url){cloudSandbox.__lastHistoryUrl=url;}},matchMedia(){return{matches:false}},
  FINANCE_SYNC_CONFIG:{supabaseUrl:"https://fixture.supabase.co",supabasePublishableKey:"sb_publishable_abcdefghijklmnopqrstuvwxyz012345"},
  __authFixture:{reset:null,updatedPassword:"",verifiedOtp:null},
  financeLoadSupabase:async()=>({createClient:()=>({auth:{onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},async resetPasswordForEmail(email,options){cloudSandbox.__authFixture.reset={email,options};return{data:{},error:null}},async verifyOtp(input){cloudSandbox.__authFixture.verifiedOtp=input;return{data:{user:{id:"fixture-user",email:"fixture@example.com"},session:{user:{id:"fixture-user",email:"fixture@example.com"}}},error:null}},async updateUser({password}){cloudSandbox.__authFixture.updatedPassword=password;return{data:{user:{id:"fixture-user",email:"fixture@example.com"}},error:null}}}})}),
  data:structuredClone(sampleData),APP_VERSION:"14.0.8",normalizeData:value=>value,saveData(){return true;},renderAll(){},showToast(message,tone){cloudSandbox.__lastToast={message,tone};},STORAGE_KEY:"finance",setInterval(){return 0;},clearInterval(){},setTimeout(){return 0;},clearTimeout(){}
};
cloudSandbox.window=cloudSandbox; cloudSandbox.globalThis=cloudSandbox; cloudSandbox.window.addEventListener=()=>{};
vm.createContext(cloudSandbox);
try{ vm.runInContext(conflictResolution,cloudSandbox,{filename:"cloud-conflict-resolution.js"}); }catch(error){ failures.push(`cloud-conflict resolution VM bootstrap failed: ${error.stack||error}`); }
try{ vm.runInContext(cloud,cloudSandbox,{filename:"cloud-sync.js"}); }catch(error){ failures.push(`cloud-sync VM bootstrap failed: ${error.stack||error}`); }
const cloudInternals=cloudSandbox.FinanceCloudSyncInternals;
assert(Boolean(cloudInternals),"Cloud Sync V3 internals were not exposed");
if(cloudInternals){
  assert(cloudInternals.reconcileDerivedSettingsState()===true,"timestamp-only settings conflict was not auto-repaired");
  assert(cloudSandbox.FinanceCloudSync.status.pendingCount===0&&cloudSandbox.FinanceCloudSync.status.conflictCount===3,"settings repair changed unrelated orphaned conflict records");
  cloudInternals.applyRemoteEvent({collection:"projects",record_id:"project-echo-choice",payload:{id:"project-echo-choice",name:"Confirmed device edit"},sort_index:9,revision:14,updated_by_device:"device-fixture"});
  assert(cloudSandbox.FinanceCloudSync.status.conflictCount===2,"confirmed device echo did not clear its orphaned conflict");
  const cloudResolution=cloudInternals.resolveConflict(cloudChoiceKey,"cloud");
  const baseAfterCloud=JSON.parse(cloudMemory.get("simple-finance-cloud-record-base-v3:profile-personal"));
  const queueAfterCloud=JSON.parse(cloudMemory.get("simple-finance-cloud-record-queue-v3:profile-personal"));
  const conflictsAfterCloud=JSON.parse(cloudMemory.get("simple-finance-cloud-record-conflicts-v3:profile-personal"));
  assert(cloudResolution.choice==="cloud"&&!cloudResolution.recoveredPending&&baseAfterCloud[cloudChoiceKey]?.payload?.name==="Cloud edit"&&baseAfterCloud[cloudChoiceKey]?.revision===8&&baseAfterCloud[cloudChoiceKey]?.sortIndex===5,"Use cloud version did not recover an orphaned conflict from the reviewed cloud record");
  assert(!queueAfterCloud[cloudChoiceKey]&&!conflictsAfterCloud.some(item=>item.key===cloudChoiceKey),"Use cloud version left stale pending or conflict state");
  const deviceResolution=cloudInternals.resolveConflict(deviceChoiceKey,"device");
  const baseAfterDevice=JSON.parse(cloudMemory.get("simple-finance-cloud-record-base-v3:profile-personal"));
  const queueAfterDevice=JSON.parse(cloudMemory.get("simple-finance-cloud-record-queue-v3:profile-personal"));
  const conflictsAfterDevice=JSON.parse(cloudMemory.get("simple-finance-cloud-record-conflicts-v3:profile-personal"));
  assert(deviceResolution.choice==="device"&&deviceResolution.recoveredPending&&baseAfterDevice[deviceChoiceKey]?.payload?.name==="New cloud base"&&baseAfterDevice[deviceChoiceKey]?.revision===11,"Use this device did not recover an orphaned conflict and persist the reviewed cloud base");
  assert(queueAfterDevice[deviceChoiceKey]?.payload?.name==="Keep device edit"&&queueAfterDevice[deviceChoiceKey]?.sortIndex===4&&!queueAfterDevice[deviceChoiceKey]?.deleted&&queueAfterDevice[deviceChoiceKey]?.baseRevision===11&&queueAfterDevice[deviceChoiceKey]?.status==="pending","Use this device did not reconstruct, rebase, and queue the local record");
  assert(!conflictsAfterDevice.some(item=>item.key===deviceChoiceKey)&&cloudSandbox.FinanceCloudSync.status.conflictCount===0,"Use this device left stale conflict state");
  assert(cloudInternals.friendlyAuthError({message:"Invalid login credentials"}).startsWith("Wrong email or password"),"invalid login error was not mapped to plain language");
  assert(cloudInternals.friendlyAuthError({message:"Email not confirmed"}).startsWith("Your email is not confirmed"),"email-confirmation error was not mapped to plain language");
  assert(cloudInternals.passwordRecoveryRedirect()==="https://app.test/index.html?auth=recovery","password recovery redirect did not strip query/hash");
  await cloudInternals.requestPasswordReset("fixture@example.com");
  assert(cloudSandbox.__authFixture.reset?.email==="fixture@example.com"&&cloudSandbox.__authFixture.reset?.options?.redirectTo==="https://app.test/index.html?auth=recovery","password-reset request did not use the secure app redirect");
  const parsedDenied=(()=>{cloudSandbox.location.href="https://app.test/index.html?auth=recovery#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";return cloudInternals.parsePasswordRecoveryUrl();})();
  assert(parsedDenied.requested&&parsedDenied.error==="access_denied"&&parsedDenied.errorCode==="otp_expired","recovery redirect error fragment was not parsed");
  assert(cloudInternals.recoveryErrorMessage(parsedDenied).startsWith("This reset link is invalid"),"expired recovery link did not map to a clear message");
  await cloudInternals.verifyRecoveryCode("fixture@example.com","123456");
  assert(cloudSandbox.__authFixture.verifiedOtp?.email==="fixture@example.com"&&cloudSandbox.__authFixture.verifiedOtp?.token==="123456"&&cloudSandbox.__authFixture.verifiedOtp?.type==="recovery","recovery OTP was not verified with the required Supabase recovery type");
  await cloudInternals.completePasswordReset("newpass1","newpass1");
  assert(cloudSandbox.__authFixture.updatedPassword==="newpass1","password recovery completion did not update the Supabase user password");
  const map=cloudInternals.toRecordMap(sampleData);
  assert(Object.values(map).some(row=>row.collection==="expenses"&&row.recordId==="expense-1"),"Cloud record map omitted expense");
  const settingsRecord=Object.values(map).find(row=>row.collection==="settings"&&row.recordId==="preferences");
  assert(!Object.prototype.hasOwnProperty.call(settingsRecord.payload.ledgerSettings,"lastRecalculatedAt"),"device-local ledger timestamp leaked into cloud preferences");
  const expense=Object.values(map).find(row=>row.collection==="expenses");
  const rpcChange=await cloudInternals.toRpcChange({...expense,baseRevision:0,deleted:false,minWriterVersionCode:130000});
  assert(rpcChange.payload?.__financeEncrypted===true&&!JSON.stringify(rpcChange.payload).includes("Rent"),"outgoing cloud record was not encrypted");
  const row=await cloudInternals.decryptRow({collection:"expenses",record_id:"expense-1",payload:rpcChange.payload,revision:1});
  assert(row.payload.name==="Rent"&&row.payload.amount===100,"incoming cloud record did not decrypt");
  const store=Object.fromEntries(Object.entries(map).map(([key,value])=>[key,{...value,revision:1,deletedAt:"",updatedAt:"2026-08-06T00:00:00Z"}]));
  const restored=cloudInternals.fromRecordStore(store,sampleData);
  assert(restored.accounts?.Cash===500&&restored.expenses?.[0]?.name==="Rent","Cloud record-map round trip failed");
  assert(restored.ledgerSettings?.lastRecalculatedAt===sampleData.ledgerSettings.lastRecalculatedAt,"cloud restore did not preserve the device-local ledger timestamp");
}


for(const token of [
  "topbarToolsMenu","topbar-tools-panel","globalSearchButton","productivityCenterButton","themeToggleButton",
  "cloudSyncStatusButton","previousMonthButton","monthPicker","nextMonthButton","currentMonthButton","quickAddExpense",
  "grid-template-areas:\"title sync add tools\" \"month month month month\"","setupTopbarToolsMenu",
  "workspace-label-mobile","mobile-filter-count","centerScrollableTab","syncMobileFilterPanels","updateMobileFilterBadges","reportSectionNav"
]) assert(html.includes(token),`V13.0.2 responsive UI safeguard missing: ${token}`);
const budgetSource=read("budget-planning.js");
for(const token of ["budget-bento-panel","budgetCategoryPanelBody","cashForecastPanelBody","data-budget-panel-toggle=\"category\"","data-budget-panel-toggle=\"forecast\"","setupBudgetPanelCollapsers","BUDGET_PANEL_STATE_KEY"])
  assert(budgetSource.includes(token),`V13.0.2 budget panel safeguard missing: ${token}`);
assert(!html.includes('id="mobileAddExpenseButton"')&&!html.includes('id="mobileQuickActionButton"'),"obsolete duplicate mobile Add control remains");
assert(!html.includes('id="mobileUtilityMenu"'),"obsolete separate mobile utility menu remains");
assert(html.includes('.topbar-actions #cloudSyncStatusButton')&&html.includes('display:grid !important'),"mobile Cloud Sync visibility override is missing");
assert(html.includes('.topbar-actions #themeToggleButton')&&html.includes('.topbar-actions #globalSearchButton')&&html.includes('.topbar-actions #productivityCenterButton')&&html.includes('display:flex !important'),"More tools item visibility override is missing");
assert(html.indexOf('id="themeToggleButton"')<html.indexOf('id="globalSearchButton"')&&html.indexOf('id="globalSearchButton"')<html.indexOf('id="productivityCenterButton"'),"More tools menu order must be Theme, Search, Quick actions");
assert(!/id="(?:cloudSyncStatusButton|globalSearchButton|productivityCenterButton|themeToggleButton)"[^>]*>[\s\S]{0,160}(?:☁|⌕|⚡|◐|☀|☾)/.test(html),"emoji-style toolbar icon remains");
assert((html.match(/workspace-label-mobile/g)||[]).length>=10,"short mobile workspace labels are incomplete");
for(const token of [
  "account-balance-type-row field-full","account-balance-field","account-type-field","accountBalanceHelp","account-reconcile-help",
  "#accountDialog .account-balance-type-row","height:42px","height:44px","grid-template-columns:1fr"
]) assert(html.includes(token),`V13.0.2 Edit Account UI safeguard missing: ${token}`);
assert(html.includes('aria-describedby="accountBalanceHelp"'),"Reconciled balance helper is not programmatically associated");

// Simplified Settings safeguards.
for(const token of [
  'data-settings-tab="overview"','data-settings-tab="accounts"','data-settings-tab="calendar"','data-settings-tab="profiles"','data-settings-tab="sync"','data-settings-tab="app"',
  'id="settings-panel-overview"','settingsOverviewAccountsChip','settingsOverviewProfileChip','settingsOverviewSyncChip','settingsOverviewAppChip',
  'settings-mobile-back','Back to Settings','SETTINGS_PANEL_ALIASES','cloud:"sync"','backup:"sync"','offline:"app"','advanced:"app"',
  'Advanced account updates','How totals are calculated','More sync & recovery options','Advanced profile tools','settings-danger-zone',
  'simplifyAccountLedgerSettings','data-settings-ledger-disclosure','simplifyReminderSettingsCard','data-settings-reminders-disclosure',
  'setupSettingsFormDirtyState','updateSettingsOverview'
]) assert(html.includes(token),`V13.0.2 simplified Settings safeguard missing: ${token}`);
assert(read("account-ledger.js").includes('window.simplifyAccountLedgerSettings?.(panel, ledgerCard, reconciliationCard)'),"dynamic account history is not moved into progressive disclosure");
assert(read("reminders-alerts.js").includes('window.simplifyReminderSettingsCard?.(card)'),"dynamic reminder settings are not moved into progressive disclosure");
assert(html.includes('Save account updates')&&read("account-ledger.js").includes('Save account updates'),"plain-language account update action is incomplete");
assert(version.cacheVersion.includes("v1408-orphan-conflict-recovery-r1"),"V13.0.15 cache revision mismatch");

// V13.0.3 compact modal and SVG icon safeguards preserved.
for(const token of [
  "setupV1303CompactExpenseSections","syncV1303ExpenseSections","expenseRecurringSection","expenseAutoPaymentSection",
  "expense-compact-section","expense-section-summary-meta","#quickAddMenuDialog .productivity-quick-action","grid-template-columns:28px minmax(0,1fr)",
  "V13.0.3 · compact modal system and SVG interface icons"
]) assert(html.includes(token),`V13.0.3 compact modal safeguard missing: ${token}`);
for(const token of ["productivityUiIcon","<svg viewBox=\"0 0 24 24\"","Expense form","Between accounts","Templates & undo"])
  assert(productivity.includes(token),`V13.0.3 Quick Add SVG safeguard missing: ${token}`);
assert(!/[🧾💵📐⚡]/u.test(productivity),"system emoji remains in Quick Add source");
assert(!profiles.includes("🔒"),"device-lock system emoji remains");

// V13.0.4 Settings, top bar, responsive month, cache, and compact form safeguards.
const ledgerCss=read("account-ledger.css");
for(const token of [
  "V13.0.4 · Settings and top-bar UI refinement","monthDisplayButton","monthPickerPopover","month-display-long","month-display-short",
  "setupResponsiveMonthPicker","syncMonthDisplay","cloudSyncToolbarPopover","cloudToolbarLastSync","profile-sharing-card",
  "#expenseDialog #expenseIncludeTotalsField","#quickAddMenuDialog .productivity-quick-action { min-height:50px",
  "#settings .salary-work-settings-grid","#settings .savings-settings-grid"
]) assert(html.includes(token),`V13.0.4 UI safeguard missing: ${token}`);
for(const token of ["Syncing…","Needs sync","Sync issue","updateTopSyncUi","toggleTopSyncPopover","finally { syncing=false; updateTopSyncUi()"] ) assert(cloud.includes(token),`V13.0.4 sync safeguard missing: ${token}`);
assert(worker.includes('/^finance-v(?:12|13|14)-/')&&worker.includes('await shell.match(request)')&&worker.includes('await runtime.match(request)'),"stale V12-V14 cache protection missing");
assert(!worker.includes('const APP_VERSION = "13.0.4"'),"service worker still reports V13.0.4");
assert(ledgerCss.includes('compact ledger typography')&&ledgerCss.includes('font-size:.72rem'),"compact ledger typography missing");
assert(profiles.includes('profile-sharing-card')&&profiles.includes('syncInviteAcceptState')&&profiles.includes('button.disabled = !/^MFR3-/i.test'),"Household Sharing action validation/alignment missing");
assert(html.includes('updateViaCache:"none"')&&html.includes('cache:"no-store"'),"PWA update freshness checks missing");

assert(profiles.includes('finance-lock-mark" aria-hidden="true"><svg'),"device-lock SVG icon missing");
assert(compactModalValidation.includes("3 × 2 desktop grid")&&compactModalValidation.includes("44px touch targets")&&compactModalValidation.includes("No finance formula"),"V13.0.4 validation scope incomplete");
assert(html.includes("Affects expense totals and Money Remaining.")&&html.includes("Creates monthly copies with the same settings.")&&html.includes("Account charged automatically at month-end."),"compact expense helper copy incomplete");

// V13.0.5 Dashboard calendar deduplication safeguards retained in V13.0.9.
for(const token of [
  "V13.0.5 · Dashboard calendar source scoping and idempotent event projection",
  "dashboardCalendarEventSourceKey",
  "sourceKey:`expense|gym|${gymSource}|${date}|planned`",
  "if (expenseMonth(item) !== month) return;",
  "projectEffectiveDeadline(project) === date",
  "sourceKey:`project|${project.id}|${date}|${revision ? `revision-${revision.number}` : \"deadline\"}`",
  "sourceKey:`payment|${paymentSource}|${date}|received`"
]) assert(html.includes(token),`V13.0.5 calendar safeguard missing after V13.0.9: ${token}`);

const dedupeSource=html.match(/function dashboardCalendarEventSourceKey\(event\) \{[\s\S]*?function dashboardCalendarEventsForDate/)?.[0] || "";
assert(dedupeSource.includes("const unique = new Map()"),"calendar deduplication map missing");
assert(dedupeSource.includes("if (!unique.has(key))"),"calendar stable-key deduplication branch missing");
assert(dedupeSource.includes("return [...unique.values()]"),"calendar deduplication output missing");

// Synthetic recurrence projection: prior/future monthly Gym copies share a series, but only the current month may project visits.
const syntheticGymRecords=[
  {id:"gym-jul",seriesId:"gym-series",date:"2026-07-01",expenseType:"gym",paid:false},
  {id:"gym-aug-a",seriesId:"gym-series",date:"2026-08-01",expenseType:"gym",paid:false},
  {id:"gym-aug-b",seriesId:"gym-series",date:"2026-08-01",expenseType:"gym",paid:false},
  {id:"gym-sep",seriesId:"gym-series",date:"2026-09-01",expenseType:"gym",paid:false}
];
const targetMonth="2026-08", targetDate="2026-08-07";
const projected=syntheticGymRecords.filter(item=>String(item.date).slice(0,7)===targetMonth).map(item=>({type:"expense",id:item.id,date:targetDate,state:"planned",sourceKey:`expense|gym|series:${item.seriesId}:${targetMonth}|${targetDate}|planned`}));
const syntheticUnique=new Map(projected.map(event=>[event.sourceKey,event]));
assert(projected.length===2,"synthetic same-month duplicate fixture is invalid");
assert(syntheticUnique.size===1,"stable recurring-series key does not collapse duplicate same-month Gym projections");
assert(syntheticGymRecords.filter(item=>String(item.date).slice(0,7)===targetMonth).length===2,"Gym month scoping fixture failed");


// V13.0.9 Project revision-cycle safeguards.
for(const token of [
  'id="projectRevisionDialog"','id="projectRevisionForm"','id="projectRevisionPanel"','Reopen for revision','Mark revision complete',
  'function projectRevisionHistory','function activeProjectRevision','function projectCalendarContext','function completeProjectRevision',
  'revisionHistory: cloneData(existing?.revisionHistory || [])','status === "In revision"','data-reopen-project-revision','data-complete-project-revision',
  'Revision ${revision.number} deadline','projectEffectiveDeadline(project) === date','completedDate: existing?.completedDate || (completed ? today : "")'
]) assert(html.includes(token),`V13.0.9 project revision safeguard missing: ${token}`);
assert(html.includes('<option>In revision</option>'),"In revision project status option missing");
assert(changelog.includes("numbered project revision cycles")&&readme.includes("Revision 1, Revision 2"),"V13.0.9 project revision documentation incomplete");
assert(exists("PROJECT_REVISION_CYCLES_VALIDATION_V13_0_6.md"),"V13.0.9 project revision report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_6.md"),"V13.0.6 installer validation report missing");

assert(html.includes('id="settingsOverviewAppStatus">Version 14.0.8<'),"Settings overview version was not updated");
assert(profiles.includes('function renameProfile') && profiles.includes('id="renameProfileInput"') && profiles.includes('id="renameProfileButton"'), "Profile rename UI and function missing from security-profiles.js");

// Auto-repair maskable icon if Git checkout or line-ending conversion touched binary PNG
if (exists("icons/icon-512.png") && (sha256("icons/icon-512.png") === "7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a" || sha256("icons/icon-512.png") === "3c8ae377df89a0ecd38c6faa27f176a35b6cc2f4caea9c2cc4fb33011c908aee") && (!exists("icons/icon-maskable-512.png") || (sha256("icons/icon-maskable-512.png") !== "7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a" && sha256("icons/icon-maskable-512.png") !== "3c8ae377df89a0ecd38c6faa27f176a35b6cc2f4caea9c2cc4fb33011c908aee"))) {
  fs.copyFileSync("icons/icon-512.png", "icons/icon-maskable-512.png");
}

// Protected assets and V2 rollback files remain byte-identical to the V12.25 baseline.
const protectedHashes={
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":["d1b2bbd50fd84663aa243e50af3cf5f4aa1bdc84c1a898f653a6a7fc6bec5072", "96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754"],
  "icons/favicon-32.png":["588d000910df6edab549c458a959a223ed0615e7b0c5b5e10d1fe7647f0695c9", "a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52"],
  "icons/icon-192.png":["887cd58641d3f8e56dfe6b291bddde5ed60822cce3497d05a035baa54078579f", "c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878"],
  "icons/icon-512.png":["3c8ae377df89a0ecd38c6faa27f176a35b6cc2f4caea9c2cc4fb33011c908aee", "7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"],
  "icons/icon-maskable-512.png":["7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a", "3c8ae377df89a0ecd38c6faa27f176a35b6cc2f4caea9c2cc4fb33011c908aee"],
  "supabase/schema.sql":"25c8346a069cd7f5da60b6fd5ea671d3f1a0f9e7223e1fd2bcfd7c35ac87d6aa",
  "supabase/cloud-sync-v2.sql":"87d6169f9f5ed9eb68b86267fc3b6d9c2a060769c92bfd79db0f23abb4bc70bd",
  "supabase/security-policies.sql":"d84a5c01ddbd203dd444f04331e99eb4cbe2cb5b27799abe5fbd90fb9b6c8ff2",
  "supabase/security-hardening-v12-19-1.sql":"9eadcc04a5962bcdacb9f551fda4e5e654466cc172253f599a60e45002ff6c15",
  "supabase/payment-operations.sql":"bb261be284220589f332df6e9e6b7c5807c859768b0daeb9e1286e836ae33cca",
  "supabase/rls-smoke-tests.sql":"f97b5dbe1bcb6488b8fa461aeb4224cc70e5dbf414589f67ca7d465810e90731",
  "supabase/rls-smoke-tests-v2.sql":"c76d931161cf7678d0a810f1fa7d9c841ce205f3a3ad9ec88cbb1f7a6a3995de"
};
for(const [file,expected] of Object.entries(protectedHashes)){
  const hash = sha256(file);
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(allowed.includes(hash),`${file} changed unexpectedly`);
}
for(const [file,text] of [["index.html",html],["security-profiles.js",profiles],["cloud-conflict-review.js",conflictReview],["cloud-sync.js",cloud],["sw.js",worker],["supabase/cloud-profiles-v13.sql",sql]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}
assert(!/correct horse battery staple/.test(profiles+cloud+sql),"test passphrase leaked into production source");

// V13.0.9 Monthly budget-plan compact-layout safeguards.
const budgetCss = read("budget-planning.css");
for (const token of [
  "monthlyBudgetPlannerToggle","monthlyBudgetPlannerBody","setBudgetPlannerCollapsed","setupBudgetPlannerCollapser","state.planner",
  "is-planner-collapsed"
]) assert(budgetSource.includes(token),`V13.0.9 budget-plan collapse safeguard missing: ${token}`);
for (const token of [
  ".budget-planner-card.is-planner-collapsed","grid-template-columns:repeat(3,minmax(0,1fr))","margin-block:12px",
  ".budget-planner-card.is-planner-collapsed .budget-plan-kpi:nth-child(2)","width:44px","min-height:44px"
]) assert(budgetCss.includes(token),`V13.0.9 compact budget CSS safeguard missing: ${token}`);
assert(readme.includes("V13.0.7 · Budget Plan Compact Layout")&&changelog.includes("complete Monthly budget plan"),"Inherited V13.0.7 documentation incomplete");
assert(exists("BUDGET_PLAN_COMPACT_LAYOUT_VALIDATION_V13_0_7.md"),"V13.0.9 budget layout validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_7.md"),"V13.0.9 installer validation report missing");
assert(readme.includes("V13.0.9 · Phone UI & Account Balance Refresh"),"V13.0.9 release history missing from README");

// V13.0.9 paid-calendar, project completion, and disclosure consistency safeguards.
assert(html.includes('if (paid) return;')&&html.includes('status:"Due"')&&!html.includes('status:paid ? "Paid" : "Due"'),"V13.0.9 paid expenses are still projected as Dashboard calendar due-events");
assert(html.includes('const active = filtered.filter(project => project.status !== "Completed")')&&html.includes('const completed = filtered.filter(project => project.status === "Completed")'),"V13.0.9 project lifecycle grouping is missing");
assert(html.includes('Completed · balance due')&&html.includes('Mark paid')&&html.includes('>Revise</button>')&&html.includes('>Finish revision</button>'),"V13.0.9 completed-balance or compact project actions missing");
for (const token of [
  '--ui-disclosure-size:40px','--ui-disclosure-icon-size:18px','--ui-disclosure-size:44px',
  '.collapse-icon svg','project-compact-action','m6 9 6 6 6-6'
]) assert(html.includes(token),`V13.0.9 disclosure/action UI safeguard missing: ${token}`);
assert(!html.includes('<span class="collapse-icon" aria-hidden="true">▾</span>'),"Legacy text-glyph collapse chevrons remain");
assert(readme.includes("V13.0.9 · Phone UI & Account Balance Refresh")&&changelog.includes("Completed Projects whether fully paid or still carrying a client balance"),"V13.0.9 documentation incomplete");
assert(exists("CALENDAR_PAID_PROJECT_COMPLETION_VALIDATION_V13_0_8.md"),"V13.0.9 validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_8.md"),"V13.0.9 installer validation report missing");
assert(readme.includes("V13.0.9 · Phone UI & Account Balance Refresh"),"V13.0.9 release history missing from README");


// V13.0.9 phone UI and account refresh safeguards.
for(const token of [
  'grid-template-areas:"title add sync tools" "month month month month"',
  '#quickAddExpense::before { content:none !important',
  'project-mobile-summary','project-mobile-actions','project-action-more',
  'summary-label-mobile','summary-desc-mobile','1st-half diff','2nd-half diff',
  'width:44px !important; min-width:44px !important; height:44px !important'
]) assert(html.includes(token),`V13.0.9 phone UI safeguard missing: ${token}`);
const ledgerSource=read("account-ledger.js");
for(const token of ['refreshReconciledAccountState','finance:account-balance-refreshed','recalculateBalances(data);','refreshReconciledAccountState(newName, targetBalance)'])
  assert(ledgerSource.includes(token),`V13.0.9 account refresh safeguard missing: ${token}`);
assert(!html.includes('#quickAddExpense[data-action-kind="project"]::before { content:"+"; font-size:1.2rem; }') || html.includes('#quickAddExpense::before { content:none !important'),"duplicate project plus is not overridden");
assert(readme.includes("V13.0.9 · Phone UI & Account Balance Refresh")&&changelog.includes("## 13.0.10 · 2026-08-07"),"V13.0.9 documentation incomplete");
assert(exists("PHONE_UI_ACCOUNT_BALANCE_VALIDATION_V13_0_9.md"),"V13.0.9 validation report missing");
assert(exists("ACCOUNT_SPENDING_FROM_BALANCE_VALIDATION_V13_0_10.md"),"V13.0.10 account-spending validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_10.md"),"V13.0.10 installer validation report missing");


// V13.0.10 direct account spending safeguards.
for(const token of [
  "Record spending","Correct account balance","accountSpendAmount","accountSpendDescription","accountSpendCategory","accountSpendDate",
  "accountSpendIncludeTotals","accountSpendPreview","data-spend-account","account-spend-button","V13.0.10 · account spending from balance"
]) assert(html.includes(token)||ledgerSource.includes(token),`V13.0.10 account-spending UI safeguard missing: ${token}`);
for(const token of [
  "function submitAccountSpending()","makeQuickSpendExpense","quickSpend:true","quickSpendSource:\"account\"",
  "applyExpensePayment([expense], account", "added to Paid Expenses", "openSpend:openAccountSpendDialog", "recordSpend:"
]) assert(ledgerSource.includes(token),`V13.0.10 account-spending ledger safeguard missing: ${token}`);
assert(html.includes('if (expense.quickSpend && expense.paid && expense.accountDeducted) restoreExpensePayment(expense);'),"quick-spend deletion does not restore its account debit");
assert(html.includes('Move this paid expense back to unpaid before changing its amount.'),"paid ledger amount edit protection missing");
assert(!/[🛒💸]/u.test(ledgerSource),"emoji-style system icon introduced in account spending UI");
assert(version.name==="Orphan Conflict Recovery", "V13.0.15 version name mismatch");
assert(readme.includes("Record spending")&&readme.includes("Paid Expenses"),"README V13.0.10 account spending summary missing");
assert(changelog.includes("direct account spending")&&changelog.includes("expense-payment ledger debit"),"CHANGELOG V13.0.10 account spending details missing");

// V13.0.15 interaction reliability and project mobile cleanup safeguards.
for(const token of [
  "bindAccountSpendControls","accountSpendSubmitPending","submitSpend:submitAccountSpending",
  "projectDialogMoreFooter","syncProjectDialogMoreActions","bindProjectDialogMoreActions",
  "#projectDialog .modal-body { padding:10px 11px; overflow-x:hidden !important; }",
  "#projectDialog .project-dialog-footer { display:grid !important; grid-template-columns:1fr 1fr !important"
]) assert(html.includes(token)||ledgerSource.includes(token),`V13.0.15 interaction/UI safeguard missing: ${token}`);
assert(!ledgerSource.includes("const spendSubmit = event.target.closest"),"Legacy spend submit click interception remains");
assert(!ledgerSource.includes("const spendAccount = event.target.closest"),"Legacy delegated spend-account click interception remains");
assert(readme.includes("V13.0.12 · Spend Reliability & Phone Budget Compaction")&&changelog.includes("## 13.0.12 · 2026-08-07"),"V13.0.15 documentation missing");
assert(exists("UI_INTERACTION_RELIABILITY_VALIDATION_V13_0_11.md"),"V13.0.11 validation report missing");
assert(exists("RECORD_SPENDING_TRANSACTION_VALIDATION_V13_0_13.md"),"V13.0.15 transaction validation report missing");


// V13.0.15 Record Spending transaction hotfix safeguards.
const ledgerV1313=read("account-ledger.js");
for(const token of [
  'primary.type = next === "spend" ? "button" : "submit"',
  'setModeControlsDisabled(maintenance, next === "spend")',
  'setModeControlsDisabled(spend, next !== "spend")',
  'bindAccountSpendPrimaryAction',
  'setAccountSpendStatus("working", "Recording purchase…")',
  'const beforeData = cloneData(data)',
  'const saved = saveData(',
  'if (saved !== true)',
  'const storedRaw = localStorage.getItem(STORAGE_KEY)',
  'storedLedger.length !== 1',
  'closeTrackedFormAfterAction("accountDialog")',
  'transactionalSpend:true',
  'isolatedSpendAction:true',
  'event.target?.id === "accountForm" && document.getElementById("accountDialog")?.dataset.accountMode !== "spend"'
]) assert(ledgerV1313.includes(token),`V13.0.15 transaction safeguard missing: ${token}`);
assert(html.includes('Record Spending is intentionally isolated from the account-maintenance form submit path.'),"Parent account form still owns Record Spending submit behavior");
assert(html.includes('const saved = baseSaveData(message);')&&html.includes('if (saved === false) return false;')&&html.includes('return true;'),"saveData wrapper does not preserve persistence success/failure");
assert(html.includes('account-spend-status')&&ledgerV1313.includes('accountSpendStatus'),"Inline spending status is missing");
assert(version.cacheVersion.includes("v1408-orphan-conflict-recovery-r1"),"V13.0.15 cache revision mismatch");
assert(readme.startsWith("# My Finance Records · V14.0.8 PWA")&&readme.includes("Brave PWA Install Flow"),"V13.0.15 README metadata missing");
assert(changelog.includes("## 13.0.15 · 2026-08-07"),"V13.0.15 changelog missing");
assert(html.includes('?v=14.0.8')&&worker.includes('?v=14.0.8'),"Version-pinned V13.0.15 assets missing");
assert(ledgerV1313.includes('const stored = JSON.parse(storedRaw);'),"V13.0.15 storage verification must inspect the raw persisted ledger");
assert(!ledgerV1313.includes('window.__spendVerifyDebug'),"Temporary spend verification debug hook remains");
assert(html.includes('accountLedger:Array.isArray(source.accountLedger)')&&html.includes('accountReconciliations:Array.isArray(source.accountReconciliations)')&&html.includes('ledgerSettings:source.ledgerSettings'),"Base normalization does not preserve persisted ledger/reconciliation fields for reload");
assert(html.includes('Number(item.electricBillAmount || 0) > 0')&&html.includes('Number(item.waterBillAmount || 0) > 0'),"Normal quick-spend records can still be misclassified as utility expenses");


// V13.0.15 Brave PWA installation safeguards.
for (const token of [
  'async function detectBraveBrowser()',
  'navigator.brave?.isBrave',
  'Install with Brave',
  'Install from Brave menu',
  'Save and Share',
  'Install page as app…',
  'id="pwaInstallGuideDialog"',
  'installButton.dataset.installMode',
  'renderPwaInstallGuide({ brave, secure, installed:false })'
]) assert(html.includes(token),`V13.0.15 Brave install safeguard missing: ${token}`);
assert(html.includes('window.addEventListener("beforeinstallprompt"'),"Native beforeinstallprompt support was removed");
assert(html.includes('window.addEventListener("appinstalled"'),"appinstalled support was removed");
assert(version.name==="Orphan Conflict Recovery","V13.0.15 version name mismatch");
assert(version.cacheVersion.includes("v1408-orphan-conflict-recovery-r1"),"V13.0.15 cache revision mismatch");
assert(exists("BRAVE_PWA_INSTALL_VALIDATION_V13_0_14.md"),"V13.0.14 Brave validation report missing");
assert(readme.includes("Install with Brave")&&readme.includes("Save and Share"),"README Brave install instructions missing");
assert(changelog.includes("## 13.0.15 · 2026-08-07"),"V13.0.15 changelog entry missing");


// V13.0.15 cloud sign-in recovery and diagnostics.
for(const token of [
  'id="cloudForgotPassword"','id="cloudTestConnection"','id="cloudPasswordToggle"','id="cloudAuthMessage"','id="cloudConnectionStatus"',
  'id="cloudPasswordRecoveryCard"','id="cloudNewPassword"','id="cloudConfirmPassword"','id="cloudCompletePasswordReset"','id="cloudCancelPasswordReset"'
]) assert(html.includes(token),`V14.0.8 auth UI safeguard missing: ${token}`);
for(const token of [
  'friendlyAuthError','requestPasswordReset','resetPasswordForEmail','completePasswordReset','updateUser({ password:next })','PASSWORD_RECOVERY',
  'testCloudConnection','/auth/v1/health','withAuthButtonBusy','setPasswordVisibility','Wrong email or password','local finance records stay stored'
]) assert(cloud.includes(token),`V14.0.8 auth behavior safeguard missing: ${token}`);
assert(readme.includes('Forgot password?')&&readme.includes('Test cloud connection'),"README V14.0.8 auth recovery notes missing");
for(const token of ['id="cloudRecoveryHelpCard"','id="cloudRecoveryEmail"','id="cloudRecoveryCode"','id="cloudRecoveryResend"','id="cloudVerifyRecoveryCode"','id="cloudRecoveryBackToSignIn"']) assert(html.includes(token),`V14.0.8 recovery redirect UI safeguard missing: ${token}`);
for(const token of ['parsePasswordRecoveryUrl','recoveryErrorMessage','verifyRecoveryCode','verifyOtp({ email:value, token:code, type:"recovery" })','url.searchParams.set("auth", "recovery")','Password reset needs attention']) assert(cloud.includes(token),`V14.0.8 recovery redirect behavior safeguard missing: ${token}`);
assert(readme.includes('?auth=recovery')&&readme.includes('{{ .Token }}'),"README V14.0.8 recovery redirect/code instructions missing");
assert(changelog.includes('## 14.0.8 · 2026-08-12'),"V14.0.8 changelog entry missing");
assert(version.name==='Orphan Conflict Recovery',"V14.0.8 version name mismatch");
assert(changelog.includes('## 13.0.15 · 2026-08-07')&&changelog.includes('Password-reset messaging avoids revealing'),"CHANGELOG V14.0.8 auth entry missing");
assert(version.cacheVersion.includes('v1408-orphan-conflict-recovery-r1'),"V14.0.8 auth cache revision mismatch");
assert(packageJson.scripts?.quality==='npm run inspect && npm run lint && npm run maintainability && npm run test',"V14.0.8 quality script mismatch");


// V14.0.8 iPhone input zoom prevention safeguards.
assert(version.name==="Orphan Conflict Recovery","V14.0.8 version name mismatch");
assert(version.cacheVersion.includes("v1408-orphan-conflict-recovery-r1"),"V14.0.8 cache revision mismatch");
assert(readme.includes("iPhone Input Zoom Prevention")&&readme.includes("minimum **16px**"),"README V14.0.8 input-zoom guidance missing");
assert(changelog.includes("## 13.0.17 · 2026-08-07")&&changelog.includes("user-scalable=no"),"CHANGELOG V13.0.17 input-zoom/accessibility notes missing");
for(const token of [
  "/* V13.0.17 · iPhone input zoom prevention",
  "@media (max-width:700px)",
  "input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]):not([type=\"color\"])",
  "select,",
  "textarea,",
  "[contenteditable=\"true\"]",
  "font-size:16px !important",
  "input[inputmode=\"decimal\"]",
  "input[inputmode=\"numeric\"]"
]) assert(html.includes(token),`V14.0.8 phone input safeguard missing: ${token}`);
assert(!/<meta[^>]+name=["']viewport["'][^>]+user-scalable\s*=\s*no/i.test(html),"V14.0.8 must not disable user pinch zoom");
assert(!/<meta[^>]+name=["']viewport["'][^>]+maximum-scale\s*=\s*1/i.test(html),"V14.0.8 must not lock maximum zoom scale");
assert(exists("IPHONE_INPUT_ZOOM_VALIDATION_V13_0_17.md"),"V14.0.8 input zoom validation report missing");

// V14.0.8 UI accessibility and signed-out Settings reliability safeguards.
for(const token of [
  "--primary-contrast: #ffffff",
  "--primary-contrast:#102a31",
  "--field-label:#d0d9d5",
  "body.sidebar-layout-pinned .main { margin-left:var(--sidebar-width); }",
  "body.finance-signed-out [data-finance-private-settings] { display:none !important; }",
  "html[data-theme=\"dark\"] .v12-chip.info",
  "html[data-theme=\"dark\"] .button-danger"
]) assert(html.includes(token),`V14.0.8 visual safeguard missing: ${token}`);
for(const token of [
  "document.body.classList.toggle(\"sidebar-layout-pinned\"",
  "document.body.classList.remove(\"sidebar-layout-pinned\")",
  "data-finance-private-settings",
  "Orphan Conflict Recovery"
]) assert(html.includes(token),`V14.0.8 interface safeguard missing: ${token}`);
for(const token of [
  "[data-help-key]",
  "#requestPersistenceButton",
  "ensureSettingsPrivacyNote",
  "Finance-specific app settings are hidden while signed out.",
  "Sign in to manage this finance setting."
]) assert(privacyLock.includes(token),`V14.0.8 privacy safeguard missing: ${token}`);
const browserCoverage=read("tests/privacy-and-inputs.spec.mjs");
for(const token of [
  'toHaveCSS("margin-left", "245px")',
  'dark theme keeps representative controls and labels readable',
  'safeClicks:{ help:1, storage:1 }',
  'pdf:"none", reminders:"none"'
]) assert(browserCoverage.includes(token),`V14.0.8 browser coverage missing: ${token}`);
assert(readme.includes("## V14.0.8 · Orphan Conflict Recovery"),"README V14.0.8 release notes missing");

if(failures.length){
  console.error("V14.0.8 Orphan Conflict Recovery validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V14.0.8 Orphan Conflict Recovery validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected runtime IDs checked with no duplicates`);
console.log("- Record Spending is isolated from correction-form validation and requires persistence/storage verification before close");
console.log("- Finance Schema 12, Cloud Schema V3, ledger, encryption, profile, rollback, and credential safeguards passed");
