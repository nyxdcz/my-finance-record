#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const baseline=spawnSync(process.execPath,[path.join(here,"validate-v12-24-0.mjs")],{encoding:"utf8"});
process.stdout.write(baseline.stdout||""); process.stderr.write(baseline.stderr||"");
if(baseline.status!==0) failures.push("V12.24.0 Quick Entry & Productivity baseline failed");

const html=read("index.html");
const reminders=read("reminders-alerts.js");
const reminderCss=read("reminders-alerts.css");
const cloud=read("cloud-sync.js");
const worker=read("sw.js");
const workflow=read(".github/workflows/quality-pages.yml");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const checklist=read("RELEASE_CHECKLIST.md");
const validation=read("REMINDERS_SCHEDULED_ALERTS_VALIDATION_V12_25_0.md");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));

assert(version.version==="12.25.0","version.json is not V12.25.0");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===2,"Cloud Schema changed from V2");
assert(version.ledgerVersion===1,"Ledger Version changed from 1");
assert(version.budgetVersion===1,"Budget Version changed from 1");
assert(version.insightsVersion===1,"Insights Version changed from 1");
assert(version.productivityVersion===1,"Productivity Version changed from 1");
assert(version.remindersVersion===1,"Reminders Version 1 metadata missing");
assert(html.includes('<title>My Finance Records · V12.25.0</title>'),"HTML title version mismatch");
assert(html.includes('const APP_VERSION = "12.25.0";'),"HTML APP_VERSION mismatch");
assert(html.includes('reminders-alerts.css')&&html.includes('reminders-alerts.js'),"reminder assets are not loaded");
assert(html.includes('{"version": "V12.25.0", "title": "Reminders & Scheduled Alerts"'),"in-app V12.25.0 history entry missing");
assert(worker.includes('const APP_VERSION = "12.25.0";'),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./reminders-alerts.js")')&&worker.includes('asset("./reminders-alerts.css")'),"reminder assets missing from PWA shell");
assert(workflow.includes('reminders-alerts.js reminders-alerts.css'),"GitHub Pages workflow does not deploy reminder assets");
assert(packageJson.version==="12.25.0"&&packageLock.version==="12.25.0","package version mismatch");
assert(packageJson.scripts?.quality==="node tests/validate-v12-25-0.mjs","quality script mismatch");
assert(readme.startsWith("# My Finance Records · V12.25.0 PWA"),"README heading mismatch");
assert(readme.includes("Exact closed-app delivery is browser-controlled and is not guaranteed"),"README delivery limitation missing");
assert(readme.includes("No additional Supabase SQL migration is required"),"README migration guidance missing");
assert(changelog.includes("## 12.25.0 · 2026-08-06"),"CHANGELOG V12.25.0 entry missing");
assert(checklist.includes("Alerts never mark paid, post income, transfer funds, reconcile balances, alter budgets, or append ledger entries"),"reminder no-mutation checklist missing");
assert(validation.includes("direct user interaction")&&validation.includes("Exact closed-app timing is not guaranteed"),"reminder validation limitations incomplete");
assert(cloud.includes('const APP_VERSION_CODE = 120250;')&&cloud.includes('V12.25.0</strong>'),"Cloud Sync app-version metadata mismatch");
assert(cloud.includes('"reminderSettings"')&&cloud.includes('reminderSettings:clone(source?.reminderSettings || {})'),"Cloud Sync reminder mapping missing");
assert(cloud.includes('output.reminderSettings = clone(settings.reminderSettings'),"Cloud Sync reminder settings restore missing");

for(const token of [
  "Expense due dates","Overdue bills","Low account balances","Expected income","Savings contributions","Utility Bill entry",
  "Gym schedule","Failed Gym auto-payment","Unsynchronized changes","Recovery backup","Daily notification digest","Send test",
  "Pause 24 hours","Notification history on this device","Periodic Background Sync","never mark expenses paid","FinanceReminderAlertsInternals",
  "deliverIndividualAlerts","finance-scheduled-alerts-v1","requestPermission","setAppBadge","reminderSettings"
]) assert(reminders.includes(token),`reminder safeguard missing: ${token}`);
for(const token of [
  ".finance-alert-status-grid",".finance-alert-settings-grid",".finance-alert-rule-grid",".finance-alert-list",".finance-alert-history",
  "@media (max-width: 700px)","env(safe-area-inset-bottom)"
]) assert(reminderCss.includes(token),`reminder responsive style missing: ${token}`);
for(const token of [
  "FINANCE_ALERT_NOTIFY","FINANCE_ALERT_CHECK","finance-scheduled-alerts-v1","finance-scheduled-alerts-now","showScheduledFinanceAlert",
  "scheduledTimeReached","reminderSnoozed","showNotification"
]) assert(worker.includes(token),`service-worker reminder safeguard missing: ${token}`);

for(const file of [
  "reminders-alerts.js","productivity-tools.js","reports-insights.js","budget-planning.js","cloud-sync.js","account-ledger.js","sw.js",
  "tests/validate-v12-22-0.mjs","tests/validate-v12-23-0.mjs","tests/validate-v12-24-0.mjs","tests/validate-v12-25-0.mjs"
]){
  const syntax=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
  assert(syntax.status===0,`${file} syntax failed: ${syntax.stderr}`);
}
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
inlineScripts.forEach((code,index)=>{const temp=path.join(root,`.v12250-inline-${index}.js`);fs.writeFileSync(temp,code);const syntax=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});fs.unlinkSync(temp);assert(syntax.status===0,`inline script ${index+1} syntax failed: ${syntax.stderr}`);});

const staticIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
const injectedSources=[read("cloud-sync.js"),read("account-ledger.js"),read("budget-planning.js"),read("reports-insights.js"),read("productivity-tools.js"),reminders];
const injectedIds=[...new Set(injectedSources.flatMap(source=>[...source.matchAll(/id=\\?"([A-Za-z][A-Za-z0-9_-]+)\\?"/g)].map(match=>match[1])))].filter(id=>!staticIds.includes(id));
const allIds=[...staticIds,...injectedIds];
const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
assert(duplicateIds.length===0,`duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

const now=new Date("2026-08-20T09:00:00+08:00");
const settings={
  version:1,enabled:true,dailyDigest:true,dailyTime:"08:00",leadDays:3,lowBalanceThreshold:1000,backupDays:14,
  utilityReminderDay:15,savingsMonthlyTarget:1000,savingsReminderDay:15,
  rules:{dueExpenses:true,overdueExpenses:true,lowBalance:true,expectedIncome:true,savingsContribution:true,utilityEntry:true,gymSchedule:true,gymAutoPayFailure:true,unsyncedChanges:true,backupReminder:true}
};
const sampleData={
  accounts:{Cash:500,Bank:5000,Savings:3000},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},accountOrder:["Cash","Bank","Savings"],accountIcons:{},
  expenses:[
    {id:"overdue",name:"Internet",date:"2026-08-10",amount:1500,paid:false,expenseType:"normal",account:"Bank"},
    {id:"due",name:"Rent",date:"2026-08-22",amount:4000,paid:false,expenseType:"normal",account:"Bank"},
    {id:"paid",name:"Paid bill",date:"2026-08-20",amount:100,paid:true,expenseType:"normal",account:"Cash"},
    {id:"gym-today",name:"Gym",date:"2026-08-01",amount:1280,paid:false,expenseType:"gym",gymPricePerVisit:80,gymDays:[4],gymDateOverrides:{added:[],removed:[]}},
    {id:"gym-failed",name:"July Gym",date:"2026-07-01",amount:1360,paid:false,expenseType:"gym",gymAutoPay:true,gymAutoPayAccount:"Cash",gymAutoPaySuppressed:true,gymDays:[1,2,4,5]}
  ],
  incomeRecords:[
    {id:"expected",name:"Design payment",date:"2026-08-21",amount:12000,account:"Bank",category:"Other Income"},
    {id:"posted",name:"Posted income",date:"2026-08-21",amount:2000,account:"Bank",category:"Other Income",ledgerTransactionId:"income-posted"},
    {id:"transfer-income",name:"Transfer",date:"2026-08-21",amount:1000,account:"Bank",category:"Transfer from savings"}
  ],
  accountLedger:[
    {id:"saving-1",account:"Savings",type:"transfer-in",amount:400,date:"2026-08-05"},
    {id:"opening",account:"Savings",type:"opening-balance",amount:2600,date:"2026-08-01"}
  ],
  accountReconciliations:[],projects:[],savingsGoals:[],monthlyBudgets:{},budgetTemplates:[],expenseTemplates:[],monthlyReports:{},monthlyChecklists:{},iconLibrary:{},expenseRecurrenceSkips:[],
  savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1},budgetSettings:{version:1},productivitySettings:{version:1},reminderSettings:settings
};

const memory=new Map();
const notifications=[];
const registration={showNotification:async(title,options)=>{notifications.push({title,options});}};
const reminderSandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,__FINANCE_REMINDER_TEST__:true,
  STORAGE_KEY:"finance",data:structuredClone(sampleData),normalizeData:value=>value,appMeta:{lastBackupAt:"2026-07-20T00:00:00Z",reminders:{}},
  localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)},
  Notification:{permission:"granted",requestPermission:async()=>"granted"},
  navigator:{userAgent:"Node",standalone:false,serviceWorker:{ready:Promise.resolve(registration)},setAppBadge:async()=>{},clearAppBadge:async()=>{}},
  serviceWorkerRegistration:registration,matchMedia:()=>({matches:false})
};
reminderSandbox.window=reminderSandbox; reminderSandbox.globalThis=reminderSandbox;
vm.createContext(reminderSandbox);
try{vm.runInContext(reminders,reminderSandbox,{filename:"reminders-alerts.js"});}catch(error){failures.push(`reminders-alerts VM bootstrap failed: ${error.stack||error}`);}
const internals=reminderSandbox.FinanceReminderAlertsInternals;
assert(Boolean(internals),"Reminder internals were not exposed");
if(internals){
  const before=JSON.stringify(reminderSandbox.data);
  const alerts=internals.buildAlerts(reminderSandbox.data,settings,{cloudStatus:{pendingCount:2,conflictCount:1},lastBackupAt:"2026-07-20T00:00:00Z"},now);
  const types=new Set(alerts.map(item=>item.type));
  for(const type of ["overdue-expense","due-expense","low-balance","expected-income","savings-contribution","utility-entry","gym-schedule","gym-auto-pay-failure","unsynced-changes","backup-reminder"]){
    assert(types.has(type),`alert fixture missing: ${type}`);
  }
  assert(alerts.length===10,`expected 10 alert fixtures, received ${alerts.length}`);
  assert(alerts.filter(item=>item.type==="expected-income").length===1,"posted or transfer income generated an expected-income alert");
  assert(JSON.stringify(reminderSandbox.data)===before,"building reminders mutated finance data");
  assert(internals.savingsContributedThisMonth(reminderSandbox.data,settings,now)===400,"Savings contribution fixture mismatch");
  assert(internals.gymScheduledToday(reminderSandbox.data.expenses.find(item=>item.id==="gym-today"),now)===true,"Gym schedule fixture mismatch");
  assert(internals.scheduleReached(settings,new Date("2026-08-20T07:59:00"))===false,"daily schedule fired early");
  assert(internals.scheduleReached(settings,new Date("2026-08-20T08:00:00"))===true,"daily schedule did not fire at selected time");
  const digest=internals.digestPayload(alerts,settings,now);
  assert(digest.count===10&&digest.title.includes("10")&&digest.body.includes("+6 more"),"grouped digest fixture mismatch");
  const individualSettings={...settings,dailyDigest:false};
  const first=await internals.deliverIndividualAlerts(alerts,individualSettings,{reason:"test"});
  const firstCount=notifications.length;
  const second=await internals.deliverIndividualAlerts(alerts,individualSettings,{reason:"test"});
  const secondCount=notifications.length-firstCount;
  const third=await internals.deliverIndividualAlerts(alerts,individualSettings,{reason:"test"});
  assert(first===true&&second===true&&third===false,"individual-alert fingerprint delivery sequence mismatch");
  assert(firstCount===5&&secondCount===5&&notifications.length===10,"individual-alert delivery cap or deduplication mismatch");
}

// Cloud record round-trip for synchronized reminder settings.
const cloudMemory=new Map();
const cloudSandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,
  localStorage:{getItem:key=>cloudMemory.get(key)??null,setItem:(key,value)=>cloudMemory.set(key,String(value)),removeItem:key=>cloudMemory.delete(key)},
  navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},location:{reload(){}},matchMedia(){return{matches:false}},
  data:structuredClone(sampleData),APP_VERSION:"12.25.0",normalizeData:value=>value,saveData(){},renderAll(){},STORAGE_KEY:"finance",setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){}
};
cloudSandbox.window=cloudSandbox; cloudSandbox.globalThis=cloudSandbox; cloudSandbox.window.addEventListener=()=>{};
vm.createContext(cloudSandbox);
try{vm.runInContext(cloud,cloudSandbox,{filename:"cloud-sync.js"});}catch(error){failures.push(`cloud-sync VM bootstrap failed: ${error.stack||error}`);}
const cloudInternals=cloudSandbox.FinanceCloudSyncInternals;
assert(Boolean(cloudInternals),"Cloud Sync internals were not exposed");
if(cloudInternals){
  const map=cloudInternals.toRecordMap(sampleData);
  const settingsRow=Object.values(map).find(row=>row.collection==="settings"&&row.recordId==="preferences");
  assert(settingsRow?.payload?.reminderSettings?.rules?.backupReminder===true,"reminder settings missing from cloud singleton record");
  const store=Object.fromEntries(Object.entries(map).map(([key,row])=>[key,{...row,revision:1,deletedAt:"",updatedAt:"2026-08-06T00:00:00Z"}]));
  const restored=cloudInternals.fromRecordStore(store,{});
  assert(restored.reminderSettings?.version===1&&restored.reminderSettings?.dailyTime==="08:00","reminder settings cloud round-trip failed");
}

const sha256=file=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
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
for(const [file,text] of [["index.html",html],["reminders-alerts.js",reminders],["cloud-sync.js",cloud],["sw.js",worker]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}

if(failures.length){console.error("V12.25.0 Reminders & Scheduled Alerts validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));process.exit(1);}
console.log("V12.25.0 Reminders & Scheduled Alerts validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected runtime IDs checked with no duplicates`);
console.log("- Ten alert types, schedule, digest, individual delivery, Cloud Sync round-trip, no-mutation, service-worker, and device-local safeguards passed");
console.log("- Finance Schema 12, Cloud Schema V2, Ledger/Budget/Insights/Productivity/Reminders Version 1, manifest, offline page, icons, and Supabase SQL remain protected");
