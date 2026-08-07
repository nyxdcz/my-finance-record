"use strict";
const APP_VERSION = "13.0.7";
const CACHE_VERSION = "finance-v13-20260807-v13007-budget-plan-compact-r1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const DB_NAME = "simple-finance-project-records-v12-db";
const DB_VERSION = 1;

const scopeUrl = self.registration.scope;
const asset = path => new URL(path, scopeUrl).toString();
const APP_SHELL = [
  asset("./index.html"),
  asset("./offline.html"),
  asset("./manifest.webmanifest"),
  asset("./version.json"),
  asset("./security-profiles.js"),
  asset("./security-profiles.css"),
  asset("./cloud-sync.js"),
  asset("./account-ledger.js"),
  asset("./account-ledger.css"),
  asset("./budget-planning.js"),
  asset("./budget-planning.css"),
  asset("./reports-insights.js"),
  asset("./reports-insights.css"),
  asset("./productivity-tools.js"),
  asset("./productivity-tools.css"),
  asset("./reminders-alerts.js"),
  asset("./reminders-alerts.css"),
  asset("./sync-config.js"),
  asset("./vendor/supabase.min.js"),
  asset("./icons/icon-192.png"),
  asset("./icons/icon-512.png"),
  asset("./icons/icon-maskable-512.png"),
  asset("./icons/apple-touch-icon.png"),
  asset("./icons/favicon-32.png")
];

async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL);
}

self.addEventListener("install", event => {
  event.waitUntil(precache());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => /^finance-v(?:12|13)-/.test(key) && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
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
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "PRECACHE") event.waitUntil(precache());
  if (event.data?.type === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => /^finance-v(?:12|13)-/.test(key)).map(key => caches.delete(key)))).then(precache));
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
