import { test, expect } from "@playwright/test";

function establishedPhoneData() {
  return {
    accounts:{ Wallet:4821.5 },
    accountTypes:{ Wallet:"Cash" },
    accountOrder:["Wallet"],
    accountIcons:{},
    iconLibrary:{},
    savingsSettings:{ defaultAccount:"", includeInAvailable:true, trendMonths:6 },
    savingsGoals:[],
    incomeRecords:[{ id:"income-phone-new", name:"Phone income", category:"Other", account:"Wallet", amount:1200, date:"2026-08-17", includeInTotals:true }],
    expenses:[{ id:"expense-phone-new", name:"Phone latest expense", category:"Bills", account:"Wallet", amount:345, date:"2026-08-17", group:"other", paid:false, includeInTotals:true, expenseType:"normal" }],
    expenseRecurrenceSkips:[],
    projects:[],
    monthlyReports:{},
    monthlyChecklists:{},
    monthlyBudgets:{},
    budgetTemplates:[],
    expenseTemplates:[],
    accountLedger:[],
    accountReconciliations:[],
    budgetSettings:{ version:1, defaultLowBalanceThreshold:1000, includeExpectedIncome:true, includeRecurringEstimates:true },
    projectCalendarSettings:{ autoPrepare:true, defaultReminder:"P1D", includeNotes:true, includeFinancialValues:false },
    salaryWorkSettings:{ includedProjectsPerMonth:3, officeDays:["Tuesday","Thursday","Saturday"], homeDays:["Monday","Wednesday","Friday"], compensationModel:"fixed-monthly-salary" },
    ledgerSettings:{ version:1 },
    productivitySettings:{ version:1, enabled:true, shortcuts:true },
    reminderSettings:{ version:1 }
  };
}

test("established phone data is protected before Cloud Sync can treat an empty baseline as first sync", async ({ page }) => {
  await page.addInitScript(({ finance }) => {
    localStorage.clear();
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify({
      version:1,
      activeProfileId:"profile-personal",
      profiles:[{ id:"profile-personal", name:"My Finances", type:"personal", role:"owner", cloudProfileId:"cloud-mobile", encryption:{enabled:false} }]
    }));
    localStorage.setItem("simple-finance-profile-data-v1:profile-personal", JSON.stringify(finance));
    localStorage.setItem("simple-finance-project-records-v2", JSON.stringify(finance));
    localStorage.setItem("simple-finance-cloud-config-v1", JSON.stringify({ supabaseUrl:"https://mobileguard.supabase.co", supabasePublishableKey:"short" }));
    localStorage.setItem("sb-mobileguard-auth-token", JSON.stringify({ user:{ id:"user-mobile" }, access_token:"" }));
    localStorage.removeItem("simple-finance-cloud-record-base-v3:profile-personal");
    localStorage.removeItem("simple-finance-cloud-record-queue-v3:profile-personal");
    localStorage.removeItem("simple-finance-cloud-sync-v3:profile-personal");
  }, { finance:establishedPhoneData() });

  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });
  await expect.poll(async () => page.evaluate(() => Boolean(window.FinanceCloudRevertGuard)), { timeout:10000 }).toBe(true);

  const protectedState = await page.evaluate(() => {
    const meta = JSON.parse(localStorage.getItem("simple-finance-cloud-sync-v3:profile-personal") || "{}");
    const queue = JSON.parse(localStorage.getItem("simple-finance-cloud-record-queue-v3:profile-personal") || "{}");
    const active = JSON.parse(localStorage.getItem("simple-finance-project-records-v2") || "{}");
    const items = Object.values(queue);
    return {
      meta,
      queueCount:items.length,
      allHeld:items.length > 0 && items.every(item => Number(item.nextAttemptAt || 0) > Date.now() + 365 * 24 * 60 * 60 * 1000),
      expenseHeld:items.some(item => item.collection === "expenses" && item.recordId === "expense-phone-new" && item.status === "pending" && item.basePayload === null),
      accountHeld:items.some(item => item.collection === "accounts" && item.recordId === "Wallet" && Number(item.payload?.balance || 0) === 4821.5),
      activeExpense:active.expenses?.find(item => item.id === "expense-phone-new")?.name || "",
      activeBalance:Number(active.accounts?.Wallet || 0),
      guard:window.FinanceCloudRevertGuard.last
    };
  });

  expect(protectedState.meta.initializedUserId).toBe("user-mobile:cloud-mobile");
  expect(protectedState.meta.initializedProfileId).toBe("cloud-mobile");
  expect(protectedState.queueCount).toBeGreaterThan(0);
  expect(protectedState.allHeld).toBe(true);
  expect(protectedState.expenseHeld).toBe(true);
  expect(protectedState.accountHeld).toBe(true);
  expect(protectedState.activeExpense).toBe("Phone latest expense");
  expect(protectedState.activeBalance).toBe(4821.5);
  expect(protectedState.guard?.armed).toBe(true);
});

test("guard does not interfere when a trustworthy cloud baseline already exists", async ({ page }) => {
  await page.addInitScript(({ finance }) => {
    localStorage.clear();
    localStorage.setItem("simple-finance-profiles-v1", JSON.stringify({
      version:1,
      activeProfileId:"profile-personal",
      profiles:[{ id:"profile-personal", name:"My Finances", type:"personal", role:"owner", cloudProfileId:"cloud-mobile", encryption:{enabled:false} }]
    }));
    localStorage.setItem("simple-finance-profile-data-v1:profile-personal", JSON.stringify(finance));
    localStorage.setItem("simple-finance-project-records-v2", JSON.stringify(finance));
    localStorage.setItem("simple-finance-cloud-record-base-v3:profile-personal", JSON.stringify({ "accounts\u001fWallet":{ collection:"accounts", recordId:"Wallet", payload:{name:"Wallet",balance:4821.5,type:"Cash",icon:null}, sortIndex:0, revision:8 } }));
    localStorage.setItem("simple-finance-cloud-sync-v3:profile-personal", JSON.stringify({ initializedUserId:"user-mobile:cloud-mobile", initializedProfileId:"cloud-mobile" }));
  }, { finance:establishedPhoneData() });

  await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"domcontentloaded" });
  await expect.poll(async () => page.evaluate(() => Boolean(window.FinanceCloudRevertGuard)), { timeout:10000 }).toBe(true);
  const state = await page.evaluate(() => ({
    guard:window.FinanceCloudRevertGuard.last,
    queue:JSON.parse(localStorage.getItem("simple-finance-cloud-record-queue-v3:profile-personal") || "{}")
  }));
  expect(state.guard?.armed).toBe(false);
  expect(state.guard?.reason).toBe("sync-baseline-present");
  expect(Object.keys(state.queue)).toHaveLength(0);
});
