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

const html=read("index.html");
const profiles=read("security-profiles.js");
const profileCss=read("security-profiles.css");
const cloud=read("cloud-sync.js");
const worker=read("sw.js");
const sql=read("supabase/cloud-profiles-v13.sql");
const workflow=read(".github/workflows/quality-pages.yml");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const security=read("SECURITY.md");
const privacy=read("PRIVACY.md");
const migration=read("V13_MIGRATION_GUIDE.md");
const validation=read("CLOUD_PROFILE_ENCRYPTION_VALIDATION_V13_0_0.md");
const uiValidation=read("TOOLBAR_BUDGET_BENTO_VALIDATION_V13_0_2.md");
const settingsValidation=read("SETTINGS_SIMPLIFICATION_VALIDATION_V13_0_2.md");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));

assert(version.version==="13.0.2","version.json is not V13.0.2");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===3,"Cloud Schema V3 metadata missing");
for(const [field,value] of Object.entries({ledgerVersion:1,budgetVersion:1,insightsVersion:1,productivityVersion:1,remindersVersion:1,profileArchitectureVersion:1,encryptionVersion:1,authSecurityVersion:1})) assert(version[field]===value,`${field} metadata mismatch`);
assert(html.includes('<title>My Finance Records · V13.0.2</title>'),"HTML title mismatch");
assert(html.includes('const APP_VERSION = "13.0.2";'),"HTML APP_VERSION mismatch");
assert(html.includes('data-settings-tab="profiles"')&&html.includes('id="settings-panel-profiles"'),"Profiles & Security settings panel missing");
assert(html.includes('security-profiles.css')&&html.includes('security-profiles.js'),"profile architecture assets are not loaded");
assert(html.includes('{"version": "V13.0.2", "title": "Toolbar & Budget Bento UI"'),"in-app V13.0.2 history entry missing");
assert(html.includes('{"version": "V13.0.0", "title": "Major Cloud, Encryption & Profile Architecture"'),"in-app V13.0.0 history entry missing");
assert(html.includes('{"version": "V12.21.0", "title": "Record-level Cloud Sync 2.0"'),"V12.21 history was rewritten incorrectly");
assert(worker.includes('const APP_VERSION = "13.0.2";'),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./security-profiles.js")')&&worker.includes('asset("./security-profiles.css")'),"profile assets missing from PWA shell");
assert(workflow.includes('security-profiles.js security-profiles.css cloud-sync.js'),"GitHub Pages workflow does not deploy profile assets");
assert(packageJson.version==="13.0.2"&&packageLock.version==="13.0.2","package version mismatch");
assert(packageJson.scripts?.quality==="node tests/validate-v13-0-2.mjs","quality script mismatch");
assert(readme.startsWith("# My Finance Records · V13.0.2 PWA"),"README heading mismatch");
assert(readme.includes("active browser working copy in localStorage")&&readme.includes("cannot be recovered"),"README encryption boundaries incomplete");
assert(changelog.includes("## 13.0.2 · 2026-08-07"),"CHANGELOG V13 entry missing");
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
  "security-profiles.js","cloud-sync.js","account-ledger.js","budget-planning.js","reports-insights.js","productivity-tools.js","reminders-alerts.js","sw.js","tests/validate-v13-0-2.mjs"
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
const injectedSources=[profiles,cloud,read("account-ledger.js"),read("budget-planning.js"),read("reports-insights.js"),read("productivity-tools.js"),read("reminders-alerts.js")];
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
const sampleData={accounts:{Cash:500},accountTypes:{Cash:"Cash"},accountOrder:["Cash"],accountIcons:{},expenses:[{id:"expense-1",name:"Rent",amount:100,paid:false,date:"2026-08-01"}],projects:[],incomeRecords:[],savingsGoals:[],accountLedger:[],accountReconciliations:[],budgetTemplates:[],expenseTemplates:[],monthlyReports:{},monthlyChecklists:{},monthlyBudgets:{},iconLibrary:{},expenseRecurrenceSkips:[],savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1},budgetSettings:{version:1},productivitySettings:{version:1},reminderSettings:{version:1}};
const cloudSandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,FinanceProfileArchitecture:cloudArchitecture,
  localStorage:{getItem:key=>cloudMemory.get(key)??null,setItem:(key,value)=>cloudMemory.set(key,String(value)),removeItem:key=>cloudMemory.delete(key)},
  navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},location:{reload(){}},matchMedia(){return{matches:false}},
  data:structuredClone(sampleData),APP_VERSION:"13.0.0",normalizeData:value=>value,saveData(){return true;},renderAll(){},STORAGE_KEY:"finance",setInterval(){return 0;},clearInterval(){},setTimeout(){return 0;},clearTimeout(){}
};
cloudSandbox.window=cloudSandbox; cloudSandbox.globalThis=cloudSandbox; cloudSandbox.window.addEventListener=()=>{};
vm.createContext(cloudSandbox);
try{ vm.runInContext(cloud,cloudSandbox,{filename:"cloud-sync.js"}); }catch(error){ failures.push(`cloud-sync VM bootstrap failed: ${error.stack||error}`); }
const cloudInternals=cloudSandbox.FinanceCloudSyncInternals;
assert(Boolean(cloudInternals),"Cloud Sync V3 internals were not exposed");
if(cloudInternals){
  const map=cloudInternals.toRecordMap(sampleData);
  assert(Object.values(map).some(row=>row.collection==="expenses"&&row.recordId==="expense-1"),"Cloud record map omitted expense");
  const expense=Object.values(map).find(row=>row.collection==="expenses");
  const rpcChange=await cloudInternals.toRpcChange({...expense,baseRevision:0,deleted:false,minWriterVersionCode:130000});
  assert(rpcChange.payload?.__financeEncrypted===true&&!JSON.stringify(rpcChange.payload).includes("Rent"),"outgoing cloud record was not encrypted");
  const row=await cloudInternals.decryptRow({collection:"expenses",record_id:"expense-1",payload:rpcChange.payload,revision:1});
  assert(row.payload.name==="Rent"&&row.payload.amount===100,"incoming cloud record did not decrypt");
  const store=Object.fromEntries(Object.entries(map).map(([key,value])=>[key,{...value,revision:1,deletedAt:"",updatedAt:"2026-08-06T00:00:00Z"}]));
  const restored=cloudInternals.fromRecordStore(store,{});
  assert(restored.accounts?.Cash===500&&restored.expenses?.[0]?.name==="Rent","Cloud record-map round trip failed");
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
assert(version.cacheVersion.includes("simplified-settings-r4"),"Settings cache revision mismatch");

// Protected assets and V2 rollback files remain byte-identical to the V12.25 baseline.
const protectedHashes={
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":"96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png":"a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png":"c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "supabase/schema.sql":"25c8346a069cd7f5da60b6fd5ea671d3f1a0f9e7223e1fd2bcfd7c35ac87d6aa",
  "supabase/cloud-sync-v2.sql":"87d6169f9f5ed9eb68b86267fc3b6d9c2a060769c92bfd79db0f23abb4bc70bd",
  "supabase/security-policies.sql":"d84a5c01ddbd203dd444f04331e99eb4cbe2cb5b27799abe5fbd90fb9b6c8ff2",
  "supabase/security-hardening-v12-19-1.sql":"9eadcc04a5962bcdacb9f551fda4e5e654466cc172253f599a60e45002ff6c15",
  "supabase/payment-operations.sql":"bb261be284220589f332df6e9e6b7c5807c859768b0daeb9e1286e836ae33cca",
  "supabase/rls-smoke-tests.sql":"f97b5dbe1bcb6488b8fa461aeb4224cc70e5dbf414589f67ca7d465810e90731",
  "supabase/rls-smoke-tests-v2.sql":"c76d931161cf7678d0a810f1fa7d9c841ce205f3a3ad9ec88cbb1f7a6a3995de"
};
for(const [file,expected] of Object.entries(protectedHashes)) assert(sha256(file)===expected,`${file} changed unexpectedly`);
for(const [file,text] of [["index.html",html],["security-profiles.js",profiles],["cloud-sync.js",cloud],["sw.js",worker],["supabase/cloud-profiles-v13.sql",sql]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}
assert(!/correct horse battery staple/.test(profiles+cloud+sql),"test passphrase leaked into production source");

if(failures.length){
  console.error("V13.0.2 Simplified Settings UI validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));
  process.exit(1);
}
console.log("V13.0.2 Simplified Settings UI validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected runtime IDs checked with no duplicates`);
console.log("- Profile roles, AES-256-GCM, PBKDF2, encrypted backup, Cloud Sync V3 envelope, SQL/RLS, rollback, and credential safeguards passed");
console.log("- Finance Schema 12 and protected manifest, offline page, icons, and Cloud Schema V2 rollback files remain unchanged");
