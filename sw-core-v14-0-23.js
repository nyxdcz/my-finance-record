"use strict";
const APP_VERSION = "14.0.23";
self.__FINANCE_APP_VERSION = APP_VERSION;
const CACHE_VERSION = "finance-v14-20260814-v1423-expense-ai-r1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const DB_NAME = "simple-finance-project-records-v12-db";
const DB_VERSION = 1;
let financeAuthState = "signed-out";

const scopeUrl = self.registration.scope;
const asset = path => new URL(path, scopeUrl).toString();
const APP_SHELL = [
  asset("./index.html"),
  asset("./offline.html"),
  asset("./manifest.webmanifest"),
  asset("./version.json"),
  asset("./app.css?v=15.1.0-desktop1"),
  asset("./dashboard-interactions.css?v=15.1.0-desktop1"),
  asset("./mobile-v14-0-23.css?v=14.0.23"),
  asset("./interaction-patterns.js?v=14.0.23"),
  asset("./privacy-lock.js?v=14.0.23"),
  asset("./security-profiles.js?v=14.0.23"),
  asset("./security-profiles.css?v=15.1.0-desktop1"),
  asset("./cloud-conflict-review.js?v=14.0.23"),
  asset("./cloud-conflict-resolution.js?v=14.0.23"),
  asset("./cloud-sync-lifecycle.js?v=14.0.23"),
  asset("./cloud-sync.js?v=14.0.23"),
  asset("./account-ledger.js?v=14.0.23"),
  asset("./account-ledger.css?v=14.0.23"),
  asset("./budget-planning.js?v=14.0.23"),
  asset("./budget-planning.css?v=15.1.0-desktop1"),
  asset("./reports-insights.js?v=14.0.23"),
  asset("./reports-insights.css?v=15.1.0-desktop1"),
  asset("./productivity-tools.js?v=14.0.23"),
  asset("./productivity-tools.css?v=14.0.23"),
  asset("./reminders-alerts.js?v=14.0.23"),
  asset("./reminders-alerts.css?v=14.0.23"),
  asset("./projects-calendar-v13.0.20.js?v=14.0.23"),
  asset("./projects-calendar-v13.0.20.css?v=15.1.0-desktop1"),
  asset("./sync-config.js"),
  asset("./expense-screenshot-parser.js?v=14.0.23"),
  asset("./expense-screenshot-detect.js?v=14.0.23"),
  asset("./expense-screenshot-ai.js?v=14.0.23"),
  asset("./vendor/supabase.min.js"),
  asset("./icons/icon-192.png"),
  asset("./icons/icon-512.png"),
  asset("./icons/icon-maskable-512.png"),
  asset("./icons/apple-touch-icon.png"),
  asset("./icons/favicon-32.png"),
  asset("./icons/sidebar-overview.png"), asset("./icons/sidebar-finance.png"), asset("./icons/sidebar-work.png"), asset("./icons/sidebar-settings.png")
];

async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);
}

self.addEventListener("install", event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => /^finance-v(?:12|13|14)-/.test(key) && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(asset("./index.html"))) || (await caches.match(asset("./offline.html")));
  }
}

async function cacheFirst(request) {
  const shell = await caches.open(SHELL_CACHE);
  const runtime = await caches.open(RUNTIME_CACHE);
  const cached = (await shell.match(request)) || (await runtime.match(request));
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && new URL(request.url).origin === self.location.origin) runtime.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || network || new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("version.json") || url.pathname.endsWith("manifest.webmanifest")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

self.addEventListener("message", event => {
  if (event.data?.type === "FINANCE_AUTH_STATE") financeAuthState = event.data?.authenticated ? "signed-in" : "signed-out";
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "PRECACHE") event.waitUntil(precache());
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => /^finance-v(?:12|13|14)-/.test(key)).map(key => caches.delete(key)))).then(precache));
  }
  if (event.data?.type === "FINANCE_ALERT_NOTIFY") {
    event.waitUntil(showFinanceNotification(event.data.payload || {}, { force:true }));
  }
  if (event.data?.type === "FINANCE_ALERT_CHECK") {
    event.waitUntil(showScheduledFinanceAlert());
  }
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("accountSnapshots")) db.createObjectStore("accountSnapshots", { keyPath: "id" });
      if (!db.objectStoreNames.contains("pdfPacks")) db.createObjectStore("pdfPacks", { keyPath: "id" });
      if (!db.objectStoreNames.contains("reminderIndex")) db.createObjectStore("reminderIndex", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readReminderIndex() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reminderIndex", "readonly");
    const request = tx.objectStore("reminderIndex").get("current");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function writeReminderIndex(value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("reminderIndex", "readwrite");
    tx.objectStore("reminderIndex").put(value);
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scheduledTimeReached(value, date = new Date()) {
  const match = String(value || "08:00").match(/^(\d{1,2}):(\d{2})$/);
  const hour = match ? Math.min(23, Math.max(0, Number(match[1]))) : 8;
  const minute = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  const scheduled = new Date(date);
  scheduled.setHours(hour, minute, 0, 0);
  return date >= scheduled;
}

function reminderSnoozed(reminder, date = new Date()) {
  const until = new Date(reminder?.snoozedUntil || 0);
  return !Number.isNaN(until.getTime()) && until > date;
}

async function showFinanceNotification(payload = {}, { force = false } = {}) {
  if (financeAuthState !== "signed-in") return false;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;
  const title = String(payload.title || "Finance reminder");
  const options = {
    body:String(payload.body || "Open My Finance Records to review your alerts."),
    icon:asset("./icons/icon-192.png"),
    badge:asset("./icons/icon-192.png"),
    tag:String(payload.tag || (force ? "finance-alert-manual" : `finance-alert-${localDateKey()}`)),
    renotify:false,
    data:{ url:new URL(payload.url || "./index.html?page=dashboard", scopeUrl).toString(), source:payload.source || "scheduled-alert" }
  };
  await self.registration.showNotification(title, options);
  return true;
}

async function showScheduledFinanceAlert() {
  const reminder = await readReminderIndex().catch(() => null);
  const now = new Date();
  if (!reminder?.enabled || reminderSnoozed(reminder, now)) return false;
  if (reminder.settings?.dailyDigest === false) return false;
  if (!scheduledTimeReached(reminder.settings?.dailyTime, now)) return false;
  const date = localDateKey(now);
  if (String(reminder.lastNotificationDate || "") === date) return false;
  const payload = reminder.notification || {
    title:reminder.title || "Finance alerts",
    body:reminder.body || "Open My Finance Records to review your alerts.",
    tag:`finance-alert-digest-${date}`,
    url:"./index.html?page=dashboard"
  };
  const delivered = await showFinanceNotification(payload);
  if (!delivered) return false;
  reminder.lastNotificationDate = date;
  reminder.lastNotificationAt = now.toISOString();
  await writeReminderIndex(reminder).catch(() => null);
  return true;
}

self.addEventListener("periodicsync", event => {
  if (["finance-review-reminder", "finance-scheduled-alerts-v1"].includes(event.tag)) event.waitUntil(showScheduledFinanceAlert());
});

self.addEventListener("sync", event => {
  if (["finance-review-now", "finance-scheduled-alerts-now"].includes(event.tag)) event.waitUntil(showScheduledFinanceAlert());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || "./index.html?page=dashboard", scopeUrl).toString();
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clientsList.find(client => client.url.startsWith(scopeUrl));
    if (existing) { await existing.focus(); existing.navigate(target); return; }
    await self.clients.openWindow(target);
  })());
});