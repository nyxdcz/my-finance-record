import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";

/* global data */

const APP_URL = "http://127.0.0.1:3000";
const ACCOUNT_INTEGRITY_SOURCES = ["assets/js/account-ledger.js","assets/js/account-submit-compat.js","assets/js/cloud-sync.js","assets/js/cloud-sync-lifecycle.js"];
const hash = crypto.createHash("sha256");
for (const file of ACCOUNT_INTEGRITY_SOURCES) { hash.update(`${file}\0`); hash.update(fs.readFileSync(file)); }
const REVISION = hash.digest("hex").slice(0, 12);
const REFRESH_KEY = `finance-account-integrity-${REVISION}`;

test.use({ serviceWorkers:"allow" });
test.beforeEach(async ({ page }) => { await page.addInitScript(key => localStorage.setItem(key, "done"), REFRESH_KEY); });

async function authenticate(page) {
  await page.waitForFunction(() => Boolean(window.FinancePrivacyLock));
  await page.waitForFunction(() => !document.body.classList.contains("finance-auth-pending"));
  await page.evaluate(() => window.FinancePrivacyLock.setAuthenticated(true));
  await page.waitForFunction(() => Boolean(window.FinanceLedgerTransactions?.capabilities?.unifiedMoneyMutations && window.FinanceProfileArchitecture));
}

async function openApp(page) {
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto(`${APP_URL}/?page=money`, { waitUntil:"networkidle" });
  await authenticate(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) { await page.reload({ waitUntil:"networkidle" }); await authenticate(page); }
}

async function boostAccount(page, account, target) {
  await page.evaluate(({ account, target }) => {
    const card = document.querySelector(`#moneyAccounts [data-account-card="${CSS.escape(account)}"]`);
    card?.querySelector("[data-edit-account]")?.click();
    const input = document.getElementById("accountBalance");
    input.value = target.toLocaleString("en-PH", { minimumFractionDigits:2, maximumFractionDigits:2 });
    document.getElementById("accountForm").dispatchEvent(new Event("submit", { bubbles:true, cancelable:true }));
  }, { account, target });
}

test("transfer persists as one equal-and-opposite ledger transaction", async ({ page }) => {
  await openApp(page);
  const setup = await page.evaluate(() => ({ names:Object.keys(data.accounts || {}).slice(0, 2), balances:{...data.accounts} }));
  expect(setup.names.length).toBe(2);
  const [from, to] = setup.names;
  await boostAccount(page, from, Math.max(1000, Number(setup.balances[from] || 0) + 500));
  const before = await page.evaluate(({from,to}) => ({ from:Number(data.accounts[from]), to:Number(data.accounts[to]) }), {from,to});
  const result = await page.evaluate(({from,to}) => window.FinanceLedgerTransactions.transfer({ from, to, amount:125.25, date:new Date().toISOString().slice(0,10), note:"Phase 2 transfer" }), {from,to});
  expect(result.ok).toBe(true);
  const state = await page.evaluate(({from,to,transferId}) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
    const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");
    const entries = (data.accountLedger || []).filter(entry => entry.transferId === transferId);
    return { runtimeFrom:data.accounts[from], runtimeTo:data.accounts[to], persistedFrom:persisted.accounts[from], persistedTo:persisted.accounts[to], profileFrom:profile.accounts[from], profileTo:profile.accounts[to], entries };
  }, {from,to,transferId:result.transferId});
  expect(state.runtimeFrom).toBeCloseTo(before.from - 125.25, 2);
  expect(state.runtimeTo).toBeCloseTo(before.to + 125.25, 2);
  expect(state.persistedFrom).toBe(state.runtimeFrom);
  expect(state.persistedTo).toBe(state.runtimeTo);
  expect(state.profileFrom).toBe(state.runtimeFrom);
  expect(state.profileTo).toBe(state.runtimeTo);
  expect(state.entries).toHaveLength(2);
  expect(state.entries.reduce((sum, entry) => sum + Number(entry.amount), 0)).toBeCloseTo(0, 2);
});

test("quick spend and payment reversal remain ledger/account consistent", async ({ page }) => {
  await openApp(page);
  const account = await page.evaluate(() => Object.keys(data.accounts || {})[0]);
  const original = await page.evaluate(account => Number(data.accounts[account]), account);
  await boostAccount(page, account, Math.max(1500, original + 750));
  const before = await page.evaluate(account => Number(data.accounts[account]), account);
  const spend = await page.evaluate(account => window.FinanceLedgerTransactions.quickSpend({ account, amount:87.65, description:"Phase 2 purchase", category:"Personal", date:new Date().toISOString().slice(0,10), note:"integrity regression", includeInTotals:true }), account);
  expect(spend.ok).toBe(true);
  const paid = await page.evaluate(({account,id,transactionId}) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
    const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");
    const item = data.expenses.find(expense => expense.id === id);
    const entry = data.accountLedger.find(candidate => candidate.transactionId === transactionId && candidate.expenseId === id);
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], item, entry };
  }, {account,id:spend.expense.id,transactionId:spend.transactionId});
  expect(paid.balance).toBeCloseTo(before - 87.65, 2);
  expect(paid.persisted).toBe(paid.balance);
  expect(paid.profile).toBe(paid.balance);
  expect(paid.item.paid).toBe(true);
  expect(paid.entry.amount).toBeCloseTo(-87.65, 2);

  const reversed = await page.evaluate(id => {
    const item = data.expenses.find(expense => expense.id === id);
    return window.FinanceLedgerTransactions.reverseExpensePayment(item);
  }, spend.expense.id);
  expect(reversed.ok).toBe(true);
  const after = await page.evaluate(({account,id}) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
    const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");
    const item = data.expenses.find(expense => expense.id === id);
    const reversal = data.accountLedger.find(entry => entry.expenseId === id && entry.type === "expense-payment-reversal");
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], item, reversal };
  }, {account,id:spend.expense.id});
  expect(after.balance).toBeCloseTo(before, 2);
  expect(after.persisted).toBe(after.balance);
  expect(after.profile).toBe(after.balance);
  expect(after.item.paid).toBe(false);
  expect(after.reversal.amount).toBeCloseTo(87.65, 2);
});

test("income add edit delete uses deposit and reversal pairs atomically", async ({ page }) => {
  await openApp(page);
  const account = await page.evaluate(() => Object.keys(data.accounts || {})[0]);
  const before = await page.evaluate(account => Number(data.accounts[account]), account);
  const base = { name:"Phase 2 income", amount:222.22, date:new Date().toISOString().slice(0,10), category:"Other income", categoryGroup:"Other income", account, recurring:"No", seriesId:"", includeInTotals:true, notes:"integrity regression", icon:null, postToLedger:true };
  const created = await page.evaluate(record => window.FinanceLedgerTransactions.saveIncome(record), base);
  expect(created.ok).toBe(true);
  const edited = await page.evaluate(({id,record}) => window.FinanceLedgerTransactions.saveIncome({ ...record, id, amount:333.33 }), { id:created.record.id, record:base });
  expect(edited.ok).toBe(true);
  const mid = await page.evaluate(({account,id}) => {
    const record = data.incomeRecords.find(item => item.id === id);
    const deposits = data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit");
    const reversals = data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit-reversal");
    return { balance:data.accounts[account], record, deposits, reversals };
  }, {account,id:created.record.id});
  expect(mid.balance).toBeCloseTo(before + 333.33, 2);
  expect(mid.deposits).toHaveLength(2);
  expect(mid.reversals).toHaveLength(1);
  expect(mid.record.ledgerTransactionId).not.toBe("");

  const deleted = await page.evaluate(id => window.FinanceLedgerTransactions.deleteIncome(id), created.record.id);
  expect(deleted.ok).toBe(true);
  const finalState = await page.evaluate(({account,id}) => {
    const persisted = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const profileId = window.FinanceProfileArchitecture?.activeProfileId?.() || "";
    const profile = JSON.parse(localStorage.getItem(`simple-finance-profile-data-v1:${profileId}`) || "{}");
    return { balance:data.accounts[account], persisted:persisted.accounts[account], profile:profile.accounts[account], record:data.incomeRecords.find(item => item.id === id), reversals:data.accountLedger.filter(entry => entry.incomeId === id && entry.type === "income-deposit-reversal") };
  }, {account,id:created.record.id});
  expect(finalState.balance).toBeCloseTo(before, 2);
  expect(finalState.persisted).toBe(finalState.balance);
  expect(finalState.profile).toBe(finalState.balance);
  expect(finalState.record).toBeUndefined();
  expect(finalState.reversals).toHaveLength(2);

  await page.reload({ waitUntil:"networkidle" });
  await authenticate(page);
  const reloaded = await page.evaluate(({account,id}) => ({ balance:data.accounts[account], record:data.incomeRecords.find(item => item.id === id) }), {account,id:created.record.id});
  expect(reloaded.balance).toBeCloseTo(before, 2);
  expect(reloaded.record).toBeUndefined();
});

test("Viewer money mutation fails before transfer ledger changes", async ({ page }) => {
  await openApp(page);
  const names = await page.evaluate(() => Object.keys(data.accounts || {}).slice(0,2));
  expect(names.length).toBe(2);
  await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem("simple-finance-profiles-v1") || "{}");
    const active = (meta.profiles || []).find(profile => profile.id === meta.activeProfileId);
    if (!active) throw new Error("Active profile metadata missing");
    active.role = "viewer";
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify(meta));
  });
  await page.reload({ waitUntil:"networkidle" });
  await authenticate(page);
  await page.waitForFunction(() => window.FinanceProfileArchitecture?.activeRole?.() === "viewer");
  const before = await page.evaluate(() => ({ accounts:{...data.accounts}, count:(data.accountLedger || []).length }));
  const result = await page.evaluate(([from,to]) => window.FinanceLedgerTransactions.transfer({ from, to, amount:1, date:new Date().toISOString().slice(0,10) }), names);
  expect(result.ok).toBe(false);
  expect(result.reason).toBe("read-only");
  const after = await page.evaluate(() => ({ accounts:{...data.accounts}, count:(data.accountLedger || []).length }));
  expect(after).toEqual(before);
});
