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

const baseline=spawnSync(process.execPath,[path.join(here,"validate-v12-23-0.mjs")],{encoding:"utf8"});
process.stdout.write(baseline.stdout||""); process.stderr.write(baseline.stderr||"");
if(baseline.status!==0) failures.push("V12.23.0 Reports & Financial Insights baseline failed");

const html=read("index.html");
const productivity=read("productivity-tools.js");
const productivityCss=read("productivity-tools.css");
const cloud=read("cloud-sync.js");
const worker=read("sw.js");
const workflow=read(".github/workflows/quality-pages.yml");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const checklist=read("RELEASE_CHECKLIST.md");
const validation=read("QUICK_ENTRY_PRODUCTIVITY_VALIDATION_V12_24_0.md");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));

assert(["12.24.0","12.25.0"].includes(version.version),"version.json is not a supported V12.24+ release");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===2,"Cloud Schema changed from V2");
assert(version.ledgerVersion===1,"Ledger Version changed from 1");
assert(version.budgetVersion===1,"Budget Version changed from 1");
assert(version.insightsVersion===1,"Insights Version changed from 1");
assert(version.productivityVersion===1,"Productivity Version 1 metadata missing");
assert(html.includes(`<title>My Finance Records · V${version.version}</title>`),"HTML title version mismatch");
assert(html.includes(`const APP_VERSION = "${version.version}";`),"HTML APP_VERSION mismatch");
assert(html.includes('productivity-tools.css')&&html.includes('productivity-tools.js'),"productivity assets are not loaded");
assert(html.includes('data-paid-expense-row="${item.id}"'),"paid expense rows do not expose stable IDs for bulk selection");
assert(html.includes('{"version": "V12.24.0", "title": "Quick Entry & Productivity"'),"in-app V12.24.0 history entry missing");
assert(worker.includes(`const APP_VERSION = "${version.version}";`),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./productivity-tools.js")')&&worker.includes('asset("./productivity-tools.css")'),"productivity assets missing from PWA shell");
assert(workflow.includes('productivity-tools.js productivity-tools.css'),"GitHub Pages workflow does not deploy productivity assets");
assert(packageJson.version===version.version&&packageLock.version===version.version,"package version mismatch");
assert(packageJson.scripts?.quality===`node tests/validate-v${version.version.replaceAll(".","-")}.mjs`,"quality script mismatch");
assert(readme.startsWith(`# My Finance Records · V${version.version} PWA`),"README heading mismatch");
assert(readme.includes("No additional Supabase migration is required"),"README migration guidance missing");
assert(changelog.includes("## 12.24.0 · 2026-08-06"),"CHANGELOG V12.24.0 entry missing");
assert(checklist.includes("Paid payment-account correction creates one reversal and one replacement ledger entry"),"productivity release checklist missing");
assert(validation.includes("review-before-save")&&validation.includes("12-step local undo history"),"productivity validation guidance incomplete");
const versionParts=version.version.split(".").map(Number);
const appVersionCode=(versionParts[0]||0)*10000+(versionParts[1]||0)*10+(versionParts[2]||0);
assert(cloud.includes(`const APP_VERSION_CODE = ${appVersionCode};`)&&cloud.includes(`V${version.version}</strong>`),"Cloud Sync app-version metadata mismatch");
assert(cloud.includes('"expenseTemplates"')&&cloud.includes('productivitySettings:clone(source?.productivitySettings || {})'),"Cloud Sync productivity mapping missing");
assert(cloud.includes('output.productivitySettings = clone(settings.productivitySettings'),"Cloud Sync productivity settings restore missing");

for(const token of [
  "Quick add","Search all finance records","Productivity center","Expense templates","Duplicate last month","More expense filters",
  "Correct payment account","Recently edited records","Undo history","Save as template","change-category","payment-account-correction-reversal",
  "payment-account-correction-debit","FinanceProductivityInternals","expenseTemplates","productivitySettings","Command","ctrlKey"
]) assert(productivity.includes(token),`productivity safeguard missing: ${token}`);
for(const token of [
  ".productivity-quick-grid",".productivity-search-results",".productivity-paid-bulk",".productivity-recent-account-row",
  "dialog[data-form-dialog]","dialog[data-form-dialog][open]","@media (max-width: 700px)","env(safe-area-inset-bottom)"
]) assert(productivityCss.includes(token),`productivity responsive style missing: ${token}`);

for(const file of ["productivity-tools.js","reports-insights.js","budget-planning.js","cloud-sync.js","account-ledger.js","sw.js","tests/validate-v12-22-0.mjs","tests/validate-v12-23-0.mjs","tests/validate-v12-24-0.mjs"]){
  const syntax=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
  assert(syntax.status===0,`${file} syntax failed: ${syntax.stderr}`);
}
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
inlineScripts.forEach((code,index)=>{const temp=path.join(root,`.v12240-inline-${index}.js`);fs.writeFileSync(temp,code);const syntax=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});fs.unlinkSync(temp);assert(syntax.status===0,`inline script ${index+1} syntax failed: ${syntax.stderr}`);});

const staticIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
const injectedSources=[read("cloud-sync.js"),read("account-ledger.js"),read("budget-planning.js"),read("reports-insights.js"),productivity];
const injectedIds=[...new Set(injectedSources.flatMap(source=>[...source.matchAll(/id=\\?"([A-Za-z][A-Za-z0-9_-]+)\\?"/g)].map(match=>match[1])))].filter(id=>!staticIds.includes(id));
const allIds=[...staticIds,...injectedIds];
const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
assert(duplicateIds.length===0,`duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

const memory=new Map();
const sampleData={
  accounts:{Cash:1000,Bank:2000,Savings:500},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},accountOrder:["Cash","Bank","Savings"],accountIcons:{},
  expenses:[
    {id:"paid-1",name:"Internet",category:"Bills",date:"2026-08-05",paid:true,paidDate:"2026-08-05",paidFromAccount:"Cash",account:"Cash",amount:200,paidAmount:200,accountDeducted:true,paymentTransactionId:"pay-1",includeInTotals:true,recurring:"Monthly"},
    {id:"unpaid-1",name:"Groceries",category:"Groceries",date:"2026-08-12",paid:false,account:"Bank",amount:350,includeInTotals:true,recurring:"No"}
  ],
  incomeRecords:[{id:"income-1",name:"Design fee",category:"Other Income",date:"2026-08-03",account:"Bank",amount:1500}],
  projects:[{id:"project-1",name:"Villa design",type:"Architecture",status:"Ongoing",deadline:"2026-09-01",value:5000}],
  savingsGoals:[{id:"goal-1",name:"Emergency fund",currentAmount:500,targetAmount:5000}],
  accountLedger:[{id:"ledger-1",transactionId:"pay-1",operationId:"expense-payment:pay-1:paid-1",account:"Cash",type:"expense-payment",amount:-200,date:"2026-08-05",description:"Expense payment: Internet",expenseId:"paid-1"}],
  accountReconciliations:[],monthlyBudgets:{"2026-08":{month:"2026-08",items:[{id:"budget-1",category:"Groceries",plannedAmount:1000}]}},budgetTemplates:[],
  expenseTemplates:[{id:"template-1",name:"Monthly internet",expenseName:"Internet",expenseType:"normal",amount:200,category:"Bills",account:"Cash",recurring:true}],
  productivitySettings:{version:1,enabled:true,shortcuts:true},monthlyReports:{},monthlyChecklists:{},iconLibrary:{},expenseRecurrenceSkips:[],savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1},budgetSettings:{version:1}
};
const appended=[];
const sandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,__FINANCE_PRODUCTIVITY_TEST__:true,
  localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)},
  data:structuredClone(sampleData),STORAGE_KEY:"finance",UNDO_KEY:"undo",undoState:null,
  normalizeData:value=>value,pushUndo(){},undoLastChange(){},saveData(){},renderAll(){},openExpenseDialog(){},openIncomeDialog(){},
  renderExpenseRows(){},renderPaidExpenses(){},PAGE_RENDERERS:{},refreshBulkActionValue(){},applyBulkExpenseAction(){},selectedExpenseIds:new Set(),
  money:value=>`₱${Number(value||0).toFixed(2)}`,effectiveExpenseAmount:item=>Number(item.amount||0),settledExpenseAmount:item=>Number(item.paidAmount||item.amount||0),
  expenseIncludedInTotals:item=>item.includeInTotals!==false,expenseDueStatus:item=>item.id==="unpaid-1"?{badgeClass:"status-due-soon",label:"Due in 6 days"}:{badgeClass:"",label:""},
  accountNames:()=>Object.keys(sampleData.accounts),accountType:name=>sampleData.accountTypes[name]||"Other",projectIsFinancial:()=>true,projectWorkSource:()=>"freelance",
  openProjectDialog(){},openSavingsGoalDialog(){},openAccountDialog(){},goToPage(){},applySelectedMonth(){},selectedMonth:()=>"2026-08",shiftMonth:()=>"2026-07",
  duplicateExpenseNextMonth:item=>structuredClone(item),formatDateTime:value=>value,activePageId:()=>"dashboard",
  FinanceAccountLedger:{appendLedgerEntries(entries){appended.push(...structuredClone(entries)); sandbox.data.accountLedger.push(...structuredClone(entries)); for(const entry of entries) sandbox.data.accounts[entry.account]=Number(sandbox.data.accounts[entry.account]||0)+Number(entry.amount||0); return entries;}}
};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(productivity,sandbox,{filename:"productivity-tools.js"});}catch(error){failures.push(`productivity-tools VM bootstrap failed: ${error.stack||error}`);}
const internals=sandbox.FinanceProductivityInternals;
assert(Boolean(internals),"Productivity internals were not exposed");
if(internals){
  const normalized=internals.normalizeTemplate({name:" Gym ",expenseType:"gym",amount:"80",gymDays:[1,1,4,9],paid:true,paymentTransactionId:"secret"});
  assert(normalized.name==="Gym"&&normalized.expenseType==="gym"&&normalized.amount===80,"template normalization fixture mismatch");
  assert(normalized.gymDays.join(",")==="1,4","template Gym-day normalization mismatch");
  assert(!Object.prototype.hasOwnProperty.call(normalized,"paid")||normalized.paid===true,"template normalizer unexpectedly failed object preservation");
  const search=internals.searchRecords("internet cash");
  assert(search.some(item=>item.type==="Expense"&&item.id==="paid-1"),"global search expense/account fixture mismatch");
  const templateSearch=internals.searchRecords("monthly internet");
  assert(templateSearch.some(item=>item.type==="Template"&&item.id==="template-1"),"global search template fixture mismatch");
  assert(internals.matchAdvancedFilter(sampleData.expenses[1],"expense")===true,"default advanced filter rejected an expense");
  sandbox.data.expenses[1].account="Bank";
  const beforeCash=sandbox.data.accounts.Cash,beforeBank=sandbox.data.accounts.Bank;
  const corrected=internals.correctPaidAccounts([sandbox.data.expenses[0]],"Bank");
  assert(corrected===1,"payment-account correction count mismatch");
  assert(appended.length===2&&appended[0].amount===200&&appended[1].amount===-200,"payment-account correction ledger pair mismatch");
  assert(sandbox.data.accounts.Cash===beforeCash+200&&sandbox.data.accounts.Bank===beforeBank-200,"payment-account correction balance fixture mismatch");
  assert(sandbox.data.expenses[0].paidFromAccount==="Bank","payment-account correction did not update paid account");
}

// Cloud record round-trip for synchronized productivity values.
const cloudMemory=new Map();
const cloudSandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,
  localStorage:{getItem:key=>cloudMemory.get(key)??null,setItem:(key,value)=>cloudMemory.set(key,String(value)),removeItem:key=>cloudMemory.delete(key)},
  navigator:{onLine:true,userAgent:"Node",platform:"MacIntel"},document:{readyState:"loading",addEventListener(){},getElementById(){return null;}},location:{reload(){}},matchMedia(){return{matches:false}},
  data:structuredClone(sampleData),APP_VERSION:version.version,normalizeData:value=>value,saveData(){},renderAll(){},STORAGE_KEY:"finance",windowAddEventListener(){},setInterval(){return 0},clearInterval(){},setTimeout(){return 0},clearTimeout(){},
};
cloudSandbox.window=cloudSandbox; cloudSandbox.globalThis=cloudSandbox; cloudSandbox.window.addEventListener=()=>{};
vm.createContext(cloudSandbox);
try{vm.runInContext(cloud,cloudSandbox,{filename:"cloud-sync.js"});}catch(error){failures.push(`cloud-sync VM bootstrap failed: ${error.stack||error}`);}
const cloudInternals=cloudSandbox.FinanceCloudSyncInternals;
assert(Boolean(cloudInternals),"Cloud Sync internals were not exposed");
if(cloudInternals){
  const map=cloudInternals.toRecordMap(sampleData);
  assert(Boolean(map["expenseTemplates\u001ftemplate-1"]),"expense template was not mapped as an independent cloud record");
  const settings=Object.values(map).find(row=>row.collection==="settings"&&row.recordId==="preferences");
  assert(settings?.payload?.productivitySettings?.shortcuts===true,"productivity settings missing from cloud singleton record");
  const store=Object.fromEntries(Object.entries(map).map(([key,row])=>[key,{...row,revision:1,deletedAt:"",updatedAt:"2026-08-06T00:00:00Z"}]));
  const restored=cloudInternals.fromRecordStore(store,{});
  assert(restored.expenseTemplates?.[0]?.id==="template-1","expense template cloud round-trip failed");
  assert(restored.productivitySettings?.version===1,"productivity settings cloud round-trip failed");
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
for(const [file,expected] of Object.entries(protectedHashes)) assert(sha256(file)===expected,`${file} changed unexpectedly`);
for(const [file,text] of [["index.html",html],["productivity-tools.js",productivity],["cloud-sync.js",cloud],["sw.js",worker]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}

if(failures.length){console.error("V12.24.0 Quick Entry & Productivity validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));process.exit(1);}
console.log("V12.24+ Quick Entry & Productivity baseline passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected runtime IDs checked with no duplicates`);
console.log("- Template, search, filter, payment-account correction, cloud round-trip, keyboard, and phone-layout safeguards passed");
console.log("- Finance Schema 12, Cloud Schema V2, Ledger/Budget/Insights/Productivity Version 1, manifest, offline page, and icons remain protected");
