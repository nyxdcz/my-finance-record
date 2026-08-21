"use strict";
(function installFinanceBrandIcons(root) {
  const doc = root.document;
  if (!doc) return;

  const ensureLink = ({ rel, sizes, href, type }) => {
    let selector = `link[rel="${rel}"]`;
    if (sizes) selector += `[sizes="${sizes}"]`;
    let link = doc.head?.querySelector(selector);
    if (!link) {
      link = doc.createElement("link");
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
})(typeof window !== "undefined" ? window : globalThis);
