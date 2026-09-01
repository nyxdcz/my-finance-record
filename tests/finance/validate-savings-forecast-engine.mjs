import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const stamp = "2026-09-01T00:00:00.000Z";
const sourceData = {
  accounts:{ Wallet:0 },
  expenses:[],
  incomeRecords:[],
  monthlyBudgets:{
    "2026-09":{
      month:"2026-09",
      items:[],
      savingsAllocation:{ mode:"fixed", value:1000, account:"" },
      savingsTargetSet:true,
      savingsProgress:{ confirmed:true, actualAmount:750, confirmedAt:stamp, updatedAt:stamp },
      lowBalanceThreshold:1000,
      createdAt:stamp,
      updatedAt:stamp
    },
    "2026-10":{
      month:"2026-10",
      items:[],
      savingsAllocation:{ mode:"fixed", value:1200, account:"" },
      savingsTargetSet:true,
      savingsProgress:{ confirmed:false, actualAmount:0, confirmedAt:"", updatedAt:"" },
      lowBalanceThreshold:1000,
      createdAt:stamp,
      updatedAt:stamp
    },
    "2026-12":{
      month:"2026-12",
      items:[],
      savingsAllocation:{ mode:"fixed", value:0, account:"" },
      savingsTargetSet:true,
      savingsProgress:{ confirmed:false, actualAmount:0, confirmedAt:"", updatedAt:"" },
      lowBalanceThreshold:1000,
      createdAt:stamp,
      updatedAt:stamp
    }
  },
  budgetTemplates:[],
  budgetSettings:{ version:1, defaultLowBalanceThreshold:1000, includeExpectedIncome:true, includeRecurringEstimates:true }
};

const context = vm.createContext({
  console, structuredClone, Intl, Date, Math, JSON, Number, String, Boolean, Object, Array, Set, Map, RegExp, Error,
  crypto:webcrypto,
  renderAll(){}, renderIncomePage(){}, renderDashboard(){}, renderReports(){},
  normalizeData(value){ return value; },
  data:structuredClone(sourceData),
  selectedMonth(){ return "2026-09"; },
  totalIncomeForMonth(){ return 10000; },
  availableMoney(){ return 0; },
  effectiveExpenseAmount(item){ return Number(item?.amount || 0); },
  settledExpenseAmount(item){ return Number(item?.paidAmount || item?.amount || 0); },
  expenseIncludedInTotals(item){ return item?.includeInTotals !== false; },
  monthLabel(month){ return month; },
  money(value){ return String(value); },
  window:{ __FINANCE_BUDGET_TEST__:true }
});
context.globalThis = context;
vm.runInContext(fs.readFileSync("assets/js/budget-planning.js", "utf8"), context);

const engine = context.window.FinanceBudgetPlanningInternals;
const normalized = engine.normalizePlan("2026-09", sourceData.monthlyBudgets["2026-09"]);
assert.equal(normalized.savingsTargetSet, true);
assert.equal(normalized.savingsProgress.confirmed, true);
assert.equal(normalized.savingsProgress.actualAmount, 750);

const estimate = engine.savingsEstimate({ totalIncome:10000, planned:9092, committed:8732 });
assert.deepEqual(JSON.parse(JSON.stringify(estimate)), { income:10000, estimatedExpenses:9092, potential:908 });
assert.equal(engine.suggestedSavingsTarget(estimate.potential), 1000);

const projection = JSON.parse(JSON.stringify(engine.savingsProjection("2026-09")));
assert.deepEqual(projection.map(row => ({ month:row.month, target:row.target, contribution:row.contribution, cumulative:row.cumulative, confirmed:row.confirmed })), [
  { month:"2026-09", target:1000, contribution:750, cumulative:750, confirmed:true },
  { month:"2026-10", target:1200, contribution:1200, cumulative:1950, confirmed:false },
  { month:"2026-11", target:1000, contribution:1000, cumulative:2950, confirmed:false },
  { month:"2026-12", target:0, contribution:0, cumulative:2950, confirmed:false }
]);

console.log("Savings target normalization, recommendations, and independent monthly projections validated.");
