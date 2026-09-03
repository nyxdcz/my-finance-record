"use strict";

/* Talaan household expense splits.
   Allocations affect personal expense totals; payer and settlements never silently move account balances. */
(function householdSplitsBootstrap() {
  const VERSION = 1;
  const MAX_GROUPS = 50;
  const MAX_MEMBERS = 100;
  const MAX_SETTLEMENTS = 5000;
  const METHODS = new Set(["equal", "percentage", "exact"]);
  const clone = value => {
    try { return structuredClone(value); } catch (error) {}
    return JSON.parse(JSON.stringify(value ?? null));
  };
  const compact = (value, limit = 120) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, limit);
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));
  const makeId = prefix => prefix + "-" + (globalThis.crypto?.randomUUID?.() || (Date.now() + "-" + Math.random().toString(16).slice(2)));
  const nowIso = () => new Date().toISOString();
  const todayKey = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  };
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : todayKey();
  const validTimestamp = value => Number.isFinite(Date.parse(String(value || ""))) ? String(value) : nowIso();
  const roundMoney = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const positiveMoney = value => {
    const amount = roundMoney(value);
    return Number.isFinite(amount) && amount > 0 ? Math.min(amount, 999999999999999) : 0;
  };

  function normalizeMember(value, index = 0) {
    if (!value || typeof value !== "object") return null;
    const name = compact(value.name, 60);
    if (!name) return null;
    return {
      id:compact(value.id || makeId("member"), 120),
      name,
      archived:Boolean(value.archived),
      sortIndex:Number.isFinite(Number(value.sortIndex)) ? Math.max(0, Math.round(Number(value.sortIndex))) : index,
      createdAt:validTimestamp(value.createdAt),
      updatedAt:validTimestamp(value.updatedAt || value.createdAt)
    };
  }

  function normalizeGroup(value) {
    if (!value || typeof value !== "object") return null;
    const name = compact(value.name, 80);
    if (!name) return null;
    const seen = new Set();
    const members = (Array.isArray(value.members) ? value.members : [])
      .map(normalizeMember)
      .filter(member => member && !seen.has(member.id) && seen.add(member.id))
      .slice(0, MAX_MEMBERS)
      .sort((left, right) => left.sortIndex - right.sortIndex || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    if (members.length < 2) return null;
    const ownerMemberId = members.some(member => member.id === value.ownerMemberId) ? String(value.ownerMemberId) : members[0].id;
    return {
      id:compact(value.id || makeId("household"), 120),
      name,
      ownerMemberId,
      archived:Boolean(value.archived),
      members,
      createdAt:validTimestamp(value.createdAt),
      updatedAt:validTimestamp(value.updatedAt || value.createdAt)
    };
  }

  function normalizeSettlement(value, groupsById = new Map()) {
    if (!value || typeof value !== "object") return null;
    const group = groupsById.get(String(value.groupId || ""));
    if (!group) return null;
    const memberIds = new Set(group.members.map(member => member.id));
    const fromMemberId = compact(value.fromMemberId, 120), toMemberId = compact(value.toMemberId, 120);
    const amount = positiveMoney(value.amount);
    if (!memberIds.has(fromMemberId) || !memberIds.has(toMemberId) || fromMemberId === toMemberId || !amount) return null;
    return {
      id:compact(value.id || makeId("settlement"), 120),
      groupId:group.id,
      fromMemberId,
      toMemberId,
      amount,
      date:validDate(value.date),
      note:compact(value.note, 240),
      createdAt:validTimestamp(value.createdAt),
      updatedAt:validTimestamp(value.updatedAt || value.createdAt)
    };
  }

  function normalizeStore(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const seen = new Set();
    const groups = (Array.isArray(source.groups) ? source.groups : [])
      .map(normalizeGroup)
      .filter(group => group && !seen.has(group.id) && seen.add(group.id))
      .slice(0, MAX_GROUPS);
    const groupsById = new Map(groups.map(group => [group.id, group]));
    const settlementIds = new Set();
    const settlements = (Array.isArray(source.settlements) ? source.settlements : [])
      .map(item => normalizeSettlement(item, groupsById))
      .filter(item => item && !settlementIds.has(item.id) && settlementIds.add(item.id))
      .slice(-MAX_SETTLEMENTS)
      .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    return { version:VERSION, baseCurrency:"PHP", groups, settlements };
  }

  function allocateShares(totalValue, membersValue, method = "equal", values = {}) {
    const total = positiveMoney(totalValue);
    const members = (Array.isArray(membersValue) ? membersValue : []).filter(member => member?.id && !member.archived);
    if (!total || members.length < 2) return { ok:false, error:"Choose at least two active members and enter a bill total." };
    const mode = METHODS.has(method) ? method : "equal";
    const totalCents = Math.round(total * 100);
    let rawCents;
    if (mode === "equal") rawCents = members.map(() => totalCents / members.length);
    else if (mode === "percentage") {
      const percentages = members.map(member => Number(values[member.id] || 0));
      if (percentages.some(value => !Number.isFinite(value) || value < 0) || Math.abs(percentages.reduce((sum, value) => sum + value, 0) - 100) > .0001) return { ok:false, error:"Percentages must total exactly 100%." };
      rawCents = percentages.map(value => totalCents * value / 100);
    } else {
      const amounts = members.map(member => roundMoney(values[member.id] || 0));
      if (amounts.some(value => !Number.isFinite(value) || value < 0) || Math.abs(amounts.reduce((sum, value) => sum + value, 0) - total) > .001) return { ok:false, error:"Exact shares must equal the bill total." };
      rawCents = amounts.map(value => value * 100);
    }
    const cents = rawCents.map(value => Math.floor(value + 1e-8));
    let remainder = totalCents - cents.reduce((sum, value) => sum + value, 0);
    const residualOrder = rawCents.map((value, index) => ({ index, fraction:value - cents[index], memberId:members[index].id }))
      .sort((left, right) => right.fraction - left.fraction || left.memberId.localeCompare(right.memberId));
    for (let index = 0; index < remainder; index += 1) cents[residualOrder[index % residualOrder.length].index] += 1;
    const shares = members.map((member, index) => ({
      memberId:member.id,
      memberName:member.name,
      amount:cents[index] / 100,
      percentage:mode === "percentage" ? Number(values[member.id] || 0) : roundMoney(cents[index] / totalCents * 100)
    }));
    return { ok:true, method:mode, totalAmount:total, shares };
  }

  function normalizeSplit(value, totalValue, groupValue = null) {
    if (!value || typeof value !== "object") return null;
    const totalAmount = positiveMoney(totalValue ?? value.totalAmount);
    if (!totalAmount) return null;
    const group = groupValue ? normalizeGroup(groupValue) : null;
    const groupId = compact(value.groupId || group?.id, 120);
    const ownerMemberId = compact(value.ownerMemberId || group?.ownerMemberId, 120);
    const method = METHODS.has(value.method) ? value.method : "exact";
    const rawShares = (Array.isArray(value.shares) ? value.shares : []).map((share, index) => ({
      memberId:compact(share?.memberId, 120),
      memberName:compact(share?.memberName || group?.members?.find(member => member.id === share?.memberId)?.name || `Member ${index + 1}`, 60),
      amount:Math.max(0, roundMoney(share?.amount)),
      percentage:Math.max(0, Number(share?.percentage || 0))
    })).filter(share => share.memberId && share.memberName);
    if (!groupId || rawShares.length < 2 || !rawShares.some(share => share.memberId === ownerMemberId)) return null;
    const originalTotal = positiveMoney(value.totalAmount) || rawShares.reduce((sum, share) => sum + share.amount, 0);
    let allocation;
    if (method === "equal") allocation = allocateShares(totalAmount, rawShares.map((share, index) => ({ id:share.memberId, name:share.memberName, sortIndex:index })), "equal");
    else if (method === "percentage") allocation = allocateShares(totalAmount, rawShares.map((share, index) => ({ id:share.memberId, name:share.memberName, sortIndex:index })), "percentage", Object.fromEntries(rawShares.map(share => [share.memberId, share.percentage || (originalTotal ? share.amount / originalTotal * 100 : 0)])));
    else if (Math.abs(originalTotal - totalAmount) <= .001) allocation = allocateShares(totalAmount, rawShares.map((share, index) => ({ id:share.memberId, name:share.memberName, sortIndex:index })), "exact", Object.fromEntries(rawShares.map(share => [share.memberId, share.amount])));
    else return null;
    if (!allocation?.ok) return null;
    const ownerShare = allocation.shares.find(share => share.memberId === ownerMemberId)?.amount || 0;
    return {
      version:VERSION,
      groupId,
      groupName:compact(value.groupName || group?.name || "Household", 80),
      ownerMemberId,
      method,
      totalAmount,
      shares:allocation.shares,
      ownerShare:roundMoney(ownerShare),
      payerMemberId:allocation.shares.some(share => share.memberId === value.payerMemberId) ? String(value.payerMemberId) : "",
      updatedAt:validTimestamp(value.updatedAt)
    };
  }

  function copyForAmount(value, amount, group = null) {
    if (!value) return null;
    return normalizeSplit({ ...clone(value), payerMemberId:"", updatedAt:nowIso() }, amount, group);
  }

  function personalAmount(item, fullAmount = null) {
    const split = normalizeSplit(item?.householdSplit, item?.householdSplit?.totalAmount || item?.amount);
    if (!split) return roundMoney(fullAmount ?? item?.amount);
    const base = roundMoney(fullAmount ?? split.totalAmount);
    return roundMoney(split.totalAmount ? base * split.ownerShare / split.totalAmount : 0);
  }

  function positions(storeValue, expensesValue, groupIdValue) {
    const store = normalizeStore(storeValue), group = store.groups.find(item => item.id === groupIdValue);
    if (!group) return [];
    const totals = new Map(group.members.map(member => [member.id, 0]));
    (Array.isArray(expensesValue) ? expensesValue : []).forEach(item => {
      const split = normalizeSplit(item?.householdSplit, item?.householdSplit?.totalAmount || item?.amount, group);
      if (!split || split.groupId !== group.id || !item.paid || !split.payerMemberId) return;
      split.shares.forEach(share => totals.set(share.memberId, roundMoney((totals.get(share.memberId) || 0) - share.amount)));
      totals.set(split.payerMemberId, roundMoney((totals.get(split.payerMemberId) || 0) + split.totalAmount));
    });
    store.settlements.filter(item => item.groupId === group.id).forEach(item => {
      totals.set(item.fromMemberId, roundMoney((totals.get(item.fromMemberId) || 0) + item.amount));
      totals.set(item.toMemberId, roundMoney((totals.get(item.toMemberId) || 0) - item.amount));
    });
    return group.members.map(member => ({ ...member, position:roundMoney(totals.get(member.id) || 0), isOwner:member.id === group.ownerMemberId }));
  }

  function countConflicts(currentValue, incomingValue) {
    const current = normalizeStore(currentValue), incoming = normalizeStore(incomingValue);
    const groups = new Map(current.groups.map(item => [item.id, item])), settlements = new Map(current.settlements.map(item => [item.id, item]));
    return incoming.groups.reduce((total, item) => total + (groups.has(item.id) && JSON.stringify(groups.get(item.id)) !== JSON.stringify(item) ? 1 : 0), 0)
      + incoming.settlements.reduce((total, item) => total + (settlements.has(item.id) && JSON.stringify(settlements.get(item.id)) !== JSON.stringify(item) ? 1 : 0), 0);
  }

  function mergeStores(currentValue, incomingValue, conflictPolicy = "current") {
    const current = normalizeStore(currentValue), incoming = normalizeStore(incomingValue);
    const mergeById = (left, right) => {
      const map = new Map(left.map(item => [item.id, clone(item)]));
      right.forEach(item => { if (!map.has(item.id) || conflictPolicy === "incoming") map.set(item.id, clone(item)); });
      return [...map.values()];
    };
    return normalizeStore({ version:VERSION, groups:mergeById(current.groups, incoming.groups), settlements:mergeById(current.settlements, incoming.settlements) });
  }

  function summary(value, expenses = []) {
    const store = normalizeStore(value);
    const splitExpenses = (Array.isArray(expenses) ? expenses : []).filter(item => normalizeSplit(item?.householdSplit, item?.householdSplit?.totalAmount || item?.amount));
    return { groups:store.groups.length, members:store.groups.reduce((sum, group) => sum + group.members.length, 0), settlements:store.settlements.length, splitExpenses:splitExpenses.length };
  }

  const API = { version:VERSION, MAX_GROUPS, MAX_MEMBERS, MAX_SETTLEMENTS, normalizeMember, normalizeGroup, normalizeSettlement, normalizeStore, allocateShares, normalizeSplit, copyForAmount, personalAmount, positions, countConflicts, mergeStores, summary };
  globalThis.FinanceHouseholdSplits = API;
  if (globalThis.__FINANCE_HOUSEHOLD_SPLITS_TEST__) return;

  function ensureShape(source) {
    const target = source && typeof source === "object" ? source : {};
    target.ledgerSettings = target.ledgerSettings && typeof target.ledgerSettings === "object" && !Array.isArray(target.ledgerSettings) ? target.ledgerSettings : {};
    target.ledgerSettings.householdSplits = normalizeStore(target.ledgerSettings.householdSplits);
    target.expenses = (Array.isArray(target.expenses) ? target.expenses : []).map(item => {
      if (!item?.householdSplit) { const copy = { ...item }; delete copy.householdSplit; return copy; }
      const copy = { ...item }, split = normalizeSplit(item.householdSplit, item.householdSplit?.totalAmount || item.amount);
      if (split) copy.householdSplit = split; else delete copy.householdSplit;
      return copy;
    });
    return target;
  }

  const baseNormalizeData = normalizeData;
  normalizeData = value => ensureShape(baseNormalizeData(value));
  data = ensureShape(data);
  const baseEffectiveExpenseAmount = effectiveExpenseAmount;
  const baseMonthlyExpenseAmount = monthlyExpenseAmount;
  const baseSettledExpenseAmount = settledExpenseAmount;
  const baseExpensePaymentAmount = expensePaymentAmount;
  effectiveExpenseAmount = item => personalAmount(item, baseEffectiveExpenseAmount(item));
  monthlyExpenseAmount = item => personalAmount(item, baseMonthlyExpenseAmount(item));
  settledExpenseAmount = item => personalAmount(item, baseSettledExpenseAmount(item));
  expensePaymentAmount = item => item?.householdSplit ? roundMoney(baseEffectiveExpenseAmount(item)) : baseExpensePaymentAmount(item);

  let pendingSplit = null;
  let editingGroupId = "";
  const money = value => new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(Number(value || 0));
  const canWrite = () => globalThis.FinanceProfileArchitecture?.canWrite?.() !== false && !document.body.classList.contains("finance-signed-out");
  const store = () => {
    data = ensureShape(data);
    return data.ledgerSettings.householdSplits;
  };
  const findGroup = id => store().groups.find(group => group.id === id) || null;
  const toast = (message, tone = "info") => typeof showToast === "function" ? showToast(message, tone) : undefined;
  async function saveRecovery(label) {
    if (globalThis.FinancePrivacyLock?.recoveryStorage?.save) return globalThis.FinancePrivacyLock.recoveryStorage.save(label, clone(data));
    if (typeof createRecoverySnapshot === "function") return createRecoverySnapshot(label, clone(data));
    throw new Error("Recovery storage is unavailable.");
  }
  function persist(label) {
    const preserved = normalizeStore(store());
    data = normalizeData(data);
    data.ledgerSettings = data.ledgerSettings && typeof data.ledgerSettings === "object" ? data.ledgerSettings : {};
    data.ledgerSettings.householdSplits = preserved;
    return typeof saveData === "function" ? saveData(label) : false;
  }

  function currentExpenseTotal() {
    const type = document.getElementById("expenseType")?.value;
    if (type === "utility") return Math.max(0, Number(document.getElementById("electricBillAmount")?.value?.replaceAll(",", "") || 0)) + Math.max(0, Number(document.getElementById("waterBillAmount")?.value?.replaceAll(",", "") || 0));
    if (type === "budget") return Math.max(0, Number(document.getElementById("expenseDailyRate")?.value?.replaceAll(",", "") || 0)) * 15;
    if (type === "gym") {
      const price = Math.max(0, Number(document.getElementById("gymPricePerVisit")?.value?.replaceAll(",", "") || 0));
      if (typeof selectedGymDaysFromForm === "function" && typeof gymScheduledDatesForMonth === "function" && typeof gymFormMonth === "function") {
        const template = { gymPricePerVisit:price, gymDays:selectedGymDaysFromForm(), gymDateOverrides:typeof gymFormOverrides === "object" ? gymFormOverrides : { added:[], removed:[] } };
        return price * gymScheduledDatesForMonth(template, gymFormMonth()).length;
      }
      return Number(editingExpenseRecord?.()?.amount || 0);
    }
    return Math.max(0, Number(document.getElementById("expenseAmount")?.value?.replaceAll(",", "") || 0));
  }

  function splitFromForm(total, existing = null) {
    const source = pendingSplit || existing?.householdSplit;
    if (!source) return null;
    if (source.method === "exact" && document.getElementById("expenseRecurring")?.checked) { toast("Use equal or percentage shares for a recurring household expense.", "warning"); return false; }
    const group = findGroup(source.groupId);
    const split = normalizeSplit(source, total, group);
    if (!split) { toast(source.method === "exact" ? "Exact household shares must match the expense total." : "Review the household split before saving.", "warning"); return false; }
    return split;
  }
  API.splitFromForm = splitFromForm;
  API.pendingForExpense = () => clone(pendingSplit);

  function ensureExpenseControls() {
    const recurring = document.getElementById("expenseRecurringField");
    if (!recurring || document.getElementById("householdSplitExpenseField")) return;
    const anchor = document.getElementById("expenseRecurringSection") || recurring;
    anchor.insertAdjacentHTML("beforebegin", '<div class="household-expense-control field-full" id="householdSplitExpenseField"><div><strong>Household split</strong><small id="householdSplitExpenseSummary">Count the full expense as yours.</small></div><button class="button button-secondary" type="button" id="configureHouseholdSplit">Configure split</button><button class="button button-secondary button-small" type="button" id="clearHouseholdSplit" hidden>Remove</button></div>');
    document.getElementById("configureHouseholdSplit")?.addEventListener("click", openSplitDialog);
    document.getElementById("clearHouseholdSplit")?.addEventListener("click", () => { pendingSplit = null; updateExpenseControl(); if (typeof updateExpenseFormDirty === "function") updateExpenseFormDirty(); });
  }

  function updateExpenseControl() {
    const summary = document.getElementById("householdSplitExpenseSummary"), clear = document.getElementById("clearHouseholdSplit");
    if (!summary || !clear) return;
    const total = currentExpenseTotal();
    const split = pendingSplit ? normalizeSplit(pendingSplit, total || pendingSplit.totalAmount, findGroup(pendingSplit.groupId)) : null;
    summary.textContent = split ? `${split.groupName} · Your share ${money(split.ownerShare)} of ${money(split.totalAmount)}` : "Count the full expense as yours.";
    clear.hidden = !pendingSplit;
  }

  function ensureDialogs() {
    if (!document.getElementById("householdGroupDialog")) document.body.insertAdjacentHTML("beforeend", [
      '<dialog class="app-dialog household-dialog" id="householdGroupDialog" aria-labelledby="householdGroupDialogTitle"><form id="householdGroupForm">',
      '<div class="modal-header"><h3 id="householdGroupDialogTitle">Add household group</h3><button class="button button-secondary button-small" type="button" data-close-household="householdGroupDialog">Close</button></div>',
      '<div class="modal-body household-form-grid"><label class="field household-wide"><span>Group name</span><input class="input" id="householdGroupName" maxlength="80" required placeholder="Example: Home"></label>',
      '<label class="field household-wide"><span>Members, one per line</span><textarea class="input household-member-input" id="householdGroupMembers" required placeholder="You\nAlex"></textarea><small>The first member represents you. Names are snapshots in saved expenses.</small></label>',
      '<p class="field-error household-wide" id="householdGroupError" role="alert" hidden></p></div>',
      '<div class="modal-footer"><button class="button button-secondary" type="button" data-close-household="householdGroupDialog">Cancel</button><span class="footer-spacer"></span><button class="button button-primary" type="submit">Save group</button></div></form></dialog>'
    ].join(""));
    if (!document.getElementById("householdSplitDialog")) document.body.insertAdjacentHTML("beforeend", [
      '<dialog class="app-dialog household-dialog" id="householdSplitDialog" aria-labelledby="householdSplitDialogTitle"><form id="householdSplitForm">',
      '<div class="modal-header"><h3 id="householdSplitDialogTitle">Configure household split</h3><button class="button button-secondary button-small" type="button" data-close-household="householdSplitDialog">Close</button></div>',
      '<div class="modal-body household-form-grid"><label class="field"><span>Household group</span><select class="select" id="householdSplitGroup" required></select></label><label class="field"><span>Split method</span><select class="select" id="householdSplitMethod"><option value="equal">Equal</option><option value="percentage">Percentage</option><option value="exact">Exact amount</option></select></label>',
      '<div class="household-wide household-split-total"><span>Expense total</span><strong id="householdSplitTotal">₱0.00</strong></div><div class="household-wide household-share-fields" id="householdShareFields"></div>',
      '<p class="field-error household-wide" id="householdSplitError" role="alert" hidden></p></div>',
      '<div class="modal-footer"><button class="button button-secondary" type="button" data-close-household="householdSplitDialog">Cancel</button><span class="footer-spacer"></span><button class="button button-primary" type="submit">Use split</button></div></form></dialog>'
    ].join(""));
    if (!document.getElementById("householdSettlementDialog")) document.body.insertAdjacentHTML("beforeend", [
      '<dialog class="app-dialog household-dialog" id="householdSettlementDialog" aria-labelledby="householdSettlementDialogTitle"><form id="householdSettlementForm">',
      '<div class="modal-header"><h3 id="householdSettlementDialogTitle">Record settlement</h3><button class="button button-secondary button-small" type="button" data-close-household="householdSettlementDialog">Close</button></div>',
      '<div class="modal-body household-form-grid"><label class="field household-wide"><span>Group</span><select class="select" id="householdSettlementGroup" required></select></label><label class="field"><span>Paid by</span><select class="select" id="householdSettlementFrom" required></select></label><label class="field"><span>Paid to</span><select class="select" id="householdSettlementTo" required></select></label><label class="field"><span>Amount</span><input class="input" id="householdSettlementAmount" inputmode="decimal" required></label><label class="field"><span>Date</span><input class="input" id="householdSettlementDate" type="date" required></label><label class="field household-wide"><span>Note</span><input class="input" id="householdSettlementNote" maxlength="240"></label>',
      '<p class="field-error household-wide" id="householdSettlementError" role="alert" hidden></p><p class="household-wide household-safety-note">This updates household balances only. It does not create income, an expense, or an Account Ledger entry.</p></div>',
      '<div class="modal-footer"><button class="button button-secondary" type="button" data-close-household="householdSettlementDialog">Cancel</button><span class="footer-spacer"></span><button class="button button-primary" type="submit">Record settlement</button></div></form></dialog>'
    ].join(""));
  }

  function showDialog(id, focus) {
    const dialog = document.getElementById(id);
    if (typeof showAppDialog === "function") showAppDialog(dialog, focus); else dialog?.showModal();
  }

  function openGroupDialog(groupId = "") {
    if (!canWrite()) return toast("This profile is read-only.", "warning");
    ensureDialogs();
    editingGroupId = groupId;
    const group = findGroup(groupId);
    document.getElementById("householdGroupDialogTitle").textContent = group ? "Edit household group" : "Add household group";
    document.getElementById("householdGroupName").value = group?.name || "";
    document.getElementById("householdGroupMembers").value = group?.members?.filter(member => !member.archived).map(member => member.name).join("\n") || "You\n";
    showDialog("householdGroupDialog", "#householdGroupName");
  }

  function renderShareFields() {
    const group = findGroup(document.getElementById("householdSplitGroup")?.value), method = document.getElementById("householdSplitMethod")?.value || "equal";
    const container = document.getElementById("householdShareFields");
    if (!container) return;
    if (!group) { container.innerHTML = '<p class="household-empty">Create a household group first.</p>'; return; }
    const existing = pendingSplit?.groupId === group.id ? pendingSplit : null;
    container.innerHTML = group.members.filter(member => !member.archived).map(member => {
      const prior = existing?.shares?.find(share => share.memberId === member.id);
      const value = method === "equal" ? "" : method === "percentage" ? (prior?.percentage ?? "") : (prior?.amount ?? "");
      const suffix = method === "percentage" ? "%" : method === "exact" ? "PHP" : "Calculated automatically";
      return `<label class="field household-share-row"><span>${esc(member.name)}${member.id === group.ownerMemberId ? " (You)" : ""}</span><span class="household-share-input"><input class="input" data-household-share="${esc(member.id)}" inputmode="decimal" value="${esc(value)}" ${method === "equal" ? "disabled" : "required"}><small>${suffix}</small></span></label>`;
    }).join("");
  }

  function openSplitDialog() {
    if (!canWrite()) return toast("This profile is read-only.", "warning");
    ensureDialogs();
    const groups = store().groups.filter(group => !group.archived);
    if (!groups.length) { toast("Create a household group in Finance tools first.", "warning"); if (typeof goToPage === "function") goToPage("settings", { smooth:false }); setTimeout(() => document.querySelector('[data-settings-tab="finance-tools"]')?.click(), 0); return; }
    const select = document.getElementById("householdSplitGroup");
    select.innerHTML = groups.map(group => `<option value="${esc(group.id)}">${esc(group.name)}</option>`).join("");
    select.value = pendingSplit?.groupId && groups.some(group => group.id === pendingSplit.groupId) ? pendingSplit.groupId : groups[0].id;
    document.getElementById("householdSplitMethod").value = pendingSplit?.method || "equal";
    document.getElementById("householdSplitTotal").textContent = money(currentExpenseTotal());
    renderShareFields();
    showDialog("householdSplitDialog", "#householdSplitGroup");
  }

  function updateSettlementMembers() {
    const group = findGroup(document.getElementById("householdSettlementGroup")?.value), options = group?.members?.filter(member => !member.archived).map(member => `<option value="${esc(member.id)}">${esc(member.name)}${member.id === group.ownerMemberId ? " (You)" : ""}</option>`).join("") || "";
    document.getElementById("householdSettlementFrom").innerHTML = options;
    document.getElementById("householdSettlementTo").innerHTML = options;
    if (group?.members?.length > 1) document.getElementById("householdSettlementTo").value = group.members.find(member => member.id !== group.ownerMemberId)?.id || group.members[1].id;
  }

  function openSettlementDialog(groupId = "") {
    if (!canWrite()) return toast("This profile is read-only.", "warning");
    ensureDialogs();
    const groups = store().groups.filter(group => !group.archived);
    if (!groups.length) return toast("Create a household group first.", "warning");
    const select = document.getElementById("householdSettlementGroup");
    select.innerHTML = groups.map(group => `<option value="${esc(group.id)}">${esc(group.name)}</option>`).join("");
    select.value = groups.some(group => group.id === groupId) ? groupId : groups[0].id;
    document.getElementById("householdSettlementAmount").value = "";
    document.getElementById("householdSettlementDate").value = todayKey();
    document.getElementById("householdSettlementNote").value = "";
    updateSettlementMembers();
    showDialog("householdSettlementDialog", "#householdSettlementFrom");
  }

  async function handlePanelAction(event) {
    const add = event.target.closest("[data-household-add-group]");
    const edit = event.target.closest("[data-household-edit-group]");
    const settle = event.target.closest("[data-household-settle]");
    const remove = event.target.closest("[data-household-delete-settlement]");
    if (!add && !edit && !settle && !remove) return;
    event.stopPropagation();
    if (add) return openGroupDialog();
    if (edit) return openGroupDialog(edit.dataset.householdEditGroup);
    if (settle) return openSettlementDialog(settle.dataset.householdSettle || "");
    const household = store();
    const item = household.settlements.find(entry => entry.id === remove.dataset.householdDeleteSettlement);
    if (!item) return;
    const accepted = typeof openAppConfirmation === "function" ? await openAppConfirmation({ title:"Delete settlement?", message:"Remove this household settlement record?", details:"This changes household balances only. No Account Ledger transaction will be created or reversed.", confirmLabel:"Delete settlement", danger:true }) : confirm("Delete settlement?");
    if (!accepted) return;
    await saveRecovery("Before deleting household settlement");
    if (typeof pushUndo === "function") pushUndo("Delete household settlement");
    household.settlements = household.settlements.filter(entry => entry.id !== item.id);
    persist("Household settlement deleted");
    renderPanel();
  }

  function renderPanel() {
    const panel = document.getElementById("settings-panel-finance-tools");
    if (!panel) return;
    let card = document.getElementById("financeToolsHouseholdSplits");
    if (!card) {
      panel.insertAdjacentHTML("beforeend", '<article class="card household-card" id="financeToolsHouseholdSplits"><div class="card-header household-heading"><div><h3>Household splits</h3><p>Share bills without changing personal totals or account balances twice</p></div><div class="household-heading-actions"><button class="button button-secondary" type="button" data-household-settle>Record settlement</button><button class="button button-primary" type="button" data-household-add-group>Add group</button></div></div><div id="householdSplitWorkspace"></div></article>');
      card = document.getElementById("financeToolsHouseholdSplits");
    }
    if (!card.dataset.householdActionsBound) {
      card.dataset.householdActionsBound = "true";
      card.addEventListener("click", handlePanelAction);
    }
    const value = store(), workspace = document.getElementById("householdSplitWorkspace");
    if (!workspace) return;
    if (typeof setupApplicationHelp === "function") setupApplicationHelp(document);
    if (!value.groups.length) {
      workspace.innerHTML = '<div class="household-empty"><strong>No household groups yet</strong><p>Add the people you regularly share expenses with.</p></div>';
      return;
    }
    workspace.innerHTML = value.groups.map(group => {
      const balances = positions(value, data.expenses, group.id), owner = balances.find(member => member.isOwner), ownerStatus = !owner?.position ? "Settled" : owner.position > 0 ? `${money(owner.position)} owed to you` : `${money(Math.abs(owner.position))} you owe`;
      const settlements = value.settlements.filter(item => item.groupId === group.id).slice(-5).reverse();
      const activeCount = group.members.filter(member => !member.archived).length;
      return `<section class="household-group ${group.archived ? "is-archived" : ""}"><div class="household-group-head"><div><h4>${esc(group.name)}</h4><small>${activeCount} active member${activeCount === 1 ? "" : "s"} · ${esc(ownerStatus)}</small></div><div><button class="button button-secondary button-small" type="button" data-household-edit-group="${esc(group.id)}">Edit</button><button class="button button-secondary button-small" type="button" data-household-settle="${esc(group.id)}">Settle</button></div></div><div class="household-balance-list">${balances.map(member => `<div><span>${esc(member.name)}${member.isOwner ? " (You)" : ""}${member.archived ? " · Archived" : ""}</span><strong class="${member.position > 0 ? "is-credit" : member.position < 0 ? "is-debt" : ""}">${member.position > 0 ? "+" : ""}${money(member.position)}</strong></div>`).join("")}</div>${settlements.length ? `<details class="household-history"><summary>Recent settlements</summary><ul>${settlements.map(item => { const from = group.members.find(member => member.id === item.fromMemberId)?.name || "Member", to = group.members.find(member => member.id === item.toMemberId)?.name || "Member"; return `<li><span><strong>${esc(from)} → ${esc(to)}</strong><small>${esc(item.date)}${item.note ? ` · ${esc(item.note)}` : ""}</small></span><b>${money(item.amount)}</b><button class="button button-secondary button-small" type="button" data-household-delete-settlement="${esc(item.id)}">Delete</button></li>`; }).join("")}</ul></details>` : ""}</section>`;
    }).join("");
  }

  function bindEvents() {
    document.addEventListener("click", async event => {
      const close = event.target.closest("[data-close-household]"); if (close) document.getElementById(close.dataset.closeHousehold)?.close();
    });
    document.getElementById("householdGroupForm")?.addEventListener("submit", async event => {
      event.preventDefault(); if (!canWrite()) return;
      const names = document.getElementById("householdGroupMembers").value.split(/\n|,/).map(name => compact(name, 60)).filter(Boolean);
      const unique = [...new Map(names.map(name => [name.toLocaleLowerCase(), name])).values()];
      const error = document.getElementById("householdGroupError");
      if (unique.length < 2) { error.hidden = false; error.textContent = "Enter at least two different member names."; return; }
      const prior = findGroup(editingGroupId), priorOwner = prior?.members?.find(member => member.id === prior.ownerMemberId);
      const activeMembers = unique.map((name, index) => index === 0
        ? normalizeMember({ ...(priorOwner || {}), name, archived:false, sortIndex:0, updatedAt:nowIso() })
        : normalizeMember({ ...(prior?.members?.find(member => member.id !== prior?.ownerMemberId && member.name.toLocaleLowerCase() === name.toLocaleLowerCase()) || {}), name, archived:false, sortIndex:index, updatedAt:nowIso() }));
      const activeIds = new Set(activeMembers.map(member => member.id));
      const archivedMembers = (prior?.members || []).filter(member => !activeIds.has(member.id)).map((member, index) => ({ ...member, archived:true, sortIndex:activeMembers.length + index, updatedAt:nowIso() }));
      const members = [...activeMembers, ...archivedMembers];
      const group = normalizeGroup({ id:prior?.id, name:document.getElementById("householdGroupName").value, ownerMemberId:activeMembers[0].id, archived:prior?.archived, members, createdAt:prior?.createdAt, updatedAt:nowIso() });
      if (!group) { error.hidden = false; error.textContent = "Enter a valid group name and at least two members."; return; }
      await saveRecovery(prior ? "Before editing household group" : "Before adding household group"); if (typeof pushUndo === "function") pushUndo(prior ? `Edit household ${group.name}` : `Add household ${group.name}`);
      const household = store();
      household.groups = prior ? household.groups.map(item => item.id === prior.id ? group : item) : [...household.groups, group];
      persist(prior ? "Household group updated" : "Household group added"); document.getElementById("householdGroupDialog").close(); renderPanel();
    });
    document.getElementById("householdSplitGroup")?.addEventListener("change", renderShareFields);
    document.getElementById("householdSplitMethod")?.addEventListener("change", renderShareFields);
    document.getElementById("householdSplitForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const group = findGroup(document.getElementById("householdSplitGroup").value), method = document.getElementById("householdSplitMethod").value, total = currentExpenseTotal();
      const values = Object.fromEntries([...document.querySelectorAll("[data-household-share]")].map(input => [input.dataset.householdShare, Number(input.value || 0)]));
      const allocation = allocateShares(total, group?.members, method, values), error = document.getElementById("householdSplitError");
      if (!group || !allocation.ok) { error.hidden = false; error.textContent = allocation.error || "Choose a household group."; return; }
      pendingSplit = normalizeSplit({ groupId:group.id, groupName:group.name, ownerMemberId:group.ownerMemberId, method, totalAmount:total, shares:allocation.shares, updatedAt:nowIso() }, total, group);
      document.getElementById("householdSplitDialog").close(); updateExpenseControl(); if (typeof updateExpenseFormDirty === "function") updateExpenseFormDirty();
    });
    document.getElementById("householdSettlementGroup")?.addEventListener("change", updateSettlementMembers);
    document.getElementById("householdSettlementForm")?.addEventListener("submit", async event => {
      event.preventDefault(); if (!canWrite()) return;
      const household = store();
      const settlement = normalizeSettlement({ groupId:document.getElementById("householdSettlementGroup").value, fromMemberId:document.getElementById("householdSettlementFrom").value, toMemberId:document.getElementById("householdSettlementTo").value, amount:Number(document.getElementById("householdSettlementAmount").value.replaceAll(",", "")), date:document.getElementById("householdSettlementDate").value, note:document.getElementById("householdSettlementNote").value }, new Map(household.groups.map(group => [group.id, group]))), error = document.getElementById("householdSettlementError");
      if (!settlement) { error.hidden = false; error.textContent = "Choose different members and enter an amount greater than zero."; return; }
      await saveRecovery("Before recording household settlement"); if (typeof pushUndo === "function") pushUndo("Record household settlement");
      household.settlements.push(settlement); persist("Household settlement recorded"); document.getElementById("householdSettlementDialog").close(); renderPanel();
    });
  }

  const baseOpenExpenseDialog = openExpenseDialog;
  openExpenseDialog = function householdExpenseDialog(item, options) {
    const result = baseOpenExpenseDialog(item, options);
    ensureExpenseControls();
    pendingSplit = clone(item?.householdSplit || null);
    updateExpenseControl();
    return result;
  };

  const baseApplyExpensePayment = applyExpensePayment;
  applyExpensePayment = function householdExpensePayment(items, account, options = {}) {
    const result = baseApplyExpensePayment(items, account, options);
    if (result?.ok) (items || []).forEach(item => {
      if (!item?.householdSplit) return;
      item.householdSplit = { ...item.householdSplit, payerMemberId:item.householdSplit.ownerMemberId, updatedAt:nowIso() };
    });
    return result;
  };

  const baseRestoreExpensePayment = restoreExpensePayment;
  restoreExpensePayment = function householdExpensePaymentRestore(item) {
    const result = baseRestoreExpensePayment(item);
    if (item?.householdSplit) item.householdSplit = { ...item.householdSplit, payerMemberId:"", updatedAt:nowIso() };
    return result;
  };

  function ensurePaymentPayer() {
    const accountField = document.getElementById("expensePaymentAccount")?.closest(".field");
    if (!accountField || document.getElementById("householdPaymentPayerField")) return;
    accountField.insertAdjacentHTML("beforebegin", '<div class="field" id="householdPaymentPayerField" hidden><label for="householdPaymentPayer">Who paid this bill?</label><select class="select" id="householdPaymentPayer"></select><small class="field-help">If another member paid, no Talaan account is deducted.</small></div>');
  }

  const baseOpenExpensePaymentDialog = openExpensePaymentDialog;
  openExpensePaymentDialog = function householdPaymentDialog(items) {
    const result = baseOpenExpensePaymentDialog(items);
    ensurePaymentPayer();
    const eligible = (items || []).filter(item => item?.householdSplit && !item.paid), groupIds = new Set(eligible.map(item => item.householdSplit.groupId));
    const field = document.getElementById("householdPaymentPayerField"), select = document.getElementById("householdPaymentPayer");
    if (field && select && eligible.length && eligible.length === (items || []).length && groupIds.size === 1) {
      const group = findGroup([...groupIds][0]);
      field.hidden = !group;
      if (group) { select.innerHTML = group.members.filter(member => !member.archived).map(member => `<option value="${esc(member.id)}">${esc(member.name)}${member.id === group.ownerMemberId ? " (You)" : ""}</option>`).join(""); select.value = group.ownerMemberId; }
    } else if (field) field.hidden = true;
    const account = document.getElementById("expensePaymentAccount"); if (account) { account.disabled = false; account.required = true; }
    refreshExpensePaymentPreview();
    return result;
  };

  function pendingHouseholdPayment() {
    data = ensureShape(data);
    const items = data.expenses.filter(item => pendingExpensePaymentIds.includes(item.id) && !item.paid);
    const groupId = items[0]?.householdSplit?.groupId || "";
    const group = data.ledgerSettings.householdSplits.groups.find(item => item.id === groupId) || null;
    return { items, group };
  }

  document.addEventListener("submit", event => {
    if (event.target?.id !== "expensePaymentForm") return;
    const payer = document.getElementById("householdPaymentPayer"), field = document.getElementById("householdPaymentPayerField");
    if (!payer || field?.hidden) return;
    const { items, group } = pendingHouseholdPayment();
    if (!group || payer.value === group.ownerMemberId) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (expensePaymentSubmitting) return;
    expensePaymentSubmitting = true;
    const service = window.FinanceLedgerTransactions;
    if (!service?.markExpensesPaidExternally) { expensePaymentSubmitting = false; showToast("Account ledger is updating. Reload Talaan before recording this household payment.", "warning"); return; }
    const payerId = payer.value;
    const payerName = group.members.find(member => member.id === payerId)?.name || "member";
    const result = service.markExpensesPaidExternally(items, {
      paidDate:todayKey(),
      undoLabel:items.length === 1 ? `Mark ${items[0].name} paid by ${payerName}` : `Mark ${items.length} household expenses paid`,
      message:"Household expense marked paid without an account deduction",
      decorateItem:item => { item.householdSplit = { ...item.householdSplit, payerMemberId:payerId, updatedAt:nowIso() }; },
      verifyItem:item => item?.householdSplit?.payerMemberId === payerId
    });
    if (!result?.ok) { expensePaymentSubmitting = false; showToast("The household payment could not be saved. Nothing was changed.", "warning"); return; }
    closeExpensePaymentDialog(); selectedExpenseIds.clear(); document.getElementById("bulkExpenseAction").value = ""; refreshBulkActionValue(); renderPanel();
  }, true);

  document.addEventListener("change", event => {
    if (event.target?.id === "householdPaymentPayer") {
      const { group } = pendingHouseholdPayment(), other = group && event.target.value !== group.ownerMemberId;
      const account = document.getElementById("expensePaymentAccount"), warning = document.getElementById("expensePaymentWarning"), confirmButton = document.getElementById("confirmExpensePayment");
      if (account) { account.disabled = Boolean(other); account.required = !other; }
      if (other) { warning.hidden = true; warning.textContent = ""; confirmButton.disabled = false; document.getElementById("expensePaymentCurrentBalance").textContent = "—"; document.getElementById("expensePaymentAfterBalance").textContent = "—"; }
      else { account.disabled = false; refreshExpensePaymentPreview(); }
    }
  });

  const baseRenderAll = renderAll;
  renderAll = function householdRenderAll(...args) {
    const result = baseRenderAll(...args);
    renderPanel(); updateExpenseControl();
    return result;
  };
  ensureDialogs(); ensureExpenseControls(); ensurePaymentPayer(); bindEvents(); renderPanel(); renderAll(false);
  const panel = document.getElementById("settings-panel-finance-tools");
  if (panel) new MutationObserver(() => renderPanel()).observe(panel, { childList:true });
  globalThis.addEventListener("finance:profile-changed", () => { data = ensureShape(data); pendingSplit = null; renderPanel(); renderAll(false); });
  globalThis.addEventListener("finance:data-persisted", () => renderPanel());
  API.render = renderPanel;
  API.openGroup = openGroupDialog;
  API.openSettlement = openSettlementDialog;
})();
