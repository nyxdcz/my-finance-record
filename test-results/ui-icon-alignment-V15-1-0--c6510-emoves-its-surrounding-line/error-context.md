# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-icon-alignment.spec.mjs >> V15.1.0 desktop month navigation removes its surrounding line
- Location: tests/ui-icon-alignment.spec.mjs:94:1

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - complementary "Main navigation" [ref=f1e3]:
      - navigation "Finance sections" [ref=f1e4]:
        - list [ref=f1e6]:
          - listitem [ref=f1e7]:
            - button "Overview" [ref=f1e8] [cursor=pointer]
        - list [ref=f1e11]:
          - listitem [ref=f1e12]:
            - button "Finance" [ref=f1e13] [cursor=pointer]
        - list [ref=f1e16]:
          - listitem [ref=f1e17]:
            - button "Work" [ref=f1e18] [cursor=pointer]
        - list [ref=f1e21]:
          - listitem [ref=f1e22]:
            - button "Insights" [ref=f1e23] [cursor=pointer]
        - button "Settings" [ref=f1e26] [cursor=pointer]
    - main [ref=f1e28]:
      - generic [ref=f1e29]:
        - generic [ref=f1e31]:
          - heading "Dashboard" [level=1] [ref=f1e32]
          - paragraph [ref=f1e33]: Saturday, August 15, 2026
          - generic "V15.2.0 · Desktop UX Consistency · August 16, 2026" [ref=f1e34]: V15.2.0
        - generic [ref=f1e35]:
          - generic "Month navigation" [ref=f1e36]:
            - button "Previous month" [ref=f1e37] [cursor=pointer]
            - generic [ref=f1e40]:
              - button "Choose month, August 2026" [ref=f1e41] [cursor=pointer]:
                - generic [ref=f1e42]: Month
                - generic [ref=f1e44]: August 2026
              - textbox "Selected month": 2026-08
            - button "Next month" [ref=f1e45] [cursor=pointer]
            - generic "Active monthly records" [ref=f1e48]: Current
          - group "Edit history" [ref=f1e49]:
            - button "Undo unavailable while finance data is locked" [disabled] [ref=f1e50]
            - button "Redo unavailable while finance data is locked" [disabled] [ref=f1e53]
          - button "Customize dashboard" [ref=f1e56] [cursor=pointer]
          - button "More tools" [ref=f1e58] [cursor=pointer]
      - generic [ref=f1e65]:
        - 'region "Monthly overview Help: Monthly overview" [ref=f1e66]':
          - region [ref=f1e67]:
            - generic [ref=f1e68]:
              - strong [ref=f1e69]: This week
              - generic [ref=f1e70]: Aug 9–Aug 15
            - generic [ref=f1e72]:
              - generic [ref=f1e73]:
                - article "Sunday, August 9, 2026. Apple Music. Due · ₱219.00." [ref=f1e74]:
                  - generic [ref=f1e75]:
                    - strong [ref=f1e76]: "9"
                    - generic [ref=f1e77]: Sun
                  - generic [ref=f1e78]:
                    - strong [ref=f1e79]: Apple Music
                    - generic [ref=f1e80]: Due · ₱219.00
                - article "Monday, August 10, 2026. Rent. Due · ₱3,500.00 · 1 more." [ref=f1e81]:
                  - generic [ref=f1e82]:
                    - strong [ref=f1e83]: "10"
                    - generic [ref=f1e84]: Mon
                  - generic [ref=f1e85]:
                    - strong [ref=f1e86]: Rent
                    - generic [ref=f1e87]: Due · ₱3,500.00 · 1 more
                - article "Tuesday, August 11, 2026. Gym. Gym visit · ₱80.00 · 1 more." [ref=f1e88]:
                  - generic [ref=f1e89]:
                    - strong [ref=f1e90]: "11"
                    - generic [ref=f1e91]: Tue
                  - generic [ref=f1e92]:
                    - strong [ref=f1e93]: Gym
                    - generic [ref=f1e94]: Gym visit · ₱80.00 · 1 more
                - article "Wednesday, August 12, 2026. RTN Hospital. Payment received · ₱5,000.00." [ref=f1e95]:
                  - generic [ref=f1e96]:
                    - strong [ref=f1e97]: "12"
                    - generic [ref=f1e98]: Wed
                  - generic [ref=f1e99]:
                    - strong [ref=f1e100]: RTN Hospital
                    - generic [ref=f1e101]: Payment received · ₱5,000.00
                - article "Thursday, August 13, 2026. Gym. Gym visit · ₱80.00." [ref=f1e102]:
                  - generic [ref=f1e103]:
                    - strong [ref=f1e104]: "13"
                    - generic [ref=f1e105]: Thu
                  - generic [ref=f1e106]:
                    - strong [ref=f1e107]: Gym
                    - generic [ref=f1e108]: Gym visit · ₱80.00
                - article "Friday, August 14, 2026. Gym. Gym visit · ₱80.00." [ref=f1e109]:
                  - generic [ref=f1e110]:
                    - strong [ref=f1e111]: "14"
                    - generic [ref=f1e112]: Fri
                  - generic [ref=f1e113]:
                    - strong [ref=f1e114]: Gym
                    - generic [ref=f1e115]: Gym visit · ₱80.00
                - article "Saturday, August 15, 2026. SPayLater. Due · ₱1,935.00 · 1 more." [ref=f1e116]:
                  - generic [ref=f1e117]:
                    - strong [ref=f1e118]: "15"
                    - generic [ref=f1e119]: Sat
                  - generic [ref=f1e120]:
                    - strong [ref=f1e121]: SPayLater
                    - generic [ref=f1e122]: Due · ₱1,935.00 · 1 more
              - generic [ref=f1e123]:
                - article [ref=f1e124]:
                  - generic [ref=f1e125]:
                    - strong [ref=f1e126]: "9"
                    - generic [ref=f1e127]: Sun
                  - generic [ref=f1e128]:
                    - strong [ref=f1e129]: Apple Music
                    - generic [ref=f1e130]: Due · ₱219.00
                - article [ref=f1e131]:
                  - generic [ref=f1e132]:
                    - strong [ref=f1e133]: "10"
                    - generic [ref=f1e134]: Mon
                  - generic [ref=f1e135]:
                    - strong [ref=f1e136]: Rent
                    - generic [ref=f1e137]: Due · ₱3,500.00 · 1 more
                - article [ref=f1e138]:
                  - generic [ref=f1e139]:
                    - strong [ref=f1e140]: "11"
                    - generic [ref=f1e141]: Tue
                  - generic [ref=f1e142]:
                    - strong [ref=f1e143]: Gym
                    - generic [ref=f1e144]: Gym visit · ₱80.00 · 1 more
                - article [ref=f1e145]:
                  - generic [ref=f1e146]:
                    - strong [ref=f1e147]: "12"
                    - generic [ref=f1e148]: Wed
                  - generic [ref=f1e149]:
                    - strong [ref=f1e150]: RTN Hospital
                    - generic [ref=f1e151]: Payment received · ₱5,000.00
                - article [ref=f1e152]:
                  - generic [ref=f1e153]:
                    - strong [ref=f1e154]: "13"
                    - generic [ref=f1e155]: Thu
                  - generic [ref=f1e156]:
                    - strong [ref=f1e157]: Gym
                    - generic [ref=f1e158]: Gym visit · ₱80.00
                - article [ref=f1e159]:
                  - generic [ref=f1e160]:
                    - strong [ref=f1e161]: "14"
                    - generic [ref=f1e162]: Fri
                  - generic [ref=f1e163]:
                    - strong [ref=f1e164]: Gym
                    - generic [ref=f1e165]: Gym visit · ₱80.00
                - article [ref=f1e166]:
                  - generic [ref=f1e167]:
                    - strong [ref=f1e168]: "15"
                    - generic [ref=f1e169]: Sat
                  - generic [ref=f1e170]:
                    - strong [ref=f1e171]: SPayLater
                    - generic [ref=f1e172]: Due · ₱1,935.00 · 1 more
            - generic [ref=f1e173]: Seven days of income, expenses, projects, and payments. Animation pauses while focused.
          - text: Add goal
          - generic [ref=f1e175]:
            - generic [ref=f1e180]:
              - generic [ref=f1e181]: Signed-out privacy
              - heading "Sign in to view Monthly overview?" [level=3] [ref=f1e182]
              - paragraph [ref=f1e183]: No accounts, expenses, projects, payments, calendar events, reports, or search suggestions are shown while signed out.
            - generic "Signed-out finance totals" [ref=f1e184]:
              - generic [ref=f1e185]:
                - generic [ref=f1e186]: Available money
                - strong [ref=f1e187]: ₱0.00
              - generic [ref=f1e188]:
                - generic [ref=f1e189]: Income
                - strong [ref=f1e190]: ₱0.00
              - generic [ref=f1e191]:
                - generic [ref=f1e192]: Expenses
                - strong [ref=f1e193]: ₱0.00
              - generic [ref=f1e194]:
                - generic [ref=f1e195]: Projects
                - strong [ref=f1e196]: "0"
            - button "Sign in to view records" [ref=f1e197] [cursor=pointer]
            - generic [ref=f1e198]: Your local records stay stored on this device. Signing out hides them; it does not delete them.
        - text: Add account Finance records stay hidden until cloud sign-in succeeds.
  - status:
    - generic: i
    - button "Dismiss notification": ×
  - alert [ref=f1e199]
  - status [ref=f1e200]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test("production V15.1.0 UI alignment uses the delivered final stylesheet", async ({ browser }) => {
  4   |   const context = await browser.newContext({ javaScriptEnabled:false });
  5   |   const page = await context.newPage();
  6   |   await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
  7   | 
  8   |   const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("href") || ""));
  9   |   const dashboardCss = styles.findIndex(href => href.includes("dashboard-interactions.css?v=15.1.0-desktop3"));
  10  |   const uiCss = styles.findIndex(href => href.includes("ui-icon-alignment-v15-0-5.css?v=15.1.0-ui3"));
  11  |   expect(dashboardCss).toBeGreaterThanOrEqual(0);
  12  |   expect(uiCss).toBeGreaterThan(dashboardCss);
  13  |   expect(styles.some(href => href.includes("ui-icon-alignment-v15-0-4.css?v=15.0.4-ui1"))).toBe(false);
  14  | 
  15  |   const badge = await page.locator("#buildBadge").evaluate(element => {
  16  |     const before = getComputedStyle(element, "::before");
  17  |     return { content:before.content, display:before.display, width:before.width, marginRight:before.marginRight };
  18  |   });
  19  |   expect(badge.content).toBe("none");
  20  |   expect(badge.display).toBe("none");
  21  |   expect(badge.width).toBe("0px");
  22  |   expect(badge.marginRight).toBe("0px");
  23  | 
  24  |   const addExpenseGap = await page.locator("#quickAddExpense").evaluate(element => getComputedStyle(element).gap);
  25  |   expect(addExpenseGap).toBe("4px");
  26  | 
  27  |   await context.close();
  28  | });
  29  | 
  30  | 
  31  | test("V15.1.0 header omits duplicate sign-in shortcut and optically centers Dashboard utility glyph", async ({ page }) => {
  32  |   await page.goto("http://127.0.0.1:3000/index.html?page=settings", { waitUntil:"networkidle" });
  33  | 
  34  |   await expect(page.locator("#privacySignInButton")).toHaveCount(0);
  35  |   await expect(page.locator("#cloudSignIn")).toHaveCount(1);
  36  | 
  37  |   const customize = page.locator("#customizeDashboardButton");
  38  |   await expect(customize).toHaveAttribute("data-dashboard-toolbar-action", "true");
  39  |   const geometry = await customize.evaluate(element => {
  40  |     const button = getComputedStyle(element);
  41  |     const glyph = getComputedStyle(element, "::before");
  42  |     return {
  43  |       width:button.width,
  44  |       height:button.height,
  45  |       display:button.display,
  46  |       justifyItems:button.justifyItems,
  47  |       alignItems:button.alignItems,
  48  |       glyphWidth:glyph.width,
  49  |       glyphHeight:glyph.height,
  50  |       glyphTransform:glyph.transform,
  51  |       glyphMargin:glyph.margin
  52  |     };
  53  |   });
  54  |   expect(geometry.width).toBe("38px");
  55  |   expect(geometry.height).toBe("38px");
  56  |   expect(geometry.display).toBe("grid");
  57  |   expect(geometry.justifyItems).toBe("center");
  58  |   expect(geometry.alignItems).toBe("center");
  59  |   expect(geometry.glyphWidth).toBe("20px");
  60  |   expect(geometry.glyphHeight).toBe("20px");
  61  |   expect(geometry.glyphTransform).toBe("matrix(1, 0, 0, 1, 0, 1)");
  62  |   expect(geometry.glyphMargin).toBe("0px");
  63  | });
  64  | 
  65  | 
  66  | test("V15.1.0 desktop topbar controls match the Synced 38px height", async ({ page }) => {
  67  |   await page.setViewportSize({ width:1440, height:900 });
  68  |   await page.goto("http://127.0.0.1:3000/index.html?page=money", { waitUntil:"networkidle" });
  69  | 
  70  |   await page.evaluate(() => {
  71  |     window.FinancePrivacyLock?.unlock?.({ email:"toolbar-height-test@example.invalid" });
  72  |     const add = document.getElementById("quickAddExpense");
  73  |     if (add) add.hidden = false;
  74  |   });
  75  | 
  76  |   await expect(page.locator("#cloudSyncStatusButton")).toBeVisible();
  77  |   const heightOf = selector => page.locator(selector).first().evaluate(element => element.getBoundingClientRect().height);
  78  |   const reference = await heightOf("#cloudSyncStatusButton");
  79  |   expect(reference).toBe(38);
  80  | 
  81  |   for (const selector of [
  82  |     "#customizeDashboardButton",
  83  |     ".month-navigator",
  84  |     "#undoMoneyButton",
  85  |     "#redoMoneyButton",
  86  |     "#quickAddExpense",
  87  |     "#topbarToolsTrigger"
  88  |   ]) {
  89  |     expect(await heightOf(selector), `${selector} should match Synced height`).toBe(reference);
  90  |   }
  91  | });
  92  | 
  93  | 
  94  | test("V15.1.0 desktop month navigation removes its surrounding line", async ({ page }) => {
  95  |   await page.setViewportSize({ width:1440, height:900 });
  96  |   await page.goto("http://127.0.0.1:3000/index.html?page=dashboard", { waitUntil:"networkidle" });
> 97  |   await page.evaluate(() => window.FinancePrivacyLock?.unlock?.({ email:"month-nav-border-test@example.invalid" }));
      |              ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation.
  98  | 
  99  |   const shell = page.locator(".topbar-actions .month-navigator");
  100 |   await expect(shell).toBeVisible();
  101 |   const shellStyle = await shell.evaluate(element => {
  102 |     const style = getComputedStyle(element);
  103 |     const rect = element.getBoundingClientRect();
  104 |     return {
  105 |       height:rect.height,
  106 |       borderColor:style.borderTopColor,
  107 |       background:style.backgroundColor,
  108 |       shadow:style.boxShadow
  109 |     };
  110 |   });
  111 |   expect(shellStyle.height).toBe(38);
  112 |   expect(shellStyle.borderColor).toBe("rgba(0, 0, 0, 0)");
  113 |   expect(shellStyle.background).toBe("rgba(0, 0, 0, 0)");
  114 |   expect(shellStyle.shadow).toBe("none");
  115 | 
  116 |   for (const selector of ["#previousMonthButton", "#monthControl", "#nextMonthButton"]) {
  117 |     const borderWidth = await page.locator(selector).evaluate(element => getComputedStyle(element).borderTopWidth);
  118 |     expect(borderWidth, `${selector} should not show a surrounding border`).toBe("0px");
  119 |   }
  120 | 
  121 |   const current = page.locator("#currentMonthButton:not([hidden]), #monthStatusChip:not([hidden])").first();
  122 |   await expect(current).toBeVisible();
  123 |   const currentBorderWidth = await current.evaluate(element => getComputedStyle(element).borderTopWidth);
  124 |   expect(currentBorderWidth).toBe("0px");
  125 | });
  126 | 
```