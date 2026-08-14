"use strict";
/* V14.0.24 · refresh the installed worker so cache-first clients recache the updated interaction stylesheet. */
importScripts("./sw-core-v14-0-23.js");

/* V14.0.24 · keep the supplied sidebar navigation icons available offline. */
const SIDEBAR_ICON_CACHE = "finance-v14-20260814-v1423-expense-ai-r1-shell";
const SIDEBAR_ICON_ASSETS = [
  "./icons/action-add-widget.png",
  "./icons/utility-savings.png",
  "./icons/action-add-record.png",
  "./icons/utility-badge.png",
  "./icons/utility-controls.png"
];
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SIDEBAR_ICON_CACHE).then(cache => cache.addAll(
      SIDEBAR_ICON_ASSETS.map(path => new URL(path, self.registration.scope).toString())
    ))
  );
});
