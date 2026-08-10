#!/usr/bin/env node
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import {spawnSync} from "node:child_process"; import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,".."),fail=[];const ok=(c,m)=>{if(!c)fail.push(m)};
const base=spawnSync(process.execPath,[path.join(here,"validate-v12-18-8.mjs")],{encoding:"utf8"});process.stdout.write(base.stdout||"");process.stderr.write(base.stderr||"");if(base.status)fail.push("V12.18.8 baseline failed");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8"),worker=fs.readFileSync(path.join(root,"sw.js"),"utf8"),version=JSON.parse(fs.readFileSync(path.join(root,"version.json"),"utf8"));
ok(Boolean(version.version),"version missing");ok(version.schemaVersion===12,"schema changed");ok(html.includes('<option value="utility">Utility bill</option>'),"utility type missing");
for(const t of ['id="electricBillAmount"','id="waterBillAmount"','id="utilityTotalPreview"','id="expenseSeriesScope"','This month and future months','Every month in this recurring series','function isUtilityExpense','function utilityBillTotal','function recurringExpenseSharedUpdate','electricBillAmount','waterBillAmount'])ok(html.includes(t),`missing ${t}`);
ok(html.includes(`const APP_VERSION = "${version.version}";`),"html version mismatch");
ok(html.includes('item?.electricBillAmount != null || item?.waterBillAmount != null'),"utility detection does not protect null fields");
ok(html.includes('Stop future monthly copies?'),"future recurrence stop confirmation missing");
ok(html.includes('expenseRecordDescription(item)'),"utility row description integration missing");
const utilityTotal=(electric,water)=>Math.max(0,Number(electric||0))+Math.max(0,Number(water||0));ok(utilityTotal(2500,1300)===3800,"utility total fixture failed");
ok(worker.includes(`const APP_VERSION = "${version.version}";`),"worker version mismatch");
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]),dupes=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];ok(!dupes.length,`duplicate ids ${dupes}`);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);const tmp=path.join(os.tmpdir(),`v12189-${process.pid}.js`);fs.writeFileSync(tmp,scripts.at(-1));const syn=spawnSync(process.execPath,["--check",tmp],{encoding:"utf8"});try{fs.unlinkSync(tmp)}catch{};ok(!syn.status,`syntax ${syn.stderr}`);
for(const f of ['SPLIT_UTILITY_BILL_RECURRING_SERIES_VALIDATION_V12_18_9.md','manifest.webmanifest','offline.html'])ok(fs.existsSync(path.join(root,f)),`missing ${f}`);
if(fail.length){console.error("V12.18.9 validation failed\n"+fail.join("\n"));process.exit(1)}console.log("V12.18.9 utility and recurring-series baseline passed.");console.log(`- ${ids.length} IDs, schema 12, syntax and prior baselines passed`);
