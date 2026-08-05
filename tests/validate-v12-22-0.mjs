#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = file => fs.readFileSync(path.join(root,file),"utf8");

const baseline = spawnSync(process.execPath,[path.join(here,"validate-v12-21-0.mjs")],{encoding:"utf8"});
process.stdout.write(baseline.stdout || "");
process.stderr.write(baseline.stderr || "");
if (baseline.status !== 0) failures.push("V12.21.0 Cloud Sync V2 baseline failed");

const html=read("index.html");
const budget=read("budget-planning.js");
const budgetCss=read("budget-planning.css");
const cloud=read("cloud-sync.js");
const worker=read("sw.js");
const workflow=read(".github/workflows/quality-pages.yml");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const checklist=read("RELEASE_CHECKLIST.md");
const validation=read("MONTHLY_BUDGET_CASH_FLOW_VALIDATION_V12_22_0.md");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));
const versionParts=version.version.split(".").map(Number);
const appVersionCode=(versionParts[0]||0)*10000+(versionParts[1]||0)*10+(versionParts[2]||0);

assert(["12.22.0","12.23.0","12.24.0"].includes(version.version),"version.json is not a supported V12.22+ release");
assert(version.schemaVersion===12,"core finance schema changed from 12");
assert(version.cloudSchemaVersion===2,"Cloud Schema changed from V2");
assert(version.ledgerVersion===1,"Ledger Version changed from 1");
assert(version.budgetVersion===1,"Budget Version 1 metadata missing");
assert(html.includes(`<title>My Finance Records · V${version.version}</title>`),"HTML title version mismatch");
assert(html.includes(`const APP_VERSION = "${version.version}";`),"HTML APP_VERSION mismatch");
assert(html.includes('budget-planning.css')&&html.includes('budget-planning.js'),"budget runtime assets are not loaded");
assert(html.includes('monthlyBudgets')&&html.includes('budgetTemplates')&&html.includes('budgetSettings'),"base normalization does not preserve budget records");
assert(html.includes('{"version": "V12.22.0", "title": "Monthly Budgets & Cash-flow Forecasting"'),"in-app V12.22.0 history entry missing");
assert(worker.includes(`const APP_VERSION = "${version.version}";`),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./budget-planning.js")')&&worker.includes('asset("./budget-planning.css")'),"budget assets missing from PWA shell");
assert(workflow.includes('budget-planning.js budget-planning.css'),"GitHub Pages workflow does not deploy budget assets");
assert(packageJson.version===version.version&&packageLock.version===version.version,"package version mismatch");
assert(["node tests/validate-v12-22-0.mjs","node tests/validate-v12-23-0.mjs","node tests/validate-v12-24-0.mjs"].includes(packageJson.scripts?.quality),"quality script mismatch");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`),"README heading mismatch");
assert(readme.includes("No additional Supabase SQL migration is required"),"README migration guidance missing");
assert(changelog.includes("## 12.22.0 · 2026-08-06"),"CHANGELOG V12.22.0 entry missing");
assert(checklist.includes("Forecast does not subtract paid expenses a second time"),"release forecast safety checklist missing");
assert(validation.includes("Current Available Money already reflects ledger-posted income and paid expenses"),"forecast calculation validation is incomplete");

for (const token of [
  "Monthly budget plan","Build from expenses","Copy previous month","Budget template","Cash-flow forecast",
  "plannedAmount","group:item?.group === \"flexible\"","scope:item?.scope === \"project\"","rollover:Boolean",
  "reservedUnassigned","expectedIncome","currentAvailable + expectedIncome - upcoming - reservedUnassigned - allocation",
  "lowBalanceAlerts","Savings allocation is reserved in the forecast","Forecast month-end","Upcoming recurring","Overdue unpaid",
  "monthly-budget-${month}.csv","FinanceBudgetPlanningInternals"
]) assert(budget.includes(token),`budget safeguard missing: ${token}`);
for (const token of ["monthlyBudgets","budgetTemplates","budgetSettings",`APP_VERSION_CODE = ${appVersionCode}`,`V${version.version}</strong>`]) assert(cloud.includes(token),`Cloud Sync V2 budget mapping missing: ${token}`);
for (const token of ["budget-planner-summary","budget-planner-grid","budget-category-table","cash-forecast-panel","budget-dashboard-forecast","budget-report-grid","@media (max-width:700px)"]) assert(budgetCss.includes(token),`budget responsive style missing: ${token}`);

for (const file of ["budget-planning.js","cloud-sync.js","account-ledger.js","sw.js","tests/validate-v12-21-0.mjs","tests/validate-v12-22-0.mjs"]) {
  const syntax=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
  assert(syntax.status===0,`${file} syntax failed: ${syntax.stderr}`);
}
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
inlineScripts.forEach((code,index)=>{const temp=path.join(root,`.v12220-inline-${index}.js`);fs.writeFileSync(temp,code);const syntax=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});fs.unlinkSync(temp);assert(syntax.status===0,`inline script ${index+1} syntax failed: ${syntax.stderr}`);});

const staticIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
const budgetTemplateIds=[...budget.matchAll(/id=\\?"([A-Za-z][A-Za-z0-9_-]+)\\?"/g)].map(match=>match[1]);
const cloudTemplateIds=[...cloud.matchAll(/id="([A-Za-z][A-Za-z0-9_-]+)"/g)].map(match=>match[1]);
const allIds=[...staticIds,...new Set([...budgetTemplateIds,...cloudTemplateIds].filter(id=>!staticIds.includes(id)))];
const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
assert(duplicateIds.length===0,`duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

const baseData={
  accounts:{Cash:10000},accountTypes:{Cash:"Cash"},accountOrder:["Cash"],accountIcons:{},iconLibrary:{},
  expenses:[
    {id:"paid-grocery",date:"2099-08-02",category:"Groceries",amount:1000,paid:true,paidAmount:1000,includeInTotals:true,account:"Cash",recurring:"No"},
    {id:"future-grocery",date:"2099-08-15",dueDay:15,category:"Groceries",amount:500,paid:false,includeInTotals:true,account:"Cash",recurring:"No"},
    {id:"future-rent",date:"2099-08-20",dueDay:20,category:"Rent",amount:2000,paid:false,includeInTotals:true,account:"Cash",recurring:"Monthly"}
  ],
  incomeRecords:[{id:"future-income",date:"2099-08-20",name:"Expected fee",category:"Other income",amount:3000,account:"Cash",includeInTotals:true,ledgerTransactionId:""}],
  monthlyBudgets:{"2099-08":{month:"2099-08",items:[
    {id:"budget-grocery",category:"Groceries",plannedAmount:3000,group:"flexible",scope:"personal",rollover:true},
    {id:"budget-rent",category:"Rent",plannedAmount:2500,group:"fixed",scope:"personal",rollover:false}
  ],savingsAllocation:{mode:"fixed",value:500,account:"Cash"},lowBalanceThreshold:1000}},
  budgetTemplates:[],budgetSettings:{version:1,defaultLowBalanceThreshold:1000,includeExpectedIncome:true,includeRecurringEstimates:true},
  projects:[],savingsGoals:[],accountLedger:[],accountReconciliations:[],monthlyReports:{},monthlyChecklists:{},expenseRecurrenceSkips:[],savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1}
};
const budgetSandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,__FINANCE_BUDGET_TEST__:true,
  data:structuredClone(baseData),normalizeData:value=>structuredClone(value),renderAll(){},renderMoneyPage(){},renderDashboard(){},renderReports(){},
  PAGE_RENDERERS:{},selectedMonth:()=>"2099-08",shiftMonth:(month,offset)=>{const [y,m]=month.split("-").map(Number);const d=new Date(y,m-1+offset,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;},
  monthLabel:value=>value,effectiveExpenseAmount:item=>Number(item.amount||0),settledExpenseAmount:item=>Number(item.paidAmount||item.amount||0),expenseIncludedInTotals:item=>item.includeInTotals!==false,totalIncomeForMonth:()=>3000,availableMoney:()=>10000,money:value=>String(value),escapeHtml:value=>String(value),categories:["Groceries","Rent"],document:{},
};
budgetSandbox.window=budgetSandbox;budgetSandbox.globalThis=budgetSandbox;
vm.createContext(budgetSandbox);
try{vm.runInContext(budget,budgetSandbox,{filename:"budget-planning.js"});}catch(error){failures.push(`budget-planning VM bootstrap failed: ${error.stack||error}`);}
const budgetInternals=budgetSandbox.FinanceBudgetPlanningInternals;
assert(Boolean(budgetInternals),"Budget planning internals were not exposed");
if(budgetInternals){
  const metrics=budgetInternals.planMetrics("2099-08");
  assert(metrics.planned===5500,"planned budget fixture mismatch");
  assert(metrics.actual===1000,"actual paid fixture mismatch");
  assert(metrics.committed===3500,"committed expense fixture mismatch");
  assert(metrics.upcoming===2500,"upcoming expense fixture mismatch");
  assert(metrics.reservedUnassigned===2000,"unassigned reserve fixture mismatch");
  assert(metrics.expectedIncome===3000,"expected income fixture mismatch");
  assert(metrics.allocation===500,"savings allocation fixture mismatch");
  assert(metrics.forecast===8000,"month-end forecast fixture mismatch");
  assert(metrics.recurringEstimate===2000&&metrics.oneTimeUpcoming===500,"recurring/one-time classification mismatch");
  assert(metrics.remaining===4500,"budget remaining fixture mismatch");
  const normalized=budgetInternals.ensureBudgetShape({},baseData);
  assert(normalized.monthlyBudgets?.["2099-08"]?.items?.length===2,"monthly budget normalization failed");
  assert(normalized.budgetSettings?.version===1,"Budget Version normalization failed");
}

const cloudMemory=new Map();
const cloudSandbox={console,structuredClone,crypto:crypto.webcrypto,localStorage:{getItem:key=>cloudMemory.get(key)??null,setItem:(key,value)=>cloudMemory.set(key,String(value)),removeItem:key=>cloudMemory.delete(key)},navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},location:{reload(){}},matchMedia(){return{matches:false}},data:structuredClone(baseData),APP_VERSION:version.version,window:null,globalThis:null};
cloudSandbox.window=cloudSandbox;cloudSandbox.globalThis=cloudSandbox;
vm.createContext(cloudSandbox);
try{vm.runInContext(cloud,cloudSandbox,{filename:"cloud-sync.js"});}catch(error){failures.push(`cloud-sync budget VM bootstrap failed: ${error.stack||error}`);}
const cloudInternals=cloudSandbox.FinanceCloudSyncInternals;
if(cloudInternals){
  const map=cloudInternals.toRecordMap(baseData);
  assert(Object.values(map).some(row=>row.collection==="monthlyBudgets"&&row.recordId==="2099-08"),"monthly budget was not mapped as a month record");
  assert(Object.values(map).some(row=>row.collection==="settings"&&row.payload?.budgetSettings?.version===1),"budget settings were not mapped into singleton settings");
  const templateData=structuredClone(baseData);templateData.budgetTemplates=[{id:"template-1",name:"Base",items:[]}];
  const templateMap=cloudInternals.toRecordMap(templateData);
  assert(Object.values(templateMap).some(row=>row.collection==="budgetTemplates"&&row.recordId==="template-1"),"budget template was not mapped independently");
  const rows=Object.fromEntries(Object.entries(templateMap).map(([key,row])=>[key,{...row,revision:1,deletedAt:"",updatedAt:"2099-08-01T00:00:00Z",appVersion:version.version,appVersionCode,minWriterVersionCode:120220}]));
  const roundTrip=cloudInternals.fromRecordStore(rows,templateData);
  assert(roundTrip.monthlyBudgets?.["2099-08"]?.items?.length===2,"monthly budget did not round-trip through Cloud Schema V2");
  assert(roundTrip.budgetTemplates?.[0]?.id==="template-1","budget template did not round-trip through Cloud Schema V2");
  assert(roundTrip.budgetSettings?.version===1,"budget settings did not round-trip through Cloud Schema V2");
}

const sha256=file=>crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
const protectedHashes={
  "manifest.webmanifest":"28c526c6dd72a55cdb20753c135359b13b5ce543bcfdc8caae9d2e0f563d0984",
  "offline.html":"eb99a37ed572a95e637f8d88b9c9e6ff60d8f8c4400b402166bdc6bdd5d65619",
  "icons/apple-touch-icon.png":"96012cccb9690471714d0e04cb0aa9a1fc949a13cbeec768681ed2f92f6a8754",
  "icons/favicon-32.png":"a9a048a48195267714b70ca5fb920dce0448623189e4509157e69e3a846e2c52",
  "icons/icon-192.png":"c908a546849be2f2ccbc2801e3fcba3d1c36ba140979a977eb20954847dc6878",
  "icons/icon-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a",
  "icons/icon-maskable-512.png":"7f645e55c35784b3e6190a52d3bed5465c1130f7cddad0441f859fd402f08e6a"
};
for(const [file,expected] of Object.entries(protectedHashes))assert(sha256(file)===expected,`${file} changed unexpectedly`);
for(const [file,text] of [["index.html",html],["cloud-sync.js",cloud],["budget-planning.js",budget],["sw.js",worker]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}

if(failures.length){console.error("V12.22.0 Monthly Budgets & Cash-flow Forecasting validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));process.exit(1);}
console.log("V12.22.0 Monthly Budgets & Cash-flow Forecasting validation passed.");
console.log(`- ${staticIds.length} static IDs and ${new Set(budgetTemplateIds).size} injected budget IDs checked with no duplicates`);
console.log("- Planned, actual, committed, reserve, savings allocation, expected income, and month-end forecast fixtures passed");
console.log("- Monthly plans, templates, and settings round-tripped through Cloud Schema V2 records");
console.log("- Finance Schema 12, Cloud Schema V2, Ledger Version 1, manifest, offline page, and icons remain protected");
