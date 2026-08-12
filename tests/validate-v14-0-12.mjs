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
const installer=read("Install_V14_0_12.command");
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

assert(version.version==="14.0.12","version.json is not V14.0.12");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===3,"Cloud Schema V3 metadata missing");
for(const [field,value] of Object.entries({ledgerVersion:1,budgetVersion:1,insightsVersion:1,productivityVersion:1,remindersVersion:1,profileArchitectureVersion:1,encryptionVersion:1,authSecurityVersion:1})) assert(version[field]===value,`${field} metadata mismatch`);
assert(html.includes('<title>My Finance Records · V14.0.12</title>'),"HTML title mismatch");
assert(html.includes('const APP_VERSION = "14.0.12";'),"HTML APP_VERSION mismatch");
assert(html.includes('const APP_RELEASE_NAME = "Dashboard Defaults & Rail Motion";'),"HTML release name mismatch");
assert(html.includes('function synchronizeVersionDisplay()')&&html.includes('badge.textContent = `V${APP_VERSION}`'),"central runtime version display updater missing");
assert(html.includes('{"version":"V14.0.12","title":"Dashboard Defaults & Rail Motion"'),"in-app V14.0.12 history entry missing");
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
assert(html.includes('./projects-calendar-v13.0.20.js?v=14.0.12')&&html.includes('./projects-calendar-v13.0.20.css?v=14.0.12'),"Project Agenda assets are not version-pinned in HTML");
assert(worker.includes('asset("./projects-calendar-v13.0.20.js?v=14.0.12")')&&worker.includes('asset("./projects-calendar-v13.0.20.css?v=14.0.12")'),"Project Agenda assets are not version-pinned in the offline shell");
assert(html.includes('./cloud-conflict-review.js?v=14.0.12')&&worker.includes('asset("./cloud-conflict-review.js?v=14.0.12")'),"Cloud conflict review module is not loaded and precached");
assert(html.includes('./cloud-conflict-resolution.js?v=14.0.12')&&worker.includes('asset("./cloud-conflict-resolution.js?v=14.0.12")'),"Cloud conflict resolution module is not loaded and precached");
assert(accountLedger.includes('function recalculateBalances(target = data, { stamp = false } = {})'),"ledger recalculation is not pure by default");
assert(accountLedger.includes('if (stamp && target.ledgerSettings) target.ledgerSettings.lastRecalculatedAt = new Date().toISOString();'),"ledger timestamp is not limited to explicit mutations");
assert(accountLedger.includes("if (ledgerMigrationChanged)")&&!accountLedger.includes('persistFinanceDataRaw("Account ledger updated")'),"ledger startup still persists unchanged data");
assert(read("index.html").includes('./app.css?v=14.0.12')&&worker.includes('asset("./app.css?v=14.0.12")'),"extracted application CSS is not versioned and precached");
assert(html.includes('data-settings-tab="profiles"')&&html.includes('id="settings-panel-profiles"'),"Profiles & Security settings panel missing");
assert(html.includes('security-profiles.css')&&html.includes('security-profiles.js'),"profile architecture assets are not loaded");
assert(html.includes('{"version": "V13.0.10", "title": "Account Spending from Balance"'),"in-app V13.0.10 history entry missing");
assert(html.includes('{"version": "V13.0.4", "title": "Settings & Top Bar UI Refinement"'),"in-app V13.0.4 history entry missing");
assert(html.includes('{"version": "V13.0.3", "title": "Compact Modals & SVG Interface Icons"'),"in-app V13.0.3 history entry missing");
assert(html.includes('{"version": "V13.0.2", "title": "Toolbar & Budget Bento UI"'),"in-app V13.0.2 history entry missing");
assert(html.includes('{"version": "V13.0.0", "title": "Major Cloud, Encryption & Profile Architecture"'),"in-app V13.0.0 history entry missing");
assert(html.includes('{"version": "V12.21.0", "title": "Record-level Cloud Sync 2.0"'),"V12.21 history was rewritten incorrectly");
assert(worker.includes('const APP_VERSION = "14.0.12";'),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./security-profiles.js?v=14.0.12")')&&worker.includes('asset("./security-profiles.css?v=14.0.12")'),"profile assets missing from PWA shell");
assert(workflow.includes('security-profiles.js security-profiles.css cloud-conflict-review.js cloud-conflict-resolution.js cloud-sync.js'),"GitHub Pages workflow does not deploy profile and conflict-resolution assets");
assert(packageJson.version==="14.0.12"&&packageLock.version==="14.0.12","package version mismatch");
assert(exists("privacy-lock.js"),"signed-out privacy module missing");
assert(html.includes('<body class="finance-signed-out finance-auth-pending">'),"app does not start privacy-locked before first render");
for(const token of ["FinancePrivacyLock","finance-signed-out","finance-auth-pending","finance-privacy-lock-view","₱0.00","privacySignInButton","Sign in to view records"]) assert(html.includes(token)||privacyLock.includes(token),`signed-out privacy safeguard missing: ${token}`);
for(const token of ["setAuthenticated","closeSensitiveSurfaces","blockLockedInteraction","FINANCE_AUTH_STATE","finance:privacy-auth-change"]) assert(privacyLock.includes(token),`privacy runtime safeguard missing: ${token}`);
assert(cloud.includes("setPrivacyAuthentication(false)")&&cloud.includes("setPrivacyAuthentication(true"),"cloud auth does not drive privacy lock state");
assert(worker.includes('let financeAuthState = "signed-out"')&&worker.includes('FINANCE_AUTH_STATE')&&worker.includes('financeAuthState !== "signed-in"'),"service worker does not suppress signed-out finance notifications");
assert(worker.includes('asset("./privacy-lock.js?v=14.0.12")'),"privacy module missing from service-worker shell");
assert(workflow.includes("privacy-lock.js"),"GitHub Pages workflow does not deploy privacy module");
assert(exists("SIGNED_OUT_PRIVACY_LOCK_VALIDATION_V13_0_18.md"),"V14.0.12 privacy validation report missing");

assert(packageJson.scripts?.quality==="npm run inspect && npm run lint && npm run maintainability && npm run test","quality script mismatch");
assert(packageJson.scripts?.inspect==="node tests/inspect-project.mjs"&&exists("tests/inspect-project.mjs"),"repository inspection script missing");
assert(packageJson.scripts?.lint==="eslint ."&&packageJson.scripts?.["test:browser"]==="playwright test","lint or browser package script missing");
const recentReadmeVersions=["V14.0.12","V14.0.11","V14.0.10","V14.0.9","V14.0.8"];
assert(readme.trim().split(/\r?\n/).length<=12&&recentReadmeVersions.every(entry=>readme.includes(entry))&&!readme.includes("V14.0.4"),"README is not the requested concise five-version overview");
assert(!/https?:\/\//.test(readme),"README unexpectedly contains a live-app link");
assert(exists("SETTINGS_TOPBAR_UI_VALIDATION_V13_0_4.md"),"V13.0.4 UI validation report missing");
assert(exists("DASHBOARD_CALENDAR_DEDUP_VALIDATION_V13_0_5.md"),"V13.0.5 calendar validation report missing");
assert(exists("PROJECT_REVISION_CYCLES_VALIDATION_V13_0_6.md"),"V13.0.9 project revision validation report missing");
assert(exists("FILE_INSPECTION_AND_FIXES_VALIDATION_V13_0_5.md"),"V13.0.5 installer validation report missing");
assert(exists("Install_V14_0_12.command")&&(fs.statSync(path.join(root,"Install_V14_0_12.command")).mode&0o100)!==0,"V14.0.12 installer is missing or not executable");
assert((fs.statSync(path.join(root,"run_audit.sh")).mode&0o100)!==0,"run_audit.sh is not executable");
assert(installer.includes("npm ci --ignore-