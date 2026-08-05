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

const baseline=spawnSync(process.execPath,[path.join(here,"validate-v12-22-0.mjs")],{encoding:"utf8"});
process.stdout.write(baseline.stdout||"");process.stderr.write(baseline.stderr||"");
if(baseline.status!==0)failures.push("V12.22.0 Monthly Budgets baseline failed");

const html=read("index.html");
const insights=read("reports-insights.js");
const insightsCss=read("reports-insights.css");
const cloud=read("cloud-sync.js");
const worker=read("sw.js");
const workflow=read(".github/workflows/quality-pages.yml");
const readme=read("README.md");
const changelog=read("CHANGELOG.md");
const checklist=read("RELEASE_CHECKLIST.md");
const validation=read("REPORTS_FINANCIAL_INSIGHTS_VALIDATION_V12_23_0.md");
const version=JSON.parse(read("version.json"));
const packageJson=JSON.parse(read("package.json"));
const packageLock=JSON.parse(read("package-lock.json"));

assert(version.version==="12.23.0","version.json is not V12.23.0");
assert(version.schemaVersion===12,"Finance Schema changed from 12");
assert(version.cloudSchemaVersion===2,"Cloud Schema changed from V2");
assert(version.ledgerVersion===1,"Ledger Version changed from 1");
assert(version.budgetVersion===1,"Budget Version changed from 1");
assert(version.insightsVersion===1,"Insights Version 1 metadata missing");
assert(html.includes('<title>My Finance Records · V12.23.0</title>'),"HTML title version mismatch");
assert(html.includes('const APP_VERSION = "12.23.0";'),"HTML APP_VERSION mismatch");
assert(html.includes('reports-insights.css')&&html.includes('reports-insights.js'),"insights runtime assets are not loaded");
assert(html.includes('{"version": "V12.23.0", "title": "Reports & Financial Insights"'),"in-app V12.23.0 history entry missing");
assert(worker.includes('const APP_VERSION = "12.23.0";'),"service-worker version mismatch");
assert(worker.includes(`const CACHE_VERSION = "${version.cacheVersion}";`),"service-worker cache mismatch");
assert(worker.includes('asset("./reports-insights.js")')&&worker.includes('asset("./reports-insights.css")'),"insights assets missing from PWA shell");
assert(workflow.includes('reports-insights.js reports-insights.css'),"GitHub Pages workflow does not deploy insights assets");
assert(packageJson.version==="12.23.0"&&packageLock.version==="12.23.0","package version mismatch");
assert(packageJson.scripts?.quality==="node tests/validate-v12-23-0.mjs","quality script mismatch");
assert(readme.startsWith("# My Finance Records · V12.23.0 PWA"),"README heading mismatch");
assert(readme.includes("No additional Supabase migration is required"),"README migration guidance missing");
assert(changelog.includes("## 12.23.0 · 2026-08-06"),"CHANGELOG V12.23.0 entry missing");
assert(checklist.includes("Net Cash Flow equals Total Income minus Actual Spending"),"release insights checklist missing");
assert(validation.includes("Account History")&&validation.includes("Project Margin"),"insights validation guidance incomplete");
assert(cloud.includes('const APP_VERSION_CODE = 120230;')&&cloud.includes('V12.23.0</strong>'),"Cloud Sync app-version metadata mismatch");

for(const token of [
  "Reports & financial insights","Selected month","Last 3 months","Last 6 months","Last 12 months","Year to date","Custom date range",
  "Total income","Actual spending","Net cash flow","Savings change","Project margin","Monthly cash-flow trend","Spending by category",
  "Account-balance history","Planned versus actual","Utility-bill trend","Gym insights","Recurring-expense changes","Savings progress",
  "Project profitability","Year-to-date comparison","financial-insights-${metrics.range.startDate}-to-${metrics.range.endDate}.csv",
  "Project payments are not tied to an account","FinanceReportInsightsInternals"
])assert(insights.includes(token),`insights safeguard missing: ${token}`);
for(const token of ["report-insights-filters","report-insights-kpis","report-insights-grid","insight-monthly-bars","insight-line-chart","insight-budget-row","insight-ytd-grid","@media (max-width:760px)","@media print"])assert(insightsCss.includes(token),`insights responsive/print style missing: ${token}`);

for(const file of ["reports-insights.js","budget-planning.js","cloud-sync.js","account-ledger.js","sw.js","tests/validate-v12-22-0.mjs","tests/validate-v12-23-0.mjs"]){
  const syntax=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
  assert(syntax.status===0,`${file} syntax failed: ${syntax.stderr}`);
}
const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
inlineScripts.forEach((code,index)=>{const temp=path.join(root,`.v12230-inline-${index}.js`);fs.writeFileSync(temp,code);const syntax=spawnSync(process.execPath,["--check",temp],{encoding:"utf8"});fs.unlinkSync(temp);assert(syntax.status===0,`inline script ${index+1} syntax failed: ${syntax.stderr}`);});

const staticIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
const injectedSources=[read("cloud-sync.js"),read("account-ledger.js"),read("budget-planning.js"),insights];
const injectedIds=[...new Set(injectedSources.flatMap(source=>[...source.matchAll(/id=\\?"([A-Za-z][A-Za-z0-9_-]+)\\?"/g)].map(match=>match[1])))].filter(id=>!staticIds.includes(id));
const allIds=[...staticIds,...injectedIds];
const duplicateIds=[...new Set(allIds.filter((id,index)=>allIds.indexOf(id)!==index))];
assert(duplicateIds.length===0,`duplicate static/injected IDs: ${duplicateIds.join(", ")}`);

const sampleData={
  accounts:{Cash:13000,Bank:4000,Savings:3000},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},accountOrder:["Cash","Bank","Savings"],accountIcons:{},iconLibrary:{},
  expenses:[
    {id:"g25-1",seriesId:"grocery",name:"Groceries",date:"2025-01-05",paid:true,paidDate:"2025-01-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:800,paidAmount:800,includeInTotals:true,recurring:"Monthly"},
    {id:"g25-2",seriesId:"grocery",name:"Groceries",date:"2025-02-05",paid:true,paidDate:"2025-02-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:800,paidAmount:800,includeInTotals:true,recurring:"Monthly"},
    {id:"g25-3",seriesId:"grocery",name:"Groceries",date:"2025-03-05",paid:true,paidDate:"2025-03-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:800,paidAmount:800,includeInTotals:true,recurring:"Monthly"},
    {id:"g1",seriesId:"grocery",name:"Groceries",date:"2026-01-05",paid:true,paidDate:"2026-01-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:1000,paidAmount:1000,includeInTotals:true,recurring:"Monthly"},
    {id:"g2",seriesId:"grocery",name:"Groceries",date:"2026-02-05",paid:true,paidDate:"2026-02-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:1200,paidAmount:1200,includeInTotals:true,recurring:"Monthly"},
    {id:"g3",seriesId:"grocery",name:"Groceries",date:"2026-03-05",paid:true,paidDate:"2026-03-05",paidFromAccount:"Cash",account:"Cash",category:"Groceries",amount:900,paidAmount:900,includeInTotals:true,recurring:"Monthly"},
    {id:"u1",seriesId:"utility",name:"Electric & Water",expenseType:"utility",date:"2026-01-10",paid:true,paidDate:"2026-01-10",paidFromAccount:"Bank",account:"Bank",category:"Utilities",amount:300,paidAmount:300,electricBillAmount:200,waterBillAmount:100,includeInTotals:true,recurring:"Monthly"},
    {id:"u2",seriesId:"utility",name:"Electric & Water",expenseType:"utility",date:"2026-02-10",paid:true,paidDate:"2026-02-10",paidFromAccount:"Bank",account:"Bank",category:"Utilities",amount:350,paidAmount:350,electricBillAmount:250,waterBillAmount:100,includeInTotals:true,recurring:"Monthly"},
    {id:"u3",seriesId:"utility",name:"Electric & Water",expenseType:"utility",date:"2026-03-10",paid:false,account:"Bank",category:"Utilities",amount:400,electricBillAmount:300,waterBillAmount:100,includeInTotals:true,recurring:"Monthly"},
    {id:"gym1",seriesId:"gym",name:"Gym",expenseType:"gym",date:"2026-01-01",paid:true,paidDate:"2026-01-20",paidFromAccount:"Cash",account:"Cash",category:"Health & Fitness",amount:800,paidAmount:800,gymPricePerVisit:80,gymVisitCount:10,includeInTotals:true,recurring:"Monthly"},
    {id:"gym2",seriesId:"gym",name:"Gym",expenseType:"gym",date:"2026-02-01",paid:true,paidDate:"2026-02-20",paidFromAccount:"Cash",account:"Cash",category:"Health & Fitness",amount:960,paidAmount:960,gymPricePerVisit:80,gymVisitCount:12,includeInTotals:true,recurring:"Monthly"},
    {id:"gym3",seriesId:"gym",name:"Gym",expenseType:"gym",date:"2026-03-01",paid:false,account:"Cash",category:"Health & Fitness",amount:800,gymPricePerVisit:80,gymVisitCount:10,includeInTotals:true,recurring:"Monthly"},
    {id:"pc1",name:"Project materials",date:"2026-02-15",paid:true,paidDate:"2026-02-15",paidFromAccount:"Bank",account:"Bank",category:"Project Costs",amount:500,paidAmount:500,includeInTotals:true,recurring:"No"}
  ],
  incomeRecords:[
    {id:"i25-1",date:"2025-01-01",name:"Salary",category:"Paycheck",account:"Cash",amount:4000,includeInTotals:true},
    {id:"i25-2",date:"2025-02-01",name:"Salary",category:"Paycheck",account:"Cash",amount:4000,includeInTotals:true},
    {id:"i25-3",date:"2025-03-01",name:"Salary",category:"Paycheck",account:"Cash",amount:4000,includeInTotals:true},
    {id:"i1",date:"2026-01-01",name:"Salary",category:"Paycheck",account:"Cash",amount:5000,includeInTotals:true},
    {id:"i2",date:"2026-02-01",name:"Salary",category:"Paycheck",account:"Cash",amount:5000,includeInTotals:true},
    {id:"i3",date:"2026-03-01",name:"Salary",category:"Paycheck",account:"Cash",amount:5000,includeInTotals:true},
    {id:"transfer",date:"2026-02-10",name:"Transfer",category:"Transfer from savings",account:"Cash",amount:1000,includeInTotals:true}
  ],
  projects:[
    {id:"p-old",name:"Old project",workSource:"freelance",paymentHistory:[{id:"op",date:"2025-02-15",amount:1000,type:"Payment"}]},
    {id:"p1",name:"Project A",workSource:"freelance",paymentHistory:[{id:"p1a",date:"2026-01-15",amount:2000,type:"Payment"},{id:"p1b",date:"2026-03-15",amount:3000,type:"Payment"}]}
  ],
  monthlyBudgets:{
    "2026-01":{month:"2026-01",items:[{id:"b1",category:"Groceries",plannedAmount:2500}]},
    "2026-02":{month:"2026-02",items:[{id:"b2",category:"Groceries",plannedAmount:3000}]},
    "2026-03":{month:"2026-03",items:[{id:"b3",category:"Groceries",plannedAmount:3500}]}
  },budgetTemplates:[],budgetSettings:{version:1},
  monthlyReports:{
    "2025-01":{accountBalances:{Cash:6000,Bank:3000,Savings:1000},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:1000},
    "2025-02":{accountBalances:{Cash:7000,Bank:3000,Savings:1200},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:1200},
    "2025-03":{accountBalances:{Cash:8000,Bank:3000,Savings:1500},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:1500},
    "2026-01":{accountBalances:{Cash:9000,Bank:5000,Savings:2000},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:2000},
    "2026-02":{accountBalances:{Cash:11000,Bank:4500,Savings:2500},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:2500},
    "2026-03":{accountBalances:{Cash:13000,Bank:4000,Savings:3000},accountTypes:{Cash:"Cash",Bank:"Bank",Savings:"Savings"},savingsTotal:3000}
  },
  savingsGoals:[{id:"goal",name:"Emergency fund",currentAmount:3000,targetAmount:6000,targetDate:"2026-12-31"}],
  accountLedger:[],accountReconciliations:[],monthlyChecklists:{},expenseRecurrenceSkips:[],savingsSettings:{},projectCalendarSettings:{},salaryWorkSettings:{},ledgerSettings:{version:1}
};

const memory=new Map();
const sandbox={
  console,structuredClone,crypto:crypto.webcrypto,window:null,globalThis:null,__FINANCE_REPORT_INSIGHTS_TEST__:true,
  localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)},
  data:structuredClone(sampleData),renderReports(){},renderAll(){},PAGE_RENDERERS:{},selectedMonth:()=>"2026-03",
  shiftMonth:(month,offset)=>{const [y,m]=month.split("-").map(Number);const d=new Date(y,m-1+offset,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;},
  monthLabel:month=>month,expenseIncludedInTotals:item=>item.includeInTotals!==false,incomeIncludedInTotals:item=>item.includeInTotals!==false&&item.category!=="Transfer from savings",
  monthlyExpenseAmount:item=>Number(item.amount||0),settledExpenseAmount:item=>Number(item.paidAmount||item.amount||0),projectIsFinancial:()=>true,
  isUtilityExpense:item=>item.expenseType==="utility",isGymExpense:item=>item.expenseType==="gym",gymScheduledDatesForMonth:item=>Array.from({length:Number(item.gymVisitCount||0)}),
  reportForMonth:month=>sampleData.monthlyReports[month]||{accountBalances:sampleData.accounts,accountTypes:sampleData.accountTypes,savingsTotal:sampleData.accounts.Savings},
  savingsGoalCurrent:goal=>Number(goal.currentAmount||0)
};
sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(insights,sandbox,{filename:"reports-insights.js"});}catch(error){failures.push(`reports-insights VM bootstrap failed: ${error.stack||error}`);}
const internals=sandbox.FinanceReportInsightsInternals;
assert(Boolean(internals),"Reports insights internals were not exposed");
if(internals){
  const range=internals.rangeMetrics({preset:"custom",startDate:"2026-01-01",endDate:"2026-03-31",account:"",category:""},"2026-03");
  assert(range.months.join(",")==="2026-01,2026-02,2026-03","custom range months mismatch");
  assert(range.totalIncome===20000,"range Total Income fixture mismatch");
  assert(range.totalExpenses===6010,"range Actual Spending fixture mismatch");
  assert(range.netCashFlow===13990,"range Net Cash Flow fixture mismatch");
  assert(range.totalPlannedExpenses===7210,"range planned expense fixture mismatch");
  assert(range.totalBudget===9000,"range monthly budget fixture mismatch");
  assert(range.savingsStart===2000&&range.savingsEnd===3000&&range.savingsChange===1000,"Savings trend fixture mismatch");
  assert(range.gymVisits===32&&range.gymCost===2560&&range.gymCostPerVisit===80,"Gym visit/cost fixture mismatch");
  assert(range.projectIncome===5000&&range.projectCosts===500&&range.projectMargin===4500,"project cash-margin fixture mismatch");
  assert(range.utility[0].electric===200&&range.utility[1].water===100&&range.utility[2].total===400,"Utility Bill trend fixture mismatch");
  assert(range.categories.find(item=>item.name==="Groceries")?.amount===3100,"category-spending fixture mismatch");
  assert(range.recurringChanges.some(item=>item.name==="Groceries"&&item.difference===200&&item.type==="increased"),"recurring increase was not detected");
  assert(range.recurringChanges.some(item=>item.name==="Groceries"&&item.difference===-300&&item.type==="decreased"),"recurring decrease was not detected");
  assert(range.savingsGoals[0].percent===50,"Savings Goal progress fixture mismatch");
  assert(internals.accountBalanceForMonth("2026-01","Cash")===9000,"saved account snapshot was not preferred");
  const cash=internals.rangeMetrics({preset:"custom",startDate:"2026-01-01",endDate:"2026-03-31",account:"Cash",category:""},"2026-03");
  assert(cash.totalIncome===15000,"Account filter manual income fixture mismatch");
  assert(cash.totalExpenses===4860,"Account filter paid spending fixture mismatch");
  assert(cash.projectIncome===0&&cash.accountFilterNote.includes("Project payments"),"Account filter project-payment safeguard missing");
  const groceries=internals.rangeMetrics({preset:"custom",startDate:"2026-01-01",endDate:"2026-03-31",account:"",category:"Groceries"},"2026-03");
  assert(groceries.totalExpenses===3100&&groceries.totalIncome===20000,"Expense category filter changed the wrong totals");
  const comparison=internals.comparisonMetrics("2026-03",{account:"",category:""});
  assert(comparison.current.totalIncome===20000&&comparison.previous.totalIncome===13000,"YTD same-period comparison fixture mismatch");
  assert(comparison.incomeDifference===7000,"YTD Income difference fixture mismatch");
  assert(internals.percentChange(120,100)===20&&internals.percentChange(10,0)===null,"percentage comparison fixture mismatch");
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
for(const [file,expected]of Object.entries(protectedHashes))assert(sha256(file)===expected,`${file} changed unexpectedly`);
for(const [file,text]of [["index.html",html],["reports-insights.js",insights],["cloud-sync.js",cloud],["sw.js",worker]]){
  assert(!/sb_secret_[A-Za-z0-9_-]{8,}/.test(text),`Supabase secret key detected in ${file}`);
  assert(!/(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{12,}/i.test(text),`service-role credential detected in ${file}`);
}

if(failures.length){console.error("V12.23.0 Reports & Financial Insights validation failed:\n"+failures.map(item=>`- ${item}`).join("\n"));process.exit(1);}
console.log("V12.23.0 Reports & Financial Insights validation passed.");
console.log(`- ${staticIds.length} static HTML IDs and ${injectedIds.length} injected runtime IDs checked with no duplicates`);
console.log("- Range, account, category, cash-flow, account-history, budget, Utility, Gym, recurring, Savings, project-margin, and YTD fixtures passed");
console.log("- Finance Schema 12, Cloud Schema V2, Ledger Version 1, Budget Version 1, manifest, offline page, and icons remain protected");
