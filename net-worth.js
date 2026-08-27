"use strict";

/* Talaan manual net-worth ledger.
   Values are user-entered and remain separate from accounts, cash flow, and the Account Ledger. */
(function netWorthBootstrap() {
  const VERSION = 1;
  const MAX_ITEMS = 200;
  const MAX_VALUATIONS = 2000;
  const TYPES = new Set(["asset", "liability"]);
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
  const currencyCode = value => {
    const code = compact(value || "PHP", 3).toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : "PHP";
  };

  function normalizeValuation(value, itemCurrency = "PHP") {
    if (!value || typeof value !== "object") return null;
    const currency = currencyCode(itemCurrency);
    const nativeAmount = positiveMoney(value.nativeAmount ?? value.amount ?? value.amountPhp);
    if (!nativeAmount) return null;
    const phpRate = currency === "PHP" ? 1 : positiveMoney(value.phpRate);
    if (!phpRate) return null;
    return {
      id:compact(value.id || makeId("valuation"), 120),
      date:validDate(value.date),
      nativeAmount,
      phpRate,
      amountPhp:roundMoney(nativeAmount * phpRate),
      note:compact(value.note, 240),
      source:"manual",
      createdAt:validTimestamp(value.createdAt),
      updatedAt:validTimestamp(value.updatedAt || value.createdAt)
    };
  }

  function normalizeItem(value) {
    if (!value || typeof value !== "object") return null;
    const name = compact(value.name, 80);
    if (!name) return null;
    const type = TYPES.has(value.type) ? value.type : "asset";
    const currency = currencyCode(value.currency);
    const seen = new Set();
    const valuations = (Array.isArray(value.valuations) ? value.valuations : [])
      .map(item => normalizeValuation(item, currency))
      .filter(item => item && !seen.has(item.id) && seen.add(item.id))
      .sort((left, right) => left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    if (!valuations.length) return null;
    return {
      id:compact(value.id || makeId("worth"), 120),
      name,
      type,
      category:compact(value.category || (type === "asset" ? "Other asset" : "Other liability"), 60),
      currency,
      archived:Boolean(value.archived),
      valuations,
      createdAt:validTimestamp(value.createdAt),
      updatedAt:validTimestamp(value.updatedAt || value.createdAt)
    };
  }

  function normalizeStore(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const seen = new Set();
    const items = [];
    let valuationCount = 0;
    for (const raw of Array.isArray(source.items) ? source.items : []) {
      if (items.length >= MAX_ITEMS || valuationCount >= MAX_VALUATIONS) break;
      const item = normalizeItem(raw);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      const remaining = MAX_VALUATIONS - valuationCount;
      item.valuations = item.valuations.slice(-remaining);
      valuationCount += item.valuations.length;
      items.push(item);
    }
    return {
      version:VERSION,
      baseCurrency:"PHP",
      staleAfterDays:Math.max(1, Math.min(3650, Math.round(Number(source.staleAfterDays ?? 90) || 90))),
      items
    };
  }

  function ensureShape(source) {
    const target = source && typeof source === "object" ? source : {};
    target.ledgerSettings = target.ledgerSettings && typeof target.ledgerSettings === "object" && !Array.isArray(target.ledgerSettings) ? target.ledgerSettings : {};
    target.ledgerSettings.netWorth = normalizeStore(target.ledgerSettings.netWorth);
    return target;
  }

  function latestValuation(item, asOf = "9999-12-31") {
    const values = (item?.valuations || []).filter(value => value.date <= asOf);
    return values.length ? values[values.length - 1] : null;
  }

  function isStale(item, store, asOf = todayKey()) {
    const latest = latestValuation(item, asOf);
    if (!latest) return false;
    const from = new Date(latest.date + "T00:00:00Z");
    const to = new Date(asOf + "T00:00:00Z");
    return Math.floor((to - from) / 86400000) > Number(store?.staleAfterDays || 90);
  }

  function metrics(value, asOf = todayKey(), options = {}) {
    const store = normalizeStore(value);
    const includeArchived = Boolean(options.includeArchived);
    const items = store.items.filter(item => includeArchived || !item.archived).map(item => {
      const valuation = latestValuation(item, asOf);
      return { item, valuation, amountPhp:Number(valuation?.amountPhp || 0), stale:isStale(item, store, asOf) };
    }).filter(entry => entry.valuation);
    const assets = roundMoney(items.filter(entry => entry.item.type === "asset").reduce((total, entry) => total + entry.amountPhp, 0));
    const liabilities = roundMoney(items.filter(entry => entry.item.type === "liability").reduce((total, entry) => total + entry.amountPhp, 0));
    return { asOf, assets, liabilities, netWorth:roundMoney(assets - liabilities), items, staleCount:items.filter(entry => entry.stale).length };
  }

  function composition(value, type, asOf = todayKey()) {
    const output = new Map();
    metrics(value, asOf).items.filter(entry => entry.item.type === type).forEach(entry => {
      output.set(entry.item.category, roundMoney((output.get(entry.item.category) || 0) + entry.amountPhp));
    });
    return [...output].map(([category, amount]) => ({ category, amount })).sort((left, right) => right.amount - left.amount || left.category.localeCompare(right.category));
  }

  function evolution(value, limit = 24) {
    const store = normalizeStore(value);
    const dates = [...new Set(store.items.flatMap(item => item.valuations.map(entry => entry.date)))].sort().slice(-Math.max(1, Math.min(120, Number(limit || 24))));
    return dates.map(date => {
      const point = metrics(store, date);
      return { date, assets:point.assets, liabilities:point.liabilities, netWorth:point.netWorth };
    });
  }

  function itemComparable(item) {
    if (!item) return null;
    const output = clone(item);
    delete output.valuations;
    return output;
  }

  function countConflicts(currentValue, incomingValue) {
    const current = normalizeStore(currentValue), incoming = normalizeStore(incomingValue);
    const currentItems = new Map(current.items.map(item => [item.id, item]));
    let conflicts = 0;
    incoming.items.forEach(item => {
      const existing = currentItems.get(item.id);
      if (!existing) return;
      if (JSON.stringify(itemComparable(existing)) !== JSON.stringify(itemComparable(item))) conflicts += 1;
      const valuations = new Map(existing.valuations.map(value => [value.id, value]));
      item.valuations.forEach(value => {
        const prior = valuations.get(value.id);
        if (prior && JSON.stringify(prior) !== JSON.stringify(value)) conflicts += 1;
      });
    });
    return conflicts;
  }

  function mergeStores(currentValue, incomingValue, conflictPolicy = "current") {
    const current = normalizeStore(currentValue), incoming = normalizeStore(incomingValue);
    const items = new Map(current.items.map(item => [item.id, clone(item)]));
    incoming.items.forEach(item => {
      if (!items.has(item.id)) { items.set(item.id, clone(item)); return; }
      const currentItem = items.get(item.id);
      const chosen = conflictPolicy === "incoming" ? clone(item) : clone(currentItem);
      const valuations = new Map(currentItem.valuations.map(value => [value.id, clone(value)]));
      item.valuations.forEach(value => {
        if (!valuations.has(value.id) || conflictPolicy === "incoming") valuations.set(value.id, clone(value));
      });
      chosen.valuations = [...valuations.values()];
      items.set(item.id, chosen);
    });
    return normalizeStore({
      ...current,
      ...(conflictPolicy === "incoming" ? incoming : {}),
      items:[...items.values()]
    });
  }

  function summary(value) {
    const store = normalizeStore(value);
    const totals = metrics(store);
    return {
      items:store.items.length,
      activeItems:store.items.filter(item => !item.archived).length,
      valuations:store.items.reduce((total, item) => total + item.valuations.length, 0),
      assets:totals.assets,
      liabilities:totals.liabilities,
      netWorth:totals.netWorth
    };
  }

  const API = { version:VERSION, MAX_ITEMS, MAX_VALUATIONS, normalizeValuation, normalizeItem, normalizeStore, latestValuation, isStale, metrics, composition, evolution, countConflicts, mergeStores, summary };
  globalThis.FinanceNetWorth = API;
  if (globalThis.__FINANCE_NET_WORTH_TEST__) return;

  const baseNormalizeData = normalizeData;
  normalizeData = value => ensureShape(baseNormalizeData(value));
  data = ensureShape(data);
  let currentItemId = "";
  let currentValuationId = "";
  let currentValuationItemId = "";
  let showArchived = false;
  const money = value => new Intl.NumberFormat("en-PH", { style:"currency", currency:"PHP" }).format(Number(value || 0));
  const dateLabel = value => {
    const date = new Date(String(value || "") + "T00:00:00");
    return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat("en-PH", { year:"numeric", month:"short", day:"numeric" }).format(date);
  };
  const canWrite = () => globalThis.FinanceProfileArchitecture?.canWrite?.() !== false && !document.body.classList.contains("finance-signed-out");
  const store = () => {
    data = ensureShape(data);
    return data.ledgerSettings.netWorth;
  };
  const findItem = id => store().items.find(item => item.id === id) || null;
  const toast = (message, tone = "info") => typeof showToast === "function" ? showToast(message, tone) : undefined;
  async function confirmAction(options) {
    if (typeof openAppConfirmation === "function") return openAppConfirmation(options);
    return globalThis.confirm((options.title || "Confirm") + "\n\n" + (options.message || ""));
  }
  async function saveRecovery(label) {
    if (globalThis.FinancePrivacyLock?.recoveryStorage?.save) return globalThis.FinancePrivacyLock.recoveryStorage.save(label, clone(data));
    if (typeof createRecoverySnapshot === "function") return createRecoverySnapshot(label, clone(data));
    throw new Error("Recovery storage is unavailable.");
  }
  function persist(label) {
    const netWorth = normalizeStore(store());
    data = normalizeData(data);
    data.ledgerSettings = data.ledgerSettings && typeof data.ledgerSettings === "object" && !Array.isArray(data.ledgerSettings) ? data.ledgerSettings : {};
    data.ledgerSettings.netWorth = netWorth;
    return typeof saveData === "function" ? saveData(label) : false;
  }

  function ensureDialogs() {
    if (!document.getElementById("netWorthItemDialog")) document.body.insertAdjacentHTML("beforeend", [
      '<dialog class="app-dialog net-worth-dialog" id="netWorthItemDialog" aria-labelledby="netWorthItemDialogTitle"><form id="netWorthItemForm">',
      '<div class="modal-header"><h3 id="netWorthItemDialogTitle">Add asset</h3><button class="button button-secondary button-small" type="button" data-close-net-worth="netWorthItemDialog">Close</button></div>',
      '<div class="modal-body net-worth-form-grid">',
      '<label class="field net-worth-wide"><span>Name</span><input class="input" id="netWorthItemName" maxlength="80" required></label>',
      '<label class="field"><span>Type</span><select class="select" id="netWorthItemType"><option value="asset">Asset</option><option value="liability">Liability</option></select></label>',
      '<label class="field"><span>Category</span><input class="input" id="netWorthItemCategory" maxlength="60" required></label>',
      '<label class="field"><span>Currency</span><input class="input" id="netWorthItemCurrency" maxlength="3" value="PHP" pattern="[A-Za-z]{3}" required></label>',
      '<label class="net-worth-check" id="netWorthArchiveField"><input id="netWorthItemArchived" type="checkbox"> Archived</label>',
      '<div class="net-worth-initial net-worth-wide"><strong id="netWorthInitialHeading">Initial valuation</strong><small id="netWorthInitialHelp">Enter the current value to begin history.</small></div>',
      '<label class="field"><span>Valuation date</span><input class="input" id="netWorthInitialDate" type="date"></label>',
      '<label class="field"><span>Amount</span><input class="input" id="netWorthInitialAmount" inputmode="decimal" placeholder="0.00"></label>',
      '<label class="field" id="netWorthInitialRateField"><span>PHP rate</span><input class="input" id="netWorthInitialRate" inputmode="decimal" value="1"></label>',
      '<label class="field net-worth-wide"><span>Valuation note</span><input class="input" id="netWorthInitialNote" maxlength="240"></label>',
      '<p class="field-error net-worth-wide" id="netWorthItemError" role="alert" hidden></p></div>',
      '<div class="modal-footer"><button class="button button-secondary" type="button" data-close-net-worth="netWorthItemDialog">Cancel</button><span class="footer-spacer"></span><button class="button button-primary" type="submit">Save item</button></div>',
      '</form></dialog>'
    ].join(""));
    if (!document.getElementById("netWorthValuationDialog")) document.body.insertAdjacentHTML("beforeend", [
      '<dialog class="app-dialog net-worth-dialog" id="netWorthValuationDialog" aria-labelledby="netWorthValuationDialogTitle"><form id="netWorthValuationForm">',
      '<div class="modal-header"><h3 id="netWorthValuationDialogTitle">Update value</h3><button class="button button-secondary button-small" type="button" data-close-net-worth="netWorthValuationDialog">Close</button></div>',
      '<div class="modal-body net-worth-form-grid">',
      '<label class="field"><span>Date</span><input class="input" id="netWorthValuationDate" type="date" required></label>',
      '<label class="field"><span>Amount</span><input class="input" id="netWorthValuationAmount" inputmode="decimal" required></label>',
      '<label class="field" id="netWorthValuationRateField"><span>PHP rate</span><input class="input" id="netWorthValuationRate" inputmode="decimal" value="1" required></label>',
      '<label class="field net-worth-wide"><span>Note</span><input class="input" id="netWorthValuationNote" maxlength="240"></label>',
      '<p class="field-error net-worth-wide" id="netWorthValuationError" role="alert" hidden></p></div>',
      '<div class="modal-footer"><button class="button button-secondary" type="button" data-close-net-worth="netWorthValuationDialog">Cancel</button><span class="footer-spacer"></span><button class="button button-primary" type="submit">Save valuation</button></div>',
      '</form></dialog>'
    ].join(""));
  }

  function openDialog(id, focusSelector) {
    if (typeof showAppDialog === "function") showAppDialog(id, focusSelector);
    else document.getElementById(id)?.showModal();
  }
  function closeNetWorthDialog(id) {
    if (typeof closeDialog === "function") closeDialog(id);
    else document.getElementById(id)?.close();
  }
  function syncRateField(currency, field) {
    const foreign = currencyCode(currency) !== "PHP";
    field.hidden = !foreign;
    const input = field.querySelector("input");
    if (!foreign) input.value = "1";
  }

  function openItem(id = "", type = "asset") {
    ensureDialogs();
    const item = id ? findItem(id) : null;
    currentItemId = item?.id || "";
    document.getElementById("netWorthItemDialogTitle").textContent = item ? "Edit " + item.name : "Add " + (type === "liability" ? "liability" : "asset");
    document.getElementById("netWorthItemName").value = item?.name || "";
    document.getElementById("netWorthItemType").value = item?.type || (type === "liability" ? "liability" : "asset");
    document.getElementById("netWorthItemCategory").value = item?.category || (type === "liability" ? "Other liability" : "Other asset");
    document.getElementById("netWorthItemCurrency").value = item?.currency || "PHP";
    document.getElementById("netWorthItemCurrency").readOnly = Boolean(item);
    document.getElementById("netWorthItemArchived").checked = Boolean(item?.archived);
    document.getElementById("netWorthArchiveField").hidden = !item;
    document.getElementById("netWorthInitialHeading").textContent = item ? "Add valuation (optional)" : "Initial valuation";
    document.getElementById("netWorthInitialHelp").textContent = item ? "Leave Amount blank to update details without adding history." : "Enter the current value to begin history.";
    document.getElementById("netWorthInitialDate").value = todayKey();
    document.getElementById("netWorthInitialAmount").value = "";
    document.getElementById("netWorthInitialRate").value = "1";
    document.getElementById("netWorthInitialNote").value = "";
    document.getElementById("netWorthItemError").hidden = true;
    syncRateField(item?.currency || "PHP", document.getElementById("netWorthInitialRateField"));
    openDialog("netWorthItemDialog", "#netWorthItemName");
  }

  function openValuation(itemId, valuationId = "") {
    ensureDialogs();
    const item = findItem(itemId);
    if (!item) return;
    const valuation = valuationId ? item.valuations.find(value => value.id === valuationId) : null;
    currentValuationItemId = item.id;
    currentValuationId = valuation?.id || "";
    document.getElementById("netWorthValuationDialogTitle").textContent = valuation ? "Edit " + item.name + " valuation" : "Update " + item.name;
    document.getElementById("netWorthValuationDate").value = valuation?.date || todayKey();
    document.getElementById("netWorthValuationAmount").value = valuation?.nativeAmount || "";
    document.getElementById("netWorthValuationRate").value = valuation?.phpRate || "1";
    document.getElementById("netWorthValuationNote").value = valuation?.note || "";
    document.getElementById("netWorthValuationError").hidden = true;
    syncRateField(item.currency, document.getElementById("netWorthValuationRateField"));
    openDialog("netWorthValuationDialog", "#netWorthValuationAmount");
  }

  function labels(entry) {
    const values = ['<span class="status-chip neutral">Manual</span>'];
    if (entry.item.currency !== "PHP") values.push('<span class="status-chip info">Converted</span>');
    if (entry.stale) values.push('<span class="status-chip warning">Stale</span>');
    if (entry.item.archived) values.push('<span class="status-chip neutral">Archived</span>');
    return values.join("");
  }

  function valuationHistory(item) {
    return [...item.valuations].reverse().slice(0, 6).map(value => [
      '<li><span><strong>', dateLabel(value.date), '</strong><small>', esc(value.note || "Manual valuation"), '</small></span>',
      '<span><b>', money(value.amountPhp), '</b><small>', item.currency === "PHP" ? "PHP" : (esc(item.currency) + " " + Number(value.nativeAmount).toLocaleString("en-PH") + " × " + Number(value.phpRate).toLocaleString("en-PH")), '</small></span>',
      '<span class="net-worth-history-actions no-print"><button class="button button-secondary button-small" type="button" data-edit-net-worth-valuation="', esc(value.id), '" data-net-worth-item="', esc(item.id), '">Edit</button><button class="button button-secondary button-small" type="button" data-delete-net-worth-valuation="', esc(value.id), '" data-net-worth-item="', esc(item.id), '">Delete</button></span></li>'
    ].join("")).join("");
  }

  function itemCard(entry) {
    const item = entry.item, latest = entry.valuation;
    return [
      '<article class="net-worth-item', item.archived ? " is-archived" : "", '" data-net-worth-item-card="', esc(item.id), '">',
      '<div class="net-worth-item-main"><div><span class="net-worth-kind">', item.type === "asset" ? "Asset" : "Liability", ' · ', esc(item.category), '</span><h4>', esc(item.name), '</h4><div class="net-worth-labels">', labels(entry), '</div></div>',
      '<div class="net-worth-item-value"><strong>', money(entry.amountPhp), '</strong><small>As of ', dateLabel(latest.date), '</small></div></div>',
      '<div class="net-worth-item-actions no-print"><button class="button button-primary button-small" type="button" data-add-net-worth-valuation="', esc(item.id), '">Update value</button><button class="button button-secondary button-small" type="button" data-edit-net-worth-item="', esc(item.id), '">Edit</button><button class="button button-secondary button-small" type="button" data-toggle-net-worth-archive="', esc(item.id), '">', item.archived ? "Restore" : "Archive", '</button><button class="button button-secondary button-small" type="button" data-delete-net-worth-item="', esc(item.id), '">Delete</button></div>',
      '<details class="net-worth-history"><summary>Valuation history · ', item.valuations.length, '</summary><ul>', valuationHistory(item), '</ul></details></article>'
    ].join("");
  }

  function compositionMarkup(values, total, tone) {
    if (!values.length) return '<div class="system-empty">No values yet.</div>';
    return values.map(value => {
      const percent = total > 0 ? Math.max(3, Math.round(value.amount / total * 100)) : 0;
      return '<div class="net-worth-composition-row"><span><strong>' + esc(value.category) + '</strong><small>' + money(value.amount) + '</small></span><i><b class="' + tone + '" style="width:' + percent + '%"></b></i></div>';
    }).join("");
  }

  function evolutionMarkup(points) {
    if (!points.length) return '<div class="system-empty">Add valuations to build net-worth history.</div>';
    const max = Math.max(1, ...points.map(point => Math.abs(point.netWorth)));
    return '<div class="net-worth-evolution">' + points.map(point => {
      const width = Math.max(2, Math.round(Math.abs(point.netWorth) / max * 100));
      return '<div class="net-worth-evolution-row"><time>' + dateLabel(point.date) + '</time><i><b class="' + (point.netWorth < 0 ? "liability" : "asset") + '" style="width:' + width + '%"></b></i><strong>' + money(point.netWorth) + '</strong></div>';
    }).join("") + '</div>';
  }

  function ensureWorkspace() {
    const reports = document.getElementById("reports");
    if (!reports) return null;
    let workspace = document.getElementById("netWorthWorkspace");
    if (workspace) return workspace;
    const nav = reports.querySelector(".report-section-nav");
    if (nav && !nav.querySelector('[data-report-target="net-worth-section"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.reportTarget = "net-worth-section";
      button.textContent = "Net worth";
      nav.append(button);
    }
    const heading = document.createElement("div");
    heading.className = "report-section-heading";
    heading.id = "net-worth-section";
    heading.innerHTML = '<span>NW</span><div><strong>Net worth</strong><small>Manual assets, liabilities, and valuation history</small></div>';
    workspace = document.createElement("article");
    workspace.className = "card net-worth-card";
    workspace.id = "netWorthWorkspace";
    reports.append(heading, workspace);
    workspace.addEventListener("click", handleWorkspaceClick);
    workspace.addEventListener("change", event => {
      if (event.target.matches("#netWorthShowArchived")) { showArchived = event.target.checked; render(); }
      if (event.target.matches("#netWorthStaleDays")) {
        if (!canWrite()) return;
        pushUndo?.("Update net worth review period");
        store().staleAfterDays = Math.max(1, Math.min(3650, Number(event.target.value || 90)));
        persist("Net worth review period updated");
        render();
      }
    });
    return workspace;
  }

  function render() {
    const workspace = ensureWorkspace();
    if (!workspace) return;
    const currentStore = store();
    const totals = metrics(currentStore);
    const visibleEntries = showArchived ? metrics(currentStore, todayKey(), { includeArchived:true }).items : totals.items;
    const assets = composition(currentStore, "asset");
    const liabilities = composition(currentStore, "liability");
    const points = evolution(currentStore);
    const disabled = canWrite() ? "" : " disabled";
    workspace.innerHTML = [
      '<div class="net-worth-heading"><div><h3>Manual net-worth ledger</h3><p>Separate from Available Money, Savings, Cash Flow, and Account Ledger.</p></div><div class="net-worth-heading-actions no-print"><button class="button button-secondary" type="button" data-add-net-worth="liability"', disabled, '>Add liability</button><button class="button button-primary" type="button" data-add-net-worth="asset"', disabled, '>Add asset</button></div></div>',
      '<div class="net-worth-kpis"><div><span>Assets</span><strong class="text-green" id="netWorthAssetsTotal">', money(totals.assets), '</strong><small>Latest active manual values</small></div><div><span>Liabilities</span><strong class="text-red" id="netWorthLiabilitiesTotal">', money(totals.liabilities), '</strong><small>Amounts owed</small></div><div><span>Net worth</span><strong id="netWorthTotal" class="', totals.netWorth < 0 ? "text-red" : "text-green", '">', money(totals.netWorth), '</strong><small>Assets minus liabilities</small></div><div><span>Needs review</span><strong>', totals.staleCount, '</strong><small>Older than ', currentStore.staleAfterDays, ' days</small></div></div>',
      '<div class="net-worth-controls no-print"><label class="net-worth-check"><input id="netWorthShowArchived" type="checkbox"', showArchived ? " checked" : "", '> Show archived</label><label class="field"><span>Stale after</span><select class="select" id="netWorthStaleDays"', disabled, '><option value="30"', currentStore.staleAfterDays === 30 ? " selected" : "", '>30 days</option><option value="90"', currentStore.staleAfterDays === 90 ? " selected" : "", '>90 days</option><option value="180"', currentStore.staleAfterDays === 180 ? " selected" : "", '>180 days</option><option value="365"', currentStore.staleAfterDays === 365 ? " selected" : "", '>1 year</option></select></label></div>',
      '<div class="net-worth-grid"><section><div class="net-worth-section-heading"><h4>Assets by category</h4><small>Manual PHP values</small></div>', compositionMarkup(assets, totals.assets, "asset"), '</section><section><div class="net-worth-section-heading"><h4>Liabilities by category</h4><small>Manual PHP values</small></div>', compositionMarkup(liabilities, totals.liabilities, "liability"), '</section><section class="net-worth-wide-panel"><div class="net-worth-section-heading"><h4>Net-worth evolution</h4><small>Last known value on each valuation date</small></div>', evolutionMarkup(points), '</section></div>',
      '<div class="net-worth-list-heading"><div><h4>Assets and liabilities</h4><small>', visibleEntries.length, ' visible item', visibleEntries.length === 1 ? "" : "s", '</small></div></div>',
      '<div class="net-worth-items" id="netWorthItemList">', visibleEntries.length ? visibleEntries.sort((left, right) => left.item.type.localeCompare(right.item.type) || right.amountPhp - left.amountPhp || left.item.name.localeCompare(right.item.name)).map(itemCard).join("") : '<div class="system-empty">Add an asset or liability to begin. Values are never linked to accounts automatically.</div>', '</div>'
    ].join("");
  }

  async function handleWorkspaceClick(event) {
    const target = event.target;
    const add = target.closest("[data-add-net-worth]"); if (add) return openItem("", add.dataset.addNetWorth);
    const edit = target.closest("[data-edit-net-worth-item]"); if (edit) return openItem(edit.dataset.editNetWorthItem);
    const addValue = target.closest("[data-add-net-worth-valuation]"); if (addValue) return openValuation(addValue.dataset.addNetWorthValuation);
    const editValue = target.closest("[data-edit-net-worth-valuation]"); if (editValue) return openValuation(editValue.dataset.netWorthItem, editValue.dataset.editNetWorthValuation);
    const archive = target.closest("[data-toggle-net-worth-archive]");
    if (archive && canWrite()) {
      const item = findItem(archive.dataset.toggleNetWorthArchive);
      if (!item) return;
      pushUndo?.((item.archived ? "Restore " : "Archive ") + item.name);
      item.archived = !item.archived; item.updatedAt = nowIso();
      persist(item.archived ? "Net worth item archived" : "Net worth item restored"); render(); return;
    }
    const removeValue = target.closest("[data-delete-net-worth-valuation]");
    if (removeValue && canWrite()) {
      const item = findItem(removeValue.dataset.netWorthItem);
      const valuation = item?.valuations.find(value => value.id === removeValue.dataset.deleteNetWorthValuation);
      if (!item || !valuation || item.valuations.length <= 1) return toast("Each item needs at least one valuation.", "warning");
      const confirmed = await confirmAction({ title:"Delete valuation?", message:"Delete the " + dateLabel(valuation.date) + " value for " + item.name + "?", details:"Other valuation history stays unchanged.", confirmLabel:"Delete valuation", danger:true });
      if (!confirmed) return;
      await saveRecovery("Before net worth valuation deletion");
      pushUndo?.("Delete " + item.name + " valuation");
      item.valuations = item.valuations.filter(value => value.id !== valuation.id); item.updatedAt = nowIso();
      persist("Net worth valuation deleted"); render(); return;
    }
    const removeItem = target.closest("[data-delete-net-worth-item]");
    if (removeItem && canWrite()) {
      const item = findItem(removeItem.dataset.deleteNetWorthItem);
      if (!item) return;
      const confirmed = await confirmAction({ title:"Delete net-worth item?", message:"Delete " + item.name + " and all " + item.valuations.length + " valuation records?", details:"Archive it instead if you want to keep history.", confirmLabel:"Delete item", danger:true });
      if (!confirmed) return;
      await saveRecovery("Before net worth item deletion");
      pushUndo?.("Delete net worth item " + item.name);
      store().items = store().items.filter(value => value.id !== item.id);
      persist("Net worth item deleted"); render();
    }
  }

  function bindDialogs() {
    ensureDialogs();
    document.addEventListener("click", event => {
      const close = event.target.closest("[data-close-net-worth]");
      if (close) closeNetWorthDialog(close.dataset.closeNetWorth);
    });
    document.getElementById("netWorthItemCurrency").addEventListener("input", event => syncRateField(event.target.value, document.getElementById("netWorthInitialRateField")));
    document.getElementById("netWorthItemType").addEventListener("change", event => {
      if (!currentItemId) document.getElementById("netWorthItemCategory").value = event.target.value === "liability" ? "Other liability" : "Other asset";
    });
    document.getElementById("netWorthItemForm").addEventListener("submit", event => {
      event.preventDefault(); event.stopPropagation();
      if (!canWrite()) return;
      const existing = currentItemId ? findItem(currentItemId) : null;
      const currency = existing?.currency || currencyCode(document.getElementById("netWorthItemCurrency").value);
      const rawAmount = document.getElementById("netWorthInitialAmount").value.trim();
      const valuation = rawAmount ? normalizeValuation({
        id:makeId("valuation"), date:document.getElementById("netWorthInitialDate").value,
        nativeAmount:rawAmount, phpRate:currency === "PHP" ? 1 : document.getElementById("netWorthInitialRate").value,
        note:document.getElementById("netWorthInitialNote").value
      }, currency) : null;
      const candidate = normalizeItem({
        ...(existing || {}),
        id:existing?.id || makeId("worth"),
        name:document.getElementById("netWorthItemName").value,
        type:document.getElementById("netWorthItemType").value,
        category:document.getElementById("netWorthItemCategory").value,
        currency,
        archived:document.getElementById("netWorthItemArchived").checked,
        valuations:[...(existing?.valuations || []), ...(valuation ? [valuation] : [])],
        createdAt:existing?.createdAt || nowIso(), updatedAt:nowIso()
      });
      const error = document.getElementById("netWorthItemError");
      if (!candidate) { error.textContent = existing ? "Complete the item details. If adding a valuation, enter a positive amount and PHP rate." : "Complete the item and enter a positive initial valuation."; error.hidden = false; return; }
      pushUndo?.(existing ? "Edit net worth item " + candidate.name : "Add net worth item " + candidate.name);
      const index = store().items.findIndex(item => item.id === candidate.id);
      if (index >= 0) store().items[index] = candidate; else store().items.push(candidate);
      persist(existing ? "Net worth item updated" : "Net worth item added");
      closeNetWorthDialog("netWorthItemDialog"); render();
    });
    document.getElementById("netWorthValuationForm").addEventListener("submit", event => {
      event.preventDefault(); event.stopPropagation();
      if (!canWrite()) return;
      const item = findItem(currentValuationItemId);
      if (!item) return;
      const existing = currentValuationId ? item.valuations.find(value => value.id === currentValuationId) : null;
      const valuation = normalizeValuation({
        id:existing?.id || makeId("valuation"), date:document.getElementById("netWorthValuationDate").value,
        nativeAmount:document.getElementById("netWorthValuationAmount").value,
        phpRate:item.currency === "PHP" ? 1 : document.getElementById("netWorthValuationRate").value,
        note:document.getElementById("netWorthValuationNote").value,
        createdAt:existing?.createdAt || nowIso(), updatedAt:nowIso()
      }, item.currency);
      const error = document.getElementById("netWorthValuationError");
      if (!valuation) { error.textContent = "Enter a positive amount and a valid PHP conversion rate."; error.hidden = false; return; }
      pushUndo?.((existing ? "Edit " : "Add ") + item.name + " valuation");
      const index = item.valuations.findIndex(value => value.id === valuation.id);
      if (index >= 0) item.valuations[index] = valuation; else item.valuations.push(valuation);
      item.valuations = normalizeItem(item).valuations; item.updatedAt = nowIso();
      persist(existing ? "Net worth valuation updated" : "Net worth valuation added");
      closeNetWorthDialog("netWorthValuationDialog"); render();
    });
  }

  function open() {
    if (typeof goToPage === "function") goToPage("reports", { smooth:false });
    render();
    setTimeout(() => document.getElementById("net-worth-section")?.scrollIntoView({ behavior:"smooth", block:"start" }), 0);
  }

  const originalRenderAll = renderAll;
  renderAll = function netWorthRenderAll(...args) {
    const result = originalRenderAll(...args);
    render();
    return result;
  };
  bindDialogs();
  render();
  globalThis.addEventListener("finance:profile-changed", () => { data = ensureShape(data); render(); });
  globalThis.addEventListener("finance:data-persisted", () => render());
  Object.assign(API, { open, openItem, openValuation, render, get data() { return clone(store()); } });
})();
