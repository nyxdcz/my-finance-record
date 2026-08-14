"use strict";

/* My Finance Records V12.22.0 · monthly budgets and cash-flow forecasting.
   Plans are local-first finance records and Cloud Schema V2 synchronizes each month,
   template, and settings record independently. */
(function monthlyBudgetPlanningBootstrap() {
  const BUDGET_PANEL_STATE_KEY = "simple-finance-budget-panel-state-v1";
  const BUDGET_VERSION = 1;
  const FIXED_CATEGORIES = new Set(["Bills","Rent","Loans","Utilities","Subscriptions"]);
  const DEFAULT_THRESHOLD = 1000;
  const originalRenderAll = renderAll;
  const originalRenderMoneyPage = renderMoneyPage;
  const originalRenderDashboard = renderDashboard;
  const originalRenderReports = renderReports;
  const originalNormalizeData = normalizeData;

  const clone = value => {
    try { return structuredClone(value); } catch (error) { return JSON.parse(JSON.stringify(value)); }
  };
  const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const safeText = (value, max = 120) => String(value || "").trim().slice(0, max);
  const localDate = () => {
    const value = new Date();
    return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
  };
  const itemMonth = item => String(item?.date || "").slice(0,7);
  const expenseAmount = item => roundMoney(typeof effectiveExpenseAmount === "function" ? effectiveExpenseAmount(item) : Number(item?.amount || 0));
  const paidAmount = item => roundMoney(typeof settledExpenseAmount === "function" ? settledExpenseAmount(item) : Number(item?.paidAmount || item?.amount || 0));
  const included = item => typeof expenseIncludedInTotals === "function" ? expenseIncludedInTotals(item) : item?.includeInTotals !== false;
  const scopeForExpense = item => String(item?.category || "") === "Project Costs" ? "project" : "personal";
  const monthShift = (month, offset) => typeof shiftMonth === "function" ? shiftMonth(month, offset) : (() => { const [y,m]=month.split("-").map(Number); const d=new Date(y,m-1+offset,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
  const monthName = month => typeof monthLabel === "function" ? monthLabel(month) : month;
  const makeId = prefix => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function normalizeBudgetItem(item) {
    const category = safeText(item?.category || "Other", 60) || "Other";
    return {
      id:safeText(item?.id || makeId("budget-item"), 120),
      category,
      plannedAmount:Math.max(0, roundMoney(item?.plannedAmount ?? item?.amount)),
      group:item?.group === "flexible" ? "flexible" : "fixed",
      scope:item?.scope === "project" ? "project" : "personal",
      rollover:Boolean(item?.rollover),
      notes:safeText(item?.notes, 200),
      createdAt:item?.createdAt || new Date().toISOString(),
      updatedAt:item?.updatedAt || item?.createdAt || new Date().toISOString()
    };
  }

  function normalizeAllocation(value) {
    const mode = value?.mode === "percentage" ? "percentage" : "fixed";
    return {
      mode,
      value:Math.max(0, roundMoney(value?.value || 0)),
      account:safeText(value?.account, 80)
    };
  }

  function normalizePlan(month, value) {
    const items = (Array.isArray(value?.items) ? value.items : []).map(normalizeBudgetItem).filter(item => item.plannedAmount > 0);
    const seen = new Set();
    return {
      month,
      items:items.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }),
      savingsAllocation:normalizeAllocation(value?.savingsAllocation),
      lowBalanceThreshold:Math.max(0, roundMoney(value?.lowBalanceThreshold ?? DEFAULT_THRESHOLD)),
      templateId:safeText(value?.templateId, 120),
      createdAt:value?.createdAt || new Date().toISOString(),
      updatedAt:value?.updatedAt || value?.createdAt || new Date().toISOString()
    };
  }

  function ensureBudgetShape(target, source = target) {
    if (!target || typeof target !== "object") return target;
    const sourcePlans = source?.monthlyBudgets && typeof source.monthlyBudgets === "object" && !Array.isArray(source.monthlyBudgets) ? source.monthlyBudgets : {};
    target.monthlyBudgets = Object.fromEntries(Object.entries(sourcePlans).filter(([month]) => /^\d{4}-\d{2}$/.test(month)).map(([month, plan]) => [month, normalizePlan(month, plan)]));
    target.budgetTemplates = (Array.isArray(source?.budgetTemplates) ? source.budgetTemplates : []).map(template => ({
      id:safeText(template?.id || makeId("budget-template"),120),
      name:safeText(template?.name || "Budget template",80) || "Budget template",
      items:(Array.isArray(template?.items) ? template.items : []).map(normalizeBudgetItem),
      savingsAllocation:normalizeAllocation(template?.savingsAllocation),
      lowBalanceThreshold:Math.max(0,roundMoney(template?.lowBalanceThreshold ?? DEFAULT_THRESHOLD)),
      createdAt:template?.createdAt || new Date().toISOString(),
      updatedAt:template?.updatedAt || template?.createdAt || new Date().toISOString()
    })).filter(template => template.items.length || template.savingsAllocation.value > 0);
    const settings = source?.budgetSettings && typeof source.budgetSettings === "object" ? source.budgetSettings : {};
    target.budgetSettings = {
      version:BUDGET_VERSION,
      defaultLowBalanceThreshold:Math.max(0,roundMoney(settings.defaultLowBalanceThreshold ?? DEFAULT_THRESHOLD)),
      includeExpectedIncome:settings.includeExpectedIncome !== false,
      includeRecurringEstimates:settings.includeRecurringEstimates !== false
    };
    return target;
  }

  normalizeData = function budgetAwareNormalizeData(value) {
    const normalized = originalNormalizeData(value);
    return ensureBudgetShape(normalized, value);
  };
  data = ensureBudgetShape(data, data);

  function selectedPlan(create = false) {
    ensureBudgetShape(data, data);
    const month = selectedMonth();
    if (!data.monthlyBudgets[month] && create) {
      data.monthlyBudgets[month] = normalizePlan(month, { lowBalanceThreshold:data.budgetSettings.defaultLowBalanceThreshold });
    }
    return data.monthlyBudgets[month] || normalizePlan(month, { lowBalanceThreshold:data.budgetSettings.defaultLowBalanceThreshold });
  }

  function monthExpenseList(month) {
    return (data.expenses || []).filter(item => itemMonth(item) === month && included(item));
  }

  function itemActual(item, month) {
    return roundMoney(monthExpenseList(month).filter(expense => expense.paid && String(expense.category || "Other") === item.category && scopeForExpense(expense) === item.scope).reduce((sum, expense) => sum + paidAmount(expense), 0));
  }

  function itemCommitted(item, month) {
    return roundMoney(monthExpenseList(month).filter(expense => String(expense.category || "Other") === item.category && scopeForExpense(expense) === item.scope).reduce((sum, expense) => sum + expenseAmount(expense), 0));
  }

  function planMetrics(month = selectedMonth()) {
    const plan = data.monthlyBudgets?.[month] || normalizePlan(month, { lowBalanceThreshold:data.budgetSettings?.defaultLowBalanceThreshold });
    const expenses = monthExpenseList(month);
    const actual = roundMoney(expenses.filter(item => item.paid).reduce((sum,item) => sum + paidAmount(item),0));
    const committed = roundMoney(expenses.reduce((sum,item) => sum + expenseAmount(item),0));
    const upcoming = roundMoney(expenses.filter(item => !item.paid).reduce((sum,item) => sum + expenseAmount(item),0));
    const planned = roundMoney(plan.items.reduce((sum,item) => sum + item.plannedAmount,0));
    const reservedUnassigned = roundMoney(plan.items.reduce((sum,item) => sum + Math.max(0,item.plannedAmount - itemCommitted(item,month)),0));
    const totalIncome = roundMoney(typeof totalIncomeForMonth === "function" ? totalIncomeForMonth(month) : 0);
    const allocation = plan.savingsAllocation.mode === "percentage" ? roundMoney(totalIncome * plan.savingsAllocation.value / 100) : roundMoney(plan.savingsAllocation.value);
    const today = localDate();
    const currentMonthKey = today.slice(0,7);
    const futureMonth = month > currentMonthKey;
    const expectedIncome = data.budgetSettings?.includeExpectedIncome === false ? 0 : roundMoney((data.incomeRecords || []).filter(item => itemMonth(item) === month && included(item) && !item.ledgerTransactionId && (futureMonth || String(item.date || "") > today)).reduce((sum,item) => sum + Number(item.amount || 0),0));
    const currentAvailable = roundMoney(typeof availableMoney === "function" ? availableMoney() : Object.values(data.accounts || {}).reduce((a,b)=>a+Number(b||0),0));
    const forecast = roundMoney(currentAvailable + expectedIncome - upcoming - reservedUnassigned - allocation);
    const remaining = roundMoney(planned - actual);
    const variance = roundMoney(planned - committed);
    const recurringEstimate = roundMoney(expenses.filter(item => !item.paid && item.recurring === "Monthly").reduce((sum,item)=>sum+expenseAmount(item),0));
    const oneTimeUpcoming = roundMoney(upcoming - recurringEstimate);
    const overdue = roundMoney(expenses.filter(item => !item.paid && month === currentMonthKey && dueDateForExpense(item,month) < today).reduce((sum,item)=>sum+expenseAmount(item),0));
    return { plan, planned, actual, committed, upcoming, reservedUnassigned, totalIncome, allocation, expectedIncome, currentAvailable, forecast, remaining, variance, recurringEstimate, oneTimeUpcoming, overdue };
  }

  function dueDateForExpense(item, month) {
    const day = Math.max(1,Math.min(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(),Number(item?.dueDay || String(item?.date || "").slice(8,10) || 1)));
    return `${month}-${String(day).padStart(2,"0")}`;
  }

  function lowBalanceAlerts(metrics) {
    const threshold = metrics.plan.lowBalanceThreshold;
    const alerts = [];
    Object.entries(data.accounts || {}).forEach(([account,balance]) => {
      const upcoming = monthExpenseList(selectedMonth()).filter(item => !item.paid && String(item.account || "") === account).reduce((sum,item)=>sum+expenseAmount(item),0);
      const expected = (data.incomeRecords || []).filter(item => itemMonth(item) === selectedMonth() && !item.ledgerTransactionId && String(item.account || "") === account).reduce((sum,item)=>sum+Number(item.amount||0),0);
      const projected = roundMoney(Number(balance||0) + expected - upcoming);
      if (projected < 0) alerts.push({tone:"danger",text:`${account} may be short by ${money(Math.abs(projected))} after scheduled activity.`});
      else if (projected < threshold) alerts.push({tone:"warning",text:`${account} is forecast at ${money(projected)}, below the ${money(threshold)} warning level.`});
    });
    if (metrics.forecast < 0) alerts.unshift({tone:"danger",text:`The month-end forecast is negative by ${money(Math.abs(metrics.forecast))}.`});
    if (!alerts.length) alerts.push({tone:"success",text:"No projected account is below the configured low-balance level."});
    return alerts;
  }

  function injectUi() {
    if (!document.getElementById("monthlyBudgetPlannerCard")) {
      const summary = document.getElementById("moneySummary");
      summary?.insertAdjacentHTML("afterend", `<article class="card budget-planner-card" id="monthlyBudgetPlannerCard" aria-labelledby="monthlyBudgetPlannerTitle">
        <div class="card-header budget-planner-header"><div class="budget-planner-heading-copy"><h3 id="monthlyBudgetPlannerTitle">Monthly budget plan</h3><p id="monthlyBudgetPlannerSubtitle">Plan categories, compare actual spending, and forecast month-end cash.</p></div><div class="budget-planner-actions no-print"><button class="button button-secondary button-small" id="buildBudgetFromExpenses" type="button">Build from expenses</button><button class="button button-secondary button-small" id="copyPreviousBudget" type="button">Copy previous month</button><button class="button button-secondary button-small" id="openBudgetSettings" type="button">Plan settings…</button><button class="button button-secondary button-small" id="exportBudgetCsv" type="button">Export CSV</button><button class="button button-primary button-small" id="addBudgetItem" type="button">+ Add category…</button><button class="budget-planner-toggle budget-panel-collapse" id="monthlyBudgetPlannerToggle" type="button" aria-controls="monthlyBudgetPlannerBody" aria-expanded="true" aria-label="Collapse Monthly budget plan" title="Collapse Monthly budget plan"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"/></svg></button></div></div>
        <div id="monthlyBudgetPlannerBody" class="budget-planner-body">
        <div class="budget-planner-summary" id="budgetPlannerSummary"></div>
        <div class="budget-planner-grid"><section class="budget-category-panel budget-bento-panel" data-budget-panel="category"><div class="budget-panel-heading"><div class="budget-panel-heading-copy"><h4>Category plan</h4><p>Fixed and flexible budgets for personal and project spending.</p></div><div class="budget-panel-heading-actions"><span class="v12-chip info" id="budgetCategoryCount">0 categories</span><button class="budget-panel-collapse no-print" type="button" data-budget-panel-toggle="category" aria-controls="budgetCategoryPanelBody" aria-expanded="true" aria-label="Collapse Category plan" title="Collapse Category plan"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"/></svg></button></div></div><div class="budget-panel-body budget-category-body" id="budgetCategoryPanelBody"><div id="budgetCategoryTableWrap"></div><div class="budget-template-bar no-print"><div class="field"><label for="budgetTemplateSelect">Budget template</label><select class="select" id="budgetTemplateSelect"><option value="">Choose a template</option></select></div><button class="button button-secondary button-small" id="applyBudgetTemplate" type="button">Apply</button><button class="button button-secondary button-small" id="saveBudgetTemplate" type="button">Save current…</button><button class="button button-secondary button-small" id="deleteBudgetTemplate" type="button">Delete</button></div></div></section>
        <aside class="cash-forecast-panel budget-bento-panel" data-budget-panel="forecast"><div class="budget-panel-heading"><div class="budget-panel-heading-copy"><h4>Cash-flow forecast</h4><p>Current money plus expected income minus future commitments.</p></div><div class="budget-panel-heading-actions"><span class="v12-chip" id="cashForecastStatus">No plan</span><button class="budget-panel-collapse no-print" type="button" data-budget-panel-toggle="forecast" aria-controls="cashForecastPanelBody" aria-expanded="true" aria-label="Collapse Cash-flow forecast" title="Collapse Cash-flow forecast"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"/></svg></button></div></div><div class="cash-forecast-body budget-panel-body" id="cashForecastPanelBody"><div class="forecast-breakdown" id="cashForecastBreakdown"></div><div class="forecast-classification" id="cashForecastClassification"></div><div class="budget-alerts" id="budgetForecastAlerts"></div></div></aside></div>
        </div>
      </article>`);
    }
    if (!document.getElementById("monthlyBudgetReportCard")) {
      const reports = document.getElementById("reports");
      const anchor = reports?.querySelector("#report-account-section") || reports?.lastElementChild;
      anchor?.insertAdjacentHTML("beforebegin", `<article class="card budget-report-card" id="monthlyBudgetReportCard"><div class="card-header"><div><h3>Budget plan versus actual</h3><p id="budgetReportSubtitle">Monthly plan performance and cash forecast</p></div><button class="button button-secondary button-small no-print" id="reportOpenBudgetPlan" type="button">Open budget plan</button></div><div class="budget-report-grid" id="budgetReportGrid"></div></article>`);
    }
    if (!document.getElementById("budgetItemDialog")) {
      document.body.insertAdjacentHTML("beforeend", `<dialog class="modal" id="budgetItemDialog"><form method="dialog" id="budgetItemForm"><div class="modal-header"><div><h3 id="budgetItemDialogTitle">Add budget category</h3><p>Set the monthly planned amount and how unused money is handled.</p></div><button class="modal-close" type="button" data-close-budget-dialog aria-label="Close">×</button></div><div class="modal-body"><input id="budgetItemId" type="hidden"><div class="form-grid"><div class="field"><label for="budgetItemCategory">Category</label><select class="select" id="budgetItemCategory"></select></div><div class="field" id="budgetCustomCategoryField" hidden><label for="budgetCustomCategory">Custom category</label><input class="input" id="budgetCustomCategory" maxlength="60"></div><div class="field"><label for="budgetItemAmount">Planned amount</label><input class="input" id="budgetItemAmount" type="number" min="0.01" step="0.01" inputmode="decimal" required></div><div class="field"><label for="budgetItemGroup">Budget group</label><select class="select" id="budgetItemGroup"><option value="fixed">Fixed</option><option value="flexible">Flexible</option></select></div><div class="field"><label for="budgetItemScope">Budget scope</label><select class="select" id="budgetItemScope"><option value="personal">Personal</option><option value="project">Project</option></select></div><div class="field field-full"><label for="budgetItemNotes">Planning note</label><textarea class="textarea" id="budgetItemNotes" rows="2" maxlength="200"></textarea></div><label class="budget-rollover-row field-full" for="budgetItemRollover"><input id="budgetItemRollover" type="checkbox"><span><strong>Roll unused money into the next month</strong><small>Copy Previous Month adds the unspent balance to this category.</small></span></label></div></div><div class="modal-actions"><button class="button button-secondary" type="button" data-close-budget-dialog>Cancel</button><button class="button button-primary" type="submit">Save category</button></div></form></dialog>
      <dialog class="modal" id="budgetSettingsDialog"><form method="dialog" id="budgetSettingsForm"><div class="modal-header"><div><h3>Monthly plan settings</h3><p>Savings allocation and account warning controls for the selected month.</p></div><button class="modal-close" type="button" data-close-budget-settings aria-label="Close">×</button></div><div class="modal-body"><div class="budget-dialog-note">Savings allocation is reserved in the forecast. It does not move money or create a ledger entry.</div><div class="form-grid"><div class="field"><label for="budgetSavingsMode">Savings allocation</label><select class="select" id="budgetSavingsMode"><option value="fixed">Fixed amount</option><option value="percentage">Percentage of monthly income</option></select></div><div class="field"><label for="budgetSavingsValue" id="budgetSavingsValueLabel">Amount</label><input class="input" id="budgetSavingsValue" type="number" min="0" step="0.01" inputmode="decimal"></div><div class="field"><label for="budgetSavingsAccount">Target savings account</label><select class="select" id="budgetSavingsAccount"></select></div><div class="field"><label for="budgetLowBalanceThreshold">Low-balance warning</label><input class="input" id="budgetLowBalanceThreshold" type="number" min="0" step="0.01" inputmode="decimal"></div></div></div><div class="modal-actions"><button class="button button-secondary" type="button" data-close-budget-settings>Cancel</button><button class="button button-primary" type="submit">Save settings</button></div></form></dialog>`);
    }
  }

  function categoryOptions(selected = "") {
    const values = [...new Set([...(typeof categories !== "undefined" ? categories : []), ...(data.expenses || []).map(item=>String(item.category||"Other")), ...(selected ? [selected] : [])])].filter(Boolean).sort((a,b)=>a.localeCompare(b));
    return values.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("") + '<option value="__custom__">Custom category…</option>';
  }

  function openItemDialog(item = null) {
    const plan = selectedPlan(true);
    const dialog = document.getElementById("budgetItemDialog");
    document.getElementById("budgetItemDialogTitle").textContent = item ? "Edit budget category" : "Add budget category";
    document.getElementById("budgetItemId").value = item?.id || "";
    const select = document.getElementById("budgetItemCategory");
    select.innerHTML = categoryOptions(item?.category || "");
    select.value = item?.category || "Groceries";
    document.getElementById("budgetCustomCategory").value = "";
    document.getElementById("budgetCustomCategoryField").hidden = true;
    document.getElementById("budgetItemAmount").value = item?.plannedAmount || "";
    document.getElementById("budgetItemGroup").value = item?.group || (FIXED_CATEGORIES.has(select.value) ? "fixed" : "flexible");
    document.getElementById("budgetItemScope").value = item?.scope || (select.value === "Project Costs" ? "project" : "personal");
    document.getElementById("budgetItemRollover").checked = Boolean(item?.rollover);
    document.getElementById("budgetItemNotes").value = item?.notes || "";
    dialog.showModal();
    setTimeout(()=>select.focus(),0);
    return plan;
  }

  function closeDialog(id) { const dialog=document.getElementById(id); if(dialog?.open) dialog.close(); }

  function openSettingsDialog() {
    const plan = selectedPlan(true);
    const accounts = Object.keys(data.accounts || {});
    const select = document.getElementById("budgetSavingsAccount");
    select.innerHTML = '<option value="">No specific account</option>' + accounts.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
    select.value = accounts.includes(plan.savingsAllocation.account) ? plan.savingsAllocation.account : "";
    document.getElementById("budgetSavingsMode").value = plan.savingsAllocation.mode;
    document.getElementById("budgetSavingsValue").value = plan.savingsAllocation.value || "";
    document.getElementById("budgetLowBalanceThreshold").value = plan.lowBalanceThreshold;
    syncSavingsModeLabel();
    document.getElementById("budgetSettingsDialog").showModal();
  }

  function syncSavingsModeLabel() {
    const percentage = document.getElementById("budgetSavingsMode")?.value === "percentage";
    const label = document.getElementById("budgetSavingsValueLabel");
    if (label) label.textContent = percentage ? "Percentage of income" : "Amount";
    const input = document.getElementById("budgetSavingsValue");
    if (input) { input.max = percentage ? "100" : ""; input.step = percentage ? "0.1" : "0.01"; }
  }

  function saveBudgetChange(message) {
    data.monthlyBudgets[selectedMonth()].updatedAt = new Date().toISOString();
    saveData(message);
    renderBudgetWorkspace();
  }

  function buildFromExpenses() {
    const plan = selectedPlan(true);
    const totals = new Map();
    monthExpenseList(selectedMonth()).forEach(item => {
      const key = `${scopeForExpense(item)}\u001f${String(item.category || "Other")}`;
      totals.set(key,roundMoney((totals.get(key)||0)+expenseAmount(item)));
    });
    if (!totals.size) return showToast("No included expenses are available for this month", "info");
    if (plan.items.length && !confirm("Replace the current category plan with amounts built from this month’s expenses?")) return;
    if (typeof pushUndo === "function") pushUndo(`Build ${monthName(selectedMonth())} budget from expenses`);
    plan.items = [...totals.entries()].map(([key,plannedAmount]) => { const [scope,category]=key.split("\u001f"); return normalizeBudgetItem({id:makeId("budget-item"),category,plannedAmount,scope,group:FIXED_CATEGORIES.has(category)?"fixed":"flexible",rollover:false}); });
    saveBudgetChange("Monthly budget built from expenses");
  }

  function copyPrevious() {
    const month = selectedMonth();
    const previousMonth = monthShift(month,-1);
    const previous = data.monthlyBudgets?.[previousMonth];
    if (!previous?.items?.length) return showToast(`No saved budget plan exists for ${monthName(previousMonth)}`, "info");
    const current = selectedPlan(true);
    if (current.items.length && !confirm(`Replace the current ${monthName(month)} plan with ${monthName(previousMonth)}?`)) return;
    if (typeof pushUndo === "function") pushUndo(`Copy ${monthName(previousMonth)} budget`);
    current.items = previous.items.map(item => {
      const unused = item.rollover ? Math.max(0,item.plannedAmount-itemActual(item,previousMonth)) : 0;
      return normalizeBudgetItem({...clone(item),id:makeId("budget-item"),plannedAmount:roundMoney(item.plannedAmount+unused),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    });
    current.savingsAllocation = clone(previous.savingsAllocation);
    current.lowBalanceThreshold = previous.lowBalanceThreshold;
    current.templateId = previous.templateId || "";
    saveBudgetChange(`Copied ${monthName(previousMonth)} monthly budget`);
  }

  function saveTemplate() {
    const plan = selectedPlan(false);
    if (!plan.items.length && !plan.savingsAllocation.value) return showToast("Add budget categories before saving a template", "warning");
    const name = prompt("Template name", `${monthName(selectedMonth())} plan`);
    if (!name?.trim()) return;
    if (typeof pushUndo === "function") pushUndo(`Save budget template ${name.trim()}`);
    data.budgetTemplates.push({id:makeId("budget-template"),name:safeText(name,80),items:clone(plan.items).map(item=>({...item,id:makeId("budget-item")})),savingsAllocation:clone(plan.savingsAllocation),lowBalanceThreshold:plan.lowBalanceThreshold,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    saveData("Budget template saved");
    renderBudgetWorkspace();
  }

  function applyTemplate() {
    const id = document.getElementById("budgetTemplateSelect")?.value;
    const template = data.budgetTemplates.find(item=>item.id===id);
    if (!template) return showToast("Choose a budget template", "warning");
    const plan = selectedPlan(true);
    if (plan.items.length && !confirm(`Replace the current plan with “${template.name}”?`)) return;
    if (typeof pushUndo === "function") pushUndo(`Apply budget template ${template.name}`);
    plan.items = template.items.map(item=>normalizeBudgetItem({...clone(item),id:makeId("budget-item"),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
    plan.savingsAllocation = clone(template.savingsAllocation);
    plan.lowBalanceThreshold = template.lowBalanceThreshold;
    plan.templateId = template.id;
    saveBudgetChange(`Applied budget template ${template.name}`);
  }

  function deleteTemplate() {
    const id = document.getElementById("budgetTemplateSelect")?.value;
    const template = data.budgetTemplates.find(item=>item.id===id);
    if (!template) return showToast("Choose a budget template", "warning");
    if (!confirm(`Delete the “${template.name}” budget template? Monthly plans will remain.`)) return;
    if (typeof pushUndo === "function") pushUndo(`Delete budget template ${template.name}`);
    data.budgetTemplates = data.budgetTemplates.filter(item=>item.id!==id);
    saveData("Budget template deleted");
    renderBudgetWorkspace();
  }

  function exportCsv() {
    const month = selectedMonth();
    const metrics = planMetrics(month);
    const rows = [["Month","Category","Group","Scope","Planned","Actual Paid","Committed","Remaining","Rollover","Notes"],...metrics.plan.items.map(item=>[month,item.category,item.group,item.scope,item.plannedAmount,itemActual(item,month),itemCommitted(item,month),roundMoney(item.plannedAmount-itemActual(item,month)),item.rollover?"Yes":"No",item.notes]),[],["Forecast Component","Amount"],["Current available",metrics.currentAvailable],["Expected unposted income",metrics.expectedIncome],["Upcoming recorded expenses",-metrics.upcoming],["Reserved unassigned budget",-metrics.reservedUnassigned],["Savings allocation",-metrics.allocation],["Forecast month-end",metrics.forecast]];
    if (typeof downloadCsv === "function") downloadCsv(`monthly-budget-${month}.csv`,rows);
    else {
      const content=rows.map(row=>row.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(",")).join("\n");
      const url=URL.createObjectURL(new Blob([content],{type:"text/csv"})); const link=document.createElement("a"); link.href=url; link.download=`monthly-budget-${month}.csv`; link.click(); URL.revokeObjectURL(url);
    }
    showToast("Monthly budget CSV exported", "success");
  }

  function renderBudgetWorkspace() {
    injectUi();
    ensureBudgetShape(data,data);
    const month = selectedMonth();
    const metrics = planMetrics(month);
    const plan = metrics.plan;
    document.getElementById("monthlyBudgetPlannerSubtitle").textContent = `${monthName(month)} · planned versus actual spending and projected month-end money.`;
    const utilization = metrics.planned > 0 ? Math.round(metrics.actual / metrics.planned * 100) : 0;
    const summary = [
      ["Planned budget",metrics.planned,"Category limits for the month",metrics.planned?"":""],
      ["Actual spent",metrics.actual,`${utilization}% of planned budget`,metrics.actual>metrics.planned&&metrics.planned?"is-danger":""],
      ["Committed",metrics.committed,"Paid and unpaid recorded expenses",metrics.committed>metrics.planned&&metrics.planned?"is-warning":""],
      ["Budget remaining",metrics.remaining,"Planned minus paid expenses",metrics.remaining<0?"is-danger":"is-success"],
      ["Forecast month-end",metrics.forecast,"After upcoming, reserves, and savings",metrics.forecast<0?"is-danger":"is-success"]
    ];
    document.getElementById("budgetPlannerSummary").innerHTML = summary.map(([label,value,help,tone])=>`<div class="budget-plan-kpi ${tone}"><span>${label}</span><strong>${money(value)}</strong><small>${help}</small></div>`).join("");
    document.getElementById("budgetCategoryCount").textContent = `${plan.items.length} categor${plan.items.length===1?"y":"ies"}`;
    const wrap = document.getElementById("budgetCategoryTableWrap");
    if (!plan.items.length) wrap.innerHTML = `<div class="budget-empty"><strong>No monthly category plan yet</strong>Build from current expenses, copy the previous month, apply a template, or add a category.</div>`;
    else wrap.innerHTML = `<div class="table-scroll"><table class="budget-category-table"><thead><tr><th>Category</th><th>Group</th><th>Scope</th><th>Planned</th><th>Actual</th><th>Committed</th><th>Remaining</th><th>Actions</th></tr></thead><tbody>${plan.items.map(item=>{
      const actual=itemActual(item,month), committed=itemCommitted(item,month), remaining=roundMoney(item.plannedAmount-actual), percent=item.plannedAmount?Math.min(100,Math.round(actual/item.plannedAmount*100)):0;
      return `<tr><td class="budget-category-name"><strong>${escapeHtml(item.category)}</strong><small>${item.rollover?"Rollover enabled":"No rollover"}${item.notes?` · ${escapeHtml(item.notes)}`:""}</small><div class="budget-progress ${remaining<0?"budget-status-over":"budget-status-safe"}"><i style="width:${percent}%"></i></div></td><td data-label="Group">${item.group==="fixed"?"Fixed":"Flexible"}</td><td data-label="Scope">${item.scope==="project"?"Project":"Personal"}</td><td data-label="Planned" class="amount">${money(item.plannedAmount)}</td><td data-label="Actual" class="amount">${money(actual)}</td><td data-label="Committed" class="amount">${money(committed)}</td><td data-label="Remaining" class="amount ${remaining<0?"text-red":"text-green"}">${money(remaining)}</td><td data-label="Actions"><div class="budget-category-actions no-print"><button class="button button-secondary button-small" data-edit-budget-item="${item.id}" type="button">Edit</button><button class="button button-secondary button-small" data-delete-budget-item="${item.id}" type="button">Delete</button></div></td></tr>`;
    }).join("")}</tbody></table></div>`;
    const templateSelect=document.getElementById("budgetTemplateSelect");
    const selectedTemplate=templateSelect.value || plan.templateId || "";
    templateSelect.innerHTML='<option value="">Choose a template</option>'+data.budgetTemplates.map(template=>`<option value="${template.id}">${escapeHtml(template.name)}</option>`).join("");
    templateSelect.value=data.budgetTemplates.some(item=>item.id===selectedTemplate)?selectedTemplate:"";
    const status=document.getElementById("cashForecastStatus");
    status.textContent=metrics.forecast<0?"Shortfall":plan.items.length?"Forecast ready":"No plan";
    status.className=`v12-chip ${metrics.forecast<0?"danger":plan.items.length?"success":"warning"}`;
    document.getElementById("cashForecastBreakdown").innerHTML=[
      ["Current available money",metrics.currentAvailable,""],
      ["Expected unposted income",metrics.expectedIncome,"text-green"],
      ["Upcoming recorded expenses",-metrics.upcoming,"text-red"],
      ["Unassigned category reserves",-metrics.reservedUnassigned,"text-orange"],
      ["Planned savings allocation",-metrics.allocation,"text-blue"],
      ["Forecast month-end",metrics.forecast,metrics.forecast<0?"text-red":"text-green","forecast-total"]
    ].map(([label,value,tone,rowClass=""])=>`<div class="forecast-line ${rowClass}"><span>${label}</span><strong class="${tone}">${value>0&&label!=="Current available money"?"+":""}${money(value)}</strong></div>`).join("");
    document.getElementById("cashForecastClassification").innerHTML=[
      ["Confirmed paid expenses",metrics.actual],
      ["Upcoming recurring",metrics.recurringEstimate],
      ["Upcoming one-time",metrics.oneTimeUpcoming],
      ["Overdue unpaid",metrics.overdue]
    ].map(([label,value])=>`<div><span>${label}</span><strong>${money(value)}</strong></div>`).join("");
    document.getElementById("budgetForecastAlerts").innerHTML=lowBalanceAlerts(metrics).map(item=>`<div class="budget-alert ${item.tone}">${escapeHtml(item.text)}</div>`).join("");
    renderBudgetReport(metrics);
  }


  function renderBudgetReport(metrics = planMetrics(selectedMonth())) {
    const subtitle=document.getElementById("budgetReportSubtitle"); if(subtitle) subtitle.textContent=`${monthName(selectedMonth())} plan performance and month-end forecast`;
    const grid=document.getElementById("budgetReportGrid"); if(!grid)return;
    grid.innerHTML=[["Planned",metrics.planned],["Actual paid",metrics.actual],["Committed",metrics.committed],["Forecast month-end",metrics.forecast]].map(([label,value])=>`<div><span>${label}</span><strong class="${label==="Forecast month-end"?(value<0?"text-red":"text-green"):""}">${money(value)}</strong></div>`).join("");
  }

  function budgetPanelState() {
    try {
      const value = JSON.parse(localStorage.getItem(BUDGET_PANEL_STATE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (error) { return {}; }
  }

  function setBudgetPanelCollapsed(name, collapsed, persist = true) {
    const panel = document.querySelector(`[data-budget-panel="${name}"]`);
    const toggle = document.querySelector(`[data-budget-panel-toggle="${name}"]`);
    if (!panel || !toggle) return;
    const title = name === "forecast" ? "Cash-flow forecast" : "Category plan";
    panel.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${title}`);
    toggle.title = `${collapsed ? "Expand" : "Collapse"} ${title}`;
    if (persist) {
      const state = budgetPanelState();
      state[name] = Boolean(collapsed);
      try { localStorage.setItem(BUDGET_PANEL_STATE_KEY, JSON.stringify(state)); } catch (error) {}
    }
  }

  function setBudgetPlannerCollapsed(collapsed, persist = true) {
    const card = document.getElementById("monthlyBudgetPlannerCard");
    const toggle = document.getElementById("monthlyBudgetPlannerToggle");
    if (!card || !toggle) return;
    card.classList.toggle("is-planner-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} Monthly budget plan`);
    toggle.title = `${collapsed ? "Expand" : "Collapse"} Monthly budget plan`;
    if (persist) {
      const state = budgetPanelState();
      state.planner = Boolean(collapsed);
      try { localStorage.setItem(BUDGET_PANEL_STATE_KEY, JSON.stringify(state)); } catch (error) {}
    }
  }

  function setupBudgetPlannerCollapser() {
    const state = budgetPanelState();
    setBudgetPlannerCollapsed(Boolean(state.planner), false);
    document.addEventListener("click", event => {
      const toggle = event.target.closest("#monthlyBudgetPlannerToggle");
      if (!toggle) return;
      const card = document.getElementById("monthlyBudgetPlannerCard");
      setBudgetPlannerCollapsed(!card?.classList.contains("is-planner-collapsed"));
    });
  }

  function setupBudgetPanelCollapsers() {
    const state = budgetPanelState();
    ["category", "forecast"].forEach(name => setBudgetPanelCollapsed(name, Boolean(state[name]), false));
    document.addEventListener("click", event => {
      const toggle = event.target.closest("[data-budget-panel-toggle]");
      if (!toggle) return;
      const name = toggle.dataset.budgetPanelToggle;
      const panel = document.querySelector(`[data-budget-panel="${name}"]`);
      setBudgetPanelCollapsed(name, !panel?.classList.contains("is-collapsed"));
    });
  }

  function bindEvents() {
    document.addEventListener("click",event=>{
      if(event.target.closest("#addBudgetItem")) openItemDialog();
      if(event.target.closest("#buildBudgetFromExpenses")) buildFromExpenses();
      if(event.target.closest("#copyPreviousBudget")) copyPrevious();
      if(event.target.closest("#openBudgetSettings")) openSettingsDialog();
      if(event.target.closest("#exportBudgetCsv")) exportCsv();
      if(event.target.closest("#saveBudgetTemplate")) saveTemplate();
      if(event.target.closest("#applyBudgetTemplate")) applyTemplate();
      if(event.target.closest("#deleteBudgetTemplate")) deleteTemplate();
      if(event.target.closest("#reportOpenBudgetPlan")){goToPage("money");setTimeout(()=>document.getElementById("monthlyBudgetPlannerCard")?.scrollIntoView({behavior:"smooth",block:"start"}),120);}
      const edit=event.target.closest("[data-edit-budget-item]"); if(edit){const item=selectedPlan(false).items.find(value=>value.id===edit.dataset.editBudgetItem);if(item)openItemDialog(item);}
      const remove=event.target.closest("[data-delete-budget-item]"); if(remove){const plan=selectedPlan(true),item=plan.items.find(value=>value.id===remove.dataset.deleteBudgetItem);if(item&&confirm(`Delete the ${item.category} budget from ${monthName(selectedMonth())}?`)){if(typeof pushUndo==="function")pushUndo(`Delete ${item.category} monthly budget`);plan.items=plan.items.filter(value=>value.id!==item.id);saveBudgetChange("Monthly budget category deleted");}}
      if(event.target.closest("[data-close-budget-dialog]"))closeDialog("budgetItemDialog");
      if(event.target.closest("[data-close-budget-settings]"))closeDialog("budgetSettingsDialog");
    });
    document.getElementById("budgetItemCategory")?.addEventListener("change",event=>{const custom=event.target.value==="__custom__";document.getElementById("budgetCustomCategoryField").hidden=!custom;if(!custom){document.getElementById("budgetItemGroup").value=FIXED_CATEGORIES.has(event.target.value)?"fixed":"flexible";document.getElementById("budgetItemScope").value=event.target.value==="Project Costs"?"project":"personal";}});
    document.getElementById("budgetSavingsMode")?.addEventListener("change",syncSavingsModeLabel);
    document.getElementById("budgetItemForm")?.addEventListener("submit",event=>{
      event.preventDefault(); const plan=selectedPlan(true),id=document.getElementById("budgetItemId").value,rawCategory=document.getElementById("budgetItemCategory").value,category=rawCategory==="__custom__"?safeText(document.getElementById("budgetCustomCategory").value,60):rawCategory,amount=roundMoney(document.getElementById("budgetItemAmount").value);
      if(!category||amount<=0)return showToast("Enter a category and planned amount greater than zero","warning");
      const existing=plan.items.find(item=>item.id===id); const record=normalizeBudgetItem({id:existing?.id||makeId("budget-item"),category,plannedAmount:amount,group:document.getElementById("budgetItemGroup").value,scope:document.getElementById("budgetItemScope").value,rollover:document.getElementById("budgetItemRollover").checked,notes:document.getElementById("budgetItemNotes").value,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});
      if(typeof pushUndo==="function")pushUndo(`${existing?"Edit":"Add"} ${category} monthly budget`); if(existing)Object.assign(existing,record);else plan.items.push(record); closeDialog("budgetItemDialog");saveBudgetChange("Monthly budget category saved");
    });
    document.getElementById("budgetSettingsForm")?.addEventListener("submit",event=>{
      event.preventDefault(); const plan=selectedPlan(true),mode=document.getElementById("budgetSavingsMode").value,value=roundMoney(document.getElementById("budgetSavingsValue").value),threshold=roundMoney(document.getElementById("budgetLowBalanceThreshold").value); if(mode==="percentage"&&value>100)return showToast("Savings percentage cannot exceed 100%","warning");
      if(typeof pushUndo==="function")pushUndo(`Update ${monthName(selectedMonth())} plan settings`); plan.savingsAllocation={mode,value:Math.max(0,value),account:document.getElementById("budgetSavingsAccount").value}; plan.lowBalanceThreshold=Math.max(0,threshold); closeDialog("budgetSettingsDialog");saveBudgetChange("Monthly budget settings saved");
    });
  }

  window.FinanceBudgetPlanningInternals = {normalizeBudgetItem,normalizePlan,ensureBudgetShape,planMetrics,itemActual,itemCommitted,lowBalanceAlerts,dueDateForExpense};
  if (window.__FINANCE_BUDGET_TEST__) return;

  renderMoneyPage = function budgetRenderMoneyPage(...args) { const result=originalRenderMoneyPage(...args); renderBudgetWorkspace(); return result; };
  renderDashboard = function budgetRenderDashboard(...args) { const result=originalRenderDashboard(...args); injectUi(); renderDashboardBudgetForecast(); return result; };
  renderReports = function budgetRenderReports(...args) { const result=originalRenderReports(...args); injectUi(); renderBudgetReport(); return result; };
  PAGE_RENDERERS.money = renderMoneyPage;
  PAGE_RENDERERS.dashboard = () => { renderDashboard(); renderMonthInsights(); };
  PAGE_RENDERERS.reports = renderReports;
  renderAll = function budgetRenderAll(...args) { const result=originalRenderAll(...args); injectUi(); renderBudgetWorkspace(); return result; };

  injectUi();
  setupBudgetPlannerCollapser();
  setupBudgetPanelCollapsers();
  bindEvents();
  renderBudgetWorkspace();
})();
