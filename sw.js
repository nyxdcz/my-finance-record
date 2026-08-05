"use strict";
const APP_VERSION = "12.19.0";
const CACHE_VERSION = "finance-v12-20260805-v12190-macbook-iphone-cloud-sync";
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
  asset("./cloud-sync.js"),
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
    await Promise.all(keys.filter(key => key.startsWith("finance-v12-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
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
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
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
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("finance-v12-")).map(key => caches.delete(key)))).then(precache));
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

async function showReviewNotification() {
  const reminder = await readReminderIndex().catch(() => null);
  if (!reminder?.enabled || Notification.permission !== "granted") return;
  const body = reminder.issues?.length ? reminder.body : "No urgent finance review items.";
  await self.registration.showNotification(reminder.title || "Finance review", {
    body,
    icon: asset("./icons/icon-192.png"),
    badge: asset("./icons/icon-192.png"),
    tag: "finance-review",
    data: { url: asset("./index.html?page=dashboard") }
  });
}

self.addEventListener("periodicsync", event => {
  if (event.tag === "finance-review-reminder") event.waitUntil(showReviewNotification());
});

self.addEventListener("sync", event => {
  if (event.tag === "finance-review-now") event.waitUntil(showReviewNotification());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = event.notification.data?.url || asset("./index.html?page=dashboard");
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clientsList.find(client => client.url.startsWith(scopeUrl));
    if (existing) { await existing.focus(); existing.navigate(target); return; }
    await self.clients.openWindow(target);
  })());
});
