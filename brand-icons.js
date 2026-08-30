"use strict";
(function installFinanceBrandIcons(root) {
  const doc = root.document;
  if (!doc) return;

  // Browser chrome should show the product name only; version remains inside the app UI.
  doc.title = "Talaan";

  const ensureLink = ({ rel, sizes, href, type, id }) => {
    let selector = id ? `#${id}` : `link[rel="${rel}"]`;
    if (!id && sizes) selector += `[sizes="${sizes}"]`;
    let link = doc.head?.querySelector(selector);
    if (!link) {
      link = doc.createElement("link");
      if (id) link.id = id;
      link.rel = rel;
      if (sizes) link.sizes = sizes;
      if (type) link.type = type;
      doc.head?.appendChild(link);
    }
    if (link) link.href = href;
  };

  ensureLink({ rel:"icon", sizes:"32x32", type:"image/png", href:"./icons/favicon-32-logo2.png" });
  ensureLink({ rel:"icon", sizes:"192x192", type:"image/png", href:"./icons/icon-192-logo2.png" });
  ensureLink({ rel:"apple-touch-icon", href:"./icons/apple-touch-icon-logo2.png" });
  ensureLink({ rel:"stylesheet", id:"incomeExpensesCompactStylesheet", href:"./income-expenses-compact.css?v=2.5.0-income-expenses-compact2" });
})(typeof window !== "undefined" ? window : globalThis);